// src/sessionManager.js
// Stage 2B/3/4/5: participant state model with roster, status, advance logic,
// host assignment, role-aware session views, per-participant hum data storage,
// and session-aware song scoring from the shared songs.json catalog.

const path = require('path');
let _songCatalog = null;
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

const sessions = {};

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
  const readyCount         = session.participants.filter(function(p) { return p.status === 'ready'; }).length;
  const completedHumCount  = session.participants.filter(function(p) { return !!p.humData; }).length;
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
    // Hum data summary
    hasHumData:              completedHumCount > 0,
    completedHumCount:       completedHumCount,
    joinedCount:             session.participants.length,
    readyCount:              readyCount,
    totalCount:              session.participants.length,
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
  const readyCount  = session.participants.filter(function(p) { return p.status === 'ready'; }).length;
  const totalJoined = session.participants.length;
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
  return publicSession(sessions[sessionId]);
}

// Stage 7: attach an affiliate_code to an existing session (set by server after
// looking up the driver user's affiliate record). Safe no-op if the session
// does not exist. Returns the updated public view.
function setSessionAffiliateCode(sessionId, affiliateCode) {
  const session = sessions[sessionId];
  if (!session) return null;
  session.affiliateCode = affiliateCode || null;
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
  return publicSession(session);
}

// ── Session-aware song scoring ────────────────────────────────────────────────
//
// Stage 6 group-fit model: scores each song by how much of EACH participant's
// vocal range overlaps the song's range, weighted by rolePreference. This is
// more honest than union-envelope because a song that perfectly fits one
// extreme rider but covers none of the others will score low.
//
// Per-participant weight by rolePreference:
//   'Lead'    -> 1.5  (melody-first: matters most for song fit)
//   'Either'  -> 1.0
//   'Harmony' -> 0.7  (flexible, matters less for melody fit)
//
// groupFit = sum(participantCoverage * weight) / sum(weight)
//   where participantCoverage = overlap(participantRange, songRange) / participantSpan
//
// Fallbacks:
//   0 valid riders -> union-envelope over default range
//   1 valid rider  -> direct range (same as old behavior)
//   2+ valid riders -> weighted group model above
//
function scoreSessionResults(session, limit) {
  limit = limit || 5;
  try {
    const catalog = getSongCatalog();
    if (!catalog.length) return { results: [], hasRealData: false, participantCount: 0, hummedCount: 0, groupLo: 0, groupHi: 0 };

    // Only participants with valid, sensible humData
    const withHum = (session.participants || []).filter(function(p) {
      if (!p.humData) return false;
      const lo = p.humData.low, hi = p.humData.high;
      return Number.isInteger(lo) && Number.isInteger(hi) && hi > lo;
    });

    const participantCount = session.participants ? session.participants.length : 0;
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

    const scored = catalog.map(function(song) {
      const songLo = typeof song.lo === 'number' ? song.lo : 40;
      const songHi = typeof song.hi === 'number' ? song.hi : 72;

      let coverage; // 0..1
      if (mode === 'group') {
        let weightedSum = 0, weightTotal = 0;
        withHum.forEach(function(p) {
          const pLo = p.humData.low, pHi = p.humData.high;
          const span = Math.max(pHi - pLo, 1);
          const overlap = Math.max(0, Math.min(pHi, songHi) - Math.max(pLo, songLo));
          const pCov = overlap / span;
          const w = weightFor(p.rolePreference);
          weightedSum += pCov * w;
          weightTotal += w;
        });
        coverage = weightTotal > 0 ? weightedSum / weightTotal : 0;
      } else {
        // single / default: coverage = overlap / groupSpan
        const span = Math.max(groupHi - groupLo, 1);
        const overlap = Math.max(0, Math.min(groupHi, songHi) - Math.max(groupLo, songLo));
        coverage = overlap / span;
      }

      const fitPct = Math.min(100, Math.max(0, Math.round(coverage * 100)));

      return {
        title:  song.title,
        artist: song.artist,
        lo:     songLo,
        hi:     songHi,
        fitPct: fitPct
      };
    });

    // Sort descending by fitPct (stable)
    scored.sort(function(a, b) { return b.fitPct - a.fitPct; });

    // Diversity tie-breaking: among songs within 3 pts of each other, prefer
    // different artists. Deterministic, stable — we walk the sorted list and
    // when two adjacent entries are within 3 pts and share an artist already
    // seen in the recent window, we nudge the duplicate down past non-dupes.
    const top = [];
    const pool = scored.slice(0, Math.min(scored.length, limit * 6));
    const seenArtists = {};
    let i = 0;
    while (top.length < limit && i < pool.length) {
      const cand = pool[i];
      const artistKey = (cand.artist || '').toLowerCase();
      if (!seenArtists[artistKey]) {
        top.push(cand);
        seenArtists[artistKey] = true;
        pool.splice(i, 1);
        i = 0;
      } else {
        // Look ahead within 3 pts for a different-artist alternative
        let swapped = false;
        for (let j = i + 1; j < pool.length; j++) {
          if (cand.fitPct - pool[j].fitPct > 3) break;
          const altArtist = (pool[j].artist || '').toLowerCase();
          if (!seenArtists[altArtist]) {
            top.push(pool[j]);
            seenArtists[altArtist] = true;
            pool.splice(j, 1);
            swapped = true;
            break;
          }
        }
        if (!swapped) {
          // No diverse alternative within tolerance: accept this one
          top.push(cand);
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
      results:         top,
      hasRealData:     hasRealData,
      participantCount: participantCount,
      hummedCount:     hummedCount,
      groupLo:         groupLo,
      groupHi:         groupHi
    };
  } catch (_) {
    return { results: [], hasRealData: false, participantCount: 0, hummedCount: 0, groupLo: 0, groupHi: 0 };
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
