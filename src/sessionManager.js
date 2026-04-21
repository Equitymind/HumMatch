// src/sessionManager.js

const sessions = {};

function createSession(sessionName, expectedRiderCount, vibePreset) {
    const sessionId = Date.now(); // Simple unique identifier based on timestamp
    sessions[sessionId] = {
        id: sessionId,
        name: sessionName,
        expectedCount: expectedRiderCount,
        vibePreset: vibePreset,
        createdAt: new Date(),
        participants: [],
        joinedCount: 0,
        readyCount: 0,
        isActive: true
    };
    return sessions[sessionId];
}

function joinSession(sessionId, participantName, preference) {
    if (sessions[sessionId] && sessions[sessionId].isActive) {
        const participant = { name: participantName, preference: preference };
        sessions[sessionId].participants.push(participant);
        sessions[sessionId].joinedCount++; // Update the joined count
        return sessions[sessionId];
    }
    return null; // Session not found or inactive
}

function endSession(sessionId) {
    if (sessions[sessionId]) {
        sessions[sessionId].isActive = false;
        return sessions[sessionId];
    }
    return null;
}

function getSession(sessionId) {
    return sessions[sessionId] || null;
}

module.exports = { createSession, joinSession, endSession, getSession };
