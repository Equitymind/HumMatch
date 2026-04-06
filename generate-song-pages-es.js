#!/usr/bin/env node
/**
 * HumMatch Spanish SEO Generator  
 * Generates Spanish song pages in /es/cancion/
 * 
 * Run: node generate-song-pages-es.js
 */

const fs   = require('fs');
const path = require('path');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const BASE_URL  = 'https://hummatch.me';
const SONG_DIR  = path.join(__dirname, 'es', 'cancion');
const MAX_PAGES = 15000;

// ─── MIDI → NOTE NAME ─────────────────────────────────────────────────────────
const NOTE_NAMES = ['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'];
function midiToNote(midi) {
  const octave = Math.floor(midi / 12) - 1;
  return NOTE_NAMES[midi % 12] + octave;
}

function midiToNoteAscii(midi) {
  const names = ['Do','Do#','Re','Re#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'];
  return names[midi % 12] + (Math.floor(midi / 12) - 1);
}

// ─── SLUGIFY ──────────────────────────────────────────────────────────────────
function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function songSlug(title, artist) {
  return slugify(title) + '-' + slugify(artist);
}

// ─── VOICE TYPE MAPPING (Spanish) ─────────────────────────────────────────────
const VOICE_TYPES = {
  soprano: { name: 'Soprano', icon: '🎤', desc: 'Voz aguda femenina' },
  mezzosoprano: { name: 'Mezzosoprano', icon: '🎵', desc: 'Voz media femenina' },
  alto: { name: 'Alto/Contralto', icon: '🎶', desc: 'Voz grave femenina' },
  tenor: { name: 'Tenor', icon: '🎸', desc: 'Voz aguda masculina' },
  baritone: { name: 'Barítono', icon: '🎺', desc: 'Voz media masculina' },
  bass: { name: 'Bajo', icon: '🎻', desc: 'Voz grave masculina' }
};

function getVoiceType(rangeLo, rangeHi) {
  if (!rangeLo || !rangeHi) return null;
  const mid = (rangeLo + rangeHi) / 2;
  if (mid >= 62 && mid < 72) return 'soprano';
  if (mid >= 55 && mid < 64) return 'mezzosoprano';
  if (mid >= 48 && mid < 58) return 'alto';
  if (mid >= 50 && mid < 62) return 'tenor';
  if (mid >= 43 && mid < 55) return 'baritone';
  if (mid < 48) return 'bass';
  return null;
}

// ─── READ SONGS FROM index.html ───────────────────────────────────────────────
console.log('📖 Leyendo canciones de index.html...');
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const songsMatch = indexHtml.match(/const SONGS = (\[[\s\S]*?\]);/);
if (!songsMatch) {
  console.error('❌ No se encontró const SONGS en index.html');
  process.exit(1);
}

let SONGS = [];
try {
  SONGS = JSON.parse(songsMatch[1]);
  console.log(`✅ ${SONGS.length} canciones cargadas`);
} catch (e) {
  console.error('❌ Error al parsear SONGS:', e.message);
  process.exit(1);
}

// ─── CREATE SONG DIR ──────────────────────────────────────────────────────────
if (!fs.existsSync(SONG_DIR)) {
  fs.mkdirSync(SONG_DIR, { recursive: true });
  console.log(`✅ Directorio ${SONG_DIR} creado`);
}

// ─── GENERATE PAGES ───────────────────────────────────────────────────────────
console.log(`\n🎨 Generando páginas de canciones en español...\n`);

let created = 0;
let skipped = 0;
let errors = 0;

for (const song of SONGS) {
  if (!song.title || !song.artist) {
    skipped++;
    continue;
  }

  if (created >= MAX_PAGES) {
    console.log(`⚠️ Límite de ${MAX_PAGES} páginas alcanzado`);
    break;
  }

  const slug = songSlug(song.title, song.artist);
  const filePath = path.join(SONG_DIR, `${slug}.html`);
  
  try {
    const html = generateSpanishSongPage(song);
    fs.writeFileSync(filePath, html, 'utf8');
    created++;
    
    if (created % 100 === 0) {
      console.log(`  ✓ ${created} páginas creadas...`);
    }
  } catch (err) {
    console.error(`  ✗ Error con ${song.slug}:`, err.message);
    errors++;
  }
}

