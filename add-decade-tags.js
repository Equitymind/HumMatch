#!/usr/bin/env node
/**
 * Add decade tags to all songs (merge decades into genres)
 * Makes filtering simpler - one tag system instead of two!
 */

const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');
const backupPath = path.join(__dirname, 'index.html.before-decade-tags');

console.log('📖 Reading index.html...');
let html = fs.readFileSync(indexPath, 'utf8');

// Backup
fs.writeFileSync(backupPath, html, 'utf8');
console.log('✅ Backup saved to index.html.before-decade-tags');

// Extract SONGS array
const songsMatch = html.match(/const SONGS = (\[[\s\S]*?\]);/);
if (!songsMatch) {
  console.error('❌ Could not find SONGS array');
  process.exit(1);
}

let songs = JSON.parse(songsMatch[1]);
console.log(`✅ Loaded ${songs.length} songs`);

// Add decade tag based on year
let updated = 0;
let skipped = 0;

for (const song of songs) {
  if (!song.year) {
    skipped++;
    continue;
  }
  
  // Determine decade
  let decade;
  if (song.year >= 2020) decade = '2020s';
  else if (song.year >= 2010) decade = '2010s';
  else if (song.year >= 2000) decade = '2000s';
  else if (song.year >= 1990) decade = '90s';
  else if (song.year >= 1980) decade = '80s';
  else if (song.year >= 1970) decade = '70s';
  else if (song.year >= 1960) decade = '60s';
  else if (song.year >= 1950) decade = '50s';
  else decade = 'classic';
  
  // Initialize tags if missing
  if (!song.tags) song.tags = [];
  
  // Add decade if not already present
  if (!song.tags.includes(decade)) {
    song.tags.push(decade);
    updated++;
  }
}

console.log(`\n✅ Updated ${updated} songs with decade tags`);
console.log(`⏭  Skipped ${skipped} songs (no year)`);

// Write back to index.html
const newSongsStr = JSON.stringify(songs, null, 2);
const newHtml = html.replace(
  /const SONGS = \[[\s\S]*?\];/,
  `const SONGS = ${newSongsStr};`
);

fs.writeFileSync(indexPath, newHtml, 'utf8');
console.log(`\n🎉 Done! index.html updated with decade tags`);
console.log(`\nNow genres include: pop, rock, 80s, 90s, etc. (unified!)`);
