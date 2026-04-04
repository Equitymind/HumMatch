#!/usr/bin/env node
/**
 * HumMatch SEO Linking Infrastructure Builder
 *
 * Generates:
 *   - /artist/[slug].html     for each unique artist
 *   - /easy-songs.html        songs ≤12 semitones
 *   - /medium-songs.html      songs 13–20 semitones
 *   - /hard-songs.html        songs 21+ semitones
 *   - /bass-songs.html        hi note ≤ C4
 *   - /baritone-songs.html    hi note C♯4–F4
 *   - /tenor-songs.html       hi note F♯4–A♯4
 *   - /alto-songs.html        hi note B4–E5
 *   - /soprano-songs.html     hi note F5+
 *   - Patches all song/*.html (breadcrumbs + artist/category links)
 *   - Updated sitemap.xml
 *
 * Run: node build-seo-links.js
 */

const fs   = require('fs');
const path = require('path');

const BASE_URL   = 'https://hummatch.me';
const ROOT       = __dirname;
const SONG_DIR   = path.join(ROOT, 'song');
const ARTIST_DIR = path.join(ROOT, 'artist');

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function slugify(str) {
  return String(str).toLowerCase()
    .replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}

// Parse note string like "F♯2" or "A♭4" → MIDI integer
function noteToMidi(note) {
  const nm = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const m  = String(note).match(/^([A-G])(♯|♭)?(-?\d+)$/);
  if (!m) return 60;
  return (parseInt(m[3])+1)*12 + (nm[m[1]]||0) + (m[2]==='♯'?1:m[2]==='♭'?-1:0);
}

// ─── CLASSIFICATION ───────────────────────────────────────────────────────────
function getDiffCat(semitones) {
  if (semitones <= 20) return 'easy';   // up to 1.67 octaves — accessible
  if (semitones <= 26) return 'medium'; // ~2 octaves — moderate challenge
  return 'hard';                        // 27+ semitones — demanding
}

function getVoiceType(hiNote) {
  const hi = noteToMidi(hiNote);
  if (hi <= 60) return 'bass';
  if (hi <= 65) return 'baritone';
  if (hi <= 70) return 'tenor';
  if (hi <= 76) return 'alto';
  return 'soprano';
}

// ─── CATEGORY METADATA ────────────────────────────────────────────────────────
const DIFF_META = {
  easy: {
    label: 'Easy', color: '#22c55e', emoji: '🟢',
    file: 'easy-songs.html', path: '/easy-songs',
    title: 'Easy Songs to Sing | Simple Karaoke Songs | HumMatch',
    metaDesc: 'Browse the best easy songs to sing at karaoke. Accessible vocal ranges up to 20 semitones — perfect for beginners and casual singers who want to sound great.',
    h1: 'Easy Songs to Sing',
    lead: 'Songs with a vocal range up to 20 semitones — the most accessible picks in our catalog. Perfect for beginners, casual karaoke nights, and anyone who wants to nail it without straining.',
    rangeNote: '≤20 semitones (up to 1.67 octaves)',
  },
  medium: {
    label: 'Medium', color: '#f59e0b', emoji: '🟡',
    file: 'medium-songs.html', path: '/medium-songs',
    title: 'Medium Difficulty Karaoke Songs | HumMatch',
    metaDesc: 'Medium difficulty songs with 21–26 semitone ranges — roughly 2 octaves. Perfect for singers with some training looking for a satisfying challenge.',
    h1: 'Medium Difficulty Songs',
    lead: 'Songs spanning 21–26 semitones — a solid challenge that rewards practice and vocal control. Great for singers ready to step up their game.',
    rangeNote: '21–26 semitones (~2 octaves)',
  },
  hard: {
    label: 'Hard', color: '#ef4444', emoji: '🔴',
    file: 'hard-songs.html', path: '/hard-songs',
    title: 'Hard Songs to Sing | Challenging Karaoke Songs | HumMatch',
    metaDesc: 'The most vocally demanding karaoke songs — 27+ semitone ranges (over 2 octaves). Power ballads, rock anthems, and showstoppers for experienced singers.',
    h1: 'Hard Songs to Sing',
    lead: 'Songs spanning 27+ semitones — demanding ranges that separate serious singers from casual ones. Power ballads, rock anthems, and showstoppers that require real vocal range.',
    rangeNote: '27+ semitones (2+ octaves)',
  },
};

