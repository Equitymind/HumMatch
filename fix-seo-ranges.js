#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load verified artists
const verifiedArtists = JSON.parse(
  fs.readFileSync('./artist-vocal-ranges-all.json', 'utf-8')
);

// Create lookup map for O(1) artist lookup
const artistLookup = new Map(
  verifiedArtists.map((artist) => [artist.artist.toLowerCase(), artist])
);

// Convert MIDI to note name helper
function midiToNote(midi) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteName = notes[midi % 12];
  return noteName + octave;
}

// Calculate semitone span
function calculateSpan(lo, hi) {
  return hi - lo;
}

// Get difficulty rating
function getDifficulty(span) {
  if (span <= 12) return 'Easy';
  if (span <= 18) return 'Medium';
  if (span <= 24) return 'Hard';
  return 'Very Hard';
}

// Get difficulty color
function getDiffColor(span) {
  if (span <= 12) return '#4ade80'; // green
  if (span <= 18) return '#facc15'; // yellow
  if (span <= 24) return '#ef4444'; // red
  return '#6366f1'; // indigo for very hard
}

// Get difficulty emoji
function getDiffEmoji(span) {
  if (span <= 12) return '🟢';
  if (span <= 18) return '🟡';
  if (span <= 24) return '🔴';
  return '🟣';
}

// Helper to escape HTML special chars
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Extract artist name from HTML
function extractArtist(html) {
  // Try to get from the breadcrumb link to artist page
  const match = html.match(/href="\/artist\/([^"]+)"/);
  if (match) {
    // Convert kebab-case to Title Case
    return match[1]
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return null;
}

// Create stats grid HTML
function createStatsGrid(artist) {
  const data = artistLookup.get(artist.toLowerCase());
  if (!data) return null;

  const span = calculateSpan(data.lo, data.hi);
  const difficulty = getDifficulty(span);
  const diffColor = getDiffColor(span);
  const diffEmoji = getDiffEmoji(span);

  return `  <div class="stats-grid">
    <div class="stat">
      <div class="stat-label">Low Note</div>
      <div class="stat-val">${data.loNote}</div>
      <div class="stat-sub">MIDI ${data.lo}</div>
    </div>
    <div class="stat">
      <div class="stat-label">High Note</div>
      <div class="stat-val">${data.hiNote}</div>
      <div class="stat-sub">MIDI ${data.hi}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Span</div>
      <div class="stat-val">${span}</div>
      <div class="stat-sub">semitones</div>
    </div>
    <div class="stat">
      <div class="stat-label">Difficulty</div>
      <div class="stat-val" style="color:${diffColor}">${difficulty}</div>
      <div class="stat-sub">${diffEmoji}</div>
    </div>
  </div>`;
}

// Create range breakdown HTML
function createRangeBreakdown(songTitle, artist) {
  const data = artistLookup.get(artist.toLowerCase());
  if (!data) return null;

  const span = calculateSpan(data.lo, data.hi);
  const octaves = (span / 12).toFixed(1);
  const difficulty = getDifficulty(span);
  const diffColor = getDiffColor(span);
  const diffEmoji = getDiffEmoji(span);

  // Calculate bar position (relative to full MIDI range 24-96)
  const minMidi = 24;
  const maxMidi = 96;
  const totalRange = maxMidi - minMidi;
  const leftPercent = Math.round(((data.lo - minMidi) / totalRange) * 100);
  const widthPercent = Math.round((span / totalRange) * 100);

  return `  <div class="section">
    <h2>Vocal Range Breakdown</h2>
    <div class="range-card">
      <p class="range-desc">
        <strong>${escapeHtml(songTitle)}</strong> spans <strong>${span} semitones</strong> —
        from <strong style="color:var(--purple)">${data.loNote}</strong>
        to <strong style="color:var(--pink)">${data.hiNote}</strong>
        (${octaves} octaves).
      </p>
      <div class="range-track">
        <span class="range-note">${data.loNote}</span>
        <div class="range-bg">
          <div class="range-fill" style="left:${leftPercent}%; width:${widthPercent}%;"></div>
        </div>
        <span class="range-note">${data.hiNote}</span>
      </div>
      <div>
        <span class="diff-pill" style="background:${diffColor}1a; border:1px solid ${diffColor}40; color:${diffColor}">
          ${diffEmoji} ${difficulty} — ${getDiffDescription(difficulty)}
        </span>
      </div>
    </div>
  </div>`;
}

function getDiffDescription(difficulty) {
  switch (difficulty) {
    case 'Easy':
      return 'Perfect for beginners';
    case 'Medium':
      return 'Good for intermediate singers';
    case 'Hard':
      return 'Demanding range — best for experienced singers.';
    case 'Very Hard':
      return 'Professional range — advanced singers only.';
    default:
      return '';
  }
}

// Create "coming soon" message
function createComingSoonMessage() {
  return `  <div class="section">
    <div style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.2);border-radius:14px;padding:20px 24px;text-align:center;color:var(--muted)">
      <p style="margin:0;font-size:0.95rem">Vocal range data coming soon</p>
    </div>
  </div>`;
}

