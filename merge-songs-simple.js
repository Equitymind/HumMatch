const fs = require('fs');

const batch1 = require('./new-songs-batch-1.json');
const batch2 = require('./new-songs-batch-2.json');
const batch3 = require('./new-songs-batch-3.json');
const batch4 = require('./new-songs-batch-4.json');

const all = [...batch1, ...batch2, ...batch3, ...batch4];

console.log(`Total: ${all.length} songs`);

// Write as valid JSON
fs.writeFileSync('songs-merged-400.json', JSON.stringify(all, null, 2));

// Also write as JavaScript format ready to insert
const jsFormat = all.map(s => {
  const title = s.title.replace(/'/g, "\\'");
  const artist = s.artist.replace(/'/g, "\\'");
  const year = s.year ? `, year:${s.year}` : '';
  return `  { title:'${title}', artist:'${artist}', lo:${s.lo}, hi:${s.hi}, brightness:${s.brightness}${year} }`;
}).join(',\n');

fs.writeFileSync('songs-insert.txt', `// Added ${all.length} songs - Batch 1-4 (1960s-2000s)\n` + jsFormat);
console.log('Written songs-insert.txt');