const VOICE_META = {
  bass: {
    label: 'Bass', color: '#6366f1', emoji: '🎵',
    file: 'bass-songs.html', path: '/bass-songs',
    range: 'hi ≤ C4',
    title: 'Songs for Bass Voice | Low Range Karaoke Songs | HumMatch',
    metaDesc: 'The best karaoke songs for bass singers. Low ceiling songs that work perfectly for deep, powerful voices.',
    h1: 'Songs for Bass Voice',
    lead: 'Songs with a low ceiling — highest note around C4 or below. Perfect for deep bass voices who want to sing comfortably without reaching up.',
  },
  baritone: {
    label: 'Baritone', color: '#8b5cf6', emoji: '🎵',
    file: 'baritone-songs.html', path: '/baritone-songs',
    range: 'hi C♯4–F4',
    title: 'Songs for Baritone Voice | Baritone Karaoke Songs | HumMatch',
    metaDesc: 'The best karaoke songs for baritone voices. Mid-low range songs that sit comfortably in the baritone sweet spot.',
    h1: 'Songs for Baritone Voice',
    lead: 'Songs that peak in the mid-low range — the bread-and-butter territory for baritone singers. Most classic rock anthems and pop standards live here.',
  },
  tenor: {
    label: 'Tenor', color: '#a855f7', emoji: '🎵',
    file: 'tenor-songs.html', path: '/tenor-songs',
    range: 'hi F♯4–A♯4',
    title: 'Songs for Tenor Voice | Tenor Karaoke Songs | HumMatch',
    metaDesc: 'Great karaoke songs for tenor voices. Mid-to-high range songs that showcase the tenor voice at its very best.',
    h1: 'Songs for Tenor Voice',
    lead: 'Songs that peak in the classic tenor range — from pop hits to rock ballads. These tracks are where tenors truly shine.',
  },
  alto: {
    label: 'Alto', color: '#ec4899', emoji: '🎵',
    file: 'alto-songs.html', path: '/alto-songs',
    range: 'hi B4–E5',
    title: 'Songs for Alto Voice | Alto & Mezzo-Soprano Karaoke Songs | HumMatch',
    metaDesc: 'The best karaoke songs for alto and mezzo-soprano voices. Mid-to-high range songs perfect for alto singers.',
    h1: 'Songs for Alto Voice',
    lead: 'Songs peaking in the upper-mid range — perfect for alto and mezzo-soprano singers who want to flex their higher register.',
  },
  soprano: {
    label: 'Soprano', color: '#f43f5e', emoji: '🎵',
    file: 'soprano-songs.html', path: '/soprano-songs',
    range: 'hi F5+',
    title: 'Songs for Soprano Voice | High Range Karaoke Songs | HumMatch',
    metaDesc: 'Karaoke songs for soprano voices. High-reaching power anthems that demand an exceptional upper register.',
    h1: 'Songs for Soprano Voice',
    lead: 'These songs push into true soprano territory — powerful anthems and vocal showcases that demand an exceptional high register and precise control.',
  },
};

