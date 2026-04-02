const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const BUILD_VERSION = process.env.BUILD_VERSION || '1.0.0';
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'hummatch-admin-2026';
const SPOTIFY_AVAILABLE = process.env.SPOTIFY_AVAILABLE === 'true';

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('short'));
app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// SQLite database (file-based, persists across restarts)
// ---------------------------------------------------------------------------
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'hummatch.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT NOT NULL,
    lang TEXT DEFAULT 'en',
    data TEXT DEFAULT '{}',
    ip TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    is_premium INTEGER DEFAULT 0,
    playlist TEXT DEFAULT '[]',
    hum_count INTEGER DEFAULT 0,
    export_count INTEGER DEFAULT 0,
    month_key TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS geo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lat REAL,
    lng REAL,
    city TEXT,
    country TEXT,
    cnt INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
  CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
  CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

// Prepared statements for performance
const stmts = {
  insertEvent: db.prepare(
    'INSERT INTO events (event, lang, data, ip, user_agent) VALUES (?, ?, ?, ?, ?)'
  ),
  insertUser: db.prepare(
    'INSERT INTO users (email, token, month_key) VALUES (?, ?, ?)'
  ),
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserByToken: db.prepare('SELECT * FROM users WHERE token = ?'),
  syncUser: db.prepare(
    `UPDATE users SET playlist = ?, hum_count = COALESCE(?, hum_count),
     export_count = COALESCE(?, export_count), updated_at = datetime('now') WHERE token = ?`
  ),
  insertContact: db.prepare(
    'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)'
  ),
  insertGeo: db.prepare(
    'INSERT INTO geo (lat, lng, city, country) VALUES (?, ?, ?, ?)'
  )
};

