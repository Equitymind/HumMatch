const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Batches 21 & 22 (Latin + Español)\n');

// Read batch files
const batch21Path = path.join(__dirname, 'batch-21.json');
const batch22Path = path.join(__dirname, 'batch-22.json');

let batch21, batch22;

try {
  batch21 = JSON.parse(fs.readFileSync(batch21Path, 'utf8'));
  console.log(`✓ Batch 21 (Latin): ${batch21.length} songs`);
} catch (e) {
  console.error('Could not load Batch 21:', e.message);
  batch21 = [];
}

try {
  batch22 = JSON.parse(fs.readFileSync(batch22Path, 'utf8'));
  console.log(`✓ Batch 22 (Español): ${batch22.length} songs`);
} catch (e) {
  console.error('Could not load Batch 22:', e.message);
  batch22 = [];
}

const newSongs = [...batch21, ...batch22];
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