// ─── SHARED CSS ───────────────────────────────────────────────────────────────
const SHARED_CSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0d0b1a; --card: rgba(255,255,255,0.04);
      --border: rgba(124,58,237,0.15); --grad: linear-gradient(135deg, #A855F7, #EC4899);
      --purple: #A855F7; --pink: #EC4899; --text: #e2e0f0;
      --muted: rgba(255,255,255,0.45); --radius: 14px;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; line-height: 1.65; }
    nav.topnav { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 50; background: rgba(13,11,26,0.92); backdrop-filter: blur(12px); }
    .logo { font-size: 1.2rem; font-weight: 800; text-decoration: none; background: var(--grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .nav-links { display: flex; gap: 8px; align-items: center; }
    .nav-link { color: var(--muted); text-decoration: none; font-size: 0.875rem; padding: 6px 12px; border-radius: 8px; transition: color 0.15s; }
    .nav-link:hover { color: var(--text); }
    .nav-btn { background: var(--grad); color: #fff; padding: 8px 18px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 0.875rem; transition: opacity 0.15s; }
    .nav-btn:hover { opacity: 0.85; }
    .hero { max-width: 960px; margin: 0 auto; padding: 48px 24px 28px; }
    .breadcrumb { font-size: 0.8rem; color: var(--muted); margin-bottom: 20px; }
    .breadcrumb a { color: var(--muted); text-decoration: none; }
    .breadcrumb a:hover { color: var(--purple); }
    .breadcrumb span { margin: 0 6px; }
    h1 { font-size: clamp(1.8rem, 5vw, 2.6rem); font-weight: 800; line-height: 1.15; margin-bottom: 10px; }
    .lead { font-size: 1rem; color: var(--muted); max-width: 680px; margin-bottom: 28px; line-height: 1.7; }
    .stats-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 32px; }
    .stat-chip { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 9px 16px; font-size: 0.82rem; color: var(--muted); }
    .stat-chip strong { color: var(--text); }
    .content { max-width: 960px; margin: 0 auto; padding: 0 24px 80px; }
    .filter-bar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; align-items: center; }
    .filter-bar input { flex: 1; min-width: 200px; background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 10px 16px; color: var(--text); font-size: 0.9rem; outline: none; }
    .filter-bar input::placeholder { color: var(--muted); }
    .filter-bar input:focus { border-color: var(--purple); }
    .sort-select { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; color: var(--text); font-size: 0.85rem; cursor: pointer; outline: none; }
    .sort-select option { background: #1a1728; }
    .count-badge { font-size: 0.82rem; color: var(--muted); padding: 8px 4px; }
    .song-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px,1fr)); gap: 10px; }
    .song-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; text-decoration: none; color: var(--text); display: block; transition: border-color 0.15s, background 0.15s; }
    .song-card:hover { border-color: rgba(168,85,247,0.45); background: rgba(168,85,247,0.07); }
    .sc-title { font-weight: 700; font-size: 0.9rem; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sc-artist { font-size: 0.75rem; color: var(--muted); margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sc-meta { display: flex; gap: 6px; flex-wrap: wrap; }
    .sc-tag { font-size: 0.7rem; padding: 2px 7px; border-radius: 5px; background: rgba(255,255,255,0.06); color: var(--muted); }
    .diff-tag { font-weight: 700; }
    .cta-box { background: linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.12)); border: 1px solid rgba(168,85,247,0.28); border-radius: 18px; padding: 32px; text-align: center; margin: 40px 0; }
    .cta-box h2 { font-size: 1.3rem; margin-bottom: 10px; }
    .cta-box p { color: var(--muted); font-size: 0.92rem; margin-bottom: 20px; max-width: 480px; margin-left: auto; margin-right: auto; }
    .btn-grad { display: inline-block; background: var(--grad); color: #fff; padding: 13px 28px; border-radius: 12px; font-weight: 700; font-size: 0.95rem; text-decoration: none; transition: opacity 0.15s, transform 0.1s; }
    .btn-grad:hover { opacity: 0.88; transform: translateY(-1px); }
    .cat-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; align-items: center; }
    .cat-nav a { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 6px 14px; text-decoration: none; color: var(--muted); font-size: 0.8rem; transition: all 0.15s; }
    .cat-nav a:hover, .cat-nav a.active { border-color: rgba(168,85,247,0.5); color: var(--purple); background: rgba(168,85,247,0.08); }
    .cat-nav-label { font-size: 0.75rem; color: var(--muted); }
    footer { border-top: 1px solid var(--border); padding: 28px 24px; text-align: center; color: var(--muted); font-size: 0.82rem; }
    footer a { color: var(--muted); text-decoration: none; }
    footer a:hover { color: var(--purple); }
    @media(max-width:600px){.song-grid{grid-template-columns:1fr;}.stats-bar{gap:8px;}}`;

const YEAR = new Date().getFullYear();

function navHtml() {
  return `<nav class="topnav">
  <a href="/" class="logo">HumMatch</a>
  <div class="nav-links">
    <a href="/song/" class="nav-link">Songs</a>
    <a href="/blog" class="nav-link">Blog</a>
    <a href="/" class="nav-btn">Test My Voice</a>
  </div>
</nav>`;
}

function footerHtml() {
  return `<footer>
  <p>&copy; ${YEAR} HumMatch &nbsp;·&nbsp;
    <a href="/privacy">Privacy</a> &nbsp;·&nbsp;
    <a href="/terms">Terms</a> &nbsp;·&nbsp;
    <a href="/blog">Blog</a> &nbsp;·&nbsp;
    <a href="/">Try HumMatch Free</a>
  </p>
