/**
 * Import hummatch-analytics-backup.json into the HumMatch better-sqlite3 database.
 *
 * Mapping:
 *   - All 5,009 events → `events` table (event, lang, data, ip, user_agent, created_at)
 *   - share_card events are shares (tracked as events with event='share_card')
 *   - pwa_install / a2hs_tap events → installs (tracked as events)
 *   - account_register events → user signups (tracked as events)
 *   - Geo data extracted from IP-bearing events → `geo` table (deduplicated by IP)
 *
 * Timestamps are converted from Unix epoch seconds → ISO 8601 datetime strings.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const BACKUP_PATH = path.join(__dirname, '..', 'hummatch-analytics-backup.json');
const DB_PATH = path.join(__dirname, 'hummatch.db');

// ---------------------------------------------------------------------------
// 1. Read backup
// ---------------------------------------------------------------------------
console.log('Reading backup file…');
const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf-8'));
const events = backup.events;
console.log(`  Found ${events.length} events`);
console.log(`  Exported at: ${new Date(backup.exported_at).toISOString()}`);

// ---------------------------------------------------------------------------
// 2. Open / initialise database (tables are created by server.js schema)
// ---------------------------------------------------------------------------
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ensure tables exist (same DDL as server.js)
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
  CREATE TABLE IF NOT EXISTS geo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lat REAL, lng REAL, city TEXT, country TEXT,
    cnt INTEGER DEFAULT 1,
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
  CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
  CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
`);

// ---------------------------------------------------------------------------
// 3. Map old event names to the new schema event names used by the analytics
//    dashboard in server.js. The dashboard queries for specific event names:
//      page_view, hum_complete, hum_phase_complete, share, pwa_install,
//      karaoke_open, purchase, session_end
// ---------------------------------------------------------------------------
function mapEventName(oldName) {
  const mapping = {
    // Direct matches (already used by dashboard)
    page_view: 'page_view',
    hum_complete: 'hum_complete',
    session_end: 'session_end',
    pwa_install: 'pwa_install',

    // Map old names → new dashboard names
    share_card: 'share',           // dashboard queries 'share'
    song_sung: 'karaoke_open',     // dashboard queries 'karaoke_open'
    account_register: 'account_register',

    // Keep the rest as-is (useful for raw analytics)
    song_matched: 'song_matched',
    hum_start: 'hum_start',
    gender_set: 'gender_set',
    results_view: 'results_view',
    song_click: 'song_click',
    a2hs_tap: 'a2hs_tap',
    no_match: 'no_match',
    song_dismissed: 'song_dismissed',
    challenge_tap: 'challenge_tap',
    export_copy: 'export_copy',
  };
  return mapping[oldName] || oldName;
}

// ---------------------------------------------------------------------------
// 4. Convert Unix timestamp (seconds) → ISO datetime string
// ---------------------------------------------------------------------------
function toISO(epoch) {
  return new Date(epoch * 1000).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}

// ---------------------------------------------------------------------------
// 5. Insert all events in a single transaction for speed
// ---------------------------------------------------------------------------
const insertEvent = db.prepare(
  'INSERT INTO events (event, lang, data, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?)'
);

console.log('\nImporting events…');

const counts = {};
const importAll = db.transaction(() => {
  for (const e of events) {
    const mappedEvent = mapEventName(e.event);
    const lang = e.lang || 'en';
    const data = typeof e.data === 'string' ? e.data : JSON.stringify(e.data || {});
    const ip = e.ip || '';
    const ua = e.ua || '';
    const createdAt = toISO(e.created_at);

    insertEvent.run(mappedEvent, lang, data, ip, ua, createdAt);

    counts[mappedEvent] = (counts[mappedEvent] || 0) + 1;
  }
});

importAll();

// ---------------------------------------------------------------------------
// 6. Verify
// ---------------------------------------------------------------------------
const totalInserted = db.prepare('SELECT COUNT(*) as cnt FROM events').get().cnt;
const eventBreakdown = db.prepare(
  'SELECT event, COUNT(*) as cnt FROM events GROUP BY event ORDER BY cnt DESC'
).all();

const dateRange = db.prepare(
  'SELECT MIN(created_at) as earliest, MAX(created_at) as latest FROM events'
).get();

console.log('\n========================================');
console.log('  IMPORT COMPLETE');
console.log('========================================');
console.log(`  Total events in DB:  ${totalInserted}`);
console.log(`  Expected:            ${events.length}`);
console.log(`  Match:               ${totalInserted >= events.length ? 'YES' : 'NO'}`);
console.log(`  Date range:          ${dateRange.earliest} → ${dateRange.latest}`);
console.log('\n  Event breakdown:');
for (const row of eventBreakdown) {
  console.log(`    ${row.event.padEnd(22)} ${row.cnt}`);
}

// Summary of mapped categories
const humEvents = eventBreakdown.filter(r =>
  ['hum_complete', 'hum_start', 'hum_phase_complete'].includes(r.event)
).reduce((s, r) => s + r.cnt, 0);
const shareEvents = eventBreakdown.filter(r => r.event === 'share').reduce((s, r) => s + r.cnt, 0);
const installEvents = eventBreakdown.filter(r =>
  ['pwa_install', 'a2hs_tap', 'account_register'].includes(r.event)
).reduce((s, r) => s + r.cnt, 0);

console.log('\n  Category summary:');
console.log(`    Hum events (hum_complete/start):  ${humEvents}`);
console.log(`    Share events (share):             ${shareEvents}`);
console.log(`    Install/signup events:            ${installEvents}`);
console.log('========================================\n');

// ---------------------------------------------------------------------------
// 7. Geocode unique IPs → populate geo table via ip-api.com batch API
//    Free tier: 45 requests/minute, batch endpoint handles up to 100 IPs/request
// ---------------------------------------------------------------------------
async function populateGeo() {
  // Extract unique non-empty IPs from imported events
  const rows = db.prepare(
    "SELECT ip, COUNT(*) as cnt FROM events WHERE ip IS NOT NULL AND ip != '' GROUP BY ip"
  ).all();

  if (rows.length === 0) {
    console.log('No IPs found in events — skipping geo population.');
    return;
  }

  console.log(`\nGeocoding ${rows.length} unique IPs via ip-api.com…`);

  const ipCounts = {};
  for (const r of rows) ipCounts[r.ip] = r.cnt;
  const allIps = Object.keys(ipCounts);

  const insertGeo = db.prepare(
    'INSERT INTO geo (lat, lng, city, country, cnt) VALUES (?, ?, ?, ?, ?)'
  );
  const insertAll = db.transaction((geoRows) => {
    for (const g of geoRows) insertGeo.run(g.lat, g.lng, g.city, g.country, g.cnt);
  });

  const BATCH_SIZE = 100;
  const RATE_LIMIT_MS = Math.ceil(60000 / 45); // ~1334ms between requests (45 req/min)
  const geoResults = [];
  let resolved = 0;
  let failed = 0;

  for (let i = 0; i < allIps.length; i += BATCH_SIZE) {
    const batch = allIps.slice(i, i + BATCH_SIZE);

    // ip-api.com batch endpoint: POST http://ip-api.com/batch
    const body = JSON.stringify(batch.map(ip => ({ query: ip, fields: 'status,lat,lon,city,country,query' })));

    try {
      const res = await fetch('http://ip-api.com/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const results = await res.json();

      for (const r of results) {
        if (r.status === 'success' && r.lat && r.lon) {
          geoResults.push({
            lat: r.lat,
            lng: r.lon,
            city: r.city || 'Unknown',
            country: r.country || 'Unknown',
            cnt: ipCounts[r.query] || 1,
          });
          resolved++;
        } else {
          failed++;
        }
      }
    } catch (err) {
      console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err.message);
      failed += batch.length;
    }

    // Rate-limit: wait between batches
    if (i + BATCH_SIZE < allIps.length) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    }

    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allIps.length / BATCH_SIZE);
    console.log(`  Batch ${batchNum}/${totalBatches} — ${resolved} resolved, ${failed} failed`);
  }

  // Insert all geo results in one transaction
  if (geoResults.length > 0) {
    insertAll(geoResults);
  }

  const geoCount = db.prepare('SELECT COUNT(*) as cnt FROM geo').get().cnt;
  console.log('\n========================================');
  console.log('  GEO IMPORT COMPLETE');
  console.log('========================================');
  console.log(`  Unique IPs:      ${allIps.length}`);
  console.log(`  Resolved:        ${resolved}`);
  console.log(`  Failed:          ${failed}`);
  console.log(`  Geo rows in DB:  ${geoCount}`);
  console.log('========================================\n');
}

// Run geo population, then close DB
populateGeo()
  .catch(err => console.error('Geo population failed:', err.message))
  .finally(() => db.close());
