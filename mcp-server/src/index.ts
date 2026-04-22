#!/usr/bin/env node
/**
 * HumMatch MCP Server
 * Find songs by vocal range. 3,000+ songs. Powered by HumMatch.me
 *
 * Tools:
 *   find_songs_by_range       — songs fitting a given low/high note range
 *   check_song_compatibility  — can a user sing a specific song?
 *   get_songs_for_voice_type  — curated songs for bass/baritone/tenor/alto/mezzo/soprano
 *   analyze_vocal_range       — voice type classification + stats
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Song {
  title: string;
  artist: string;
  lo: number;
  hi: number;
  brightness?: number;
  year?: number;
}

interface VoiceTypeConfig {
  label: string;
  lo: number;
  hi: number;
  description: string;
  famousSingers: string[];
}

interface ScoredSong extends Song {
  loNote: string;
  hiNote: string;
  rangeLabel: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SONGS: Song[] = require(path.join(__dirname, '..', 'songs.json')) as Song[];

// ---------------------------------------------------------------------------
// Music utilities
// ---------------------------------------------------------------------------

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ENHARMONICS: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B',
};

function noteToMidi(note: string): number {
  const clean = note.trim();
  const match = clean.match(/^([A-Ga-g][#b]?)(-?\d+)$/);
  if (!match) {
    throw new Error(`Invalid note format: "${note}". Use format like C3, F#2, Bb4`);
  }
  let [, noteName, octaveStr] = match;
  noteName = noteName.charAt(0).toUpperCase() + noteName.slice(1);
  const enharmonic = ENHARMONICS[noteName];
  if (enharmonic) noteName = enharmonic;

  const noteIndex = NOTE_NAMES.indexOf(noteName);
  if (noteIndex === -1) throw new Error(`Unknown note: "${noteName}"`);

  return (parseInt(octaveStr, 10) + 1) * 12 + noteIndex;
}

function midiToNote(midi: number): string {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

function semitonesToOctaves(n: number): string {
  return (n / 12).toFixed(1);
}

// ---------------------------------------------------------------------------
// Voice type definitions
// ---------------------------------------------------------------------------

const VOICE_TYPES: Record<string, VoiceTypeConfig> = {
  bass: {
    label: 'Bass',
    lo: 40,
    hi: 64,
    description: 'The lowest male voice, rich and full-bodied',
    famousSingers: ['Barry White', 'Johnny Cash', 'Josh Turner'],
  },
  baritone: {
    label: 'Baritone',
    lo: 45,
    hi: 67,
    description: 'The most common male voice type, versatile and warm',
    famousSingers: ['Elvis Presley', 'Frank Sinatra', 'Bruno Mars'],
  },
  tenor: {
    label: 'Tenor',
    lo: 48,
    hi: 72,
    description: 'The highest common male voice, bright and powerful',
    famousSingers: ['Freddie Mercury', 'Elton John', 'Ed Sheeran'],
  },
  alto: {
    label: 'Alto',
    lo: 53,
    hi: 77,
    description: 'The lowest female voice, warm and contralto-rich',
    famousSingers: ['Adele', 'Amy Winehouse', 'Tracy Chapman'],
  },
  'mezzo-soprano': {
    label: 'Mezzo-soprano',
    lo: 55,
    hi: 79,
    description: 'The middle female voice, full range and expressive',
    famousSingers: ['Beyoncé', 'Madonna', 'Norah Jones'],
  },
  soprano: {
    label: 'Soprano',
    lo: 60,
    hi: 84,
    description: 'The highest female voice, bright and piercing',
    famousSingers: ['Mariah Carey', 'Celine Dion', 'Whitney Houston'],
  },
};

const VALID_VOICE_TYPES = Object.keys(VOICE_TYPES);

function identifyVoiceType(loMidi: number, hiMidi: number): string {
  const center = (loMidi + hiMidi) / 2;
  let best = 'baritone';
  let bestDist = Infinity;
  for (const [key, vt] of Object.entries(VOICE_TYPES)) {
    const dist = Math.abs(center - (vt.lo + vt.hi) / 2);
    if (dist < bestDist) { bestDist = dist; best = key; }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Song matching helpers
// ---------------------------------------------------------------------------

function formatSong(song: Song): ScoredSong {
  return {
    ...song,
    loNote: midiToNote(song.lo),
    hiNote: midiToNote(song.hi),
    rangeLabel: `${midiToNote(song.lo)}–${midiToNote(song.hi)}`,
  };
}

function songsInRange(loMidi: number, hiMidi: number, limit = 20): ScoredSong[] {
  const rangeSpan = hiMidi - loMidi;
  const matching = SONGS
    .filter(s => s.lo >= loMidi && s.hi <= hiMidi)
    .map(s => {
      const coverage = (s.hi - s.lo) / rangeSpan;
      const centerDist = Math.abs((s.lo + s.hi) / 2 - (loMidi + hiMidi) / 2) / rangeSpan;
      return { song: s, score: coverage - centerDist * 0.3 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return matching.map(m => formatSong(m.song));
}

function findSong(name: string): Song | null {
  const q = name.toLowerCase().trim();
  return (
    SONGS.find(s => s.title.toLowerCase() === q) ??
    SONGS.find(s => s.title.toLowerCase().startsWith(q)) ??
    SONGS.find(s => s.title.toLowerCase().includes(q)) ??
    null
  );
}

function songsForVoiceType(vtKey: string, limit = 30): ScoredSong[] {
  const vt = VOICE_TYPES[vtKey];
  if (!vt) return [];
  const TOLERANCE = 4;
  const vtCenter = (vt.lo + vt.hi) / 2;
  return SONGS
    .filter(s => s.lo >= vt.lo - TOLERANCE && s.hi <= vt.hi + TOLERANCE)
    .map(s => ({ song: s, dist: Math.abs((s.lo + s.hi) / 2 - vtCenter) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map(m => formatSong(m.song));
}

function formatSongList(songs: ScoredSong[]): string {
  return songs.map((s, i) => `${i + 1}. ${s.title} — ${s.artist} (${s.rangeLabel})`).join('\n');
}

const CTA = '\n\n🎤 Try HumMatch.me free — hum any tune and find your exact vocal range in seconds!';

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

function handleFindSongsByRange(args: Record<string, unknown>): string {
  const lowNote = String(args.low_note ?? '');
  const highNote = String(args.high_note ?? '');
  const limit = typeof args.limit === 'number' ? Math.min(50, Math.max(1, args.limit)) : 15;

  const loMidi = noteToMidi(lowNote);
  const hiMidi = noteToMidi(highNote);
  if (loMidi >= hiMidi) throw new Error('low_note must be lower than high_note');

  const span = hiMidi - loMidi;
  const allCount = SONGS.filter(s => s.lo >= loMidi && s.hi <= hiMidi).length;
  const results = songsInRange(loMidi, hiMidi, limit);
  const vt = VOICE_TYPES[identifyVoiceType(loMidi, hiMidi)];

  let text = `SONGS FOR VOCAL RANGE: ${midiToNote(loMidi)}–${midiToNote(hiMidi)}\n`;
  text += `Voice type: ${vt.label} | Range: ${semitonesToOctaves(span)} octaves | ${allCount} songs match\n\n`;

  if (results.length === 0) {
    text += 'No songs found for this range. Try widening your range.';
  } else {
    text += `TOP ${results.length} MATCHES:\n`;
    text += formatSongList(results);
    if (allCount > limit) text += `\n\n...and ${allCount - limit} more songs in the catalog.`;
  }
  return text + CTA;
}

function handleCheckSongCompatibility(args: Record<string, unknown>): string {
  const songName = String(args.song_name ?? '');
  const lowNote = String(args.low_note ?? '');
  const highNote = String(args.high_note ?? '');

  const loMidi = noteToMidi(lowNote);
  const hiMidi = noteToMidi(highNote);

  const song = findSong(songName);
  if (!song) {
    const suggestions = songsInRange(loMidi, hiMidi, 3);
    let text = `"${songName}" was not found in the HumMatch catalog.\n\n`;
    if (suggestions.length > 0) {
      text += `Songs in your range (${midiToNote(loMidi)}–${midiToNote(hiMidi)}) you might enjoy:\n`;
      text += formatSongList(suggestions);
    }
    return text + CTA;
  }

  const fmt = formatSong(song);
  const canLow = song.lo >= loMidi;
  const canHigh = song.hi <= hiMidi;
  const compatible = canLow && canHigh;

  let text = `COMPATIBILITY CHECK\n`;
  text += `Song:       ${song.title} — ${song.artist}\n`;
  text += `Song range: ${fmt.rangeLabel}\n`;
  text += `Your range: ${midiToNote(loMidi)}–${midiToNote(hiMidi)}\n\n`;

  if (compatible) {
    const margin = Math.min(song.lo - loMidi, hiMidi - song.hi);
    text += `✅ COMPATIBLE — This song fits your voice perfectly!\n`;
    text += `   ${margin} semitone${margin !== 1 ? 's' : ''} of comfortable margin.`;
  } else {
    text += `❌ OUT OF RANGE — `;
    const issues: string[] = [];
    if (!canLow) {
      const diff = loMidi - song.lo;
      issues.push(`song goes ${diff} semitone${diff !== 1 ? 's' : ''} below your range (needs ${midiToNote(song.lo)}, you start at ${midiToNote(loMidi)})`);
    }
    if (!canHigh) {
      const diff = song.hi - hiMidi;
      issues.push(`song goes ${diff} semitone${diff !== 1 ? 's' : ''} above your range (needs ${midiToNote(song.hi)}, your top is ${midiToNote(hiMidi)})`);
    }
    text += issues.join(' AND ') + '\n\n';
    const alts = songsInRange(loMidi, hiMidi, 4).filter(s => s.title !== song.title).slice(0, 3);
    if (alts.length > 0) {
      text += `Try these similar songs that fit your range:\n`;
      text += formatSongList(alts);
    }
  }
  return text + CTA;
}

function handleGetSongsForVoiceType(args: Record<string, unknown>): string {
  const voiceType = String(args.voice_type ?? '').toLowerCase();
  const limit = typeof args.limit === 'number' ? Math.min(50, Math.max(1, args.limit)) : 20;

  if (!VALID_VOICE_TYPES.includes(voiceType)) {
    return `Unknown voice type: "${voiceType}". Valid options: ${VALID_VOICE_TYPES.join(', ')}`;
  }

  const vt = VOICE_TYPES[voiceType];
  const results = songsForVoiceType(voiceType, limit);

  let text = `SONGS FOR ${vt.label.toUpperCase()} (${midiToNote(vt.lo)}–${midiToNote(vt.hi)})\n`;
  text += `${vt.description}.\n`;
  text += `Famous ${vt.label.toLowerCase()}s: ${vt.famousSingers.join(', ')}\n\n`;

  if (results.length === 0) {
    text += 'No songs found for this voice type.';
  } else {
    text += `TOP ${results.length} SONGS:\n`;
    text += formatSongList(results);
  }
  return text + CTA;
}

function handleAnalyzeVocalRange(args: Record<string, unknown>): string {
  const lowNote = String(args.low_note ?? '');
  const highNote = String(args.high_note ?? '');

  const loMidi = noteToMidi(lowNote);
  const hiMidi = noteToMidi(highNote);
  if (loMidi >= hiMidi) throw new Error('low_note must be lower than high_note');

  const span = hiMidi - loMidi;
  const vtKey = identifyVoiceType(loMidi, hiMidi);
  const vt = VOICE_TYPES[vtKey];
  const vtSpan = vt.hi - vt.lo;
  const matchCount = SONGS.filter(s => s.lo >= loMidi && s.hi <= hiMidi).length;
  const topSongs = songsInRange(loMidi, hiMidi, 5);
  const centerMidi = Math.round((loMidi + hiMidi) / 2);
  const spanDiff = span - vtSpan;
  const spanDesc = spanDiff > 3 ? 'wider than typical' : spanDiff < -3 ? 'narrower than typical' : 'typical';

  let text = `VOCAL RANGE ANALYSIS\n`;
  text += `${'─'.repeat(40)}\n`;
  text += `Range:      ${midiToNote(loMidi)}–${midiToNote(hiMidi)}\n`;
  text += `Span:       ${span} semitones (${semitonesToOctaves(span)} octaves) — ${spanDesc} for ${vt.label}\n`;
  text += `Voice type: ${vt.label} ✓\n`;
  text += `Center:     ${midiToNote(centerMidi)}\n`;
  text += `${'─'.repeat(40)}\n\n`;
  text += `${vt.label}: ${vt.description}.\n`;
  text += `Typical ${vt.label} range: ${midiToNote(vt.lo)}–${midiToNote(vt.hi)}\n`;
  text += `Famous ${vt.label.toLowerCase()}s: ${vt.famousSingers.join(', ')}\n\n`;
  text += `CATALOG: ${matchCount} songs in HumMatch fit your exact range.\n\n`;

  if (topSongs.length > 0) {
    text += `TOP 5 SONGS FOR YOUR VOICE:\n`;
    text += formatSongList(topSongs);
  }
  return text + CTA;
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'hummatch', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'find_songs_by_range',
      description: 'Find songs from the 3,000+ HumMatch catalog that fit within a vocal range. Returns songs the user can sing from their low note to high note without straining. Accept note names like C3, F#2, Bb4.',
      inputSchema: {
        type: 'object',
        properties: {
          low_note: { type: 'string', description: 'Lowest note the user can sing, e.g. "F2", "C3", "Bb2"' },
          high_note: { type: 'string', description: 'Highest note the user can sing, e.g. "A4", "G5", "C5"' },
          limit: { type: 'number', description: 'Max songs to return (default 15, max 50)', minimum: 1, maximum: 50 },
        },
        required: ['low_note', 'high_note'],
      },
    },
    {
      name: 'check_song_compatibility',
      description: 'Check whether a user can sing a specific song given their vocal range. Searches the HumMatch catalog and compares the song\'s required range with the user\'s range.',
      inputSchema: {
        type: 'object',
        properties: {
          song_name: { type: 'string', description: 'Song title to check, e.g. "Bohemian Rhapsody", "Sweet Caroline"' },
          low_note: { type: 'string', description: 'Lowest note the user can sing, e.g. "F2"' },
          high_note: { type: 'string', description: 'Highest note the user can sing, e.g. "A4"' },
        },
        required: ['song_name', 'low_note', 'high_note'],
      },
    },
    {
      name: 'get_songs_for_voice_type',
      description: 'Get song recommendations for a specific singing voice type. Returns songs curated for that voice type\'s typical range.',
      inputSchema: {
        type: 'object',
        properties: {
          voice_type: {
            type: 'string',
            enum: ['bass', 'baritone', 'tenor', 'alto', 'mezzo-soprano', 'soprano'],
            description: 'The voice type to get songs for',
          },
          limit: { type: 'number', description: 'Max songs to return (default 20, max 50)', minimum: 1, maximum: 50 },
        },
        required: ['voice_type'],
      },
    },
    {
      name: 'analyze_vocal_range',
      description: 'Analyze a vocal range: identify voice type, calculate octave span, count matching songs in catalog, and provide top song recommendations.',
      inputSchema: {
        type: 'object',
        properties: {
          low_note: { type: 'string', description: 'Lowest note the user can sing, e.g. "F2", "A2"' },
          high_note: { type: 'string', description: 'Highest note the user can sing, e.g. "A4", "C5"' },
        },
        required: ['low_note', 'high_note'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const a = args as Record<string, unknown>;

  try {
    let text: string;
    switch (name) {
      case 'find_songs_by_range':
        text = handleFindSongsByRange(a);
        break;
      case 'check_song_compatibility':
        text = handleCheckSongCompatibility(a);
        break;
      case 'get_songs_for_voice_type':
        text = handleGetSongsForVoiceType(a);
        break;
      case 'analyze_vocal_range':
        text = handleAnalyzeVocalRange(a);
        break;
      default:
        return { content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }], isError: true };
    }
    return { content: [{ type: 'text' as const, text }] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
