#!/usr/bin/env node
/**
 * Fix vocal ranges for top 250 songs (13 artists)
 * Updates index.html with researched accurate ranges
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
const rangesPath = path.join(__dirname, 'artist-vocal-ranges-top250.json');

// Load researched ranges
const { artists } = JSON.parse(fs.readFileSync(rangesPath, 'utf8'));

// Create lookup map
const rangeMap = {};
artists.forEach(a => {
  rangeMap[a.name] = { lo: a.loMIDI, hi: a.hiMIDI };
});

console.log('🎵 Fixing vocal ranges for top 250 songs...\n');
console.log('Artists to update:', Object.keys(rangeMap).length);
console.log('');

// Read index.html
let html = fs.readFileSync(htmlPath, 'utf8');

// Extract SONGS array
const start = html.indexOf('const SONGS = ') + 'const SONGS = '.length;
let depth = 0, end = -1;
for (let i = start; i < html.length; i++) {
  if (html[i] === '[') depth++;
  else if (html[i] === ']') {
    depth--;
    if (depth === 0) { end = i; break; }
  }
}

const arrText = html.slice(start, end + 1);
const songs = JSON.parse(arrText);

// Update songs
let updated = 0;
songs.forEach(song => {
  if (rangeMap[song.artist]) {
    const { lo, hi } = rangeMap[song.artist];
    if (song.lo !== lo || song.hi !== hi) {
      console.log(`Updating "${song.title}" by ${song.artist}: ${song.lo}-${song.hi} → ${lo}-${hi}`);
      song.lo = lo;
      song.hi = hi;
      updated++;
    }
  }
});

console.log('');
console.log(`✅ Updated ${updated} songs`);

// Write back
const newArrText = JSON.stringify(songs, null, 2);
const newHtml = html.slice(0, start) + newArrText + html.slice(end + 1);

fs.writeFileSync(htmlPath, newHtml, 'utf8');

console.log('✅ index.html updated successfully!');
console.log('');
console.log('Next steps:');
console.log('1. git add index.html artist-vocal-ranges-top250.json');
console.log('2. git commit -m "Fix vocal ranges for top 250 songs (13 artists)"');
console.log('3. git push');
console.log('4. Deploy to Render');
console.log('5. TEST!');
