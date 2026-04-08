#!/usr/bin/env node
/**
 * Fetch popular karaoke songs from MusicBrainz
 * Then use Claude Haiku to estimate vocal ranges
 * 
 * Free APIs used:
 * - MusicBrainz (no key needed)
 * - Claude Haiku for vocal analysis (~$0.40/1000 songs)
 */

const fs = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

// Popular songs by genre/era to fill gaps
const SEARCH_QUERIES = [
  // Latin music (biggest gap)
  { query: 'Shakira', limit: 20 },
  { query: 'Bad Bunny', limit: 20 },
  { query: 'J Balvin', limit: 15 },
  { query: 'Daddy Yankee', limit: 15 },
  { query: 'Luis Fonsi', limit: 10 },
  { query: 'Maluma', limit: 10 },
  { query: 'Ozuna', limit: 10 },
  { query: 'Karol G', limit: 10 },
  
  // 2010s-2020s Pop (missing vocal ranges)
  { query: 'The Weeknd', limit: 20 },
  { query: 'Ariana Grande', limit: 20 },
  { query: 'Billie Eilish', limit: 15 },
  { query: 'Dua Lipa', limit: 15 },
  { query: 'Ed Sheeran', limit: 15 },
  { query: 'Taylor Swift', limit: 20 },
  { query: 'Bruno Mars', limit: 15 },
  { query: 'Post Malone', limit: 10 },
  
  // Classic Rock (need more 70s-80s)
  { query: 'Queen karaoke', limit: 15 },
  { query: 'Eagles karaoke', limit: 12 },
  { query: 'Fleetwood Mac', limit: 12 },
  { query: 'Journey karaoke', limit: 12 },
  { query: 'Bon Jovi', limit: 12 },
  { query: 'Def Leppard', limit: 10 },
  
  // Country (underrepresented)
  { query: 'Carrie Underwood', limit: 15 },
  { query: 'Luke Bryan', limit: 12 },
  { query: 'Blake Shelton', limit: 12 },
  { query: 'Miranda Lambert', limit: 10 },
  { query: 'Keith Urban', limit: 10 },
  
  // R&B/Soul classics
  { query: 'Aretha Franklin', limit: 12 },
  { query: 'Whitney Houston', limit: 15 },
  { query: 'Mariah Carey', limit: 15 },
  { query: 'Alicia Keys', limit: 12 },
  
  // Rock/Alternative
  { query: 'Foo Fighters', limit: 12 },
  { query: 'Coldplay karaoke', limit: 15 },
  { query: 'Imagine Dragons', limit: 12 },
  { query: 'Green Day karaoke', limit: 12 }
];

async function searchMusicBrainz(query, limit = 10) {
  const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&limit=${limit}&fmt=json`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HumMatch/1.0 (joe@hummatch.com)'
      }
    });
    
    if (!response.ok) {
      console.error(`MusicBrainz error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const songs = [];
    
    for (const recording of data.recordings || []) {
      if (!recording['artist-credit']?.[0]?.name) continue;
      
      const title = recording.title;
      const artist = recording['artist-credit'][0].name;
      const year = recording['first-release-date']?.substring(0, 4) || null;
      
      songs.push({ title, artist, year: year ? parseInt(year) : null });
    }
    
    return songs;
  } catch (err) {
    console.error(`Error fetching from MusicBrainz:`, err.message);
    return [];
  }
}

async function estimateVocalRange(title, artist, year) {
  const prompt = `Song: "${title}" by ${artist}${year ? ` (${year})` : ''}

Estimate the vocal range and characteristics for karaoke purposes.

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "lo": <MIDI note number for lowest note, e.g. 40 for E2>,
  "hi": <MIDI note number for highest note, e.g. 64 for E4>,
  "brightness": <vocal timbre 0-100, where 0=dark/warm, 100=bright/sharp>,
  "tags": [<genre tags like "pop", "rock", "latin", "rnb", plus decade like "80s", "90s", "2010s">]
}

Guidelines:
- Most pop songs: lo around 40-48 (E2-C3), hi around 62-72 (D4-C5)
- Rock songs: slightly lower, lo 38-45, hi 60-69
- Female vocals typically 3-5 semitones higher than male
- Latin/reggaeton: lo 42-50, hi 64-74
- Country: lo 40-47, hi 60-70
- Brightness: breathy/soft = 30-40, neutral = 45-55, powerful/edgy = 60-80`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    
    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate
    if (!parsed.lo || !parsed.hi || !parsed.brightness || !parsed.tags) {
      throw new Error('Missing required fields');
    }
    
    return parsed;
  } catch (err) {
    console.error(`  ❌ Error estimating range for "${title}":`, err.message);
    return null;
  }
}

async function main() {
  console.log('🎵 Fetching popular songs from MusicBrainz...\n');
  
  const allSongs = [];
  const seenKeys = new Set();
  
  for (const { query, limit } of SEARCH_QUERIES) {
    console.log(`Searching: ${query} (limit ${limit})...`);
    const songs = await searchMusicBrainz(query, limit);
    
    for (const song of songs) {
      const key = `${song.title}::${song.artist}`.toLowerCase();
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allSongs.push(song);
      }
    }
    
    // Rate limit: 1 request per second
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n✅ Found ${allSongs.length} unique songs\n`);
  
  // Now estimate vocal ranges with Haiku
  console.log('🎤 Estimating vocal ranges with Claude Haiku...\n');
  
  const songsWithRanges = [];
  let processed = 0;
  let errors = 0;
  
  for (const song of allSongs) {
    process.stdout.write(`\r[${processed + 1}/${allSongs.length}] ${song.title} by ${song.artist}...`);
    
    const rangeData = await estimateVocalRange(song.title, song.artist, song.year);
    
    if (rangeData) {
      songsWithRanges.push({
        title: song.title,
        artist: song.artist,
        lo: rangeData.lo,
        hi: rangeData.hi,
        brightness: rangeData.brightness,
        year: song.year,
        tags: rangeData.tags
      });
    } else {
      errors++;
    }
    
    processed++;
    
    // Rate limit: ~2 requests per second (cheap tier)
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n\n✅ Processed ${songsWithRanges.length} songs successfully`);
  console.log(`❌ ${errors} errors`);
  
  // Save to file
  const outputPath = path.join(__dirname, 'new-songs-batch.json');
  fs.writeFileSync(outputPath, JSON.stringify(songsWithRanges, null, 2), 'utf8');
  
  console.log(`\n💾 Saved to: ${outputPath}`);
  console.log(`\nNext step: Merge these songs into index.html SONGS array`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