</footer>`;
}

// ─── LOAD SONGS ───────────────────────────────────────────────────────────────
function loadSongs() {
  process.stdout.write('  Loading songs-data.json... ');
  const raw  = fs.readFileSync(path.join(SONG_DIR, 'songs-data.json'), 'utf8');
  const data = JSON.parse(raw);
  const songs = data.map(([slug, title, artist, loNote, hiNote, semitones]) => ({
    slug, title, artist, loNote, hiNote, semitones,
    artistSlug: slugify(artist),
    diffCat:    getDiffCat(semitones),
    voiceType:  getVoiceType(hiNote),
  }));
  console.log(`${songs.length} songs`);
  return songs;
}

// ─── ARTIST PAGE ──────────────────────────────────────────────────────────────
function renderArtistPage(artist, songs) {
  const artistSlug  = slugify(artist);
  const sorted      = [...songs].sort((a,b) => a.semitones - b.semitones);
  const diffCount   = {easy:0, medium:0, hard:0};
  songs.forEach(s => diffCount[s.diffCat]++);
  const maxHiMidi   = Math.max(...songs.map(s => noteToMidi(s.hiNote)));
  const minLoMidi   = Math.min(...songs.map(s => noteToMidi(s.loNote)));
  const NOTE_NAMES  = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  const midiToNote  = m => NOTE_NAMES[m%12] + (Math.floor(m/12)-1);

  const pageTitle = `${artist} Songs - Vocal Range Guide | HumMatch`;
  const metaDesc  = `All ${artist} songs on HumMatch with vocal range data and karaoke guides. Browse ${songs.length} ${artist} tracks and find out which ones fit your voice.`;

  const breadcrumbSchema = JSON.stringify({
    "@context":"https://schema.org","@type":"BreadcrumbList",
    "itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":BASE_URL},
      {"@type":"ListItem","position":2,"name":"Songs","item":`${BASE_URL}/song/`},
      {"@type":"ListItem","position":3,"name":artist,"item":`${BASE_URL}/artist/${artistSlug}`}
    ]
  });

  const musicGroupSchema = JSON.stringify({
    "@context":"https://schema.org","@type":"MusicGroup",
    "name": artist,
    "url": `${BASE_URL}/artist/${artistSlug}`
  });

  const songCards = sorted.map(s => {
    const dm = DIFF_META[s.diffCat];
    return `  <a href="/song/${s.slug}" class="song-card">
    <div class="sc-title">${esc(s.title)}</div>
    <div class="sc-meta">
      <span class="sc-tag">${esc(s.loNote)}–${esc(s.hiNote)}</span>
      <span class="sc-tag">${s.semitones} semi.</span>
      <span class="sc-tag diff-tag" style="color:${dm.color}">${dm.label}</span>
    </div>
  </a>`;
  }).join('\n');

  // Build "explore by" nav links
  const diffLinks = Object.entries(DIFF_META).map(([k,m]) =>
    `<a href="${m.path}">${m.emoji} ${m.label}</a>`).join('\n    ');
  const voiceLinks = Object.entries(VOICE_META).map(([k,m]) =>
    `<a href="${m.path}">${m.label}</a>`).join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(pageTitle)}</title>
  <meta name="description" content="${esc(metaDesc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${BASE_URL}/artist/${artistSlug}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(pageTitle)}">
  <meta property="og:description" content="${esc(metaDesc)}">
  <meta property="og:url" content="${BASE_URL}/artist/${artistSlug}">
  <meta property="og:site_name" content="HumMatch">
  <script type="application/ld+json">${breadcrumbSchema}</script>
  <script type="application/ld+json">${musicGroupSchema}</script>
  <style>${SHARED_CSS}
    .artist-header { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin-bottom: 6px; }
    .song-count { font-size: 0.85rem; background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3); border-radius: 8px; padding: 3px 12px; color: var(--purple); }
    .explore-section { margin-bottom: 28px; }
    .explore-section h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 8px; }
  </style>
</head>
<body>
${navHtml()}
<div class="hero">
  <nav aria-label="Breadcrumb" class="breadcrumb">
    <a href="/">Home</a><span>›</span>
    <a href="/song/">Songs</a><span>›</span>
    ${esc(artist)}
  </nav>
  <div class="artist-header">
    <h1>${esc(artist)}</h1>
    <span class="song-count">${songs.length} songs</span>
  </div>
  <p class="lead">Vocal range data and karaoke guides for every ${esc(artist)} song in our catalog. Find out which ones fit your voice — free.</p>
  <div class="stats-bar">
    <div class="stat-chip">🟢 <strong>${diffCount.easy}</strong> Easy</div>
    <div class="stat-chip">🟡 <strong>${diffCount.medium}</strong> Medium</div>
    <div class="stat-chip">🔴 <strong>${diffCount.hard}</strong> Hard</div>
    <div class="stat-chip">Full span: <strong>${midiToNote(minLoMidi)}</strong> → <strong>${midiToNote(maxHiMidi)}</strong></div>
  </div>
</div>

<div class="content">
  <div class="song-grid">
${songCards}
  </div>

  <div class="explore-section" style="margin-top:40px">
    <h3>Explore by Difficulty</h3>
    <div class="cat-nav">
      ${diffLinks}
    </div>
    <h3 style="margin-top:12px">Explore by Voice Type</h3>
    <div class="cat-nav">
      ${voiceLinks}
    </div>
  </div>

  <div class="cta-box">
    <h2>Can You Sing ${esc(artist)}?</h2>
    <p>Hum for 5 seconds and HumMatch instantly tells you which ${esc(artist)} songs are in your range.</p>
    <a href="/" class="btn-grad">🎤 Test My Voice — Free</a>
  </div>
</div>
${footerHtml()}
</body>
</html>`;
}

