const fs = require('fs');

// Read existing songs from index.html
const html = fs.readFileSync('index.html', 'utf8');
const songMatches = html.match(/title:'([^']+)'[^}]+artist:'([^']+)'/g) || [];
const existing = new Set();
let existingCount = 0;

// Also match JSON-style double-quoted format
const jsonMatches = html.match(/"title":"([^"]+)"[^}]+"artist":"([^"]+)"/g) || [];

songMatches.forEach(match => {
  const titleMatch = match.match(/title:'([^']+)'/);
  const artistMatch = match.match(/artist:'([^']+)'/);
  if (titleMatch && artistMatch) {
    existing.add(`${titleMatch[1].toLowerCase()}|||${artistMatch[1].toLowerCase()}`);
    existingCount++;
  }
});

jsonMatches.forEach(match => {
  const titleMatch = match.match(/"title":"([^"]+)"/);
  const artistMatch = match.match(/"artist":"([^"]+)"/);
  if (titleMatch && artistMatch) {
    existing.add(`${titleMatch[1].toLowerCase()}|||${artistMatch[1].toLowerCase()}`);
    existingCount++;
  }
});

console.log(`Existing songs in index.html: ${existing.size}`);

// Read all 5 Spanish expansion batches
const allNew = [];
for (let i = 1; i <= 5; i++) {
  const batch = require(`./spanish-expansion-batch-${i}.json`);
  allNew.push(...batch);
  console.log(`  Batch ${i}: ${batch.length} songs`);
}
console.log(`Total new songs to process: ${allNew.length}`);

// Filter out duplicates
const unique = allNew.filter(song => {
  const key = `${song.title.toLowerCase()}|||${song.artist.toLowerCase()}`;
  return !existing.has(key);
});

console.log(`After deduplication: ${unique.length} truly new songs`);
console.log(`Duplicates removed: ${allNew.length - unique.length}`);

// Convert to JavaScript format (JSON with double quotes, no tags)
const jsLines = unique.map(s => {
  const title = s.title.replace(/\\/g, '\\\\');
  const artist = s.artist.replace(/\\/g, '\\\\');
  const year = s.year ? `,"year":${s.year}` : '';
  return `    {"title":${JSON.stringify(title)},"artist":${JSON.stringify(artist)},"lo":${s.lo},"hi":${s.hi},"brightness":${s.brightness}${year}}`;
});

const insertBlock = `\n    // ═══ SPANISH EXPANSION: ${unique.length} new songs (Reggaeton, Regional Mexican, Rock en Español, Salsa, Bachata, Cumbia, Corridos, Vallenato, Merengue, Indie Latino, Latin Jazz) ═══\n` + jsLines.join(',\n') + ',\n';

// Find insertion point: just before the closing ]; of the song catalog
// The catalog ends at the line with ]; after all the songs
const insertMarker = '\n];';
const markerIndex = html.lastIndexOf('\n];');
if (markerIndex === -1) {
  console.error('Could not find insertion point!');
  process.exit(1);
}

const newHtml = html.slice(0, markerIndex) + insertBlock + html.slice(markerIndex);
fs.writeFileSync('index.html', newHtml);

console.log(`\n✓ Inserted ${unique.length} new Spanish songs into index.html`);
console.log(`  Final catalog size: ~${existing.size + unique.length} songs`);
