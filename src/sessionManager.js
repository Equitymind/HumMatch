// src/sessionManager.js
// Stage 2B: extended participant state model with roster, status, and advance logic.

const sessions = {};

// ── helpers ──────────────────────────────────────────────────────────────────

function makeParticipantId() {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Return a safe public copy of the session (avoids accidentally leaking internal
// fields and keeps the shape stable across all API responses).
function publicSession(session) {
  if (!session) return null;
  const readyCount = session.participants.filter(function(p) { return p.status === 'ready'; }).length;
  const currentParticipant = session.participants[session.currentParticipantIndex] || null;
  const nextParticipant = session.participants[session.currentParticipantIndex + 1] || null;
  return {
    id:                     session.id,
    name:                   session.name,
    expectedCount:          session.expectedCount,
    vibePreset:             session.vibePreset,
    createdAt:              session.createdAt,
    isActive:               session.isActive,
    isComplete:             session.isComplete,
    joinedCount:            session.participants.length,
    readyCount:             readyCount,
    totalCount:             session.participants.length,
    currentParticipantIndex: session.currentParticipantIndex,
    currentParticipant:     currentParticipant ? { id: currentParticipant.id, name: currentParticipant.name } : null,
    nextParticipant:        nextParticipant    ? { id: nextParticipant.id,    name: nextParticipant.name    } : null,
    participants:           session.participants.map(function(p) {
      return {
        id:             p.id,
        name:           p.name,
        rolePreference: p.rolePreference,
        joinedAt:       p.joinedAt,
        status:         p.status,
        // legacy alias used by older front-end code
        preference:     p.rolePreference
      };
    })
  };
}

// Recalculate participant statuses after a state change.
// Rules:
//   index < currentParticipantIndex  → ready
//   index === currentParticipantIndex → current
//   index > currentParticipantIndex  → waiting
function syncStatuses(session) {
  const idx = session.currentParticipantIndex;
  session.participants.forEach(function(p, i) {
    if (i < idx)       p.status = 'ready';
    else if (i === idx) p.status = 'current';
    else               p.status = 'waiting';
  });
}

// ── public API ────────────────────────────────────────────────────────────────

function createSession(sessionName, expectedRiderCount, vibePreset) {
  const sessionId = Date.now().toString();
  const driverParticipant = {
    id:             makeParticipantId(),
    name:           'Driver',
    rolePreference: 'Lead',
    joinedAt:       new Date(),
    status:         'current'   // driver is always participant 0 / current at start
  };
  sessions[sessionId] = {
    id:                      sessionId,
    name:                    sessionName || 'Ride Mode Session',
    expectedCount:           Number(expectedRiderCount) || 5,
    vibePreset:              vibePreset || 'Easy Wins',
    createdAt:               new Date(),
    participants:            [driverParticipant],
    currentParticipantIndex: 0,
    isActive:                true,
    isComplete:              false
  };
  return publicSession(sessions[sessionId]);
}

function joinSession(sessionId, participantName, rolePreference) {
  const session = sessions[sessionId];
  if (!session || !session.isActive) return null;

  // Cap at 5 total riders (spec requirement).
  if (session.participants.length >= 5) return publicSession(session);

  const newParticipant = {
    id:             makeParticipantId(),
    name:           participantName || 'Guest',
    rolePreference: rolePreference  || 'Either',
    joinedAt:       new Date(),
    status:         'waiting'   // new joiners wait until it's their turn
  };
  session.participants.push(newParticipant);

  // Keep statuses consistent after the join.
  syncStatuses(session);
  return publicSession(session);
}

// Mark the current participant ready and advance to the next one.
// Returns null if session not found or already complete.
function advanceSession(sessionId) {
  const session = sessions[sessionId];
  if (!session || !session.isActive) return null;

  const idx = session.currentParticipantIndex;
  const current = session.participants[idx];

  if (current) {
    current.status = 'ready';
  }

  const nextIdx = idx + 1;
  if (nextIdx < session.participants.length) {
    session.currentParticipantIndex = nextIdx;
    syncStatuses(session);
  } else {
    // All participants are done — mark everyone ready and complete the session.
    session.isComplete = true;
    session.isActive   = false;   // no more joins allowed
    session.participants.forEach(function(p) { p.status = 'ready'; });
  }

  return publicSession(session);
}

function endSession(sessionId) {
  const session = sessions[sessionId];
  if (!session) return null;
  session.isActive   = false;
  session.isComplete = true;
  // Mark any still-waiting/current participants as ready so the roster looks clean.
  session.participants.forEach(function(p) {
    if (p.status !== 'ready') p.status = 'ready';
  });
  return publicSession(session);
}

function getSession(sessionId) {
  const session = sessions[sessionId];
  if (!session) return null;
  return publicSession(session);
}

module.exports = { createSession, joinSession, advanceSession, endSession, getSession };