// ─── CATEGORY PAGE TEMPLATE (shared for diff + voice pages) ──────────────────
function renderCategoryPage({ pageTitle, metaDesc, canonical, breadcrumbSchema,
  h1, lead, statsChips, catNavsHtml, songs, ctaTitle, ctaBody, diffColors }) {

  const SONGS_JSON = JSON.stringify(songs.map(s => ({
    slug: s.slug, title: s.title, artist: s.artist,
    artistSlug: s.artistSlug, loNote: s.loNote, hiNote: s.hiNote,
    semitones: s.semitones, diffCat: s.diffCat
  })));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(pageTitle)}</title>
  <meta name="description" content="${esc(metaDesc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(pageTitle)}">
  <meta property="og:description" content="${esc(metaDesc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="HumMatch">
  <script type="application/ld+json">${breadcrumbSchema}</script>
  <style>${SHARED_CSS}</style>
</head>
<body>
${navHtml()}
<div class="hero">
  <nav aria-label="Breadcrumb" class="breadcrumb">
    <a href="/">Home</a><span>›</span>
    <a href="/song/">Songs</a><span>›</span>
    ${esc(h1)}
  </nav>
  <h1>${esc(h1)}</h1>
  <p class="lead">${esc(lead)}</p>
  <div class="stats-bar">
    ${statsChips}
  </div>
</div>

<div class="content">
  ${catNavsHtml}

  <div class="filter-bar">
    <input type="text" id="searchInput" placeholder="Search songs or artists..." oninput="filterSongs()">
    <select class="sort-select" id="sortSelect" onchange="sortAndRender()">
      <option value="title">Sort: A–Z</option>
      <option value="semitones">Sort: Smallest Range</option>
      <option value="semitones-desc">Sort: Largest Range</option>
      <option value="artist">Sort: Artist A–Z</option>
    </select>
    <span class="count-badge" id="countBadge">${songs.length} songs</span>
  </div>
  <div class="song-grid" id="songGrid"></div>

  <div class="cta-box">
    <h2>${esc(ctaTitle)}</h2>
    <p>${esc(ctaBody)}</p>
    <a href="/" class="btn-grad">🎤 Test My Voice — Free</a>
  </div>
</div>
${footerHtml()}
<script>
const SONGS = ${SONGS_JSON};
const DIFF_COLORS = {easy:'#22c55e',medium:'#f59e0b',hard:'#ef4444'};
let filtered = [...SONGS];

function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function renderGrid() {
  const g = document.getElementById('songGrid');
  if (!filtered.length) { g.innerHTML = '<p style="color:rgba(255,255,255,0.4);grid-column:1/-1;padding:20px 0">No songs found.</p>'; return; }
  g.innerHTML = filtered.map(s => \`<a href="/song/\${s.slug}" class="song-card">
    <div class="sc-title">\${escHtml(s.title)}</div>
    <div class="sc-artist"><a href="/artist/\${s.artistSlug}" style="color:var(--muted);text-decoration:none" onclick="event.stopPropagation()">\${escHtml(s.artist)}</a></div>
    <div class="sc-meta">
      <span class="sc-tag">\${s.loNote}–\${s.hiNote}</span>
      <span class="sc-tag">\${s.semitones} semi.</span>
      <span class="sc-tag diff-tag" style="color:\${DIFF_COLORS[s.diffCat]}">\${s.diffCat.charAt(0).toUpperCase()+s.diffCat.slice(1)}</span>
    </div>
  </a>\`).join('');
  document.getElementById('countBadge').textContent = filtered.length + ' songs';
}

function filterSongs() {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  filtered = q ? SONGS.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)) : [...SONGS];
  sortAndRender();
}

function sortAndRender() {
  const v = document.getElementById('sortSelect').value;
  if (v === 'title')         filtered.sort((a,b) => a.title.localeCompare(b.title));
  else if (v === 'semitones') filtered.sort((a,b) => a.semitones - b.semitones);
  else if (v === 'semitones-desc') filtered.sort((a,b) => b.semitones - a.semitones);
  else if (v === 'artist')   filtered.sort((a,b) => a.artist.localeCompare(b.artist));
  renderGrid();
}

renderGrid();
</script>
</body>
</html>`;
}

// ─── DIFFICULTY PAGE ──────────────────────────────────────────────────────────
function renderDiffPage(diffKey, songs) {
  const meta = DIFF_META[diffKey];

  const breadcrumbSchema = JSON.stringify({
    "@context":"https://schema.org","@type":"BreadcrumbList",
    "itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":BASE_URL},
      {"@type":"ListItem","position":2,"name":"Songs","item":`${BASE_URL}/song/`},
      {"@type":"ListItem","position":3,"name":`${meta.label} Songs`,"item":`${BASE_URL}${meta.path}`}
    ]
  });

  const diffNavLinks = Object.entries(DIFF_META).map(([k,m]) =>
    `<a href="${m.path}"${k===diffKey?' class="active"':''}>${m.emoji} ${m.label}</a>`
  ).join('\n    ');

  const voiceNavLinks = Object.entries(VOICE_META).map(([k,m]) =>
    `<a href="${m.path}">${m.label}</a>`
  ).join('\n    ');

  const catNavsHtml = `
  <div class="cat-nav">
    ${diffNavLinks}
  </div>
  <div class="cat-nav" style="margin-bottom:20px">
    <span class="cat-nav-label">Voice type:</span>
    ${voiceNavLinks}
  </div>`;

  const statsChips = `
    <div class="stat-chip"><strong>${songs.length}</strong> songs</div>
    <div class="stat-chip">Range: <strong>${meta.rangeNote}</strong></div>`;

  return renderCategoryPage({
    pageTitle: meta.title,
    metaDesc:  meta.metaDesc,
    canonical: `${BASE_URL}${meta.path}`,
    breadcrumbSchema,
    h1:        meta.h1,
    lead:      meta.lead,
    statsChips,
    catNavsHtml,
    songs,
    ctaTitle: `Find ${meta.label} Songs for YOUR Voice`,
    ctaBody:  `Hum for 5 seconds and HumMatch instantly shows you which ${meta.label.toLowerCase()} songs fit your exact range — no guessing required.`,
  });
}

