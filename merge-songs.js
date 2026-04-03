#!/usr/bin/env node
/**
 * HumMatch Song Merger - Combines all layers, deduplicates, validates
 * Run: node generate-songs.js && node generate-songs-2.js && node merge-songs.js
 */
const fs = require('fs');
const path = require('path');

// ── Load partials ──
const partial1 = JSON.parse(fs.readFileSync(path.join(__dirname, '_songs_partial_1.json'), 'utf8'));
const partial2 = JSON.parse(fs.readFileSync(path.join(__dirname, '_songs_partial_2.json'), 'utf8'));
const partial3 = fs.existsSync(path.join(__dirname, '_songs_partial_3.json'))
  ? JSON.parse(fs.readFileSync(path.join(__dirname, '_songs_partial_3.json'), 'utf8'))
  : [];

// ── Extract existing songs from index.html ──
function extractExistingSongs() {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const songs = [];
  const re = /\{\s*title:'([^']+)',\s*artist:'([^']+)'/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    songs.push({ title: m[1].replace(/\\'/g, "'"), artist: m[2].replace(/\\'/g, "'") });
  }
  return songs;
}

// ── Normalize for dedup ──
function normalizeKey(title, artist) {
  return (title + '|||' + artist)
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[^a-z0-9|]/g, '')
    .trim();
}

// ── Main ──
const existing = extractExistingSongs();
console.log(`Existing songs in index.html: ${existing.length}`);

const existingKeys = new Set(existing.map(s => normalizeKey(s.title, s.artist)));

// Combine all new songs
const allNew = [...partial1, ...partial2, ...partial3];
console.log(`Total new songs before dedup: ${allNew.length}`);

// Deduplicate against existing AND within new songs
const seenKeys = new Set();
const dedupedNew = [];
let dupCount = 0;
let invalidCount = 0;

for (const song of allNew) {
  // Validate required fields
  if (!song.title || !song.artist || !song.lo || !song.hi || !song.brightness) {
    invalidCount++;
    continue;
  }

  // Validate MIDI ranges
  if (song.lo < 30 || song.lo > 60 || song.hi < 50 || song.hi > 90) {
    invalidCount++;
    continue;
  }

  if (song.brightness < 0 || song.brightness > 100) {
    invalidCount++;
    continue;
  }

  const key = normalizeKey(song.title, song.artist);

  if (existingKeys.has(key) || seenKeys.has(key)) {
    dupCount++;
    continue;
  }

  seenKeys.add(key);

  // Clean up undefined fields
  const clean = { title: song.title, artist: song.artist, lo: song.lo, hi: song.hi, brightness: song.brightness };
  if (song.year) clean.year = song.year;
  if (song.tags && song.tags.length > 0) clean.tags = song.tags;

  dedupedNew.push(clean);
}

console.log(`\nDedup results:`);
console.log(`  Duplicates removed: ${dupCount}`);
console.log(`  Invalid entries removed: ${invalidCount}`);
console.log(`  New unique songs: ${dedupedNew.length}`);
console.log(`  Total catalog (existing + new): ${existing.length + dedupedNew.length}`);

// ── Write output ──
fs.writeFileSync(
  path.join(__dirname, 'hummatch-new-songs.json'),
  JSON.stringify(dedupedNew, null, 2)
);
console.log(`\nWritten to hummatch-new-songs.json`);

// ── Generate stats ──
console.log('\n═══════════════════════════════════════════════');
console.log('SUMMARY STATISTICS');
console.log('═══════════════════════════════════════════════');

// Vocal range distribution
const rangeGroups = { 'Bass (lo<42)': 0, 'Baritone (42-44)': 0, 'Tenor (45-48)': 0, 'Alto/Mezzo (48-52)': 0, 'Soprano (52+)': 0 };
for (const s of dedupedNew) {
  if (s.lo < 42) rangeGroups['Bass (lo<42)']++;
  else if (s.lo <= 44) rangeGroups['Baritone (42-44)']++;
  else if (s.lo <= 48) rangeGroups['Tenor (45-48)']++;
  else if (s.lo <= 52) rangeGroups['Alto/Mezzo (48-52)']++;
  else rangeGroups['Soprano (52+)']++;
}
console.log('\nVocal Range Distribution (new songs):');
for (const [range, count] of Object.entries(rangeGroups)) {
  const pct = ((count / dedupedNew.length) * 100).toFixed(1);
  console.log(`  ${range}: ${count} (${pct}%)`);
}

// Era distribution
const eras = { 'Pre-1960': 0, '1960s': 0, '1970s': 0, '1980s': 0, '1990s': 0, '2000s': 0, '2010s': 0, '2020s': 0, 'No year': 0 };
for (const s of dedupedNew) {
  if (!s.year) eras['No year']++;
  else if (s.year < 1960) eras['Pre-1960']++;
  else if (s.year < 1970) eras['1960s']++;
  else if (s.year < 1980) eras['1970s']++;
  else if (s.year < 1990) eras['1980s']++;
  else if (s.year < 2000) eras['1990s']++;
  else if (s.year < 2010) eras['2000s']++;
  else if (s.year < 2020) eras['2010s']++;
  else eras['2020s']++;
}
console.log('\nEra Distribution:');
for (const [era, count] of Object.entries(eras)) {
  const pct = ((count / dedupedNew.length) * 100).toFixed(1);
  console.log(`  ${era}: ${count} (${pct}%)`);
}

// Spanish/Latin count
const latinCount = dedupedNew.filter(s => s.tags && s.tags.includes('latin')).length;
console.log(`\nSpanish/Latin tagged: ${latinCount}`);

// Brightness distribution
const brightGroups = { 'Dark (0-40)': 0, 'Medium (41-55)': 0, 'Bright (56-70)': 0, 'Very Bright (71+)': 0 };
for (const s of dedupedNew) {
  if (s.brightness <= 40) brightGroups['Dark (0-40)']++;
  else if (s.brightness <= 55) brightGroups['Medium (41-55)']++;
  else if (s.brightness <= 70) brightGroups['Bright (56-70)']++;
  else brightGroups['Very Bright (71+)']++;
}
console.log('\nBrightness Distribution:');
for (const [group, count] of Object.entries(brightGroups)) {
  const pct = ((count / dedupedNew.length) * 100).toFixed(1);
  console.log(`  ${group}: ${count} (${pct}%)`);
}

// Top artists
const artistCounts = {};
for (const s of dedupedNew) {
  const a = s.artist.split(' ft.')[0].split(' feat')[0].split(' /')[0].split(' &')[0].trim();
  artistCounts[a] = (artistCounts[a] || 0) + 1;
}
const topArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]).slice(0, 20);
console.log('\nTop 20 Artists (new songs):');
for (const [artist, count] of topArtists) {
  console.log(`  ${artist}: ${count}`);
}

