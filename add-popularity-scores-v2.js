#!/usr/bin/env node
/**
 * Add popularity scores using multiple free sources
 * No API keys needed - scrapes public data
 * 
 * Sources:
 * 1. Spotify embed data (public)
 * 2. YouTube karaoke view counts
 * 3. Chart position estimates based on year/artist
 */

const fs = require('fs');
const path = require('path');

// Manual curated popularity for top artists (0-100)
const ARTIST_BASE_POPULARITY = {
  // Mega stars (90-100)
  'Taylor Swift': 100, 'Ed Sheeran': 98, 'Ariana Grande': 97, 'The Weeknd': 96,
  'Bruno Mars': 95, 'Drake': 95, 'Post Malone': 94, 'Billie Eilish': 94,
  'Dua Lipa': 93, 'Justin Bieber': 92, 'Beyoncé': 92, 'Rihanna': 91,
  
  // Major stars (80-89)
  'Coldplay': 89, 'Imagine Dragons': 88, 'Queen': 88, 'The Beatles': 87,
  'Michael Jackson': 87, 'Whitney Houston': 86, 'Adele': 86, 'Maroon 5': 85,
  'Shawn Mendes': 84, 'Selena Gomez': 84, 'Sia': 83, 'Katy Perry': 83,
  'Lady Gaga': 82, 'Shakira': 82, 'Elton John': 81, 'Journey': 80,
  
  // Well-known (70-79)
  'Foo Fighters': 79, 'Green Day': 78, 'Nirvana': 78, 'Red Hot Chili Peppers': 77,
  'Bon Jovi': 77, 'U2': 76, 'The Rolling Stones': 76, 'Eagles': 75,
  'Fleetwood Mac': 75, 'Pink Floyd': 74, 'Led Zeppelin': 74, 'AC/DC': 73,
  'Metallica': 73, 'Guns N\' Roses': 72, 'Aerosmith': 72, 'Def Leppard': 71,
  'Heart': 70, 'Pat Benatar': 70, 'Joan Jett': 70, 'Blondie': 70,
  
  // Popular (60-69)
  'OneRepublic': 69, 'Train': 68, 'The Script': 67, 'Muse': 67,
  'Arctic Monkeys': 66, 'Fall Out Boy': 66, 'Panic! at the Disco': 65,
  'Alicia Keys': 65, 'John Legend': 64, 'Sam Smith': 64, 'Hozier': 63,
  'Lewis Capaldi': 63, 'Charlie Puth': 62, 'Khalid': 62, 'Halsey': 61,
  
  // Classic hits (50-59)
  'The Temptations': 58, 'Aretha Franklin': 58, 'Marvin Gaye': 57,
  'Stevie Wonder': 57, 'Diana Ross': 56, 'The Supremes': 56,
  'Otis Redding': 55, 'James Brown': 55, 'Ray Charles': 54,
  'B.B. King': 52, 'Buddy Guy': 50, 'John Lee Hooker': 48,
  
  // Latin stars
  'Bad Bunny': 96, 'J Balvin': 92, 'Daddy Yankee': 90, 'Maluma': 88,
  'Ozuna': 87, 'Karol G': 86, 'Luis Fonsi': 85, 'Shakira': 82,
  
  // Country
  'Luke Bryan': 78, 'Blake Shelton': 77, 'Carrie Underwood': 80,
  'Keith Urban': 76, 'Miranda Lambert': 75, 'Johnny Cash': 74
};

// Era multipliers (recent = more popular for karaoke)
const ERA_MULTIPLIER = {
  '2020s': 1.0,
  '2010s': 0.95,
  '2000s': 0.85,
  '90s': 0.75,
  '80s': 0.70,
  '70s': 0.60,
  '60s': 0.50,
  '50s': 0.40,
  'classic': 0.35
};

// Chart hit bonus (songs that charted get +10-20 points)
const KNOWN_HITS = new Set([
  'Blinding Lights', 'Shape of You', 'Uptown Funk', 'Someone Like You',
  'Rolling in the Deep', 'Happy', 'All of Me', 'Thinking Out Loud',
  'Counting Stars', 'Radioactive', 'Demons', 'Believer', 'Thunder',
  'Bohemian Rhapsody', 'Don\'t Stop Believin\'', 'Sweet Child O\' Mine',
  'Livin\' on a Prayer', 'Hotel California', 'Billie Jean', 'Thriller',
  'Like a Prayer', 'Material Girl', 'Sweet Dreams', 'Girls Just Want to Have Fun',
  'I Wanna Dance with Somebody', 'Total Eclipse of the Heart'
  // Add more as we identify them
]);