console.log(`\n═══════════════════════════════════════`);
console.log(`🎉 Completado`);
console.log(`  • ${created} páginas HTML → /es/cancion/`);
console.log(`  • ${skipped} omitidas`);
console.log(`  • ${errors} errores`);
console.log(`═══════════════════════════════════════\n`);

// ─── GENERATE SPANISH SONG PAGE ───────────────────────────────────────────────
function generateSpanishSongPage(song) {
  const { title, artist, lo, hi, tags } = song;
  const slug = songSlug(title, artist);
  const rangeLo = lo;
  const rangeHi = hi;
  
  // Voice type
  const voiceTypeKey = getVoiceType(rangeLo, rangeHi);
  const voiceTypes = voiceTypeKey ? [VOICE_TYPES[voiceTypeKey]] : [];
  
  // Note names
  const noteLo = rangeLo ? midiToNote(rangeLo) : '?';
  const noteHi = rangeHi ? midiToNote(rangeHi) : '?';
  const rangeSpan = (rangeLo && rangeHi) ? (rangeHi - rangeLo + 1) : 0;
  
  // Difficulty
  let difficulty = 'Media';
  if (rangeSpan <= 12) difficulty = 'Fácil';
  else if (rangeSpan > 18) difficulty = 'Difícil';
  
  // Genre badges
  const genreBadges = (tags && tags.length > 0) 
    ? `<div class="section"><h2>Género</h2><div style="display:flex;gap:8px;flex-wrap:wrap">${tags.map(tag => `<span style="background:rgba(168,85,247,0.1);color:var(--purple);padding:6px 14px;border-radius:20px;font-size:0.85rem;font-weight:600;border:1px solid rgba(168,85,247,0.2);text-transform:capitalize">${tag}</span>`).join('')}</div></div>`
    : '';
  
  // YouTube karaoke search
  const ytQuery = encodeURIComponent(`${title} ${artist} karaoke`);
  
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title} - ${artist} | Rango Vocal y Karaoke | HumMatch</title>
  <meta name="description" content="¿Puedes cantar ${title} de ${artist}? Descubre el rango vocal (${noteLo}-${noteHi}), dificultad y versiones de karaoke. Prueba gratis tu voz en HumMatch."/>
  <link rel="icon" href="/hummatch-icon-bug-2x.png" type="image/png"/>
  <link rel="canonical" href="${BASE_URL}/es/cancion/${slug}"/>
  <link rel="alternate" hreflang="en" href="${BASE_URL}/song/${slug}"/>
  <link rel="alternate" hreflang="es" href="${BASE_URL}/es/cancion/${slug}"/>
  <style>
    *,:after,:before{box-sizing:border-box;margin:0;padding:0}:root{--bg:#0d0b1a;--card:#12101f;--border:rgba(168,85,247,.15);--text1:#e2e0f0;--text2:rgba(255,255,255,.75);--text3:rgba(255,255,255,.5);--purple:#a855f7;--pink:#ec4899;--green:#22c55e;--red:#ef4444}body{background:var(--bg);color:var(--text1);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;padding:0 20px 60px;max-width:800px;margin:0 auto}a{color:var(--purple);text-decoration:none}.header{padding:24px 0;border-bottom:1px solid var(--border);margin-bottom:32px}.logo{font-size:1.5rem;font-weight:800;background:linear-gradient(135deg,var(--purple),var(--pink));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.hero{margin-bottom:40px}.song-title{font-size:2rem;font-weight:900;line-height:1.2;margin-bottom:8px}.artist{font-size:1.2rem;color:var(--text2);margin-bottom:24px}.cta-box{background:linear-gradient(135deg,rgba(168,85,247,.1),rgba(236,72,153,.05));border:2px solid rgba(168,85,247,.3);border-radius:16px;padding:24px;text-align:center;margin-bottom:32px}.cta-box h2{font-size:1.1rem;margin-bottom:12px}.cta-btn{display:inline-block;padding:14px 32px;background:linear-gradient(135deg,var(--purple),var(--pink));color:#fff;border-radius:12px;font-weight:700;font-size:1rem;margin-top:8px;transition:transform .2s}.cta-btn:hover{transform:scale(1.05)}.section{margin-bottom:32px}.section h2{font-size:1.3rem;margin-bottom:16px;color:var(--text1)}.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}.stat-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px}.stat-label{font-size:.85rem;color:var(--text3);margin-bottom:4px}.stat-value{font-size:1.5rem;font-weight:700;color:var(--text1)}.difficulty-easy{color:var(--green)}.difficulty-medium{color:#fbbf24}.difficulty-hard{color:var(--red)}.youtube-embed{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin-top:16px}.youtube-embed iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}@media (max-width:640px){.song-title{font-size:1.5rem}.stat-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="header">
    <a href="/es" class="logo">HumMatch</a>
  </div>

  <div class="hero">
    <h1 class="song-title">${title}</h1>
    <div class="artist">Por ${artist}</div>
  </div>

  <div class="cta-box">
    <h2>🎤 ¿Puedes cantar esta canción?</h2>
    <p style="color:var(--text2);font-size:0.95rem;margin-bottom:12px">Tararea 10 segundos y descubre si ${title} está en tu rango vocal</p>
    <a href="/es" class="cta-btn">Probar Gratis →</a>
  </div>

  <div class="section">
    <h2>📊 Detalles del Rango Vocal</h2>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Nota más grave</div>
        <div class="stat-value">${noteLo}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Nota más aguda</div>
        <div class="stat-value">${noteHi}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Amplitud</div>
        <div class="stat-value">${rangeSpan} semitonos</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Dificultad</div>
        <div class="stat-value difficulty-${difficulty.toLowerCase()}">${difficulty}</div>
      </div>
    </div>
  </div>

  ${voiceTypes.length > 0 ? `
  <div class="section">
    <h2>Perfecta Para Estos Tipos de Voz</h2>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      ${voiceTypes.map(vt => `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 18px;flex:1;min-width:140px"><div style="font-size:1.4rem;margin-bottom:4px">${vt.icon}</div><div style="font-weight:700;font-size:0.95rem;margin-bottom:2px">${vt.name}</div><div style="font-size:0.8rem;color:var(--text3)">${vt.desc}</div></div>`).join('')}
    </div>
  </div>
  ` : ''}

  ${genreBadges}

  <div class="section">
    <h2>🎬 Karaoke en YouTube</h2>
    <p style="color:var(--text2);margin-bottom:12px">Encuentra versiones instrumentales de ${title}</p>
    <div class="youtube-embed">
      <iframe src="https://www.youtube.com/embed?listType=search&list=${ytQuery}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen title="Karaoke de ${title}"></iframe>
    </div>
  </div>

  <div class="cta-box">
    <h2>¿Esta canción está en tu rango?</h2>
    <p style="color:var(--text2);font-size:0.95rem;margin-bottom:12px">Prueba tu voz gratis en HumMatch</p>
    <a href="/es" class="cta-btn">Encontrar Mis Canciones →</a>
  </div>

  <footer style="border-top:1px solid var(--border);padding-top:24px;margin-top:48px;text-align:center;color:var(--text3);font-size:0.85rem">
    <p>&copy; 2026 HumMatch &middot; <a href="/es">Inicio</a> &middot; <a href="/es/precios">Precios</a> &middot; <a href="/contacto">Contacto</a></p>
  </footer>
</body>
</html>`;
}
