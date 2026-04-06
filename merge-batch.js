#!/usr/bin/env node
const fs = require('fs');

const batchNum = process.argv[2];
if (!batchNum) {
  console.error('Usage: node merge-batch.js <batch-number>');
  process.exit(1);
}

const batchFile = `batch-${batchNum}.json`;
if (!fs.existsSync(batchFile)) {
  console.error(`File ${batchFile} not found`);
  process.exit(1);
}

const batch = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
let html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/const SONGS = (\[[\s\S]*?\]);/);
if (!match) {
  console.error('SONGS array not found in index.html');
  process.exit(1);
}

const songs = JSON.parse(match[1]);
songs.push(...batch);
html = html.replace(/const SONGS = \[[\s\S]*?\];/, 'const SONGS = ' + JSON.stringify(songs, null, 2) + ';');
fs.writeFileSync('index.html', html);
console.log(`✅ Merged batch-${batchNum}.json into index.html. Total songs: ${songs.length}`);
