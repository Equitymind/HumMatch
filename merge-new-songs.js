#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');
const newSongsPath = path.join(__dirname, 'new-songs-batch.json');
const backupPath = path.join(__dirname, 'index.html.backup-before-merge');

// Read new songs
const newSongs = JSON.parse(fs.readFileSync(newSongsPath, 'utf8'));
console.log(`📥 Loaded ${newSongs.length} new songs`);

// Read index.html
let html = fs.readFileSync(indexPath, 'utf8');

// Backup
fs.writeFileSync(backupPath, html, 'utf8');
console.log('✅ Backup created');

// Extract current SONGS array
const songsMatch = html.match(/const SONGS = (\[[\s\S]*?\]);/);
if (!songsMatch) {
  console.error('❌ Could not find SONGS array');
  process.exit(1);
}

let songs = JSON.parse(songsMatch[1]);
console.log(`📊 Current: ${songs.length} songs`);

// Deduplicate
const existing = new Set(songs.map(s => `${s.title}::${s.artist}`.toLowerCase()));
let added = 0;
let skipped = 0;

for (const song of newSongs) {
  const key = `${song.title}::${song.artist}`.toLowerCase();
  if (!existing.has(key)) {
    songs.push(song);
    existing.add(key);
    added++;
  } else {
    skipped++;
  }
}

console.log(`✅ Added ${added} new songs`);
console.log(`⏭  Skipped ${skipped} duplicates`);
console.log(`📊 Total: ${songs.length} songs`);

// Write back
const newSongsStr = JSON.stringify(songs, null, 2);
const newHtml = html.replace(/const SONGS = \[[\s\S]*?\];/, `const SONGS = ${newSongsStr};`);

fs.writeFileSync(indexPath, newHtml, 'utf8');
console.log('💾 index.html updated');
