const fs = require('fs');

// Read all batch files
const batch1 = JSON.parse(fs.readFileSync('new-songs-batch-1.json', 'utf8'));
const batch2 = JSON.parse(fs.readFileSync('new-songs-batch-2.json', 'utf8'));
const batch3 = JSON.parse(fs.readFileSync('new-songs-batch-3.json', 'utf8'));
const batch4 = JSON.parse(fs.readFileSync('new-songs-batch-4.json', 'utf8'));

// Merge all songs
const allSongs = [...batch1, ...batch2, ...batch3, ...batch4];

console.log(`Merged ${allSongs.length} songs from 4 batches`);
console.log(`Batch 1: ${batch1.length}`);
console.log(`Batch 2: ${batch2.length}`);
console.log(`Batch 3: ${batch3.length}`);
console.log(`Batch 4: ${batch4.length}`);

// Write merged file
fs.writeFileSync('songs-to-add-400.json', JSON.stringify(allSongs, null, 2));
console.log('Written to songs-to-add-400.json');
