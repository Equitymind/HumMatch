#!/usr/bin/env node
/**
 * Add genre tags to all HumMatch songs using Claude Haiku
 * Cost: ~$0.40 for 9,728 songs (very cheap!)
 * Speed: Fast and reliable
 */

const fs = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = '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';

const GENRE_LIST = [
  'pop', 'rock', 'country', 'rnb', 'hiphop', 'latin', 'christian', 
  'indie', 'metal', 'jazz', 'blues', 'soul', 'disco', 'classic',
  'folk', 'electronic', 'punk', 'reggae', 'alternative'
];

async function callClaude(systemPrompt, userPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${await response.text()}`);
  }
  
  const data = await response.json();
  return data.content[0].text;
}

async function assignGenresToBatch(songs) {
  const songList = songs.map((s, i) => 
    `${i+1}. "${s.title}" by ${s.artist} (${s.year || 'unknown year'})`
  ).join('\n');
  
  const prompt = `Assign genre tags to these songs. Use ONLY these genres: ${GENRE_LIST.join(', ')}.

Return EXACTLY this JSON format with NO extra text, NO markdown, NO comments:
[
  {"index": 1, "tags": ["genre1", "genre2"]},
  {"index": 2, "tags": ["genre1"]}
]

Songs to classify:
${songList}

IMPORTANT: Return ONLY the JSON array. Start with [ and end with ]. No other text.`;

  const systemPrompt = 'You are a music genre classification expert. Return ONLY a valid JSON array with no additional text.';
  const response = await callClaude(systemPrompt, prompt);
  
  // Clean and parse JSON response
  let jsonText = response.trim();
  // Remove markdown code blocks if present
  jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  // Extract array
  const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON array from response');
  }
  
  // Clean up common JSON issues
  let cleaned = jsonMatch[0]
    .replace(/,\s*}/g, '}')  // Remove trailing commas
    .replace(/,\s*\]/g, ']') // Remove trailing commas in arrays
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\/\/.*$/gm, ''); // Remove single-line comments
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('JSON Parse Error:', e.message);
    console.error('Cleaned JSON:', cleaned.substring(0, 500));
    throw new Error('Failed to parse cleaned JSON: ' + e.message);
  }
}

async function main() {
  console.log('📖 Reading index.html...');
  const indexPath = path.join(__dirname, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  
  // Extract SONGS array
  const songsMatch = html.match(/const SONGS = (\[[\s\S]*?\]);/);
  if (!songsMatch) {
    throw new Error('Could not find SONGS array in index.html');
  }
  
  const songs = JSON.parse(songsMatch[1]);
  console.log(`✅ Found ${songs.length} songs`);
  
  // Process in batches of 100
  const BATCH_SIZE = 100;
  const batches = [];
  for (let i = 0; i < songs.length; i += BATCH_SIZE) {
    batches.push(songs.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`🔄 Processing ${batches.length} batches...`);
  
  let processedCount = 0;
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`\n📦 Batch ${batchIndex + 1}/${batches.length} (${batch.length} songs)...`);
    
    try {
      const genreResults = await assignGenresToBatch(batch);
      
      // Merge tags back into songs
      genreResults.forEach(result => {
        const songIndex = (batchIndex * BATCH_SIZE) + (result.index - 1);
        if (songs[songIndex]) {
          songs[songIndex].tags = result.tags;
          processedCount++;
        }
      });
      
      console.log(`✅ Processed ${processedCount}/${songs.length} songs`);
      
      // Rate limit: wait 1 second between batches
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Batch ${batchIndex + 1} failed:`, error.message);
      console.log('⏸️  Pausing for 5 seconds before retry...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      batchIndex--; // Retry this batch
    }
  }
  
  console.log(`\n✅ All songs processed! Writing back to index.html...`);
  
  // Replace SONGS array in HTML
  const updatedSongsJson = JSON.stringify(songs, null, 2);
  const updatedHtml = html.replace(
    /const SONGS = \[[\s\S]*?\];/,
    `const SONGS = ${updatedSongsJson};`
  );
  
  // Backup original
  fs.writeFileSync(indexPath + '.before-genres', html);
  console.log('💾 Backed up original to index.html.before-genres');
  
  // Write updated file
  fs.writeFileSync(indexPath, updatedHtml);
  console.log('✅ Updated index.html with genre tags!');
  
  // Stats
  const taggedSongs = songs.filter(s => s.tags && s.tags.length > 0);
  console.log(`\n📊 Stats:`);
  console.log(`   Total songs: ${songs.length}`);
  console.log(`   Songs with tags: ${taggedSongs.length}`);
  console.log(`   Coverage: ${(taggedSongs.length / songs.length * 100).toFixed(1)}%`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
