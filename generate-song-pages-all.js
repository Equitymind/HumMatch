#!/usr/bin/env node
/**
 * HumMatch Programmatic SEO Generator — ALL SONGS
 * Generates a static page for every song in the catalog.
 * Skips pages that already exist (incremental mode).
 *
 * Run:  node generate-song-pages-all.js
 * Args: --force   Regenerate all pages (even existing ones)
 *       --range 501-1000   Only generate a specific range (1-based index)
 */

const fs   = require('fs');
const path = require('path');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const BASE_URL = 'https://hummatch.me';
const SONG_DIR = path.join(__dirname, 'song');
const INDEX_HTML = path.join(__dirname, 'index.html');

const args   = process.argv.slice(2);
const FORCE  = args.includes('--force');
const rangeArg = args.find(a => a.startsWith('--range'));
let RANGE_START = 1, RANGE_END = Infinity;
if (rangeArg) {
  const [, r] = rangeArg.split('=');
  const parts = (r || args[args.indexOf('--range') + 1] || '').split('-');
  if (parts.length === 2) { RANGE_START = +parts[0]; RANGE_END = +parts[1]; }
}

// ─── MIDI → NOTE NAME ─────────────────────────────────────────────────────────
const NOTE_NAMES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
function midiToNote(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return NOTE_NAMES[midi % 12] + octave;
}
function midiToNoteAscii(midi) {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return names[midi % 12] + (Math.floor(midi / 12) - 1);
}

// ─── DIFFICULTY ───────────────────────────────────────────────────────────────
function getDifficulty(lo, hi) {
  const span = hi - lo;
  if (span <= 12) return { label:'Easy',   emoji:'🟢', color:'#22c55e', desc:'Comfortable for most singers — fits within one octave.' };
  if (span <= 17) return { label:'Medium', emoji:'🟡', color:'#f59e0b', desc:'Moderate challenge — requires some vocal training.' };
  return               { label:'Hard',   emoji:'🔴', color:'#ef4444', desc:'Demanding range — best for experienced singers.' };
}

// ─── SLUG ─────────────────────────────────────────────────────────────────────
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function songSlug(title, artist) { return slugify(title) + '-' + slugify(artist); }

// ─── HTML ESCAPE ──────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}

// ─── RANGE BAR HELPERS ────────────────────────────────────────────────────────
const MIDI_MIN = 36, MIDI_MAX = 84;
function barLeft(lo)     { return Math.max(0, Math.round(((lo - MIDI_MIN)/(MIDI_MAX-MIDI_MIN))*100)); }
function barWidth(lo,hi) { return Math.min(100-barLeft(lo), Math.max(4, Math.round(((hi-lo)/(MIDI_MAX-MIDI_MIN))*100))); }