// ─── VOICE TYPE PAGE ──────────────────────────────────────────────────────────
function renderVoicePage(voiceKey, songs) {
  const meta = VOICE_META[voiceKey];

  const breadcrumbSchema = JSON.stringify({
    "@context":"https://schema.org","@type":"BreadcrumbList",
    "itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":BASE_URL},
      {"@type":"ListItem","position":2,"name":"Songs","item":`${BASE_URL}/song/`},
      {"@type":"ListItem","position":3,"name":`${meta.label} Songs`,"item":`${BASE_URL}${meta.path}`}
    ]
  });

  const voiceNavLinks = Object.entries(VOICE_META).map(([k,m]) =>
    `<a href="${m.path}"${k===voiceKey?' class="active"':''}>${m.label}</a>`
  ).join('\n    ');

  const diffNavLinks = Object.entries(DIFF_META).map(([k,m]) =>
    `<a href="${m.path}">${m.emoji} ${m.label}</a>`
  ).join('\n    ');

  const catNavsHtml = `
  <div class="cat-nav">
    ${voiceNavLinks}
  </div>
  <div class="cat-nav" style="margin-bottom:20px">
    <span class="cat-nav-label">Difficulty:</span>
    ${diffNavLinks}
  </div>`;

  const statsChips = `
    <div class="stat-chip"><strong>${songs.length}</strong> songs</div>
    <div class="stat-chip">Ceiling: <strong>${meta.range}</strong></div>`;

  return renderCategoryPage({
    pageTitle: meta.title,
    metaDesc:  meta.metaDesc,
    canonical: `${BASE_URL}${meta.path}`,
    breadcrumbSchema,
    h1:        meta.h1,
    lead:      meta.lead,
    statsChips,
    catNavsHtml,
    songs,
    ctaTitle: `Are You a ${meta.label}?`,
    ctaBody:  `HumMatch detects your voice type in 5 seconds. Find out if you're a ${meta.label.toLowerCase()}, and see every song you can actually sing.`,
  });
}

