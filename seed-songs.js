#!/usr/bin/env node
/**
 * Seed songs into production database
 * Usage: node seed-songs.js
 * 
 * Reads songs from index.html and upserts them into /data/hummatch.db
 * Safe to run multiple times (idempotent)
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Production DB path (matches server.js)
const DB_PATH = process.env.DB_PATH || path.join('/data', 'hummatch.db');
const HTML_PATH = path.join(__dirname, 'index.html');

console.log('🌱 HumMatch Song Seeder');
console.log(`Database: ${DB_PATH}`);
console.log(`Source: ${HTML_PATH}`);

// Ensure database exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  console.log(`Creating database directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

// Open database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Ensure songs table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    lo INTEGER NOT NULL,
    hi INTEGER NOT NULL,
    brightness INTEGER DEFAULT 50,
    year INTEGER,
    language TEXT DEFAULT 'en',
    slug TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create index if missing
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_songs_range ON songs(lo, hi)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_songs_language ON songs(language)');
} catch (e) {
  console.warn('Index creation warning:', e.message);
}

// Extract songs from index.html
console.log('\n📖 Reading songs from index.html...');

if (!fs.existsSync(HTML_PATH)) {
  console.error(`ERROR: ${HTML_PATH} not found!`);
  process.exit(1);
}

const html = fs.readFileSync(HTML_PATH, 'utf8');

// Find SONGS array
const startMarker = 'const SONGS = ';
const startIdx = html.indexOf(startMarker);
if (startIdx === -1) {
  console.error('ERROR: Could not find SONGS array in index.html');
  process.exit(1);
}

const arrayStart = startIdx + startMarker.length;

// Find matching closing bracket
let depth = 0;
let endIdx = -1;
for (let i = arrayStart; i < html.length; i++) {
  if (html[i] === '[') depth++;
  else if (html[i] === ']') {
    depth--;
    if (depth === 0) { endIdx = i; break; }
  }
}

if (endIdx === -1) {
  console.error('ERROR: Could not find end of SONGS array');
  process.exit(1);
}

const arrayContent = html.slice(arrayStart, endIdx + 1);

// Parse as JSON
let songs;
try {
  songs = JSON.parse(arrayContent);
} catch (e) {
  console.error('ERROR: Failed to parse SONGS array:', e.message);
  process.exit(1);
}

console.log(`✓ Extracted ${songs.length} songs from HTML`);

// Upsert songs
console.log('\n💾 Upserting songs into database...');

const upsertStmt = db.prepare(`
  INSERT INTO songs (title, artist, lo, hi, brightness, year, language, slug)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title,
    artist = excluded.artist,
    lo = excluded.lo,
    hi = excluded.hi,
    brightness = excluded.brightness,
    year = excluded.year,
    language = excluded.language
`);

let inserted = 0;
let updated = 0;
let errors = 0;

const upsertMany = db.transaction((songs) => {
  for (const song of songs) {
    try {
      const slug = `${song.title}-${song.artist}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      const info = upsertStmt.run(
        song.title,
        song.artist,
        song.lo,
        song.hi,
        song.brightness || 50,
        song.year || null,
        song.language || 'en',
        slug
      );
      
      if (info.changes === 1) {
        inserted++;
      } else {
        updated++;
      }
    } catch (e) {
      console.error(`  Error upserting "${song.title}" by ${song.artist}:`, e.message);
      errors++;
    }
  }
});

upsertMany(songs);

console.log('\n✅ Seeding complete!');
console.log(`  Inserted: ${inserted} new songs`);
console.log(`  Updated: ${updated} existing songs`);
if (errors > 0) {
  console.log(`  Errors: ${errors}`);
}

// Verify final count
const finalCount = db.prepare('SELECT COUNT(*) as cnt FROM songs').get().cnt;
const artistCount = db.prepare('SELECT COUNT(DISTINCT artist) as cnt FROM songs').get().cnt;
const enCount = db.prepare("SELECT COUNT(*) as cnt FROM songs WHERE language = 'en'").get().cnt;
const esCount = db.prepare("SELECT COUNT(*) as cnt FROM songs WHERE language = 'es'").get().cnt;

console.log('\n📊 Final database state:');
console.log(`  Total songs: ${finalCount}`);
console.log(`  Unique artists: ${artistCount}`);
console.log(`  English: ${enCount}`);
console.log(`  Spanish: ${esCount}`);

const samples = db.prepare('SELECT title, artist FROM songs LIMIT 5').all();
console.log('\n🎵 Sample songs:');
samples.forEach(s => console.log(`  - "${s.title}" by ${s.artist}`));

db.close();
console.log('\n✨ Done!');
