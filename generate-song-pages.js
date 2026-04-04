#!/usr/bin/env node
/**
 * HumMatch Programmatic SEO Generator
 * Generates 500 static song pages targeting:
 *   "[song name] vocal range"
 *   "[song name] karaoke range"
 *   "can I sing [song name]"
 *
 * Run: node generate-song-pages.js
 */

const fs   = require('fs');
const path = require('path');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const BASE_URL  = 'https://hummatch.me';
const SONG_DIR  = path.join(__dirname, 'song');
const MAX_PAGES = 10000;

// ─── MIDI → NOTE NAME ─────────────────────────────────────────────────────────
const NOTE_NAMES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
function midiToNote(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return NOTE_NAMES[midi % 12] + octave;
}

// Ascii-safe version for aria labels / non-unicode fallback
function midiToNoteAscii(midi) {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return names[midi % 12] + (Math.floor(midi / 12) - 1);
}

// ─── DIFFICULTY ───────────────────────────────────────────────────────────────
function getDifficulty(lo, hi) {
  const span = hi - lo;
  if (span <= 12) return { label:'Easy',   emoji:'🟢', color:'#22c55e', desc:'Comfortable for most singers — fits within one octave.',   catPath:'/easy-songs'   };
  if (span <= 17) return { label:'Medium', emoji:'🟡', color:'#f59e0b', desc:'Moderate challenge — requires some vocal training.',        catPath:'/medium-songs' };
  return               { label:'Hard',   emoji:'🔴', color:'#ef4444', desc:'Demanding range — best for experienced singers.',           catPath:'/hard-songs'   };
}

// ─── VOICE TYPE ───────────────────────────────────────────────────────────────
function getVoiceType(hi) {
  if (hi <= 60) return { label:'Bass',     path:'/bass-songs'     };
  if (hi <= 65) return { label:'Baritone', path:'/baritone-songs' };
  if (hi <= 70) return { label:'Tenor',    path:'/tenor-songs'    };
  if (hi <= 76) return { label:'Alto',     path:'/alto-songs'     };
  return               { label:'Soprano',  path:'/soprano-songs'  };
}

// ─── ENHANCED VOICE TYPE ANALYSIS ─────────────────────────────────────────────
function getVoiceTypes(lo, hi) {
  const types = [];
  // Bass: E2-E4 (40-64)
  if (lo >= 40 && hi <= 64) types.push({ name: 'Bass', icon: '🎵', desc: 'Deep, rich low range' });
  // Baritone: A2-A4 (45-69)
  if (lo >= 42 && hi <= 72 && lo < 50) types.push({ name: 'Baritone', icon: '🎤', desc: 'Most common male voice' });
  // Tenor: C3-C5 (48-72)
  if (lo >= 48 && hi <= 76) types.push({ name: 'Tenor', icon: '🎶', desc: 'Higher male range' });
  // Alto: G3-G5 (55-79)
  if (lo >= 52 && hi <= 81 && lo < 60) types.push({ name: 'Alto', icon: '🎵', desc: 'Lower female range' });
  // Mezzo-Soprano: A3-A5 (57-81)
  if (lo >= 55 && hi <= 84 && lo < 62) types.push({ name: 'Mezzo-Soprano', icon: '🎤', desc: 'Mid female range' });
  // Soprano: C4-C6 (60-84)
  if (lo >= 59 && hi >= 72) types.push({ name: 'Soprano', icon: '🎶', desc: 'High female range' });
  return types.length > 0 ? types : [{ name: 'Wide Range', icon: '🎵', desc: 'Requires versatility' }];
}

// ─── SONG CONTEXT TAGS ────────────────────────────────────────────────────────
function getBestFor(span, brightness, lo, hi) {
  const tags = [];
  if (span <= 12) tags.push({ label: 'Karaoke Night', icon: '🎤', reason: 'Easy crowd-pleaser' });
  if (brightness >= 65) tags.push({ label: 'Road Trip', icon: '🚗', reason: 'Upbeat singalong' });
  if (span <= 14 && brightness <= 55) tags.push({ label: 'Shower Sessions', icon: '🚿', reason: 'Comfortable range' });
  if (span >= 18) tags.push({ label: 'Practice', icon: '🎯', reason: 'Build vocal strength' });
  if (lo <= 55 && hi >= 70) tags.push({ label: 'Duet Potential', icon: '👥', reason: 'Wide range split' });
  return tags.slice(0, 3); // Max 3 tags
}

// ─── TRANSPOSE ADVICE ─────────────────────────────────────────────────────────
function getTransposeAdvice(span, lo, hi) {
  if (span <= 17) return null; // Only for Hard songs
  const suggestions = [];
  if (hi >= 76) suggestions.push({ direction: 'Lower', semitones: -3, reason: 'easier high notes' });
  if (lo <= 48) suggestions.push({ direction: 'Higher', semitones: +2, reason: 'more comfortable lows' });
  return suggestions.length > 0 ? suggestions[0] : null;
}

