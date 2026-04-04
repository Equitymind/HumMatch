#!/usr/bin/env node
/**
 * Add Batch 10 and Batch 11 songs to database
 * Simpler than editing HTML - just insert into DB
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'hummatch.db');

console.log('🚀 Adding Batches 10 & 11 to database\n');

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
    language TEXT DEFAULT 'English',
    slug TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Load batches
const batch10 = JSON.parse(fs.readFileSync('new-songs-batch-10.json', 'utf8'));
const batch11 = JSON.parse(fs.readFileSync('new-songs-batch-11.json', 'utf8'));

console.log(`✓ Loaded Batch 10: ${batch10.length} songs`);
console.log(`✓ Loaded Batch 11: ${batch11.length} songs`);

const allNewSongs = [...batch10, ...batch11];
console.log(`\n📦 Total to add: ${allNewSongs.length} songs\n`);

// Upsert statement
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
let skipped = 0;

const upsertMany = db.transaction((songs) => {
  for (const song of songs) {
    const slug = `${song.title}-${song.artist}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    try {
      const before = db.prepare('SELECT COUNT(*) as cnt FROM songs WHERE slug = ?').get(slug).cnt;
      
      upsertStmt.run(
        song.title,
        song.artist,
        song.lo,
        song.hi,
        song.brightness || 50,
        song.year || null,
        song.language || 'English',
        slug
      );
      
      if (before === 0) {
        inserted++;
        console.log(`  ✓ Added: "${song.title}" by ${song.artist}`);
      } else {
        skipped++;
      }
    } catch (e) {
      console.error(`  ✗ Error: "${song.title}" - ${e.message}`);
      skipped++;
    }
  }
});

upsertMany(allNewSongs);

// Final stats
const finalCount = db.prepare('SELECT COUNT(*) as cnt FROM songs').get().cnt;
const artistCount = db.prepare('SELECT COUNT(DISTINCT artist) as cnt FROM songs').get().cnt;

console.log('\n✅ Complete!');
console.log(`  New songs added: ${inserted}`);
console.log(`  Duplicates skipped: ${skipped}`);
console.log(`  Total catalog: ${finalCount} songs`);
console.log(`  Unique artists: ${artistCount}`);

db.close();