console.log('\n═══════════════════════════════════════════════');
console.log('MERGE INSTRUCTIONS');
console.log('═══════════════════════════════════════════════');
console.log(`
To merge into index.html:

1. Read hummatch-new-songs.json
2. Convert each song to the SONGS array format:
   { title:'Title', artist:'Artist', lo:XX, hi:XX, brightness:XX, year:YYYY }
3. Insert before the closing "];" of the SONGS array (line ~2411)
4. The JSON format maps directly:
   - title -> title (escape single quotes)
   - artist -> artist (escape single quotes)
   - lo, hi, brightness, year -> same
   - tags -> tags (optional)

Quick merge script:
  const songs = JSON.parse(fs.readFileSync('hummatch-new-songs.json'));
  const lines = songs.map(s => {
    let line = "  { title:'" + s.title.replace(/'/g, "\\\\'") + "', ";
    line += "artist:'" + s.artist.replace(/'/g, "\\\\'") + "', ";
    line += "lo:" + s.lo + ", hi:" + s.hi + ", brightness:" + s.brightness;
    if (s.year) line += ", year:" + s.year;
    if (s.tags) line += ", tags:['" + s.tags.join("','") + "']";
    line += " },";
    return line;
  });
  console.log(lines.join('\\n'));
`);

// Clean up temp files
try { fs.unlinkSync(path.join(__dirname, '_songs_partial_1.json')); } catch(e) {}
try { fs.unlinkSync(path.join(__dirname, '_songs_partial_2.json')); } catch(e) {}
try { fs.unlinkSync(path.join(__dirname, '_songs_partial_3.json')); } catch(e) {}
console.log('\nCleaned up temp files.');
console.log('Done!');