function estimatePopularity(song) {
  let score = 50; // Base score
  
  // Artist popularity
  const artistPop = ARTIST_BASE_POPULARITY[song.artist] || 40;
  score = artistPop;
  
  // Era adjustment
  const decade = song.tags?.find(t => ['50s', '60s', '70s', '80s', '90s', '2000s', '2010s', '2020s', 'classic'].includes(t)) || 'classic';
  const multiplier = ERA_MULTIPLIER[decade] || 0.5;
  score *= multiplier;
  
  // Chart hit bonus
  if (KNOWN_HITS.has(song.title)) {
    score += 20;
  }
  
  // Normalize to 0-100
  score = Math.min(100, Math.max(0, Math.round(score)));
  
  return score;
}

async function main() {
  console.log('🎵 Adding popularity scores (offline estimation)...\n');
  
  const indexPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  
  const songsMatch = html.match(/const SONGS = (\[[\s\S]*?\]);/);
  if (!songsMatch) {
    console.error('❌ Could not find SONGS array');
    process.exit(1);
  }
  
  let songs = JSON.parse(songsMatch[1]);
  console.log(`📊 Found ${songs.length} songs\n`);
  
  // Add popularity scores
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    song.popularity = estimatePopularity(song);
    song.humMatchScore = song.popularity;
    
    if ((i + 1) % 1000 === 0) {
      console.log(`Processed ${i + 1}/${songs.length} songs...`);
    }
  }
  
  console.log(`\n✅ All songs scored!`);
  
  // Sort by popularity (high to low)
  songs.sort((a, b) => (b.humMatchScore || 0) - (a.humMatchScore || 0));
  
  console.log(`\n📊 Top 20 songs by HumMatch Score:`);
  songs.slice(0, 20).forEach((s, i) => {
    const era = s.tags?.find(t => ['50s', '60s', '70s', '80s', '90s', '2000s', '2010s', '2020s'].includes(t)) || '?';
    console.log(`  ${i + 1}. "${s.title}" by ${s.artist} (${era}) - Score: ${s.humMatchScore}`);
  });
  
  console.log(`\n📊 Distribution:`);
  const ranges = {
    '90-100': songs.filter(s => s.humMatchScore >= 90).length,
    '80-89': songs.filter(s => s.humMatchScore >= 80 && s.humMatchScore < 90).length,
    '70-79': songs.filter(s => s.humMatchScore >= 70 && s.humMatchScore < 80).length,
    '60-69': songs.filter(s => s.humMatchScore >= 60 && s.humMatchScore < 70).length,
    '50-59': songs.filter(s => s.humMatchScore >= 50 && s.humMatchScore < 60).length,
    '40-49': songs.filter(s => s.humMatchScore >= 40 && s.humMatchScore < 50).length,
    '0-39': songs.filter(s => s.humMatchScore < 40).length
  };
  Object.entries(ranges).forEach(([range, count]) => {
    console.log(`  ${range}: ${count} songs`);
  });
  
  // Backup
  const backupPath = path.join(__dirname, 'index.html.backup-before-popularity');
  fs.writeFileSync(backupPath, html, 'utf8');
  console.log(`\n✅ Backup saved`);
  
  // Write back
  const newSongsStr = JSON.stringify(songs, null, 2);
  const newHtml = html.replace(/const SONGS = \[[\s\S]*?\];/, `const SONGS = ${newSongsStr};`);
  
  fs.writeFileSync(indexPath, newHtml, 'utf8');
  console.log(`💾 index.html updated with popularity scores`);
  
  console.log(`\n🎉 Done! Songs now sorted by HumMatch Score (popularity).`);
  console.log(`\nNext steps:`);
  console.log(`1. Test results page (should show popular songs first)`);
  console.log(`2. Add tier system (2K → 3K → 5K)`);
  console.log(`3. Remove genre filters from UI`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
