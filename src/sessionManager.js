// src/sessionManager.js
// Stage 2B/3/4: participant state model with roster, status, advance logic,
// host assignment, role-aware session views, and per-participant hum data storage.

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

function createSession(sessionName, expectedRiderCount, vibePreset, driverAlias) {
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
    createdAt:               new Date(),
    participants:            [driverParticipant],
    currentParticipantIndex: 0,
    hostParticipantId:       null,
    isActive:                true,
    isComplete:              false,
    // Driver identity fields (non-billing, prepared for later affiliate linkage)
    driverAlias:             driverAlias || null,
    driverSessionOwner:      null,
    captureMode:             'driver_device'
  };
  return publicSession(sessions[sessionId]);
}

function joinSession(sessionId, participantName, rolePreference) {
  const session = sessions[sessionId];
  if (!session || !session.isActive) return null;
  if (session.participants.length >= 5) return publicSession(session);

  const newParticipant = {
    id:             makeParticipantId(),
    name:           participantName || 'Guest',
    rolePreference: rolePreference  || 'Either',
    joinedAt:       new Date(),
    status:         'waiting',
    humData:        null
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

module.exports = {
  createSession,
  joinSession,
  assignHost,
  advanceSession,
  endSession,
  getSession,
  getSessionForViewer,
  storeHumData
};