// Find and replace section using proper div matching
function replaceSection(html, startMarker, newHtml) {
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return html;

  let divCount = 1;
  let idx = startIdx + startMarker.length;

  while (divCount > 0 && idx < html.length) {
    const openDiv = html.indexOf('<div', idx);
    const closeDiv = html.indexOf('</div>', idx);

    if (closeDiv === -1) break;
    if (openDiv !== -1 && openDiv < closeDiv) {
      divCount++;
      idx = openDiv + 4;
    } else {
      divCount--;
      if (divCount === 0) {
        const endIdx = closeDiv + 6;
        return html.substring(0, startIdx) + newHtml + html.substring(endIdx);
      }
      idx = closeDiv + 6;
    }
  }
  return html;
}

// Find and replace stats grid using proper div matching
function replaceStatsGrid(html, newHtml) {
  return replaceSection(html, '<div class="stats-grid">', newHtml);
}

// Process HTML file
function processFile(filePath, isSpanish = false) {
  let html = fs.readFileSync(filePath, 'utf-8');
  const artist = extractArtist(html);

  if (!artist) return null;

  const isVerified = artistLookup.has(artist.toLowerCase());
  let updated = html;

  // Extract song title
  const titleMatch = html.match(/<h1>(.*?)<\/h1>/);
  const songTitle = titleMatch ? titleMatch[1] : 'Song';

  // Find the range breakdown section marker
  const rangeMarker = '<div class="section">\n    <h2>Vocal Range Breakdown</h2>';
  const rangeMarkerAlt = '<div class="section">\n  <h2>Vocal Range Breakdown</h2>';

  if (isVerified) {
    // Update stats grid
    const newStats = createStatsGrid(artist);
    updated = replaceStatsGrid(updated, newStats);

    // Update range breakdown using proper div matching
    const newRange = createRangeBreakdown(songTitle, artist);
    if (updated.indexOf(rangeMarker) !== -1) {
      updated = replaceSection(updated, rangeMarker, newRange);
    } else if (updated.indexOf(rangeMarkerAlt) !== -1) {
      updated = replaceSection(updated, rangeMarkerAlt, newRange);
    }

    return { updated, action: 'updated' };
  } else {
    // Remove stats grid
    updated = replaceStatsGrid(updated, '');

    // Remove or replace range breakdown section
    const comingSoon = createComingSoonMessage();
    if (updated.indexOf(rangeMarker) !== -1) {
      updated = replaceSection(updated, rangeMarker, comingSoon);
    } else if (updated.indexOf(rangeMarkerAlt) !== -1) {
      updated = replaceSection(updated, rangeMarkerAlt, comingSoon);
    }

    return { updated, action: 'removed' };
  }
}

// Process directory with batch file I/O
function processDirectory(dirPath, isSpanish = false) {
  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.html'));

  console.log(`Processing ${files.length} files in ${dirPath}...`);

  let updated = 0;
  let removed = 0;

  // Process in batches
  const batchSize = 50;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    batch.forEach((file) => {
      const filePath = path.join(dirPath, file);
      try {
        const result = processFile(filePath, isSpanish);
        if (result) {
          fs.writeFileSync(filePath, result.updated, 'utf-8');
          if (result.action === 'updated') {
            updated++;
          } else {
            removed++;
          }
        }
      } catch (err) {
        console.error(`Error processing ${file}: ${err.message}`);
      }
    });

    // Progress indicator
    const processed = Math.min(i + batchSize, files.length);
    console.log(`  ${processed}/${files.length} files processed...`);
  }

  return { updated, removed };
}

// Main
console.log('🎵 HumMatch Vocal Range Data Fixer');
console.log('===================================\n');

const enDir = './song';
const esDir = './es/cancion';

if (!fs.existsSync(enDir)) {
  console.error(`Error: ${enDir} directory not found`);
  process.exit(1);
}

console.log(`Loaded ${verifiedArtists.length} verified artists\n`);

// Process English pages
console.log('📁 Processing English pages (/song/):');
const enResults = processDirectory(enDir, false);
console.log(`   ✅ Updated: ${enResults.updated} pages`);
console.log(`   ❌ Removed ranges: ${enResults.removed} pages\n`);

// Process Spanish pages if directory exists
let esResults = { updated: 0, removed: 0 };
if (fs.existsSync(esDir)) {
  console.log('📁 Processing Spanish pages (/es/cancion/):');
  esResults = processDirectory(esDir, true);
  console.log(`   ✅ Updated: ${esResults.updated} pages`);
  console.log(`   ❌ Removed ranges: ${esResults.removed} pages\n`);
}

// Summary
console.log('===================================');
console.log('📊 Summary');
console.log('===================================');
console.log(`Total verified artists: ${verifiedArtists.length}`);
console.log(`Pages updated with verified data: ${enResults.updated + esResults.updated}`);
console.log(`Pages with ranges removed: ${enResults.removed + esResults.removed}`);
console.log(`Total pages processed: ${
  enResults.updated + enResults.removed + esResults.updated + esResults.removed
}`);
console.log('\n✨ Complete!');
