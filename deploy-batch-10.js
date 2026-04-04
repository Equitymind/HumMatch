const fs = require('fs');

console.log('🚀 Deploying Batch 10...\n');

// Load batch 10
const batch10 = JSON.parse(fs.readFileSync('new-songs-batch-10.json', 'utf8'));
console.log(`✓ Loaded Batch 10: ${batch10.length} songs`);

// Load existing HTML
const html = fs.readFileSync('index.html', 'utf8');
console.log(`✓ Loaded index.html: ${(html.length / 1024).toFixed(0)}KB`);

// Extract existing songs
const match = html.match(/const SONGS = \[([\s\S]*?)\];/);
if (!match) {
  console.error('❌ Could not find SONGS array in HTML');
  process.exit(1);
}

const songsStr = '[' + match[1] + ']';
const existingSongs = JSON.parse(songsStr);
console.log(`✓ Parsed existing catalog: ${existingSongs.length} songs`);

// Filter duplicates
const existing = new Set(
  existingSongs.map(s => `${s.title.toLowerCase()}|${s.artist.toLowerCase()}`)
);

const uniqueSongs = batch10.filter(s => 
  !existing.has(`${s.title.toLowerCase()}|${s.artist.toLowerCase()}`)
);

console.log(`\n📊 Duplicate Check:`);
console.log(`   Total in Batch 10: ${batch10.length}`);
console.log(`   Duplicates found: ${batch10.length - uniqueSongs.length}`);
console.log(`   Unique to add: ${uniqueSongs.length}`);

if (uniqueSongs.length === 0) {
  console.log('\n⚠️  No unique songs to add. Exiting.');
  process.exit(0);
}

// Combine and sort
const allSongs = [...existingSongs, ...uniqueSongs];
allSongs.sort((a, b) => {
  const artistCmp = a.artist.localeCompare(b.artist);
  return artistCmp !== 0 ? artistCmp : a.title.localeCompare(b.title);
});

console.log(`\n✓ Combined catalog: ${allSongs.length} songs`);

// Replace in HTML
const songsJson = JSON.stringify(allSongs, null, 2);
const newHtml = html.replace(
  /const SONGS = \[([\s\S]*?)\];/,
  'const SONGS = ' + songsJson + ';'
);

// Write updated file
fs.writeFileSync('index.html', newHtml);
console.log(`\n✅ Deployed! Added ${uniqueSongs.length} songs`);
console.log(`📦 Total catalog: ${allSongs.length} songs`);
