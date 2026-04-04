const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Batches 10 & 11\n');

// Read batch files
const batch10Path = path.join(__dirname, 'new-songs-batch-10.json');
const batch11Path = path.join(__dirname, 'new-songs-batch-11.json');

let batch10, batch11;

try {
  const b10Text = fs.readFileSync(batch10Path, 'utf8');
  // Handle both JSON formats (single/double quotes)
  batch10 = JSON.parse(b10Text.replace(/'/g, '"').replace(/(\w+):/g, '"$1":'));
  console.log(`✓ Batch 10: ${batch10.length} songs`);
} catch (e) {
  console.error('Could not load Batch 10:', e.message);
  batch10 = [];
}

try {
  batch11 = JSON.parse(fs.readFileSync(batch11Path, 'utf8'));
  console.log(`✓ Batch 11: ${batch11.length} songs`);
} catch (e) {
  console.error('Could not load Batch 11:', e.message);
  batch11 = [];
}

const newSongs = [...batch10, ...batch11];
console.log(`📦 Total new songs: ${newSongs.length}\n`);

if (newSongs.length === 0) {
  console.log('❌ No songs to deploy!');
  process.exit(1);
}

// Read and parse index.html
const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const startMarker = 'const SONGS = ';
const startIdx = html.indexOf(startMarker);
const arrayStart = startIdx + startMarker.length;

// Find matching closing bracket
let depth = 0;
let endIdx = -1;
for (let i = arrayStart; i < html.length; i++) {
  if (html[i] === '[') depth++;
  else if (html[i] === ']') {
    depth--;
    if (depth === 0) {
      endIdx = i;
      break;
    }
  }
}

const arrayContent = html.slice(arrayStart, endIdx + 1);
const existingSongs = JSON.parse(arrayContent);
console.log(`✓ Current catalog: ${existingSongs.length} songs`);

// Filter duplicates
const existing = new Set(
  existingSongs.map(s => `${s.title.toLowerCase()}|${s.artist.toLowerCase()}`)
);

const uniqueSongs = newSongs.filter(s =>
  !existing.has(`${s.title.toLowerCase()}|${s.artist.toLowerCase()}`)
);

console.log(`\n📊 Deduplication:`);
console.log(`   Duplicates: ${newSongs.length - uniqueSongs.length}`);
console.log(`   Unique: ${uniqueSongs.length}`);

if (uniqueSongs.length === 0) {
  console.log('\n⚠️  All songs already exist!');
  process.exit(0);
}

// Combine and sort
const allSongs = [...existingSongs, ...uniqueSongs].sort((a, b) => {
  const cmp = a.artist.localeCompare(b.artist);
  return cmp !== 0 ? cmp : a.title.localeCompare(b.title);
});

// Replace in HTML
const newHtml =
  html.slice(0, arrayStart) +
  JSON.stringify(allSongs, null, 2) +
  html.slice(endIdx + 1);

fs.writeFileSync(htmlPath, newHtml);

console.log(`\n✅ Deployed!`);
console.log(`   Added: ${uniqueSongs.length} songs`);
console.log(`   Total: ${allSongs.length} songs`);
