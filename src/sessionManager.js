// src/sessionManager.js
// Stage 2B/3/4/5: participant state model with roster, status, advance logic,
// host assignment, role-aware session views, per-participant hum data storage,
// and session-aware song scoring from the shared songs.json catalog.

const path = require('path');
const fs = require('fs');
let _songCatalog = null;

const RIDE_MODE_BLOCKLIST = new Set([
  'taylor swift__beans on toast',
  'eagles__nate bargatze'
]);

const NON_SONG_KEYWORDS = [
  'podcast', 'interview', 'spoken word', 'spoken-word', 'comedy', 'stand-up', 'standup',
  'parody', 'tribute', 'soundalike', 'backing track', 'karaoke version', 'karaoke backing',
  'skit', 'documentary', 'lecture', 'audiobook'
];

const RIDE_MODE_SEED_TITLES = new Set([
  "Don't Stop Believin'","Mr. Brightside","Sweet Caroline","Bohemian Rhapsody","Since U Been Gone",
  "I Wanna Dance with Somebody","Livin' on a Prayer","Shallow","Friends in Low Places","Wagon Wheel",
  "Take Me Home, Country Roads","Party in the U.S.A.","You Belong with Me","Man! I Feel Like a Woman!",
  "Before He Cheats","Don't Stop Me Now","Dancing Queen","Hey Ya!","Crazy in Love","Yeah!",
  "Wannabe","No Scrubs","Say My Name","Toxic","Bye Bye Bye","I Want It That Way",
  "Build Me Up Buttercup","September","Piano Man","American Pie","Wonderwall","Iris",
  "Complicated","Sk8er Boi","Teenage Dream","Rolling in the Deep","Valerie","Shut Up and Dance",
  "Flowers","Cruel Summer","Uptown Funk","Shake It Off","Low","Yeah!","Faith","Respect",
  "Lean on Me","Stand by Me","Margaritaville","Waterfalls","No Scrubs","Truth Hurts",
  "Good 4 U","Love Story","Shake It Off","Unwritten","Pocketful of Sunshine","Levitating",
  "Hot in Herre","Get Low","Ignition (Remix)","Super Bass","Hollaback Girl","Fergalicious",
  "Single Ladies","Bad Romance","Poker Face","Blank Space","Cruel Summer","Dreams",
  "Go Your Own Way","Africa","Total Eclipse of the Heart","Summer Nights","Greased Lightnin'",
  "A Whole New World","Islands in the Stream","Need You Now","Jackson","Picture",
  "Don't Go Breaking My Heart","Is This Love","Dancing on My Own","Love Shack","I Love Rock 'n' Roll",
  "Sweet Home Alabama","Brown Eyed Girl","Jessie's Girl","Take on Me","Wake Me Up Before You Go-Go",
  "This Is How We Do It","Return of the Mack","Hey Soul Sister","Raise Your Glass","Cupid Shuffle",
  "Yeah!","Empire State of Mind","Call Me Maybe","We Found Love","Die With A Smile"
]);

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function normalizedSongKey(title, artist) {
  return normalizeText(title).replace(/[^a-z0-9]+/g, ' ').trim() + '__' + normalizeText(artist).replace(/[^a-z0-9]+/g, ' ').trim();
}