// ─── PATCH SONG PAGES ─────────────────────────────────────────────────────────
function patchSongPage(filePath, song) {
  let html = fs.readFileSync(filePath, 'utf8');

  // Skip if already patched
  if (html.includes('<!-- seo-links-v1 -->')) return false;

  const diffMeta  = DIFF_META[song.diffCat];
  const voiceMeta = VOICE_META[song.voiceType];

  // 1. Replace breadcrumb HTML (adds artist level + seo-links-v1 marker)
  const newBreadcrumb = `<nav aria-label="Breadcrumb" class="breadcrumb"><!-- seo-links-v1 -->
    <a href="/">Home</a><span>›</span>
    <a href="/song/">Songs</a><span>›</span>
    <a href="/artist/${song.artistSlug}">${esc(song.artist)}</a><span>›</span>
    ${esc(song.title)}
  </nav>`;

  html = html.replace(
    /<nav aria-label="Breadcrumb" class="breadcrumb">[\s\S]*?<\/nav>/,
    newBreadcrumb
  );

  // 2. Update breadcrumb JSON-LD to 4 levels (Home > Songs > Artist > Song)
  const newBreadcrumbSchema = JSON.stringify({
    "@context":"https://schema.org","@type":"BreadcrumbList",
    "itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":BASE_URL},
      {"@type":"ListItem","position":2,"name":"Songs","item":`${BASE_URL}/song/`},
      {"@type":"ListItem","position":3,"name":song.artist,"item":`${BASE_URL}/artist/${song.artistSlug}`},
      {"@type":"ListItem","position":4,"name":song.title,"item":`${BASE_URL}/song/${song.slug}`}
    ]
  });

  html = html.replace(
    /<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"BreadcrumbList"[^<]*<\/script>/,
    `<script type="application/ld+json">${newBreadcrumbSchema}</script>`
  );

  // 3. Wrap artist name in link inside by-artist line
  html = html.replace(
    /(<p class="by-artist">by )<strong>([^<]+)<\/strong>/,
    `$1<a href="/artist/${song.artistSlug}" style="color:inherit;text-decoration:none"><strong>$2</strong></a>`
  );

  // 4. Inject category tag links after the by-artist paragraph
  const tagStyle = 'background:rgba(255,255,255,0.05);border:1px solid rgba(124,58,237,0.2);border-radius:20px;padding:5px 14px;font-size:0.78rem;text-decoration:none;color:rgba(255,255,255,0.5);transition:color 0.15s,border-color 0.15s';
  const tagHover = 'onmouseover="this.style.color=\'#A855F7\';this.style.borderColor=\'rgba(168,85,247,0.5)\'" onmouseout="this.style.color=\'rgba(255,255,255,0.5)\';this.style.borderColor=\'rgba(124,58,237,0.2)\'"';

  const catLinks = `
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px;margin-top:-20px">
    <a href="/artist/${song.artistSlug}" style="${tagStyle}" ${tagHover}>All ${esc(song.artist)} songs →</a>
    <a href="${diffMeta.path}" style="${tagStyle}" ${tagHover}>${diffMeta.emoji} ${diffMeta.label} Songs</a>
    <a href="${voiceMeta.path}" style="${tagStyle}" ${tagHover}>${voiceMeta.label} Songs</a>
  </div>`;

  html = html.replace(
    /(<p class="by-artist">[^\n]*<\/p>)/,
    '$1' + catLinks
  );

  fs.writeFileSync(filePath, html, 'utf8');
  return true;
}