// ─── PARSE ALL SONGS FROM index.html ─────────────────────────────────────────
function parseSongs() {
  console.log('  Reading index.html...');
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  const songs = [];
  const seen  = new Set();

  // Format A — JS object style: { title:'...', artist:'...', lo:N, hi:N, brightness:N }
  const reA = /\{\s*title:'((?:[^'\\]|\\.)*)'\s*,\s*artist:'((?:[^'\\]|\\.)*)'\s*,\s*lo:(\d+)\s*,\s*hi:(\d+)\s*,\s*brightness:(\d+)(?:\s*,\s*year:(\d+))?\s*(?:,\s*tags:[^\}]*)?\}/g;
  let m;
  while ((m = reA.exec(html)) !== null) {
    const key = m[1]+'|'+m[2];
    if (!seen.has(key)) {
      seen.add(key);
      songs.push({ title: m[1].replace(/\\'/g,"'"), artist: m[2].replace(/\\'/g,"'"),
                   lo: +m[3], hi: +m[4], brightness: +m[5], year: m[6] ? +m[6] : null });
    }
  }

  // Format B — JSON style
  const reB = /\{"title":"((?:[^"\\]|\\.)*)","artist":"((?:[^"\\]|\\.)*)","lo":(\d+),"hi":(\d+),"brightness":(\d+)(?:,"year":(\d+))?[^}]*?\}/g;
  while ((m = reB.exec(html)) !== null) {
    const key = m[1]+'|'+m[2];
    if (!seen.has(key)) {
      seen.add(key);
      songs.push({ title: m[1].replace(/\\"/g,'"'), artist: m[2].replace(/\\"/g,'"'),
                   lo: +m[3], hi: +m[4], brightness: +m[5], year: m[6] ? +m[6] : null });
    }
  }

  return songs;
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
  const span    = song.hi - song.lo;
  const diff    = getDifficulty(song.lo, song.hi);
  const ytQuery = encodeURIComponent(`${song.title} ${song.artist} karaoke`);

  const pageTitle = `${song.title} - Vocal Range & Karaoke Guide | HumMatch`;
  const metaDesc  = `Find out if you can sing "${song.title}" by ${song.artist}. Vocal range: ${loAscii}–${hiAscii} (${span} semitones). Difficulty: ${diff.label}. Test your voice free on HumMatch.`;

  const musicSchema = {
    "@context": "https://schema.org", "@type": "MusicComposition",
    "name": song.title, "composer": { "@type": "MusicGroup", "name": song.artist },
    ...(song.year ? { "datePublished": String(song.year) } : {}),
    "url": `${BASE_URL}/song/${song.slug}`
  };

  const faqSchema = {
    "@context": "https://schema.org", "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": `What vocal range do I need to sing ${song.title}?`,
        "acceptedAnswer": { "@type": "Answer", "text": `${song.title} by ${song.artist} requires a vocal range from ${loAscii} to ${hiAscii}, spanning ${span} semitones (${span < 12 ? 'less than one octave' : span === 12 ? 'exactly one octave' : `${(span/12).toFixed(1)} octaves`}).` }},
      { "@type": "Question", "name": `Is ${song.title} hard to sing?`,
        "acceptedAnswer": { "@type": "Answer", "text": `${song.title} is rated ${diff.label}. ${diff.desc} It spans ${span} semitones from ${loAscii} to ${hiAscii}.` }},
      { "@type": "Question", "name": `Can I sing ${song.title} at karaoke?`,
        "acceptedAnswer": { "@type": "Answer", "text": `Whether you can sing ${song.title} depends on your personal vocal range. The song requires ${loAscii} to ${hiAscii}. Use HumMatch to test your exact range for free in under 10 seconds.` }},
      { "@type": "Question", "name": `What is the highest note in ${song.title}?`,
        "acceptedAnswer": { "@type": "Answer", "text": `The highest note in ${song.title} by ${song.artist} is ${hiAscii}. If you can comfortably sing ${hiAscii}, this song is within your reach.` }}
    ]
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "HumMatch", "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": "Songs", "item": `${BASE_URL}/#catalog` },
      { "@type": "ListItem", "position": 3, "name": song.title, "item": `${BASE_URL}/song/${song.slug}` }
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

    /* ── YOUTUBE HERO ── */
    .yt-hero { margin: 28px 0 20px; border-radius: 16px; overflow: hidden; border: 1px solid var(--border); background: var(--card); }
    .yt-thumb {
      position: relative; width: 100%; aspect-ratio: 16/9; max-height: 340px;
      background: linear-gradient(135deg, #1a0a2e 0%, #0d0b1a 50%, #1a0a2e 100%);
      display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden;
    }
    .yt-thumb::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(ellipse at center, rgba(168,85,247,0.15) 0%, transparent 70%);
    }
    .yt-play-btn {
      width: 80px; height: 80px; background: #FF0000; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 40px rgba(255,0,0,0.35), 0 0 80px rgba(255,0,0,0.15);
      transition: transform 0.15s, box-shadow 0.15s; position: relative; z-index: 1;
    }
    .yt-thumb:hover .yt-play-btn { transform: scale(1.08); box-shadow: 0 0 50px rgba(255,0,0,0.5), 0 0 100px rgba(255,0,0,0.2); }
    .yt-thumb-label {
      position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.7); color: rgba(255,255,255,0.75); font-size: 0.78rem;
      padding: 4px 12px; border-radius: 20px; white-space: nowrap; z-index: 1;
    }
    .yt-thumb-song {
      position: absolute; top: 16px; left: 16px; right: 16px; z-index: 1;
      font-size: 0.85rem; font-weight: 700; color: rgba(255,255,255,0.85); text-align: center;
    }

    /* ── VOICE CTA (after video) ── */
    .voice-cta {
      background: linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.15));
      border: 1px solid rgba(168,85,247,0.32); border-top: none;
      border-radius: 0 0 16px 16px; padding: 22px 24px; text-align: center;
    }
    .btn-test-voice {
      display: inline-block; background: var(--grad); color: #fff;
      padding: 14px 36px; border-radius: 12px; font-weight: 800; font-size: 1.05rem;
      text-decoration: none; transition: opacity 0.15s, transform 0.1s;
      box-shadow: 0 4px 24px rgba(168,85,247,0.35);
    }
    .btn-test-voice:hover { opacity: 0.88; transform: translateY(-2px); box-shadow: 0 6px 32px rgba(168,85,247,0.45); }
    .voice-cta-sub { font-size: 0.82rem; color: var(--muted); margin-top: 10px; }

    /* ── YOUTUBE (legacy, kept for footer) ── */
    .btn-yt { display: inline-flex; align-items: center; gap: 8px; background: #FF0000; color: #fff; padding: 12px 26px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 0.9rem; transition: opacity 0.15s; }
    .btn-yt:hover { opacity: 0.85; }

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

    /* ── SHARE BAR ── */
    .share-wrap { padding: 18px 0 8px; }
    .share-label-sm { font-size: 0.72rem; color: var(--muted); text-align: center; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
    .share-bar { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    .share-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 10px 18px; border-radius: 10px; font-size: 0.85rem; font-weight: 700;
      text-decoration: none; border: none; cursor: pointer;
      transition: opacity 0.15s, transform 0.1s; line-height: 1;
    }
    .share-btn:hover { opacity: 0.85; transform: translateY(-1px); }
    .share-tw   { background: #000; color: #fff; }
    .share-fb   { background: #1877F2; color: #fff; }
    .share-copy { background: rgba(255,255,255,0.08); color: var(--text); border: 1px solid rgba(255,255,255,0.14); font-family: inherit; }

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
  <nav aria-label="Breadcrumb" class="breadcrumb">
    <a href="/">HumMatch</a><span>›</span>
    <a href="/#catalog">Songs</a><span>›</span>
    ${esc(song.title)}
  </nav>

  <h1>${esc(song.title)}</h1>
  <p class="by-artist">by <strong>${esc(song.artist)}</strong>${song.year ? ` &nbsp;·&nbsp; ${song.year}` : ''}</p>

  <!-- YOUTUBE + VOICE CTA (above fold) -->
  <a href="https://www.youtube.com/results?search_query=${ytQuery}"
     target="_blank" rel="noopener noreferrer" class="yt-hero" style="display:block;text-decoration:none;">
    <div class="yt-thumb">
      <div class="yt-thumb-song">${esc(song.title)} · Karaoke</div>
      <div class="yt-play-btn">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path d="M11 8l14 7-14 7V8z" fill="#fff"/>
        </svg>
      </div>
      <div class="yt-thumb-label">▶ Opens YouTube · "${esc(song.title)} karaoke"</div>
    </div>
  </a>
  <div class="voice-cta">
    <a href="/?song=${song.slug}" class="btn-test-voice">🎤 Test Your Voice on This Song</a>
    <div class="voice-cta-sub">Hum for 5 seconds — find out if <strong style="color:var(--text)">${esc(song.title)}</strong> fits your range. Free, no sign-up.</div>
  </div>

  <!-- SHARE BAR -->
  <div class="share-wrap">
    <div class="share-label-sm">Share this song</div>
    <div class="share-bar">
      <a class="share-btn share-tw"
         href="https://twitter.com/intent/tweet?text=${encodeURIComponent(`Can you sing "${esc(song.title)}"? 🎤 Test your vocal range: ${BASE_URL}/song/${song.slug}`)}"
         target="_blank" rel="noopener noreferrer"
         onclick="trackShare('twitter')">
        <svg width="14" height="14" viewBox="0 0 300 300" fill="currentColor"><path d="M178.57 127.15 290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.25h26.46l102.4-116.59 81.8 116.59h89.34M36.01 19.54H76.66l187.13 262.13h-40.66"/></svg>
        Post on X
      </a>
      <a class="share-btn share-fb"
         href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${BASE_URL}/song/${song.slug}`)}"
         target="_blank" rel="noopener noreferrer"
         onclick="trackShare('facebook')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
        Share on Facebook
      </a>
      <button class="share-btn share-copy" onclick="copyLink('${BASE_URL}/song/${song.slug}', this)">
        📋 Copy Link
      </button>
    </div>
  </div>

  <div class="stats-grid" style="margin-top:28px">
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
    <a href="/?song=${song.slug}" class="btn-grad">🎤 Test My Voice on This Song</a>
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
    <p>HumMatch analyzes your exact vocal range from a 5-second hum — then instantly shows you which of our 3,000+ songs you can sing. No sign-up, no downloads, completely free.</p>
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

<script>
function trackShare(platform) {
  try {
    fetch('/api/hummatch/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'song_share', data: { platform: platform, song: '${song.slug}' } }),
      keepalive: true
    });
  } catch(e) {}
}
function copyLink(url, btn) {
  trackShare('copy');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function() { showCopied(btn); }).catch(function() { fallbackCopy(url, btn); });
  } else {
    fallbackCopy(url, btn);
  }
}
function fallbackCopy(url, btn) {
  var ta = document.createElement('textarea');
  ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
  showCopied(btn);
}
function showCopied(btn) {
  var orig = btn.innerHTML;
  btn.textContent = '✓ Copied!';
  setTimeout(function() { btn.innerHTML = orig; }, 2000);
}
</script>
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

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function main() {
  const startMs = Date.now();
  console.log('\n🎵  HumMatch SEO Generator — ALL SONGS (incremental)');
  console.log('=====================================================\n');

  if (FORCE) console.log('  ⚡ Force mode: regenerating all pages\n');
  if (RANGE_START > 1 || RANGE_END < Infinity) {
    console.log(`  📐 Range mode: songs ${RANGE_START}–${RANGE_END}\n`);
  }

  // 1. Parse all songs
  const rawSongs = parseSongs();
  console.log(`✅  Parsed ${rawSongs.length} songs from index.html\n`);

  // 2. Deduplicate by slug
  const slugSeen = new Set();
  const allSongs = [];
  for (const s of rawSongs) {
    const sl = songSlug(s.title, s.artist);
    if (!slugSeen.has(sl)) { slugSeen.add(sl); allSongs.push({...s, slug: sl}); }
  }
  console.log(`✅  ${allSongs.length} unique songs after dedup\n`);

  // 3. Apply range filter if specified
  const rangeFiltered = allSongs.slice(RANGE_START - 1, RANGE_END);

  // 4. Ensure /song/ dir exists
  if (!fs.existsSync(SONG_DIR)) fs.mkdirSync(SONG_DIR, { recursive: true });

  // 5. Get existing pages
  const existingFiles = new Set(fs.readdirSync(SONG_DIR).map(f => f.replace(/\.html$/, '')));

  // 6. Generate pages (skip existing unless --force)
  console.log('🏗️   Generating song pages...');
  let generated = 0, skipped = 0;
  const errors  = [];

  for (const song of rangeFiltered) {
    if (!FORCE && existingFiles.has(song.slug)) {
      skipped++;
      continue;
    }
    try {
      const related = findRelated(song, allSongs);
      const html    = renderPage(song, related);
      fs.writeFileSync(path.join(SONG_DIR, `${song.slug}.html`), html, 'utf8');
      generated++;
      if (generated % 100 === 0) process.stdout.write(`      ${generated} new pages written...\n`);
    } catch (err) {
      errors.push({ song: song.slug, err: err.message });
    }
  }

  console.log(`\n✅  Generated ${generated} new pages  (${skipped} skipped, ${errors.length} errors)\n`);
  if (errors.length) errors.slice(0,5).forEach(e => console.log(`   ⚠️  ${e.song}: ${e.err}`));

  // 7. Rebuild sitemap with ALL songs that have pages
  console.log('🗺️   Rebuilding sitemap.xml with all song pages...');
  // Use allSongs but only those with existing pages (including newly generated)
  const allFiles  = new Set(fs.readdirSync(SONG_DIR).map(f => f.replace(/\.html$/, '')));
  const sitemapSongs = allSongs.filter(s => allFiles.has(s.slug));
  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), buildSitemap(sitemapSongs), 'utf8');
  console.log(`✅  sitemap.xml  (${sitemapSongs.length + 6} URLs — ${sitemapSongs.length} song pages)\n`);

  // 8. Summary
  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  console.log('═══════════════════════════════════════════════════');
  console.log(`🎉  Done in ${elapsed}s`);
  console.log(`   • ${generated} new HTML pages  →  /song/`);
  console.log(`   • ${sitemapSongs.length} total song pages in sitemap`);
  console.log(`   • sitemap.xml updated`);
  if (allSongs.length > sitemapSongs.length) {
    console.log(`\n   💡 ${allSongs.length - sitemapSongs.length} catalog songs still have no page.`);
    console.log(`      Run again without --range to generate them all.`);
  }
  console.log('');
}

main();
