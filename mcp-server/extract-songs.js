#!/usr/bin/env node
/**
 * Extracts the SONGS array from index.html and writes songs.json
 * Run: node extract-songs.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'index.html');
const outPath = path.join(__dirname, 'songs.json');

if (!fs.existsSync(htmlPath)) {
  if (fs.existsSync(outPath)) {
    console.log('index.html not found — using existing songs.json');
    process.exit(0);
  }
  throw new Error('index.html not found and songs.json does not exist');
}

const html = fs.readFileSync(htmlPath, 'utf8');

// Find the SONGS array declaration
const startMarker = 'const SONGS = ';
const startIdx = html.indexOf(startMarker);
if (startIdx === -1) throw new Error('Could not find SONGS array in index.html');

const arrayStart = startIdx + startMarker.length; // position of '['

// Find the matching closing bracket
let depth = 0;
let endIdx = -1;
for (let i = arrayStart; i < html.length; i++) {
  if (html[i] === '[') depth++;
  else if (html[i] === ']') {
    depth--;
    if (depth === 0) { endIdx = i; break; }
  }
}
if (endIdx === -1) throw new Error('Could not find end of SONGS array');

const arrayContent = html.slice(arrayStart, endIdx + 1);
const code = `var SONGS = ${arrayContent}`;

const sandbox = {};
vm.runInNewContext(code, sandbox);

const songs = sandbox.SONGS;
if (!Array.isArray(songs) || songs.length === 0) {
  throw new Error('Failed to parse SONGS array');
}

fs.writeFileSync(outPath, JSON.stringify(songs));
console.log(`✓ Extracted ${songs.length} songs → songs.json`);