// ---------------------------------------------------------------------------
// Helper: get current month key (YYYY-MM)
// ---------------------------------------------------------------------------
function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Helper: admin auth middleware
// ---------------------------------------------------------------------------
function requireAdmin(req, res, next) {
  const key = req.headers['x-reactr-api-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ---------------------------------------------------------------------------
// API: Version (PWA auto-update)
// ---------------------------------------------------------------------------
app.get('/api/hummatch/version', (_req, res) => {
  res.json({ v: BUILD_VERSION });
});

// ---------------------------------------------------------------------------
// API: Event tracking
// ---------------------------------------------------------------------------
app.post('/api/hummatch/event', (req, res) => {
  const { event, lang, data } = req.body;
  if (!event) return res.status(400).json({ error: 'Missing event' });
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';
  try {
    stmts.insertEvent.run(event, lang || 'en', JSON.stringify(data || {}), ip, ua);
  } catch (e) {
    console.error('Event insert error:', e.message);
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// API: Spotify status
// ---------------------------------------------------------------------------
app.get('/api/hummatch/spotify-status', (_req, res) => {
  res.json({ available: SPOTIFY_AVAILABLE });
});

// ---------------------------------------------------------------------------
// API: Auth - Register / Login
// ---------------------------------------------------------------------------
app.post('/api/hummatch/auth/register', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  let existing = stmts.getUserByEmail.get(email);
  if (existing) {
    return res.json({
      token: existing.token,
      email: existing.email,
      is_premium: !!existing.is_premium,
      isNew: false
    });
  }

  const token = uuidv4();
  try {
    stmts.insertUser.run(email, token, monthKey());
    return res.json({ token, email, is_premium: false, isNew: true });
  } catch (e) {
    console.error('Register error:', e.message);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// ---------------------------------------------------------------------------
// API: Auth - Get current user
// ---------------------------------------------------------------------------
app.get('/api/hummatch/auth/me', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const user = stmts.getUserByToken.get(token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let playlist = [];
  try { playlist = JSON.parse(user.playlist || '[]'); } catch (_) {}

  res.json({
    email: user.email,
    is_premium: !!user.is_premium,
    playlist,
    hum_count: user.hum_count || 0,
    export_count: user.export_count || 0,
    month_key: user.month_key || monthKey()
  });
});

// ---------------------------------------------------------------------------
// API: Auth - Sync playlist and counts
// ---------------------------------------------------------------------------
app.post('/api/hummatch/auth/sync', (req, res) => {
  const { token, playlist, hum_count, export_count } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const user = stmts.getUserByToken.get(token);
  if (!user) return res.status(404).json({ error: 'User not found' });

  try {
    stmts.syncUser.run(
      JSON.stringify(playlist || []),
      hum_count !== undefined ? hum_count : null,
      export_count !== undefined ? export_count : null,
      token
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('Sync error:', e.message);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// ---------------------------------------------------------------------------
// API: Analytics dashboard (admin-only)
// ---------------------------------------------------------------------------
app.get('/api/hummatch/analytics', requireAdmin, (req, res) => {
  const since = parseInt(req.query.since) || 0;
  const sinceDate = since > 0
    ? new Date(since * 1000).toISOString()
    : '1970-01-01T00:00:00.000Z';

  const total = (event, lang) => {
    let q = 'SELECT COUNT(*) as cnt FROM events WHERE event = ? AND created_at >= ?';
    const params = [event, sinceDate];
    if (lang) { q += ' AND lang = ?'; params.push(lang); }
    return db.prepare(q).get(...params).cnt;
  };

  const totalVisits = total('page_view');
  const enVisits = total('page_view', 'en');
  const esVisits = total('page_view', 'es');
  const totalHums = total('hum_complete') + total('hum_phase_complete');
  const enHums = total('hum_complete', 'en') + total('hum_phase_complete', 'en');
  const esHums = total('hum_complete', 'es') + total('hum_phase_complete', 'es');
  const totalShares = total('share');
  const pwaInstalls = total('pwa_install');
  const totalSung = total('karaoke_open');
  const monthlyPurchases = total('purchase');

  // Session duration average
  const durRow = db.prepare(`
    SELECT AVG(CAST(json_extract(data, '$.duration_sec') AS INTEGER)) as avg_dur
    FROM events WHERE event = 'session_end' AND created_at >= ?
  `).get(sinceDate);
  const avgSessionSec = durRow ? Math.round(durRow.avg_dur || 0) : 0;

  // Return visitors (IPs with > 1 page_view)
  const returnRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM (
      SELECT ip FROM events WHERE event = 'page_view' AND created_at >= ?
      GROUP BY ip HAVING COUNT(*) > 1
    )
  `).get(sinceDate);
  const returnVisitors = returnRow ? returnRow.cnt : 0;

  const convRate = totalVisits > 0
    ? Math.round((totalHums / totalVisits) * 100)
    : 0;

  // Daily breakdown for charts
  const dailyRows = db.prepare(`
    SELECT DATE(created_at) as day, event, COUNT(*) as cnt
    FROM events WHERE created_at >= ?
    GROUP BY day, event ORDER BY day
  `).all(sinceDate);

  const daily = {};
  for (const r of dailyRows) {
    if (!daily[r.day]) daily[r.day] = {};
    daily[r.day][r.event] = r.cnt;
  }

  // Top songs (karaoke opens)
  const topSongs = db.prepare(`
    SELECT json_extract(data, '$.song') as song, COUNT(*) as cnt
    FROM events WHERE event = 'karaoke_open' AND created_at >= ?
    AND json_extract(data, '$.song') IS NOT NULL
    GROUP BY song ORDER BY cnt DESC LIMIT 10
  `).all(sinceDate);

  // Top referrers
  const topReferrers = db.prepare(`
    SELECT json_extract(data, '$.referrer') as ref, COUNT(*) as cnt
    FROM events WHERE event = 'page_view' AND created_at >= ?
    AND json_extract(data, '$.referrer') IS NOT NULL AND json_extract(data, '$.referrer') != ''
    GROUP BY ref ORDER BY cnt DESC LIMIT 10
  `).all(sinceDate);

  res.json({
    totalVisits, enVisits, esVisits,
    totalHums, enHums, esHums,
    totalShares, totalSung,
    pwaInstalls, monthlyPurchases,
    convRate, avgSessionSec, returnVisitors,
    daily, topSongs, topReferrers
  });
});

// ---------------------------------------------------------------------------
// API: Geo data for map (admin-only)
// ---------------------------------------------------------------------------
app.get('/api/hummatch/geo', requireAdmin, (req, res) => {
  const points = db.prepare(
    'SELECT lat, lng, city, country, cnt FROM geo ORDER BY cnt DESC LIMIT 500'
  ).all();
  res.json({ points });
});

// ---------------------------------------------------------------------------
// API: Songs endpoint (for ES version / future use)
// ---------------------------------------------------------------------------
app.get('/api/hummatch/songs', (_req, res) => {
  res.json({ songs: [], note: 'Songs are loaded from inline JS. This endpoint is reserved for admin management.' });
});

// ---------------------------------------------------------------------------
// API: Contact form
// ---------------------------------------------------------------------------
app.post('/api/hummatch/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }
  try {
    stmts.insertContact.run(name || '', email || '', message.trim());
    res.json({ ok: true });
  } catch (e) {
    console.error('Contact insert error:', e.message);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// ---------------------------------------------------------------------------
// Static files & SPA routing
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  index: 'index.html'
}));

// Blog clean URLs (match render.yaml rewrites)
app.get('/blog/find-songs-you-can-nail', (_req, res) => {
  res.sendFile(path.join(__dirname, 'blog', 'find-songs-you-can-nail.html'));
});
app.get('/blog/how-hummatch-works', (_req, res) => {
  res.sendFile(path.join(__dirname, 'blog', 'how-hummatch-works.html'));
});
app.get('/blog/how-hummatch-was-built', (_req, res) => {
  res.sendFile(path.join(__dirname, 'blog', 'how-hummatch-was-built.html'));
});
app.get('/blog', (_req, res) => {
  res.sendFile(path.join(__dirname, 'blog', 'index.html'));
});

// Contact page (serves index.html, handled client-side)
app.get('/contact', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/es/contact', (_req, res) => {
  res.sendFile(path.join(__dirname, 'hummatch-es.html'));
});

// SPA fallback: serve index.html for unmatched routes
app.get('*', (req, res) => {
  // Don't catch API routes or file extensions
  if (req.path.startsWith('/api/') || path.extname(req.path)) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`HumMatch server running on port ${PORT}`);
  console.log(`  Static files: ${__dirname}`);
  console.log(`  Database: ${DB_PATH}`);
  console.log(`  Build version: ${BUILD_VERSION}`);
  console.log(`  Spotify available: ${SPOTIFY_AVAILABLE}`);
});