// ─── SLUG ─────────────────────────────────────────────────────────────────────
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/['']/g, '')           // remove apostrophes
    .replace(/[^a-z0-9]+/g, '-')   // non-alphanum → dash
    .replace(/^-+|-+$/g, '');      // trim leading/trailing dashes
}
function songSlug(title, artist) {
  return slugify(title) + '-' + slugify(artist);
}

function artistSlug(artist) {
  return slugify(artist);
}

// ─── HTML ESCAPE ──────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#x27;');
}

// ─── RANGE BAR HELPERS (MIDI 36–84 = full piano range used) ──────────────────
const MIDI_MIN = 36, MIDI_MAX = 84;
function barLeft(lo)     { return Math.max(0, Math.round(((lo - MIDI_MIN)/(MIDI_MAX-MIDI_MIN))*100)); }
function barWidth(lo,hi) { return Math.min(100-barLeft(lo), Math.max(4, Math.round(((hi-lo)/(MIDI_MAX-MIDI_MIN))*100))); }

// ─── PARSE SONGS FROM index.html ─────────────────────────────────────────────
function parseSongs() {
  console.log('  Reading index.html...');
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  
  // Extract the SONGS array directly
  const songsMatch = html.match(/const SONGS = \[(.*?)\];/s);
  if (!songsMatch) {
    console.error('Could not find SONGS array in index.html');
    return [];
  }
  
  // Parse as JSON array
  try {
    const songsJSON = '[' + songsMatch[1] + ']';
    const parsed = JSON.parse(songsJSON);
    console.log(`  Found ${parsed.length} songs in SONGS array`);
    return parsed;
  } catch (err) {
    console.error('Failed to parse SONGS array:', err.message);
    return [];
  }
}

// ─── SELECT TOP 500 ───────────────────────────────────────────────────────────
// Priority list: well-known karaoke staples that get tons of searches
const PRIORITY = new Set([
  'Bohemian Rhapsody','Don\'t Stop Believin\'','Sweet Caroline','Piano Man',
  'Living on a Prayer','I Will Survive','Total Eclipse of the Heart',
  'Eye of the Tiger','Mr. Brightside','September','Dancing Queen',
  'Take On Me','Africa','Roxanne','With or Without You','Under Pressure',
  'Highway to Hell','Back in Black','Summer of \'69','Don\'t You Want Me',
  'Girls Just Want to Have Fun','Footloose','Come On Eileen','Love Shack',
  'Jessie\'s Girl','Every Rose Has Its Thorn','Pour Some Sugar on Me',
  'Cherry Bomb','Ring of Fire','My Way','Hallelujah','Hotel California',
  'Sweet Home Alabama','Hey Jude','Let It Be','Yesterday','Imagine',
  'Smells Like Teen Spirit','Come as You Are','Lithium','In Bloom',
  'Wonderwall','Champagne Supernova','Don\'t Look Back in Anger',
  'Rolling in the Deep','Someone Like You','Hello','Set Fire to the Rain',
  'Skyfall','All of Me','Stay with Me','Happy','Uptown Funk','Shallow',
  'A Million Dreams','This Is Me','Rewrite the Stars','City of Stars',
  'What\'s Up','Creep','No Woman No Cry','Redemption Song',
  'Stand by Me','Can\'t Help Falling in Love','Suspicious Minds',
  'Jolene','I Will Always Love You','9 to 5','Coat of Many Colors',
  'Fast Car','The Joker','Take Me to Church','Sex on Fire','Use Somebody',
  'Mr. Jones','Counting Stars','Radioactive','Demons',
  'Titanium','Wrecking Ball','We Found Love','Diamonds','Umbrella',
  'Crazy in Love','Single Ladies','Halo','Love on Top',
  'Billie Jean','Thriller','Beat It','Man in the Mirror',
  'Purple Rain','When Doves Cry','Kiss','Little Red Corvette',
  'Born to Run','Thunder Road','Dancing in the Dark',
  'Livin\' on a Prayer','You Give Love a Bad Name','Wanted Dead or Alive',
  'Here I Go Again','More Than a Feeling','Don\'t Stop',
  'You\'ve Got a Friend in Me','Circle of Life','Can You Feel the Love Tonight',
  'Let It Go','Into the Unknown','Show Yourself','Part of Your World',
  'Under the Sea','Be Our Guest','Belle','Something There',
  'Somewhere Over the Rainbow','Over the Rainbow','What a Wonderful World',
  'Tennessee Whiskey','Take Me Home, Country Roads','Country Roads',
  'Friends in Low Places','Wagon Wheel','Chicken Fried','Cruise',
  'Body Like a Back Road','Die a Happy Man','Think Out Loud',
  'Thinking Out Loud','Shape of You','Perfect','Castle on the Hill',
  'Photograph','Don\'t','Galway Girl','Lego House','A-Team',
  'Blinding Lights','Starboy','Can\'t Feel My Face','Save Your Tears',
  'As It Was','Watermelon Sugar','Adore You','Golden','Lights Up',
  'Bad Guy','Ocean Eyes','Lovely','Everything I Wanted',
  'drivers license','good 4 u','vampire','Vampire',
  'Anti-Hero','Shake It Off','Blank Space','Love Story',
  'You Belong with Me','Fearless','White Horse','Enchanted',
  'Cruel Summer','Cardigan','august','Betty',
  'Levitating','Physical','Break My Heart','New Rules',
  'IDGAF','Don\'t Start Now','Electricity','One Kiss',
  'Sweet but Psycho','In My Blood','Stitches','Mercy',
  'Sign of the Times','Waterfall','Two Ghosts','Carolina',
]);