// ─── SITEMAP ─────────────────────────────────────────────────────────────────
function buildSitemap(songs, artistSlugs) {
  const today = new Date().toISOString().split('T')[0];
  const url   = (loc, priority, freq) =>
    `  <url><loc>${BASE_URL}${loc}</loc><lastmod>${today}</lastmod><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`;

  const staticXml = [
    url('/',                             '1.0', 'weekly'),
    url('/blog',                         '0.8', 'weekly'),
    url('/pricing',                      '0.7', 'monthly'),
    url('/song/',                        '0.8', 'weekly'),
    url('/blog/find-songs-you-can-nail', '0.8', 'monthly'),
    url('/blog/how-hummatch-works',      '0.8', 'monthly'),
    url('/blog/how-hummatch-was-built',  '0.6', 'monthly'),
  ].join('\n');

  const diffXml  = Object.values(DIFF_META).map(m => url(m.path,  '0.75', 'weekly')).join('\n');
  const voiceXml = Object.values(VOICE_META).map(m => url(m.path, '0.75', 'weekly')).join('\n');
  const artistXml = artistSlugs.map(sl => url(`/artist/${sl}`, '0.70', 'monthly')).join('\n');
  const songXml   = songs.map(s => url(`/song/${s.slug}`,      '0.65', 'monthly')).join('\n');

  const totalUrls = 7 + 3 + 5 + artistSlugs.length + songs.length;

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- ── CORE PAGES (7) ── -->
${staticXml}

  <!-- ── DIFFICULTY PAGES (3) ── -->
${diffXml}

  <!-- ── VOICE TYPE PAGES (5) ── -->
${voiceXml}

  <!-- ── ARTIST PAGES (${artistSlugs.length}) ── -->
${artistXml}

  <!-- ── SONG PAGES (${songs.length}) ── -->
${songXml}

</urlset>
<!-- Total URLs: ${totalUrls} -->
`;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function main() {
  const t0 = Date.now();
  console.log('\n🔗  HumMatch SEO Linking Infrastructure Builder');
  console.log('=================================================\n');

  // 1. Load songs
  const songs = loadSongs();

  // 2. Group
  const byArtist = new Map();
  const byDiff   = {easy:[],medium:[],hard:[]};
  const byVoice  = {bass:[],baritone:[],tenor:[],alto:[],soprano:[]};

  for (const s of songs) {
    if (!byArtist.has(s.artist)) byArtist.set(s.artist, []);
    byArtist.get(s.artist).push(s);
    byDiff[s.diffCat].push(s);
    byVoice[s.voiceType].push(s);
  }

  console.log(`\n  Artists:    ${byArtist.size}`);
  console.log(`  Difficulty: easy=${byDiff.easy.length}, medium=${byDiff.medium.length}, hard=${byDiff.hard.length}`);
  console.log(`  Voice:      ${Object.entries(byVoice).map(([k,v])=>`${k}:${v.length}`).join(', ')}\n`);

  // 3. Create /artist/ directory
  if (!fs.existsSync(ARTIST_DIR)) fs.mkdirSync(ARTIST_DIR, {recursive:true});

  // 4. Generate artist pages
  process.stdout.write(`🎨  Generating ${byArtist.size} artist pages... `);
  let artistCount = 0;
  for (const [artist, artistSongs] of byArtist) {
    const html = renderArtistPage(artist, artistSongs);
    fs.writeFileSync(path.join(ARTIST_DIR, `${slugify(artist)}.html`), html, 'utf8');
    artistCount++;
  }
  console.log(`✅  ${artistCount} pages → /artist/`);

  // 5. Generate difficulty pages
  console.log(`🎨  Generating difficulty pages...`);
  for (const key of ['easy','medium','hard']) {
    const html = renderDiffPage(key, byDiff[key]);
    fs.writeFileSync(path.join(ROOT, DIFF_META[key].file), html, 'utf8');
    console.log(`   ✓  ${DIFF_META[key].file}  (${byDiff[key].length} songs)`);
  }

  // 6. Generate voice type pages
  console.log(`🎨  Generating voice type pages...`);
  for (const key of ['bass','baritone','tenor','alto','soprano']) {
    const html = renderVoicePage(key, byVoice[key]);
    fs.writeFileSync(path.join(ROOT, VOICE_META[key].file), html, 'utf8');
    console.log(`   ✓  ${VOICE_META[key].file}  (${byVoice[key].length} songs)`);
  }

  // 7. Patch all song pages
  console.log(`\n🩹  Patching ${songs.length} song pages...`);
  const songMap = new Map(songs.map(s => [s.slug, s]));
  const htmlFiles = fs.readdirSync(SONG_DIR).filter(f => f.endsWith('.html') && f !== 'index.html');

  let patched = 0, skipped = 0, errCount = 0;
  for (const file of htmlFiles) {
    const slug = file.slice(0, -5); // remove .html
    const song = songMap.get(slug);
    if (!song) { skipped++; continue; }
    try {
      const updated = patchSongPage(path.join(SONG_DIR, file), song);
      if (updated) patched++; else skipped++;
    } catch (e) {
      errCount++;
      if (errCount <= 5) console.log(`   ⚠️  ${file}: ${e.message}`);
    }
    if ((patched + skipped + errCount) % 500 === 0 && (patched + skipped + errCount) > 0) {
      process.stdout.write(`   ${patched + skipped + errCount}/${htmlFiles.length}...\n`);
    }
  }
  console.log(`✅  Patched ${patched} / ${htmlFiles.length} pages  (${skipped} skipped, ${errCount} errors)\n`);

  // 8. Update sitemap
  process.stdout.write(`🗺️   Writing sitemap.xml... `);
  const artistSlugs = [...byArtist.keys()].map(slugify);
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), buildSitemap(songs, artistSlugs), 'utf8');
  const totalUrls = 7 + 3 + 5 + artistSlugs.length + songs.length;
  console.log(`✅  ${totalUrls} URLs`);

  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`🎉  Done in ${elapsed}s\n`);
  console.log(`   ${artistCount} artist pages      → /artist/[slug]`);
  console.log(`   3 difficulty pages    → /easy-songs, /medium-songs, /hard-songs`);
  console.log(`   5 voice type pages    → /bass-songs … /soprano-songs`);
  console.log(`   ${patched} song pages patched`);
  console.log(`   ${totalUrls} URLs in sitemap.xml\n`);
  console.log(`Test: node server.js`);
  console.log(`  http://localhost:3000/easy-songs`);
  console.log(`  http://localhost:3000/tenor-songs`);
  console.log(`  http://localhost:3000/artist/${slugify([...byArtist.keys()][0])}`);
  console.log('');
}

main();
