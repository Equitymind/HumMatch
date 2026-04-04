const fs = require('fs');

// Read existing songs from index.html
const html = fs.readFileSync('index.html', 'utf8');
const songMatches = html.match(/\{ title:'[^']+',\s+artist:'[^']+'/g) || [];
const existing = new Set();
songMatches.forEach(match => {
  const titleMatch = match.match(/title:'([^']+)'/);
  const artistMatch = match.match(/artist:'([^']+)'/);
  if (titleMatch && artistMatch) {
    const key = `${titleMatch[1].toLowerCase()}|||${artistMatch[1].toLowerCase()}`;
    existing.add(key);
  }
});

console.log(`Existing songs in database: ${existing.size}`);

// Read the 4 batch files
const batch1 = require('./new-songs-batch-1.json');
const batch2 = require('./new-songs-batch-2.json');
const batch3 = require('./new-songs-batch-3.json');
const batch4 = require('./new-songs-batch-4.json');

const allNew = [...batch1, ...batch2, ...batch3, ...batch4];
console.log(`New songs to add: ${allNew.length}`);

// Filter out duplicates
const unique = allNew.filter(song => {
  const key = `${song.title.toLowerCase()}|||${song.artist.toLowerCase()}`;
  return !existing.has(key);
});

console.log(`After deduplication: ${unique.length} truly new songs`);
console.log(`Duplicates removed: ${allNew.length - unique.length}`);

// Convert to JavaScript format
const jsLines = unique.map(s => {
  const title = s.title.replace(/'/g, "\\'");
  const artist = s.artist.replace(/'/g, "\\'");
  const year = s.year ? `, year:${s.year}` : '';
  return `  { title:'${title}', artist:'${artist}', lo:${s.lo}, hi:${s.hi}, brightness:${s.brightness}${year} }`;
});

const output = `  // ═══ ADDED ${unique.length} NEW SONGS (Batches 1-4: 1960s-2000s) ═══\n  ,${jsLines.join(',\n')}`;

fs.writeFileSync('songs-deduped.txt', output);
console.log('Written to songs-deduped.txt');
console.log(`Final total will be: ${existing.size + unique.length} songs`);