function songText(song) {
  return [song && song.title, song && song.artist, song && song.genre, Array.isArray(song && song.tags) ? song.tags.join(' ') : '']
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isClearlyNonSong(song) {
  const text = songText(song);
  return NON_SONG_KEYWORDS.some(function(term) { return text.indexOf(term) !== -1; });
}

function hasSuspiciousRideMetadata(song) {
  const title = normalizeText(song && song.title);
  const artist = normalizeText(song && song.artist);
  if (!title || !artist) return true;
  if (RIDE_MODE_BLOCKLIST.has(normalizedSongKey(title, artist))) return true;
  if (isClearlyNonSong(song)) return true;
  if (title === artist) return true;
  if (title.split(' ').length <= 3 && /taylor swift|drake|beyonce|adele|rihanna|elvis|eminem|shakira|whitney houston|prince|madonna/.test(title) && artist !== title) return true;
  if (/^the\s+(weeknd|beatles|eagles|chicks)$/.test(title)) return true;
  return false;
}

function familiarityScore(song) {
  const tags = Array.isArray(song && song.tags) ? song.tags.map(normalizeText) : [];
  const title = normalizeText(song && song.title);
  const genre = normalizeText(song && song.genre);
  const popularity = Number(song && (song.popularity != null ? song.popularity : song.humMatchScore || 0)) || 0;
  let score = Math.min(1, popularity / 40);
  if (RIDE_MODE_SEED_TITLES.has(song && song.title)) score = Math.max(score, 0.92);
  if (tags.some(function(tag) { return ['party','karaoke','pop','rock','country','r&b','hiphop','classic','disco','car','group','familiar'].indexOf(tag) !== -1; })) score += 0.08;
  if (genre && /pop|rock|country|r&b|hip hop|hiphop|dance|disco|soul/.test(genre)) score += 0.06;
  if (/love|night|dance|home|road|dream|heart|baby|party|summer|girl|tonight/.test(title)) score += 0.04;
  return Math.max(0, Math.min(1, score));
}

function karaokeScore(song) {
  const title = normalizeText(song && song.title);
  const tags = Array.isArray(song && song.tags) ? song.tags.map(normalizeText) : [];
  let score = RIDE_MODE_SEED_TITLES.has(song && song.title) ? 1 : familiarityScore(song);
  if (tags.indexOf('karaoke') !== -1 || tags.indexOf('party') !== -1) score += 0.08;
  if (/don't stop|shallow|wagon wheel|sweet caroline|country roads|i wanna dance|mr\. brightside|bohemian rhapsody/.test(title)) score += 0.12;
  return Math.max(0, Math.min(1, score));
}

function groupSingabilityScore(song) {
  const title = normalizeText(song && song.title);
  const tags = Array.isArray(song && song.tags) ? song.tags.map(normalizeText) : [];
  let score = 0.35;
  if (RIDE_MODE_SEED_TITLES.has(song && song.title)) score += 0.35;
  if (tags.some(function(tag) { return ['party','group','car','familiar','disco','pop','country'].indexOf(tag) !== -1; })) score += 0.18;
  if (/love|night|dance|home|road|dream|party|summer|heart|country|friends|baby/.test(title)) score += 0.1;
  if (/duet|feat\.|featuring|with /.test(title + ' ' + normalizeText(song && song.artist))) score += 0.08;
  return Math.max(0, Math.min(1, score));
}

function vibeBoostForSong(song, vibePreset, participantCount) {
  const title = normalizeText(song && song.title);
  const artist = normalizeText(song && song.artist);
  const tags = Array.isArray(song && song.tags) ? song.tags.map(normalizeText) : [];
  const genre = normalizeText(song && song.genre);
  const vibe = normalizeText(vibePreset || '');
  let boost = 0;

  if (vibe.indexOf('girls') !== -1) {
    if (/taylor swift|beyonce|lady gaga|dua lipa|rihanna|britney|kelly clarkson|carly rae|natasha bedingfield|shania twain|olivia rodrigo|katy perry|kesha|pink/.test(artist)) boost += 0.14;
    if (tags.indexOf('pop') !== -1 || tags.indexOf('party') !== -1) boost += 0.08;
  } else if (vibe.indexOf('party') !== -1 || vibe.indexOf('friday') !== -1) {
    if (tags.some(function(tag) { return ['party','group','car','disco','pop','rock'].indexOf(tag) !== -1; })) boost += 0.12;
    if (familiarityScore(song) > 0.75) boost += 0.08;
  } else if (vibe.indexOf('date') !== -1) {
    if (/love|stay|kiss|endless|always|perfect|shallow|islands in the stream|need you now/.test(title)) boost += 0.12;
    if (/duet|feat\.|featuring|with /.test(title + ' ' + artist)) boost += 0.08;
    if (/ed sheeran|lady a|kenny rogers|dolly parton|john legend|lionel richie|diana ross/.test(artist)) boost += 0.08;
    if (tags.indexOf('party') !== -1 || tags.indexOf('hiphop') !== -1) boost -= 0.08;
  }

  if (vibe.indexOf('throwback') !== -1) {
    const year = Number(song && song.year) || 0;
    if (year >= 1980 && year <= 2009) boost += 0.14;
  } else if (vibe.indexOf('chill') !== -1) {
    const brightness = Number(song && song.brightness) || 60;
    if (brightness <= 62) boost += 0.1;
    if (tags.indexOf('indie') !== -1 || tags.indexOf('soul') !== -1 || tags.indexOf('country') !== -1) boost += 0.06;
  } else if (vibe.indexOf('duet') !== -1) {
    if (/duet|feat\.|featuring|with /.test(title + ' ' + artist)) boost += 0.16;
    if (/shallow|islands in the stream|need you now|jackson|picture|don't go breaking my heart|summer nights|a whole new world/.test(title)) boost += 0.14;
    if (participantCount >= 2) boost += 0.04;
    if (tags.indexOf('group') !== -1) boost += 0.03;
  }

  if (participantCount >= 3 && groupSingabilityScore(song) > 0.7) boost += 0.05;
  if (genre && /comedy|spoken word/.test(genre)) boost -= 0.4;
  return boost;
}

function rideModePenalty(song) {
  const text = songText(song);
  let penalty = 0;
  if (hasSuspiciousRideMetadata(song)) penalty += 1;
  if (/parody|novelty|tribute|soundalike|podcast|interview|comedy|spoken word|karaoke version|backing track/.test(text)) penalty += 0.7;
  if (familiarityScore(song) < 0.28) penalty += 0.24;
  return penalty;
}

function isRideModeEligible(song) {
  if (!song || hasSuspiciousRideMetadata(song)) return false;
  if (rideModePenalty(song) >= 1) return false;
  const familiar = familiarityScore(song);
  const karaoke = karaokeScore(song);
  const group = groupSingabilityScore(song);
  const year = Number(song && song.year) || 0;
  const title = normalizeText(song && song.title);
  const artist = normalizeText(song && song.artist);
  const tags = Array.isArray(song && song.tags) ? song.tags.map(normalizeText) : [];
  const genre = normalizeText(song && song.genre);
  if (RIDE_MODE_SEED_TITLES.has(song.title)) return true;
  if (familiar < 0.72) return false;
  if (karaoke < 0.72) return false;
  if (group < 0.62) return false;
  if (!tags.some(function(tag) { return ['pop','rock','country','r&b','hiphop','disco','party','group','car','classic','familiar'].indexOf(tag) !== -1; }) && !/pop|rock|country|r&b|hip hop|dance|disco|soul/.test(genre)) return false;
  if (year && year < 1965 && familiar < 0.86) return false;
  if (title.split(' ').length <= 2 && familiar < 0.82) return false;
  if (/best kept secret|news for lulu|beans on toast|nate bargatze|david liebe hart|nobigdyl/.test(artist)) return false;
  return true;
}

function getSongCatalog() {
  if (_songCatalog) return _songCatalog;
  try {
    const raw = require(path.join(__dirname, '..', 'songs.json'));
    _songCatalog = Array.isArray(raw) ? raw : (raw.songs || []);
  } catch (_) {
    _songCatalog = [];
  }
  return _songCatalog;
}

// ── Session persistence ───────────────────────────────────────────────────────
// The in-memory store is wiped on any Node process restart (deploy, crash,
// OOM, Render restart). A persistent disk alone does not help -- we need to
// serialize `sessions` to a JSON file on that disk so fresh QR joins survive
// process restarts. Prefer the Render disk mount at /data when it exists so
// the file actually survives deploys; fall back to cwd for local dev.
function resolveSessionFilePath() {
  if (process.env.SESSION_FILE_PATH) return process.env.SESSION_FILE_PATH;
  try {
    if (fs.existsSync('/data') && fs.statSync('/data').isDirectory()) {
      return '/data/sessions.json';
    }
  } catch (_) { /* fall through */ }
  return path.join(process.cwd(), 'sessions.json');
}
const SESSION_FILE = resolveSessionFilePath();
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // prune anything older than 24h

const sessions = {};

function sessionAgeMs(session) {
  if (!session) return Infinity;
  if (typeof session.createdAtMs === 'number') return Date.now() - session.createdAtMs;
  const ts = typeof session.createdAt === 'number'
    ? session.createdAt
    : Date.parse(session.createdAt);
  if (!ts || isNaN(ts)) return 0;
  return Date.now() - ts;
}

function loadSessionsFromDisk() {
  try {
    if (!fs.existsSync(SESSION_FILE)) {
      console.log('[sessions] Loaded 0 sessions from disk (no ' + SESSION_FILE + ' yet)');
      return;
    }
    const raw = fs.readFileSync(SESSION_FILE, 'utf8');
    if (!raw) {
      console.log('[sessions] Loaded 0 sessions from disk (empty ' + SESSION_FILE + ')');
      return;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      console.log('[sessions] Loaded 0 sessions from disk (unparseable ' + SESSION_FILE + ')');
      return;
    }
    Object.keys(parsed).forEach(function(id) {
      const sess = parsed[id];
      if (!sess) return;
      if (sessionAgeMs(sess) > SESSION_MAX_AGE_MS) return; // prune stale
      sessions[id] = sess;
    });
    console.log('[sessions] Loaded ' + Object.keys(sessions).length + ' sessions from disk (' + SESSION_FILE + ')');
  } catch (e) {
    console.error('[sessions] loadSessionsFromDisk failed:', e.message);
  }
}

function persistSessions() {
  try {
    const tmp = SESSION_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(sessions), 'utf8');
    fs.renameSync(tmp, SESSION_FILE);
  } catch (e) {
    console.error('[sessionManager] persistSessions failed:', e.message);
  }
}

loadSessionsFromDisk();

// ── helpers ───────────────────────────────────────────────────────────────────

function makeParticipantId() {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Recalculate participant statuses after any state change.
// Rules:
//   index < currentParticipantIndex  → ready
//   index === currentParticipantIndex → current
//   index > currentParticipantIndex  → waiting
function syncStatuses(session) {
  const idx = session.currentParticipantIndex;
  session.participants.forEach(function(p, i) {
    if (i < idx)        p.status = 'ready';
    else if (i === idx) p.status = 'current';
    else                p.status = 'waiting';
  });
}

// ── Viewer role constants ─────────────────────────────────────────────────────
// 'driver'    — the session creator; full roster visibility
// 'host'      — explicitly assigned host participant; full roster visibility
// 'passenger' — any other participant; privacy-safe aggregate view only

// Build the full public session shape used by driver and host views.
function fullSessionView(session) {
  if (!session) return null;
  // Rider-facing counts exclude the driver/host (non-hummer in Option B).
  // A driver is counted only if they actually hummed (p.humData present).
  const riders = session.participants.filter(function(p) {
    return p.name !== 'Driver' || !!p.humData;
  });
  const readyCount         = riders.filter(function(p) { return p.status === 'ready'; }).length;
  const completedHumCount  = riders.filter(function(p) { return !!p.humData; }).length;
  const currentP = session.participants[session.currentParticipantIndex] || null;
  const nextP    = session.participants[session.currentParticipantIndex + 1] || null;
  return {
    id:                      session.id,
    name:                    session.name,
    expectedCount:           session.expectedCount,
    vibePreset:              session.vibePreset,
    createdAt:               session.createdAt,
    isActive:                session.isActive,
    isComplete:              session.isComplete,
    hostParticipantId:       session.hostParticipantId || null,
    // Driver identity
    driverAlias:             session.driverAlias             || null,
    driverSessionOwner:      session.driverSessionOwner      || null,
    captureMode:             session.captureMode             || 'driver_device',
    // Stage 7: opaque presence signal only — never leak PII
    driverUserId:            session.driverUserId ? true : null,
    affiliateCode:           session.affiliateCode           || null,
    status:                  session.isActive ? 'active' : (session.isComplete ? 'complete' : 'ended'),
    // Hum data summary -- rider-only counts; driver/host is not a hummer.
    hasHumData:              completedHumCount > 0,
    completedHumCount:       completedHumCount,
    joinedCount:             riders.length,
    readyCount:              readyCount,
    totalCount:              riders.length,
    currentParticipantIndex: session.currentParticipantIndex,
    currentParticipant:      currentP ? { id: currentP.id, name: currentP.name } : null,
    nextParticipant:         nextP    ? { id: nextP.id,    name: nextP.name }    : null,
    // Full named roster — only returned in this view
    participants: session.participants.map(function(p) {
      return {
        id:             p.id,
        name:           p.name,
        rolePreference: p.rolePreference,
        joinedAt:       p.joinedAt,
        status:         p.status,
        preference:     p.rolePreference,  // legacy alias
        hasHumData:     !!p.humData        // true once hum captured; data itself not exposed in roster
      };
    }),
    viewerRole: 'driver'   // tag so callers know which view was returned
  };
}

// Build the privacy-safe session shape used by passenger views.
// Exposes only aggregate counts + the viewer's own participant record.
// Never leaks other participants' names or role preferences.
function passengerSessionView(session, viewerParticipantId) {
  if (!session) return null;
  // Rider-only counts -- driver/host is not a hummer in Option B.
  const riders      = session.participants.filter(function(p) {
    return p.name !== 'Driver' || !!p.humData;
  });
  const readyCount  = riders.filter(function(p) { return p.status === 'ready'; }).length;
  const totalJoined = riders.length;
  const waiting     = Math.max(totalJoined - readyCount, 0);

  // Find the viewer's own participant record (may be undefined for anonymous views).
  const self = viewerParticipantId
    ? session.participants.find(function(p) { return p.id === viewerParticipantId; })
    : null;

  // Determine the viewer's position relative to current turn.
  const currentIdx   = session.currentParticipantIndex;
  const selfIdx      = self ? session.participants.indexOf(self) : -1;
  let viewerTurnStatus = null;
  if (selfIdx !== -1) {
    if (selfIdx < currentIdx)       viewerTurnStatus = 'done';
    else if (selfIdx === currentIdx) viewerTurnStatus = 'your_turn';
    else                            viewerTurnStatus = 'upcoming';
  }

  return {
    id:           session.id,
    name:         session.name,
    vibePreset:   session.vibePreset,
    driverAlias:  session.driverAlias || null,
    isActive:     session.isActive,
    isComplete:   session.isComplete,
    // Aggregate counts only — no names
    joinedCount:  totalJoined,
    readyCount:   readyCount,
    waitingCount: waiting,
    totalCount:   totalJoined,
    expectedCount: session.expectedCount,
    counts: {
      total:   totalJoined,
      ready:   readyCount,
      waiting: waiting
    },
    // Viewer's own record (name + role + status) — null if not identified
    self: self ? {
      id:             self.id,
      name:           self.name,
      rolePreference: self.rolePreference,
      status:         self.status
    } : null,
    viewerTurnStatus: viewerTurnStatus,
    // No participants array — deliberately omitted for passenger privacy
    participants: null,
    viewerRole: 'passenger'
  };
}

// Primary dispatcher: returns the right view based on viewer role.
// viewerRole: 'driver' | 'host' | 'passenger'
// viewerParticipantId: participant id string (used for passenger self-view)
function sessionForViewer(session, viewerRole, viewerParticipantId) {
  if (!session) return null;
  if (viewerRole === 'driver' || viewerRole === 'host') {
    const view = fullSessionView(session);
    if (view) view.viewerRole = viewerRole;
    return view;
  }
  return passengerSessionView(session, viewerParticipantId);
}

// Convenience: default full view (backwards-compatible — used internally).
function publicSession(session) {
  return fullSessionView(session);
}

// ── public API ─────────────────────────────────────────────────────────────────

function createSession(sessionName, expectedRiderCount, vibePreset, driverAlias, driverUserId) {
  const sessionId = Date.now().toString();
  const driverParticipant = {
    id:             makeParticipantId(),
    name:           'Driver',
    rolePreference: 'Lead',
    joinedAt:       new Date(),
    status:         'current',
    humData:        null
  };
  sessions[sessionId] = {
    id:                      sessionId,
    name:                    sessionName || 'Ride Mode Session',
    expectedCount:           Number(expectedRiderCount) || 5,
    vibePreset:              vibePreset || 'Easy Wins',
    createdAt:               new Date().toISOString(),
    createdAtMs:             Date.now(),
    participants:            [driverParticipant],
    currentParticipantIndex: 0,
    hostParticipantId:       null,
    isActive:                true,
    isComplete:              false,
    // Driver identity fields (non-billing, prepared for later affiliate linkage)
    driverAlias:             driverAlias || null,
    driverSessionOwner:      null,
    captureMode:             'driver_device',
    // Stage 7: driver-owned session identity + affiliate attribution
    driverUserId:            driverUserId || null,
    affiliateCode:           null
  };
  persistSessions();
  return publicSession(sessions[sessionId]);
}

// Stage 7: attach an affiliate_code to an existing session (set by server after
// looking up the driver user's affiliate record). Safe no-op if the session
// does not exist. Returns the updated public view.
function setSessionAffiliateCode(sessionId, affiliateCode) {
  const session = sessions[sessionId];
  if (!session) return null;
  session.affiliateCode = affiliateCode || null;
  persistSessions();
  return publicSession(session);
}

function joinSession(sessionId, participantName, rolePreference, attributionMeta) {
  const session = sessions[sessionId];
  if (!session || !session.isActive) return null;
  if (session.participants.length >= 5) return publicSession(session);

  const newParticipant = {
    id:                   makeParticipantId(),
    name:                 participantName || 'Guest',
    rolePreference:       rolePreference  || 'Either',
    joinedAt:             new Date().toISOString(),
    status:               'waiting',
    humData:              null,
    // Stage 7: attribution metadata used by later reporting and upgrade paths
    joinedViaRideMode:    true,
    conversionEligible:   true,
    attributionMeta:      attributionMeta || null
  };
  session.participants.push(newParticipant);
  syncStatuses(session);
  persistSessions();
  // Return the new participant's id alongside the session so the caller can
  // store it as the viewer's own identifier for future passenger views.
  const view = publicSession(session);
  if (view) view.newParticipantId = newParticipant.id;
  return view;
}

// Assign a participant as the host (gives them full roster visibility).
// Passing null clears the host assignment.
function assignHost(sessionId, participantId) {
  const session = sessions[sessionId];
  if (!session) return null;
  // Validate that the participantId actually exists in this session.
  const exists = participantId
    ? session.participants.some(function(p) { return p.id === participantId; })
    : true;  // null clears the host — always valid
  if (!exists) return null;
  session.hostParticipantId = participantId || null;
  persistSessions();
  return publicSession(session);
}

function advanceSession(sessionId) {
  const session = sessions[sessionId];
  if (!session || !session.isActive) return null;

  const idx     = session.currentParticipantIndex;
  const current = session.participants[idx];
  if (current) current.status = 'ready';

  const nextIdx = idx + 1;
  if (nextIdx < session.participants.length) {
    session.currentParticipantIndex = nextIdx;
    syncStatuses(session);
  } else {
    session.isComplete = true;
    session.isActive   = false;
    session.participants.forEach(function(p) { p.status = 'ready'; });
  }

  persistSessions();
  return publicSession(session);
}

function endSession(sessionId) {
  const session = sessions[sessionId];
  if (!session) return null;
  session.isActive   = false;
  session.isComplete = true;
  session.participants.forEach(function(p) {
    if (p.status !== 'ready') p.status = 'ready';
  });
  persistSessions();
  return publicSession(session);
}

function getSession(sessionId) {
  return publicSession(sessions[sessionId] || null);
}

// Get a role-filtered view of a session.
// Used by the GET /session/:id endpoint when a viewer role is specified.
function getSessionForViewer(sessionId, viewerRole, viewerParticipantId) {
  const session = sessions[sessionId];
  if (!session) return null;
  // Resolve effective role: if viewerParticipantId matches the host, upgrade to 'host'.
  let effectiveRole = viewerRole || 'passenger';
  if (effectiveRole === 'passenger' && session.hostParticipantId && viewerParticipantId === session.hostParticipantId) {
    effectiveRole = 'host';
  }
  return sessionForViewer(session, effectiveRole, viewerParticipantId);
}

// Store hum capture data for a specific participant.
// Called before /advance so data is persisted regardless of advancement outcome.
// humPayload: { low, normal, high, capturedAt }
function storeHumData(sessionId, participantId, humPayload) {
  const session = sessions[sessionId];
  if (!session) return null;
  const participant = session.participants.find(function(p) { return p.id === participantId; });
  if (!participant) return null;
  participant.humData = {
    low:         humPayload.low         || null,
    normal:      humPayload.normal      || null,
    high:        humPayload.high        || null,
    capturedAt:  humPayload.capturedAt  || new Date().toISOString()
  };
  // Mark participant done
  participant.status = 'ready';

  // If all expected participants have hummed, mark session complete.
  // expectedCount is set on creation and does not include the driver.
  // We check all non-driver participants who have humData.
  const passengers = session.participants.filter(function(p) { return p.name !== 'Driver'; });
  const hummedPassengers = passengers.filter(function(p) { return !!p.humData; });
  const expected = session.expectedCount || (session.participants.length - 1);
  if (hummedPassengers.length >= expected && expected > 0) {
    session.isComplete = true;
    session.isActive = false;
    session.participants.forEach(function(p) { p.status = 'ready'; });
  }

  persistSessions();
  return publicSession(session);
}

// ── Session-aware song scoring ────────────────────────────────────────────────
//
// Stage 14 engine correction: uses the SAME song-centric fit formula as solo
// HumMatch (overlap / songSpan). A song is a good match when the rider's
// range covers most of the song -- not when the song is merely wider than
// the rider. The old rider-span denominator produced ~100% on any song that
// fully contained a rider's range, which is why everything was scoring 100%.
//
// Per-participant weight by rolePreference:
//   'Lead'    -> 1.5  (melody-first: matters most for song fit)
//   'Either'  -> 1.0
//   'Harmony' -> 0.7  (flexible, matters less for melody fit)
//
// Participant scoring (same as solo): coverage = overlap(participant, song) / songSpan
// Group scoring: weighted mean of per-participant coverages.
//
// Fallbacks:
//   0 valid hummers (driver-only or empty) -> honest default range, marked as
//       hasRealData=false so UI can show "No hum data captured" notice.
//   1+ valid hummers -> real scoring from actual hum data (NO silent fallback).
//
// Driver is never counted as a hummer unless p.humData is present (Option B:
// driver manages the ride but does not hum from their own phone).
//
function scoreSessionResults(session, limit) {
  limit = limit || 5;
  try {
    const catalog = getSongCatalog();
    if (!catalog.length) return { results: [], hasRealData: false, participantCount: 0, hummedCount: 0, groupLo: 0, groupHi: 0, vibePreset: session && session.vibePreset || null, rideModeEligibleCount: 0 };

    // Only participants with valid, sensible humData. Driver is excluded here
    // automatically because driver.humData is null unless they actually hummed.
    const withHum = (session.participants || []).filter(function(p) {
      if (!p.humData) return false;
      const lo = p.humData.low, hi = p.humData.high;
      return Number.isInteger(lo) && Number.isInteger(hi) && hi > lo;
    });

    // Rider-facing count excludes the driver (host) from total participants --
    // driver is a non-hummer session owner in Option B.
    const riders = (session.participants || []).filter(function(p) { return p.name !== 'Driver'; });
    const participantCount = riders.length;
    const hummedCount = withHum.length;

    // Determine dominant rolePreference among hummed riders (for label tuning)
    let dominantRole = 'Either';
    if (hummedCount > 0) {
      const counts = { Lead: 0, Harmony: 0, Either: 0 };
      withHum.forEach(function(p) {
        const pref = p.rolePreference || 'Either';
        if (counts[pref] !== undefined) counts[pref]++;
        else counts.Either++;
      });
      dominantRole = Object.keys(counts).reduce(function(a, b) {
        return counts[a] >= counts[b] ? a : b;
      });
    }

    // Figure out scoring mode + groupLo/groupHi for return metadata
    let mode, groupLo, groupHi, hasRealData;
    if (hummedCount === 0) {
      mode = 'default';
      groupLo = 48; groupHi = 69;
      hasRealData = false;
    } else if (hummedCount === 1) {
      mode = 'single';
      groupLo = withHum[0].humData.low;
      groupHi = withHum[0].humData.high;
      hasRealData = true;
    } else {
      mode = 'group';
      groupLo = Math.min.apply(null, withHum.map(function(p) { return p.humData.low;  }));
      groupHi = Math.max.apply(null, withHum.map(function(p) { return p.humData.high; }));
      hasRealData = true;
    }

    function weightFor(pref) {
      if (pref === 'Lead') return 1.5;
      if (pref === 'Harmony') return 0.7;
      return 1.0;
    }

    // Shared solo-HumMatch fit: how much of the SONG a given vocal range covers.
    // overlap / songSpan -> songs with ranges far outside the rider score low,
    // songs snugly inside the rider score high. Matches solo HumMatch exactly.
    function coverageFor(rangeLo, rangeHi, songLo, songHi) {
      const songSpan = Math.max(songHi - songLo, 1);
      const overlap  = Math.max(0, Math.min(rangeHi, songHi) - Math.max(rangeLo, songLo));
      return overlap / songSpan;
    }

    const ridePool = catalog.filter(isRideModeEligible);
    const candidateCatalog = ridePool.length ? ridePool : catalog.filter(function(song) { return !hasSuspiciousRideMetadata(song); });

    const scored = candidateCatalog.map(function(song) {
      const songLo = typeof song.lo === 'number' ? song.lo : 40;
      const songHi = typeof song.hi === 'number' ? song.hi : 72;

      let coverage; // 0..1
      if (mode === 'group') {
        let weightedSum = 0, weightTotal = 0;
        withHum.forEach(function(p) {
          const pCov = coverageFor(p.humData.low, p.humData.high, songLo, songHi);
          const w = weightFor(p.rolePreference);
          weightedSum += pCov * w;
          weightTotal += w;
        });
        coverage = weightTotal > 0 ? weightedSum / weightTotal : 0;
      } else if (mode === 'single') {
        // Matches solo HumMatch: overlap / songSpan from the one rider's range.
        coverage = coverageFor(groupLo, groupHi, songLo, songHi);
      } else {
        // No hum data -- honest default range, flagged hasRealData=false upstream.
        coverage = coverageFor(groupLo, groupHi, songLo, songHi);
      }

      const vocalFit = Math.max(0, Math.min(1, coverage));
      const familiar = familiarityScore(song);
      const karaoke = karaokeScore(song);
      const group = groupSingabilityScore(song);
      const vibeBoost = vibeBoostForSong(song, session && session.vibePreset, participantCount);
      const duetBoost = participantCount >= 2 && /duet|feat\.|featuring|with /.test(normalizeText(song.title) + ' ' + normalizeText(song.artist)) ? 0.06 : 0;
      const penalty = rideModePenalty(song);
      const composite = (vocalFit * 0.60) + (Math.max(familiar, karaoke) * 0.22) + (group * 0.12) + vibeBoost + duetBoost - penalty;
      const fitPct = Math.min(100, Math.max(0, Math.round(composite * 100)));

      // Stage 15: include the full set of fields renderSongCard needs in Ride Mode.
      // songs.json has: title, artist, lo, hi, brightness, year. language and slug
      // are not present in this catalog, so we default lang='en' and let the client
      // derive slug from title+artist via toSlug().
      const titleStr  = song.title  || '';
      const artistStr = song.artist || '';
      const slug = (titleStr + '-' + artistStr)
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      return {
        title:  titleStr,
        artist: artistStr,
        lo:     songLo,
        hi:     songHi,
        year:   song.year || null,
        lang:   song.language || 'en',
        slug:   slug,
        fitPct: fitPct,
        vocalFitPct: Math.round(vocalFit * 100),
        familiarityPct: Math.round(familiar * 100),
        karaokePct: Math.round(karaoke * 100),
        singabilityPct: Math.round(group * 100),
        vibeBoostPct: Math.round(Math.max(0, vibeBoost + duetBoost) * 100),
        rideModeEligible: true,
        genre: song.genre || null,
        tags: Array.isArray(song.tags) ? song.tags : []
      };
    });

    // Sort descending by fitPct (stable)
    scored.sort(function(a, b) { return b.fitPct - a.fitPct; });

    // Diversity tie-breaking: among songs within 3 pts of each other, prefer
    // different artists. Deterministic, stable — we walk the sorted list and
    // when two adjacent entries are within 3 pts and share an artist already
    // seen in the recent window, we nudge the duplicate down past non-dupes.
    const top = [];
    const pool = scored.slice(0, Math.min(scored.length, limit * 10));
    const seenArtists = {};
    const seenSongs = {};
    let i = 0;
    while (top.length < limit && i < pool.length) {
      const cand = pool[i];
      const artistKey = (cand.artist || '').toLowerCase();
      const songKey = normalizedSongKey(cand.title, cand.artist);
      if (!seenSongs[songKey] && !seenArtists[artistKey]) {
        top.push(cand);
        seenArtists[artistKey] = true;
        seenSongs[songKey] = true;
        pool.splice(i, 1);
        i = 0;
      } else {
        // Look ahead within 3 pts for a different-artist alternative
        let swapped = false;
        for (let j = i + 1; j < pool.length; j++) {
          if (cand.fitPct - pool[j].fitPct > 3) break;
          const altArtist = (pool[j].artist || '').toLowerCase();
          const altSongKey = normalizedSongKey(pool[j].title, pool[j].artist);
          if (!seenArtists[altArtist] && !seenSongs[altSongKey]) {
            top.push(pool[j]);
            seenArtists[altArtist] = true;
            seenSongs[altSongKey] = true;
            pool.splice(j, 1);
            swapped = true;
            break;
          }
        }
        if (!swapped) {
          // No diverse alternative within tolerance: accept this one
          if (!seenSongs[songKey]) {
            top.push(cand);
            seenSongs[songKey] = true;
            seenArtists[artistKey] = true;
          }
          pool.splice(i, 1);
          i = 0;
        }
      }
    }

    // Assign rank + bucket label
    top.forEach(function(result, idx) {
      result.rank = idx + 1;
      result.label = bucketLabel(result.fitPct, participantCount, dominantRole);
      // Keep fitScore alias for existing frontend template
      result.fitScore = result.fitPct;
    });

    return {
      results:          top,
      hasRealData:      hasRealData,
      participantCount: participantCount,
      hummedCount:      hummedCount,
      groupLo:          groupLo,
      groupHi:          groupHi,
      vibePreset:       session && session.vibePreset || null,
      rideModeEligibleCount: ridePool.length
    };
  } catch (_) {
    return { results: [], hasRealData: false, participantCount: 0, hummedCount: 0, groupLo: 0, groupHi: 0, vibePreset: session && session.vibePreset || null, rideModeEligibleCount: 0 };
  }
}

function bucketLabel(fitPct, participantCount, dominantRole) {
  if (fitPct >= 85 && participantCount >= 3) return 'Best for Everyone';
  if (fitPct >= 75) return 'Strong Group Pick';
  if (fitPct >= 60 && dominantRole === 'Harmony') return 'Harmony Pick';
  if (fitPct >= 60) return 'Good Fit';
  if (fitPct >= 40) return 'Singable';
  return 'Stretch';
}

// Score results for a session by its ID (uses raw internal session with humData intact).
function scoreResultsById(sessionId, limit) {
  const session = sessions[sessionId];
  if (!session) return null;
  return scoreSessionResults(session, limit || 5);
}

// Stage 7: raw internal session accessor for server-side plumbing (affiliate
// attribution, DB event inserts). Does NOT expose humData via the public API —
// callers must not return this directly to clients.
function getRawSession(sessionId) {
  return sessions[sessionId] || null;
}

module.exports = {
  createSession,
  joinSession,
  assignHost,
  advanceSession,
  endSession,
  getSession,
  getSessionForViewer,
  storeHumData,
  scoreSessionResults,
  scoreResultsById,
  setSessionAffiliateCode,
  getRawSession
};
