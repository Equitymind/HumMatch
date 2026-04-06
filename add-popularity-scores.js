#!/usr/bin/env node
/**
 * Add popularity scores to all songs using Spotify API
 * Formula: HumMatch Score = Spotify Popularity (0-100)
 * Later can blend with YouTube views
 */

const fs = require('fs');
const path = require('path');

// Real Spotify credentials for HumMatch app
const SPOTIFY_CLIENT_ID = '7fb671d75ec448abb430348a49ce9547';
const SPOTIFY_CLIENT_SECRET = '510c5bfab0e6499aa1df993ff57aec6ea';

let accessToken = null;

async function getSpotifyToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });
  
  const data = await response.json();
  return data.access_token;
}

async function searchSpotify(title, artist) {
  if (!accessToken) {
    accessToken = await getSpotifyToken();
  }
  
  const query = encodeURIComponent(`track:${title} artist:${artist}`);
  const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`;
  
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (response.status === 429) {
      // Rate limited - wait and retry
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
      console.log(`  Rate limited, waiting ${retryAfter}s...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return searchSpotify(title, artist);
    }
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.tracks?.items?.length > 0) {
      const track = data.tracks.items[0];
      return {
        popularity: track.popularity, // 0-100
        spotifyId: track.id,
        spotifyUrl: track.external_urls.spotify
      };
    }
    
    return null;
  } catch (err) {
    console.error(`  Error searching Spotify:`, err.message);
    return null;
  }
}

async function main() {
  console.log('🎵 Adding popularity scores to songs...\n');
  
  // Read index.html
  const indexPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Extract SONGS array
  const songsMatch = html.match(/const SONGS = (\[[\s\S]*?\]);/);
  if (!songsMatch) {
    console.error('❌ Could not find SONGS array');
    process.exit(1);
  }
  
  let songs = JSON.parse(songsMatch[1]);
  console.log(`📊 Found ${songs.length} songs\n`);
  
  // Process songs
  let processed = 0;
  let found = 0;
  let notFound = 0;
  
  for (const song of songs) {
    process.stdout.write(`\r[${processed + 1}/${songs.length}] ${song.title} by ${song.artist}...`);
    
    const spotifyData = await searchSpotify(song.title, song.artist);
    
    if (spotifyData) {
      song.popularity = spotifyData.popularity;
      song.spotifyId = spotifyData.spotifyId;
      found++;
    } else {
      song.popularity = 0; // Unknown songs get 0
      notFound++;
    }
    
    processed++;
    
    // Rate limit: 1 request per second (Spotify free tier)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Save checkpoint every 100 songs
    if (processed % 100 === 0) {
      const checkpointPath = path.join(__dirname, `songs-checkpoint-${processed}.json`);
      fs.writeFileSync(checkpointPath, JSON.stringify(songs, null, 2), 'utf8');
      console.log(`\n💾 Checkpoint saved: ${processed} songs`);
    }
  }
  
  console.log(`\n\n✅ Processed ${processed} songs`);
  console.log(`✅ Found on Spotify: ${found}`);
  console.log(`❌ Not found: ${notFound}`);
  
  // Calculate HumMatch Score for each song
  // For now: HumMatch Score = Spotify Popularity (we can add YouTube later)
  for (const song of songs) {
    song.humMatchScore = song.popularity || 0;
  }
  
  // Sort by popularity (high to low)
  songs.sort((a, b) => (b.humMatchScore || 0) - (a.humMatchScore || 0));
  
  console.log(`\n📊 Top 10 songs by popularity:`);
  songs.slice(0, 10).forEach((s, i) => {
    console.log(`  ${i + 1}. "${s.title}" by ${s.artist} - Score: ${s.humMatchScore}`);
  });
  
  // Backup original
  const backupPath = path.join(__dirname, 'index.html.backup-before-popularity');
  fs.writeFileSync(backupPath, html, 'utf8');
  console.log(`\n✅ Backup saved`);
  
  // Write back to index.html
  const newSongsStr = JSON.stringify(songs, null, 2);
  const newHtml = html.replace(/const SONGS = \[[\s\S]*?\];/, `const SONGS = ${newSongsStr};`);
  
  fs.writeFileSync(indexPath, newHtml, 'utf8');
  console.log(`💾 index.html updated with popularity scores`);
  
  console.log(`\n🎉 Done! Songs now sorted by popularity.`);
  console.log(`Next: Update UI to show tiered results (2K → 3K → 5K)`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
