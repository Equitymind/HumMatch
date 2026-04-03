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
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = STRIPE_SECRET_KEY ? require('stripe')(STRIPE_SECRET_KEY) : null;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('short'));

// Stripe webhook needs raw body — must be registered before express.json
app.post('/api/hummatch/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe) return res.status(501).json({ error: 'Stripe not configured' });
  let event;
  try {
    if (STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(req.body);
    }
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = (session.customer_email || (session.customer_details && session.customer_details.email) || '').toLowerCase();
    if (email) {
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (user) {
        db.prepare("UPDATE users SET is_premium = 1, updated_at = datetime('now') WHERE id = ?").run(user.id);
        console.log(`Stripe webhook: upgraded ${email} to premium`);
      } else {
        const newToken = uuidv4();
        db.prepare('INSERT INTO users (email, token, is_premium, month_key) VALUES (?, ?, 1, ?)').run(email, newToken, monthKey());
        console.log(`Stripe webhook: created premium account for ${email}`);
      }
    }
  }
  res.json({ received: true });
});

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

  CREATE TABLE IF NOT EXISTS user_playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    song_title TEXT,
    artist TEXT,
    confidence INTEGER,
    genre TEXT,
    song_key TEXT,
    voice_type TEXT,
    language TEXT DEFAULT 'en',
    matched_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS hum_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    song_title TEXT,
    artist TEXT,
    confidence INTEGER,
    hummed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS squad_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_user_id INTEGER,
    squad_name TEXT DEFAULT 'My SquadMatch',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(owner_user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS squad_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    squad_id INTEGER,
    user_id INTEGER,
    display_name TEXT,
    voice_type TEXT,
    status TEXT DEFAULT 'pending',
    joined_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(squad_id) REFERENCES squad_matches(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS song_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    song_title TEXT,
    artist TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    requested_at TEXT DEFAULT (datetime('now')),
    reviewed_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS friend_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    code TEXT UNIQUE NOT NULL,
    used_by_email TEXT,
    converted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS friend_code_tracker (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    codes_issued INTEGER DEFAULT 0,
    reset_date TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS groupmatch_waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    zip_code TEXT,
    voice_type TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
  CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
  CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_playlists_user ON user_playlists(user_id);
  CREATE INDEX IF NOT EXISTS idx_hum_history_user ON hum_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_squad_owner ON squad_matches(owner_user_id);
  CREATE INDEX IF NOT EXISTS idx_squad_members_squad ON squad_members(squad_id);
  CREATE INDEX IF NOT EXISTS idx_song_requests_user ON song_requests(user_id);
  CREATE INDEX IF NOT EXISTS idx_friend_codes_user ON friend_codes(user_id);
  CREATE INDEX IF NOT EXISTS idx_friend_codes_code ON friend_codes(code);
  CREATE INDEX IF NOT EXISTS idx_groupmatch_waitlist_email ON groupmatch_waitlist(email);
`);

// Add zip_code column to users if missing (migration for existing DBs)
try {
  db.exec(`ALTER TABLE users ADD COLUMN zip_code TEXT`);
} catch (_) { /* column already exists */ }

// ---------------------------------------------------------------------------
// Auto-import analytics backup if events table is empty (for fresh deploys)
// ---------------------------------------------------------------------------
(function autoImportEvents() {
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM events').get().cnt;
  if (count > 0) return;

  const backupPath = path.join(__dirname, 'hummatch-analytics-backup.json');
  const fs = require('fs');
  if (!fs.existsSync(backupPath)) return;

  try {
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    if (!backup.events || !backup.events.length) return;

    const insert = db.prepare(
      'INSERT INTO events (event, lang, data, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const importAll = db.transaction((events) => {
      for (const e of events) {
        const ts = typeof e.created_at === 'number'
          ? new Date(e.created_at * 1000).toISOString().replace('T', ' ').slice(0, 19)
          : e.created_at;
        insert.run(e.event, e.lang || 'en', e.data || '{}', e.ip || null, e.ua || null, ts);
      }
    });
    importAll(backup.events);
    console.log(`Auto-imported ${backup.events.length} analytics events from backup`);
  } catch (err) {
    console.error('Failed to auto-import analytics backup:', err.message);
  }
})();

// ---------------------------------------------------------------------------
// Auto-populate geo table from event IPs if empty (for fresh deploys)
// Uses ip-api.com batch endpoint; runs in background so it doesn't block startup
// ---------------------------------------------------------------------------
(function autoPopulateGeo() {
  const geoCount = db.prepare('SELECT COUNT(*) AS cnt FROM geo').get().cnt;
  if (geoCount > 0) return;

  const ipRows = db.prepare(
    "SELECT ip, COUNT(*) as cnt FROM events WHERE ip IS NOT NULL AND ip != '' GROUP BY ip"
  ).all();
  if (ipRows.length === 0) return;

  console.log(`Geo table empty — geocoding ${ipRows.length} unique IPs in background…`);

  const ipCounts = {};
  for (const r of ipRows) ipCounts[r.ip] = r.cnt;
  const allIps = Object.keys(ipCounts);

  const BATCH_SIZE = 100;
  const RATE_LIMIT_MS = Math.ceil(60000 / 45); // 45 req/min free tier

  (async () => {
    const insertGeo = db.prepare(
      'INSERT INTO geo (lat, lng, city, country, cnt) VALUES (?, ?, ?, ?, ?)'
    );
    const insertAll = db.transaction((rows) => {
      for (const g of rows) insertGeo.run(g.lat, g.lng, g.city, g.country, g.cnt);
    });

    const perIpResults = [];
    let resolved = 0, failed = 0;

    for (let i = 0; i < allIps.length; i += BATCH_SIZE) {
      const batch = allIps.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch('http://ip-api.com/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch.map(ip => ({ query: ip, fields: 'status,lat,lon,city,country,query' }))),
        });
        const results = await res.json();
        for (const r of results) {
          if (r.status === 'success' && r.lat && r.lon) {
            perIpResults.push({ lat: r.lat, lng: r.lon, city: r.city || 'Unknown', country: r.country || 'Unknown', cnt: ipCounts[r.query] || 1 });
            resolved++;
          } else { failed++; }
        }
      } catch (err) {
        console.error(`  Geo batch failed:`, err.message);
        failed += batch.length;
      }
      if (i + BATCH_SIZE < allIps.length) await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }

    // Cluster by city+country to reduce map pins
    const cityMap = {};
    for (const r of perIpResults) {
      const key = `${r.city}|${r.country}`;
      if (!cityMap[key]) {
        cityMap[key] = { lat: r.lat, lng: r.lng, city: r.city, country: r.country, cnt: 0 };
      }
      cityMap[key].cnt += r.cnt;
    }
    const geoResults = Object.values(cityMap);

    if (geoResults.length > 0) insertAll(geoResults);
    console.log(`Auto-populated geo table: ${resolved} IPs resolved → ${geoResults.length} city clusters, ${failed} failed`);
  })().catch(err => console.error('Geo auto-populate failed:', err.message));
})();

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
  ),
  // Dashboard tables
  insertPlaylistSong: db.prepare(
    'INSERT INTO user_playlists (user_id, song_title, artist, confidence, genre, song_key, voice_type, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ),
  getPlaylist: db.prepare(
    'SELECT * FROM user_playlists WHERE user_id = ? ORDER BY matched_at DESC'
  ),
  deletePlaylistSong: db.prepare(
    'DELETE FROM user_playlists WHERE id = ? AND user_id = ?'
  ),
  insertHumHistory: db.prepare(
    'INSERT INTO hum_history (user_id, song_title, artist, confidence) VALUES (?, ?, ?, ?)'
  ),
  getHumHistory: db.prepare(
    'SELECT * FROM hum_history WHERE user_id = ? ORDER BY hummed_at DESC LIMIT 10'
  ),
  getHumCount: db.prepare(
    'SELECT COUNT(*) as cnt FROM hum_history WHERE user_id = ?'
  ),
  getWeekHumCount: db.prepare(
    `SELECT COUNT(*) as cnt FROM hum_history WHERE user_id = ? AND hummed_at >= datetime('now', '-7 days')`
  ),
  getBestMatch: db.prepare(
    'SELECT MAX(confidence) as best FROM hum_history WHERE user_id = ?'
  ),
  // Squad
  insertSquad: db.prepare(
    'INSERT INTO squad_matches (owner_user_id, squad_name) VALUES (?, ?)'
  ),
  getSquads: db.prepare(
    'SELECT * FROM squad_matches WHERE owner_user_id = ?'
  ),
  insertSquadMember: db.prepare(
    'INSERT INTO squad_members (squad_id, user_id, display_name, voice_type, status) VALUES (?, ?, ?, ?, ?)'
  ),
  getSquadMembers: db.prepare(
    'SELECT * FROM squad_members WHERE squad_id = ?'
  ),
  updateSquadMemberStatus: db.prepare(
    'UPDATE squad_members SET status = ? WHERE id = ?'
  ),
  // Song requests
  insertSongRequest: db.prepare(
    'INSERT INTO song_requests (user_id, song_title, artist, notes) VALUES (?, ?, ?, ?)'
  ),
  getSongRequests: db.prepare(
    'SELECT * FROM song_requests WHERE user_id = ? ORDER BY requested_at DESC'
  ),
  // Friend codes
  insertFriendCode: db.prepare(
    'INSERT INTO friend_codes (user_id, code) VALUES (?, ?)'
  ),
  getFriendCodes: db.prepare(
    'SELECT * FROM friend_codes WHERE user_id = ? ORDER BY created_at DESC'
  ),
  getCodeTracker: db.prepare(
    'SELECT * FROM friend_code_tracker WHERE user_id = ?'
  ),
  upsertCodeTracker: db.prepare(
    `INSERT INTO friend_code_tracker (user_id, codes_issued, reset_date) VALUES (?, 1, ?)
     ON CONFLICT(user_id) DO UPDATE SET codes_issued = codes_issued + 1`
  ),
  resetCodeTracker: db.prepare(
    'UPDATE friend_code_tracker SET codes_issued = 0, reset_date = ? WHERE user_id = ?'
  ),
  // GroupMatch waitlist
  insertWaitlist: db.prepare(
    'INSERT INTO groupmatch_waitlist (email, zip_code, voice_type) VALUES (?, ?, ?)'
  ),
  getWaitlistByEmail: db.prepare(
    'SELECT id FROM groupmatch_waitlist WHERE email = ?'
  ),
  updateUserZip: db.prepare(
    `UPDATE users SET zip_code = ?, updated_at = datetime('now') WHERE id = ?`
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
    month_key: user.month_key || monthKey(),
    zip_code: user.zip_code || ''
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
// Helper: auth middleware (token-based)
// ---------------------------------------------------------------------------
function requireAuth(req, res, next) {
  const token = req.headers['x-hm-token'] || req.query.token;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  const user = stmts.getUserByToken.get(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  req.user = user;
  next();
}

function requirePremium(req, res, next) {
  if (!req.user.is_premium) return res.status(403).json({ error: 'Squad Leader required' });
  next();
}

// ---------------------------------------------------------------------------
// API: Dashboard - Stats overview
// ---------------------------------------------------------------------------
app.get('/api/hummatch/dashboard', requireAuth, (req, res) => {
  const uid = req.user.id;
  const totalHums = stmts.getHumCount.get(uid).cnt;
  const weekHums = stmts.getWeekHumCount.get(uid).cnt;
  const bestMatch = stmts.getBestMatch.get(uid).best || 0;
  const playlist = stmts.getPlaylist.all(uid);
  const recentHums = stmts.getHumHistory.all(uid);

  res.json({
    stats: {
      totalHums,
      weekHums,
      bestMatch,
      playlistSize: playlist.length
    },
    recentHums,
    user: {
      email: req.user.email,
      is_premium: !!req.user.is_premium,
      created_at: req.user.created_at,
      zip_code: req.user.zip_code || ''
    }
  });
});

// ---------------------------------------------------------------------------
// API: Playlist CRUD
// ---------------------------------------------------------------------------
app.get('/api/hummatch/playlist', requireAuth, (req, res) => {
  const songs = stmts.getPlaylist.all(req.user.id);
  res.json({ songs });
});

app.post('/api/hummatch/playlist/add', requireAuth, (req, res) => {
  const { song_title, artist, confidence, genre, song_key, voice_type, language } = req.body;
  if (!song_title) return res.status(400).json({ error: 'Song title required' });
  try {
    const info = stmts.insertPlaylistSong.run(
      req.user.id, song_title, artist || '', confidence || 0,
      genre || '', song_key || '', voice_type || '', language || 'en'
    );
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add song' });
  }
});

app.delete('/api/hummatch/playlist/:id', requireAuth, (req, res) => {
  const result = stmts.deletePlaylistSong.run(parseInt(req.params.id), req.user.id);
  res.json({ ok: true, deleted: result.changes });
});

// ---------------------------------------------------------------------------
// API: Hum History
// ---------------------------------------------------------------------------
app.post('/api/hummatch/hum', requireAuth, (req, res) => {
  const { song_title, artist, confidence } = req.body;
  if (!song_title) return res.status(400).json({ error: 'Song title required' });
  try {
    stmts.insertHumHistory.run(req.user.id, song_title, artist || '', confidence || 0);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to record hum' });
  }
});

// ---------------------------------------------------------------------------
// API: SquadMatch (Free + Premium)
// ---------------------------------------------------------------------------
app.get('/api/hummatch/squad', requireAuth, (req, res) => {
  const squads = stmts.getSquads.all(req.user.id);
  const result = squads.map(s => ({
    ...s,
    session_name: s.squad_name,
    members: stmts.getSquadMembers.all(s.id)
  }));
  res.json({ squads: result });
});

app.post('/api/hummatch/squad', requireAuth, (req, res) => {
  const { squad_name, session_name } = req.body;
  const name = session_name || squad_name || 'My SquadMatch';
  try {
    const info = stmts.insertSquad.run(req.user.id, name);
    res.json({ ok: true, id: info.lastInsertRowid, session_name: name });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create squad' });
  }
});

app.post('/api/hummatch/squad/:id/invite', requireAuth, (req, res) => {
  const { display_name, voice_type } = req.body;
  const squadId = parseInt(req.params.id);

  // Free users: 3-member limit
  if (!req.user.is_premium) {
    const members = stmts.getSquadMembers.all(squadId);
    if (members.length >= 3) {
      return res.status(403).json({ error: 'Free plan allows 3 squad members. Upgrade for unlimited!' });
    }
  }

  try {
    const info = stmts.insertSquadMember.run(squadId, null, display_name || '', voice_type || '', 'pending');
    const squad = stmts.getSquads.all(req.user.id).find(s => s.id === squadId);
    res.json({ ok: true, id: info.lastInsertRowid, session_name: squad ? squad.squad_name : '' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to invite member' });
  }
});

// ---------------------------------------------------------------------------
// API: Song Requests (Premium)
// ---------------------------------------------------------------------------
app.get('/api/hummatch/song-requests', requireAuth, requirePremium, (req, res) => {
  const requests = stmts.getSongRequests.all(req.user.id);
  res.json({ requests });
});

app.post('/api/hummatch/song-requests', requireAuth, requirePremium, (req, res) => {
  const { song_title, artist, notes } = req.body;
  if (!song_title) return res.status(400).json({ error: 'Song title required' });
  try {
    const info = stmts.insertSongRequest.run(req.user.id, song_title, artist || '', notes || '');
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

// ---------------------------------------------------------------------------
// API: Friend Codes (Premium)
// ---------------------------------------------------------------------------
app.get('/api/hummatch/friend-codes', requireAuth, requirePremium, (req, res) => {
  const codes = stmts.getFriendCodes.all(req.user.id);
  let tracker = stmts.getCodeTracker.get(req.user.id);

  // Auto-reset if past reset date
  if (tracker && tracker.reset_date && new Date(tracker.reset_date) <= new Date()) {
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1, 1);
    nextReset.setHours(0, 0, 0, 0);
    stmts.resetCodeTracker.run(nextReset.toISOString(), req.user.id);
    tracker = stmts.getCodeTracker.get(req.user.id);
  }

  const codesIssued = tracker ? tracker.codes_issued : 0;
  const conversions = codes.filter(c => c.converted).length;

  res.json({
    codes,
    remaining: Math.max(0, 5 - codesIssued),
    total: 5,
    conversions,
    resetDate: tracker ? tracker.reset_date : null
  });
});

app.post('/api/hummatch/friend-codes', requireAuth, requirePremium, (req, res) => {
  let tracker = stmts.getCodeTracker.get(req.user.id);

  // Auto-reset if past reset date
  if (tracker && tracker.reset_date && new Date(tracker.reset_date) <= new Date()) {
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1, 1);
    nextReset.setHours(0, 0, 0, 0);
    stmts.resetCodeTracker.run(nextReset.toISOString(), req.user.id);
    tracker = stmts.getCodeTracker.get(req.user.id);
  }

  const codesIssued = tracker ? tracker.codes_issued : 0;
  if (codesIssued >= 5) {
    return res.status(400).json({ error: 'Monthly code limit reached (5/5)' });
  }

  // Generate code from email prefix
  const prefix = req.user.email.split('@')[0].replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 8);
  const code = prefix + 'MUSIC20' + Math.floor(Math.random() * 100);

  try {
    stmts.insertFriendCode.run(req.user.id, code);
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1, 1);
    nextReset.setHours(0, 0, 0, 0);
    stmts.upsertCodeTracker.run(req.user.id, nextReset.toISOString());
    res.json({ ok: true, code, remaining: Math.max(0, 4 - codesIssued) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate code' });
  }
});

// ---------------------------------------------------------------------------
// API: Spotify Export (placeholder)
// ---------------------------------------------------------------------------
app.post('/api/hummatch/spotify/export', requireAuth, (req, res) => {
  const songs = stmts.getPlaylist.all(req.user.id);
  // Placeholder — real Spotify integration would use OAuth + Spotify Web API
  res.json({
    ok: true,
    exported: songs.length,
    message: `${songs.length} songs ready for Spotify export. Connect your Spotify account to complete.`
  });
});

// ---------------------------------------------------------------------------
// API: Account Settings
// ---------------------------------------------------------------------------
app.put('/api/hummatch/account', requireAuth, (req, res) => {
  const { email, zip_code } = req.body;
  if (email) {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    try {
      db.prepare('UPDATE users SET email = ?, updated_at = datetime(\'now\') WHERE id = ?').run(trimmed, req.user.id);
    } catch (e) {
      return res.status(400).json({ error: 'Email already in use' });
    }
  }
  if (zip_code !== undefined) {
    stmts.updateUserZip.run(zip_code.trim().slice(0, 10), req.user.id);
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// API: Stripe Checkout
// ---------------------------------------------------------------------------
const STRIPE_PRICES = {
  monthly: 'price_1TE07i8kAFC9VsZHxD9xqXYB',
  annual: 'price_1TDCM48kAFC9VsZHdVNcIKI7'
};

app.get('/api/hummatch/checkout/success', async (req, res) => {
  if (stripe && req.query.session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
      if (session.payment_status === 'paid') {
        const email = (session.customer_details?.email || session.customer_email || '').toLowerCase();
        if (email) {
          const user = stmts.getUserByEmail.get(email);
          if (user) {
            db.prepare("UPDATE users SET is_premium = 1, updated_at = datetime('now') WHERE id = ?").run(user.id);
          } else {
            const newToken = uuidv4();
            stmts.insertUser.run(email, newToken, monthKey());
            db.prepare("UPDATE users SET is_premium = 1 WHERE email = ?").run(email);
          }
          console.log(`Premium activated for ${email} via checkout success`);
        }
      }
    } catch (e) {
      console.error('Checkout success verification error:', e.message);
    }
  }
  res.redirect('/dashboard?upgraded=1');
});

app.post('/api/checkout', async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

  const plan = req.body.plan || 'monthly';
  const priceId = STRIPE_PRICES[plan];
  if (!priceId) return res.status(400).json({ error: 'Invalid plan. Use monthly or annual.' });

  const sessionOpts = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${req.protocol}://${req.get('host')}/api/hummatch/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.protocol}://${req.get('host')}/`
  };

  const token = req.headers['x-hm-token'] || req.body.token;
  if (token) {
    const user = stmts.getUserByToken.get(token);
    if (user) sessionOpts.customer_email = user.email;
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionOpts);
    res.json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout error:', e.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.get('/api/hummatch/checkout/:plan', async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

  const priceId = STRIPE_PRICES[req.params.plan];
  if (!priceId) return res.status(400).json({ error: 'Invalid plan. Use monthly or annual.' });

  const sessionOpts = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${req.protocol}://${req.get('host')}/api/hummatch/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.protocol}://${req.get('host')}/`
  };

  // Pre-fill email if user is logged in
  const token = req.headers['x-hm-token'] || req.query.token;
  if (token) {
    const user = stmts.getUserByToken.get(token);
    if (user) sessionOpts.customer_email = user.email;
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionOpts);
    res.redirect(303, session.url);
  } catch (e) {
    console.error('Stripe checkout error:', e.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ---------------------------------------------------------------------------
// API: GroupMatch Waitlist
// ---------------------------------------------------------------------------
app.post('/api/groupmatch/waitlist', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  const zip_code = (req.body.zip_code || '').trim().slice(0, 10);
  const voice_type = (req.body.voice_type || '').trim().slice(0, 30);

  // Prevent duplicate signups
  const existing = stmts.getWaitlistByEmail.get(email);
  if (existing) {
    return res.json({ ok: true, message: 'You\'re already on the waitlist!' });
  }

  try {
    stmts.insertWaitlist.run(email, zip_code, voice_type);

    // Track analytics event
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    stmts.insertEvent.run('groupmatch_waitlist_signup', 'en', JSON.stringify({ email: email.split('@')[0] + '@***', zip_code, voice_type }), ip, ua);

    res.json({ ok: true, message: 'You\'re on the list! We\'ll notify you when GroupMatch launches.' });
  } catch (e) {
    console.error('GroupMatch waitlist error:', e.message);
    res.status(500).json({ error: 'Failed to join waitlist' });
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

// Dashboard page
app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Pricing page
app.get('/pricing', (_req, res) => {
  res.sendFile(path.join(__dirname, 'pricing.html'));
});
app.get('/hummatch/pricing', (_req, res) => {
  res.sendFile(path.join(__dirname, 'pricing.html'));
});

// SquadMatch landing page
app.get('/squadmatch', (_req, res) => {
  res.sendFile(path.join(__dirname, 'squadmatch.html'));
});

// GroupMatch landing page
app.get('/groupmatch', (_req, res) => {
  res.sendFile(path.join(__dirname, 'groupmatch.html'));
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