function selectTop500(allSongs) {
  // Deduplicate by slug
  const slugSeen = new Set();
  const unique = [];
  for (const s of allSongs) {
    const sl = songSlug(s.title, s.artist);
    if (!slugSeen.has(sl)) { slugSeen.add(sl); unique.push({...s, slug: sl}); }
  }

  // Sort: priority songs first, then rest
  unique.sort((a, b) => {
    const aPri = PRIORITY.has(a.title) ? 0 : 1;
    const bPri = PRIORITY.has(b.title) ? 0 : 1;
    return aPri - bPri;
  });

  return unique.slice(0, MAX_PAGES);
}

// ─── RELATED SONGS ────────────────────────────────────────────────────────────
function findRelated(song, pool, count = 4) {
  return pool
    .filter(s => s.slug !== song.slug)
    .map(s => ({...s, dist: Math.abs(s.lo - song.lo) + Math.abs(s.hi - song.hi) + Math.abs(s.brightness - song.brightness) * 0.1}))
    .sort((a,b) => a.dist - b.dist)
    .slice(0, count);
}

// ─── HTML PAGE TEMPLATE ───────────────────────────────────────────────────────
function renderPage(song, related) {
  const loNote  = midiToNote(song.lo);
  const hiNote  = midiToNote(song.hi);
  const loAscii = midiToNoteAscii(song.lo);
  const hiAscii = midiToNoteAscii(song.hi);
  const span      = song.hi - song.lo;
  const diff      = getDifficulty(song.lo, song.hi);
  const voiceType = getVoiceType(song.hi);
  const aSlug     = artistSlug(song.artist);
  const ytQuery = encodeURIComponent(`${song.title} ${song.artist} karaoke`);
  
  // Enhanced features
  const voiceTypes = getVoiceTypes(song.lo, song.hi);
  const bestFor = getBestFor(span, song.brightness, song.lo, song.hi);
  const transpose = getTransposeAdvice(span, song.lo, song.hi);
  const today   = new Date().toISOString().split('T')[0];

  const pageTitle = `${song.title} - Vocal Range & Karaoke Guide | HumMatch`;
  const metaDesc  = `Find out if you can sing "${song.title}" by ${song.artist}. Vocal range: ${loAscii}–${hiAscii} (${span} semitones). Difficulty: ${diff.label}. Test your voice free on HumMatch.`;

  // Schema: MusicComposition
  const musicSchema = {
    "@context": "https://schema.org",
    "@type": "MusicComposition",
    "name": song.title,
    "composer": { "@type": "MusicGroup", "name": song.artist },
    ...(song.year ? { "datePublished": String(song.year) } : {}),
    "url": `${BASE_URL}/song/${song.slug}`
  };

  // Schema: FAQPage
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `What vocal range do I need to sing ${song.title}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `${song.title} by ${song.artist} requires a vocal range from ${loAscii} to ${hiAscii}, spanning ${span} semitones (${span < 12 ? 'less than one octave' : span === 12 ? 'exactly one octave' : `${(span/12).toFixed(1)} octaves`}).`
        }
      },
      {
        "@type": "Question",
        "name": `Is ${song.title} hard to sing?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `${song.title} is rated ${diff.label}. ${diff.desc} It spans ${span} semitones from ${loAscii} to ${hiAscii}.`
        }
      },
      {
        "@type": "Question",
        "name": `Can I sing ${song.title} at karaoke?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Whether you can sing ${song.title} depends on your personal vocal range. The song requires ${loAscii} to ${hiAscii}. Use HumMatch to test your exact range for free in under 10 seconds.`
        }
      },
      {
        "@type": "Question",
        "name": `What is the highest note in ${song.title}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `The highest note in ${song.title} by ${song.artist} is ${hiAscii}. If you can comfortably sing ${hiAscii}, this song is within your reach.`
        }
      }
    ]
  };

  // Schema: BreadcrumbList (4-level: Home > Songs > Artist > Song)
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home",      "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": "Songs",     "item": `${BASE_URL}/song/` },
      { "@type": "ListItem", "position": 3, "name": song.artist, "item": `${BASE_URL}/artist/${aSlug}` },
      { "@type": "ListItem", "position": 4, "name": song.title,  "item": `${BASE_URL}/song/${song.slug}` }
    ]
  };

  const relatedCards = related.map(r => {
    const rLo   = midiToNote(r.lo);
    const rHi   = midiToNote(r.hi);
    const rDiff = getDifficulty(r.lo, r.hi);
    return `
        <a href="/song/${r.slug}" class="rel-card">
          <div class="rel-title">${esc(r.title)}</div>
          <div class="rel-artist">${esc(r.artist)}</div>
          <div class="rel-meta">${rLo}–${rHi} &nbsp;<span style="color:${rDiff.color}">${rDiff.label}</span></div>
        </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(pageTitle)}</title>
  <meta name="description" content="${esc(metaDesc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${BASE_URL}/song/${song.slug}">

  <!-- Open Graph -->
  <meta property="og:type"        content="website">
  <meta property="og:title"       content="${esc(pageTitle)}">
  <meta property="og:description" content="${esc(metaDesc)}">
  <meta property="og:url"         content="${BASE_URL}/song/${song.slug}">
  <meta property="og:site_name"   content="HumMatch">

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary">
  <meta name="twitter:title"       content="${esc(pageTitle)}">
  <meta name="twitter:description" content="${esc(metaDesc)}">

  <!-- Structured Data -->
  <script type="application/ld+json">${JSON.stringify(musicSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:       #0d0b1a;
      --card:     rgba(255,255,255,0.04);
      --border:   rgba(124,58,237,0.15);
      --grad:     linear-gradient(135deg, #A855F7, #EC4899);
      --purple:   #A855F7;
      --pink:     #EC4899;
      --text:     #e2e0f0;
      --muted:    rgba(255,255,255,0.45);
      --radius:   14px;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; line-height: 1.65; }

    /* ── NAV ── */
    nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 24px;
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 50;
      background: rgba(13,11,26,0.92); backdrop-filter: blur(12px);
    }
    .logo { font-size: 1.2rem; font-weight: 800; text-decoration: none; background: var(--grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .nav-links { display: flex; gap: 8px; align-items: center; }
    .nav-link { color: var(--muted); text-decoration: none; font-size: 0.875rem; padding: 6px 12px; border-radius: 8px; transition: color 0.15s; }
    .nav-link:hover { color: var(--text); }
    .nav-btn { background: var(--grad); color: #fff; padding: 8px 18px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 0.875rem; transition: opacity 0.15s; }
    .nav-btn:hover { opacity: 0.85; }

    /* ── HERO ── */
    .hero { max-width: 880px; margin: 0 auto; padding: 48px 24px 32px; }
    .breadcrumb { font-size: 0.8rem; color: var(--muted); margin-bottom: 20px; }
    .breadcrumb a { color: var(--muted); text-decoration: none; }
    .breadcrumb a:hover { color: var(--purple); }
    .breadcrumb span { margin: 0 6px; }
    h1 { font-size: clamp(1.8rem, 5vw, 2.9rem); font-weight: 800; line-height: 1.15; margin-bottom: 6px; }
    .by-artist { font-size: 1.05rem; color: var(--muted); margin-bottom: 36px; }
    .by-artist strong { color: var(--text); }

    /* ── STATS GRID ── */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 40px; }
    .stat { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; text-align: center; }
    .stat-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.09em; color: var(--muted); margin-bottom: 8px; }
    .stat-val { font-size: 1.6rem; font-weight: 800; }
    .stat-sub { font-size: 0.72rem; color: var(--muted); margin-top: 3px; }

    /* ── CONTENT ── */
    .content { max-width: 880px; margin: 0 auto; padding: 0 24px 80px; }

    /* ── SECTION ── */
    .section { margin: 40px 0; }
    h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; }

    /* ── CTA BANNER ── */
    .cta-box {
      background: linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.12));
      border: 1px solid rgba(168,85,247,0.28);
      border-radius: 18px; padding: 32px; text-align: center; margin: 36px 0;
    }
    .cta-box h2 { font-size: 1.4rem; margin-bottom: 10px; }
    .cta-box p  { color: var(--muted); font-size: 0.95rem; margin-bottom: 22px; max-width: 480px; margin-left: auto; margin-right: auto; }
    .btn-grad  { display: inline-block; background: var(--grad); color: #fff; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 1rem; text-decoration: none; transition: opacity 0.15s, transform 0.1s; }
    .btn-grad:hover  { opacity: 0.88; transform: translateY(-1px); }
    .btn-ghost { display: inline-block; border: 1px solid rgba(255,255,255,0.14); color: var(--text); padding: 13px 24px; border-radius: 12px; font-weight: 600; font-size: 0.9rem; text-decoration: none; margin-left: 12px; transition: background 0.15s; }
    .btn-ghost:hover { background: rgba(255,255,255,0.07); }

    /* ── RANGE VIZ ── */
    .range-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px 26px; }
    .range-desc { font-size: 0.92rem; color: var(--muted); margin-bottom: 18px; }
    .range-desc strong { color: var(--text); }
    .range-track { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
    .range-note  { font-size: 0.82rem; font-weight: 700; color: var(--muted); min-width: 36px; }
    .range-bg    { flex: 1; height: 10px; background: rgba(255,255,255,0.07); border-radius: 5px; position: relative; }
    .range-fill  { height: 100%; border-radius: 5px; background: var(--grad); position: absolute; }
    .diff-pill   { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; }

    /* ── YOUTUBE ── */
    .yt-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .yt-inner { padding: 36px; text-align: center; }
    .yt-inner p { color: var(--muted); font-size: 0.9rem; margin-bottom: 18px; }
    .btn-yt { display: inline-flex; align-items: center; gap: 8px; background: #FF0000; color: #fff; padding: 12px 26px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 0.9rem; transition: opacity 0.15s; }
    .btn-yt:hover { opacity: 0.85; }
    .yt-note { font-size: 0.78rem; color: var(--muted); margin-top: 10px; }

    /* ── FAQ ── */
    .faq-item { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 24px; margin-bottom: 12px; }
    .faq-q { font-weight: 700; font-size: 0.95rem; margin-bottom: 8px; cursor: default; }
    .faq-a { color: var(--muted); font-size: 0.9rem; line-height: 1.6; }
    .faq-a strong { color: var(--text); }

    /* ── RELATED ── */
    .rel-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
    .rel-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; text-decoration: none; color: var(--text); display: block; transition: border-color 0.15s, background 0.15s; }
    .rel-card:hover { border-color: rgba(168,85,247,0.45); background: rgba(168,85,247,0.07); }
    .rel-title  { font-weight: 700; font-size: 0.9rem; margin-bottom: 4px; }
    .rel-artist { font-size: 0.78rem; color: var(--muted); margin-bottom: 8px; }
    .rel-meta   { font-size: 0.78rem; color: var(--muted); }

    /* ── FOOTER ── */
    footer { border-top: 1px solid var(--border); padding: 32px 24px; text-align: center; color: var(--muted); font-size: 0.82rem; }
    footer a { color: var(--muted); text-decoration: none; }
    footer a:hover { color: var(--purple); }

    @media (max-width: 580px) {
      .btn-ghost { display: block; margin: 10px auto 0; max-width: 200px; text-align: center; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .hero { padding-top: 32px; }
    }
  </style>
</head>
<body>

<nav>
  <a href="/" class="logo">HumMatch</a>
  <div class="nav-links">
    <a href="/#catalog" class="nav-link">Songs</a>
    <a href="/blog" class="nav-link">Blog</a>
    <a href="/" class="nav-btn">Test My Voice</a>
  </div>
</nav>

<!-- HERO -->
<div class="hero">
  <nav aria-label="Breadcrumb" class="breadcrumb"><!-- seo-links-v1 -->
    <a href="/">Home</a><span>›</span>
    <a href="/song/">Songs</a><span>›</span>
    <a href="/artist/${aSlug}">${esc(song.artist)}</a><span>›</span>
    ${esc(song.title)}
  </nav>

  <h1>${esc(song.title)}</h1>
  <p class="by-artist">by <a href="/artist/${aSlug}" style="color:inherit;text-decoration:none"><strong>${esc(song.artist)}</strong></a>${song.year ? ` &nbsp;·&nbsp; ${song.year}` : ''}</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px;margin-top:-20px">
    <a href="/artist/${aSlug}" style="background:rgba(255,255,255,0.05);border:1px solid rgba(124,58,237,0.2);border-radius:20px;padding:5px 14px;font-size:0.78rem;text-decoration:none;color:rgba(255,255,255,0.5)">All ${esc(song.artist)} songs →</a>
    <a href="${diff.catPath}" style="background:rgba(255,255,255,0.05);border:1px solid rgba(124,58,237,0.2);border-radius:20px;padding:5px 14px;font-size:0.78rem;text-decoration:none;color:rgba(255,255,255,0.5)">${diff.emoji} ${diff.label} Songs</a>
    <a href="${voiceType.path}" style="background:rgba(255,255,255,0.05);border:1px solid rgba(124,58,237,0.2);border-radius:20px;padding:5px 14px;font-size:0.78rem;text-decoration:none;color:rgba(255,255,255,0.5)">${voiceType.label} Songs</a>
  </div>

  <div class="stats-grid">
    <div class="stat">
      <div class="stat-label">Low Note</div>
      <div class="stat-val">${loNote}</div>
      <div class="stat-sub">MIDI ${song.lo}</div>
    </div>
    <div class="stat">
      <div class="stat-label">High Note</div>
      <div class="stat-val">${hiNote}</div>
      <div class="stat-sub">MIDI ${song.hi}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Span</div>
      <div class="stat-val">${span}</div>
      <div class="stat-sub">semitones</div>
    </div>
    <div class="stat">
      <div class="stat-label">Difficulty</div>
      <div class="stat-val" style="color:${diff.color}">${diff.label}</div>
      <div class="stat-sub">${diff.emoji}</div>
    </div>
  </div>
</div>

<!-- CONTENT -->
<div class="content">

  <!-- TOP CTA -->
  <div class="cta-box">
    <h2>Can You Sing "${esc(song.title)}"?</h2>
    <p>Hum into your microphone for 5 seconds. HumMatch instantly detects your vocal range and tells you if this song fits your voice.</p>
    <a href="/" class="btn-grad">🎤 Test My Voice — Free</a>
    <a href="/#catalog" class="btn-ghost">Browse All Songs</a>
  </div>

  <!-- RANGE VISUALIZATION -->
  <div class="section">
    <h2>Vocal Range Breakdown</h2>
    <div class="range-card">
      <p class="range-desc">
        <strong>${esc(song.title)}</strong> spans <strong>${span} semitones</strong> —
        from <strong style="color:var(--purple)">${loNote}</strong>
        to <strong style="color:var(--pink)">${hiNote}</strong>
        ${span < 12 ? '(under one octave)' : span === 12 ? '(exactly one octave)' : `(${(span/12).toFixed(1)} octaves)`}.
      </p>
      <div class="range-track">
        <span class="range-note">${loNote}</span>
        <div class="range-bg">
          <div class="range-fill" style="left:${barLeft(song.lo)}%; width:${barWidth(song.lo,song.hi)}%;"></div>
        </div>
        <span class="range-note">${hiNote}</span>
      </div>
      <div>
        <span class="diff-pill" style="background:${diff.color}1a; border:1px solid ${diff.color}40; color:${diff.color}">
          ${diff.emoji} ${diff.label} — ${diff.desc}
        </span>
      </div>
    </div>
  </div>

  <!-- Voice Type Fit -->
  <div class="section">
    <h2>Perfect For These Voice Types</h2>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      ${voiceTypes.map(function(vt) { return '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 18px;flex:1;min-width:140px"><div style="font-size:1.4rem;margin-bottom:4px">' + vt.icon + '</div><div style="font-weight:700;font-size:0.95rem;margin-bottom:2px">' + vt.name + '</div><div style="font-size:0.8rem;color:var(--muted)">' + vt.desc + '</div></div>'; }).join('')}
    </div>
  </div>

  ${bestFor.length > 0 ? '<div class="section"><h2>Best For</h2><div style="display:flex;gap:10px;flex-wrap:wrap">' + bestFor.map(function(bf) { return '<div style="background:linear-gradient(135deg,rgba(168,85,247,0.08),rgba(236,72,153,0.08));border:1px solid rgba(168,85,247,0.2);border-radius:10px;padding:12px 16px;flex:1;min-width:150px"><div style="font-size:1.2rem;margin-bottom:4px">' + bf.icon + '</div><div style="font-weight:700;font-size:0.9rem;margin-bottom:2px">' + bf.label + '</div><div style="font-size:0.78rem;color:var(--muted)">' + bf.reason + '</div></div>'; }).join('') + '</div></div>' : ''}

  ${transpose ? '<div class="section"><div style="background:rgba(255,165,0,0.1);border:1px solid rgba(255,165,0,0.3);border-radius:12px;padding:18px 20px"><div style="display:flex;align-items:center;gap:12px"><div style="font-size:1.8rem">🎹</div><div><div style="font-weight:700;font-size:0.95rem;margin-bottom:4px">Try Transposing ' + transpose.direction + '</div><div style="font-size:0.85rem;color:var(--muted)">Shift ' + Math.abs(transpose.semitones) + ' semitones ' + transpose.direction.toLowerCase() + ' for ' + transpose.reason + '. Most karaoke apps let you adjust pitch.</div></div></div></div></div>' : ''}

  <div class="section">
    <div style="background:linear-gradient(135deg,rgba(168,85,247,0.12),rgba(236,72,153,0.12));border:1px solid rgba(168,85,247,0.28);border-radius:14px;padding:20px 24px;text-align:center">
      <h3 style="font-size:1.15rem;margin-bottom:8px">🎸 Can Your Squad Nail This Together?</h3>
      <p style="font-size:0.88rem;color:var(--muted);margin-bottom:14px;max-width:420px;margin-left:auto;margin-right:auto">Test your group's vocal ranges and find songs everyone can sing. Perfect for karaoke nights and road trips.</p>
      <a href="/squadmatch" style="display:inline-block;background:var(--grad);color:#fff;padding:10px 24px;border-radius:10px;font-weight:700;font-size:0.9rem;text-decoration:none">➡️ Try SquadMatch</a>
    </div>
  </div>

  <!-- KARAOKE VIDEO -->
  <div class="section">
    <h2>Karaoke Video</h2>
    <div class="yt-card">
      <div class="yt-inner">
        <p>Practice singing <strong style="color:var(--text)">${esc(song.title)}</strong> with a backing track:</p>
        <a href="https://www.youtube.com/results?search_query=${ytQuery}"
           target="_blank" rel="noopener noreferrer" class="btn-yt">
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none"><rect width="20" height="14" rx="3" fill="#FF0000"/><path d="M8 10V4l5 3-5 3z" fill="#fff"/></svg>
          Find Karaoke Version on YouTube
        </a>
        <div class="yt-note">Opens YouTube search for "${esc(song.title)} karaoke"</div>
      </div>
    </div>
  </div>

  <!-- FAQ -->
  <div class="section">
    <h2>Frequently Asked Questions</h2>

    <div class="faq-item">
      <div class="faq-q">What vocal range do I need to sing ${esc(song.title)}?</div>
      <div class="faq-a">
        <strong>${esc(song.title)}</strong> by ${esc(song.artist)} requires a vocal range from
        <strong>${loNote}</strong> to <strong>${hiNote}</strong>,
        spanning <strong>${span} semitones</strong>
        ${span < 12 ? '— under one octave, so it\'s accessible for most voices.' : span === 12 ? '— exactly one octave.' : `— about ${(span/12).toFixed(1)} octaves.`}
      </div>
    </div>

    <div class="faq-item">
      <div class="faq-q">Is ${esc(song.title)} hard to sing?</div>
      <div class="faq-a">
        <strong style="color:${diff.color}">${diff.label}.</strong> ${diff.desc}
        The song spans ${span} semitones from ${loNote} to ${hiNote}.
        ${span <= 12 ? 'Most casual singers can handle this range.' : span <= 17 ? 'Singers with some training should be comfortable with this range.' : 'This is one of the more demanding ranges in the karaoke catalog — practice the high notes before performing live.'}
      </div>
    </div>

    <div class="faq-item">
      <div class="faq-q">Can I sing ${esc(song.title)} at karaoke?</div>
      <div class="faq-a">
        It depends on your vocal range. <strong>${esc(song.title)}</strong> sits between <strong>${loNote}</strong> and <strong>${hiNote}</strong>.
        If your range covers those notes, you'll nail it. Not sure?
        <a href="/" style="color:var(--purple)">HumMatch detects your range in seconds</a> — just hum a note.
      </div>
    </div>

    <div class="faq-item">
      <div class="faq-q">What is the highest note in ${esc(song.title)}?</div>
      <div class="faq-a">
        The highest note in <strong>${esc(song.title)}</strong> by ${esc(song.artist)} is
        <strong>${hiNote}</strong> (MIDI ${song.hi}).
        ${song.hi >= 72 ? 'This puts it in soprano/high tenor territory — a challenging note for most singers.' : song.hi >= 65 ? 'This is in the upper-mid range — reachable for tenors and mezzo-sopranos.' : 'This is a comfortable upper limit for baritones and altos.'}
      </div>
    </div>

    <div class="faq-item">
      <div class="faq-q">What is the lowest note in ${esc(song.title)}?</div>
      <div class="faq-a">
        The lowest note is <strong>${loNote}</strong> (MIDI ${song.lo}).
        ${song.lo <= 40 ? 'This dips into bass/baritone territory — singers with a lower register will feel at home.' : song.lo <= 48 ? 'This is a comfortable low-mid range, accessible for most voice types.' : 'The low note is in the tenor/alto range — no deep bass required.'}
      </div>
    </div>
  </div>

  <!-- RELATED SONGS -->
  <div class="section">
    <h2>Similar Songs by Vocal Range</h2>
    <div class="rel-grid">
      ${relatedCards}
    </div>
  </div>

  <!-- BOTTOM CTA -->
  <div class="cta-box" style="margin-top:52px">
    <h2>Find Every Song That Fits YOUR Voice</h2>
    <p>HumMatch analyzes your exact vocal range from a 5-second hum — then instantly shows you which of our 2,600+ songs you can sing. No sign-up, no downloads, completely free.</p>
    <a href="/" class="btn-grad">🎤 Start Humming — It's Free</a>
  </div>

</div><!-- /content -->

<footer>
  <p>
    &copy; ${new Date().getFullYear()} HumMatch &nbsp;·&nbsp;
    <a href="/privacy">Privacy</a> &nbsp;·&nbsp;
    <a href="/terms">Terms</a> &nbsp;·&nbsp;
    <a href="/blog">Blog</a> &nbsp;·&nbsp;
    <a href="/">Try HumMatch Free</a>
  </p>
</footer>

</body>
</html>`;
}

// ─── SITEMAP ──────────────────────────────────────────────────────────────────
function buildSitemap(songs) {
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { url:'/',                                priority:'1.0', freq:'weekly'  },
    { url:'/blog',                            priority:'0.8', freq:'weekly'  },
    { url:'/pricing',                         priority:'0.7', freq:'monthly' },
    { url:'/song/',                           priority:'0.8', freq:'weekly'  },
    { url:'/easy-songs',                      priority:'0.75',freq:'weekly'  },
    { url:'/medium-songs',                    priority:'0.75',freq:'weekly'  },
    { url:'/hard-songs',                      priority:'0.75',freq:'weekly'  },
    { url:'/bass-songs',                      priority:'0.75',freq:'weekly'  },
    { url:'/baritone-songs',                  priority:'0.75',freq:'weekly'  },
    { url:'/tenor-songs',                     priority:'0.75',freq:'weekly'  },
    { url:'/alto-songs',                      priority:'0.75',freq:'weekly'  },
    { url:'/soprano-songs',                   priority:'0.75',freq:'weekly'  },
    { url:'/blog/find-songs-you-can-nail',    priority:'0.8', freq:'monthly' },
    { url:'/blog/how-hummatch-works',         priority:'0.8', freq:'monthly' },
    { url:'/blog/how-hummatch-was-built',     priority:'0.6', freq:'monthly' },
  ];

  const staticXml = staticPages.map(p =>
    `  <url><loc>${BASE_URL}${p.url}</loc><lastmod>${today}</lastmod><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority></url>`
  ).join('\n');

  const songXml = songs.map(s =>
    `  <url><loc>${BASE_URL}/song/${s.slug}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.65</priority></url>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- ── CORE PAGES ── -->
${staticXml}

  <!-- ── SONG PAGES (${songs.length}) ── -->
${songXml}

</urlset>
`;
}

// ─── ROBOTS.TXT ───────────────────────────────────────────────────────────────
function buildRobots() {
  return `User-agent: *
Allow: /
Allow: /song/
Allow: /blog/
Disallow: /api/
Disallow: /analytics

Sitemap: ${BASE_URL}/sitemap.xml
`;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function main() {
  const startMs = Date.now();
  console.log('\n🎵  HumMatch Programmatic SEO Generator');
  console.log('========================================\n');

  // 1. Parse
  const allSongs = parseSongs();
  console.log(`✅  Parsed ${allSongs.length} songs from index.html\n`);

  // 2. Select top 500
  const songs = selectTop500(allSongs);
  const priorityCount = songs.filter(s => PRIORITY.has(s.title)).length;
  console.log(`✅  Selected ${songs.length} songs  (${priorityCount} priority karaoke hits + ${songs.length - priorityCount} others)\n`);

  // 3. Create /song/ directory
  if (!fs.existsSync(SONG_DIR)) {
    fs.mkdirSync(SONG_DIR, { recursive: true });
  }

  // 4. Generate pages
  console.log('🏗️   Generating song pages...');
  let generated = 0;
  const errors  = [];

  for (const song of songs) {
    try {
      const related  = findRelated(song, songs);
      const html     = renderPage(song, related);
      fs.writeFileSync(path.join(SONG_DIR, `${song.slug}.html`), html, 'utf8');
      generated++;
      if (generated % 100 === 0) process.stdout.write(`      ${generated}/${songs.length}...\n`);
    } catch (err) {
      errors.push({ song: song.slug, err: err.message });
    }
  }

  console.log(`\n✅  Generated ${generated} pages  (${errors.length} errors)\n`);
  if (errors.length) {
    errors.slice(0,5).forEach(e => console.log(`   ⚠️  ${e.song}: ${e.err}`));
  }

  // 5. Sitemap
  console.log('🗺️   Writing sitemap.xml...');
  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), buildSitemap(songs), 'utf8');
  console.log(`✅  sitemap.xml  (${songs.length + 6} URLs)\n`);

  // 6. robots.txt
  console.log('🤖  Writing robots.txt...');
  fs.writeFileSync(path.join(__dirname, 'robots.txt'), buildRobots(), 'utf8');
  console.log('✅  robots.txt\n');

  // 7. Summary
  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  console.log('═══════════════════════════════════════');
  console.log(`🎉  Done in ${elapsed}s`);
  console.log(`   • ${generated} HTML pages  →  /song/`);
  console.log(`   • sitemap.xml updated`);
  console.log(`   • robots.txt created`);
  console.log('\nTest locally:');
  console.log('   node server.js');
  console.log('   open http://localhost:3000/song/' + (songs[0] ? songs[0].slug : 'ring-of-fire-johnny-cash'));
  console.log('\nTo add YouTube video IDs, update YOUTUBE_IDS in this script.\n');
}

main();
