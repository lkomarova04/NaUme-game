"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketHandlers = void 0;
const SessionManager_1 = require("../game/SessionManager");
const emitSession = (io, sessionId, session) => {
    if (!session)
        return;
    io.to(sessionId).emit('session:update', session);
};
const registerSocketHandlers = (io, socket) => {
    socket.on('session:join', ({ sessionId, role = 'player', playerName }) => {
        socket.join(sessionId);
        const session = SessionManager_1.sessionManager.ensure(sessionId);
        if (role === 'player' && playerName) {
            const { player } = SessionManager_1.sessionManager.joinPlayer(sessionId, playerName);
            if (player) {
                socket.emit('player:joined', player);
            }
        }
        emitSession(io, sessionId, session);
    });
    socket.on('session:phase:set', ({ sessionId, phase }) => {
        emitSession(io, sessionId, SessionManager_1.sessionManager.setPhase(sessionId, phase));
    });
    socket.on('session:settings:update', ({ sessionId, settings }) => {
        emitSession(io, sessionId, SessionManager_1.sessionManager.updateSettings(sessionId, settings));
    });
    socket.on('session:round:set', ({ sessionId, roundIndex }) => {
        emitSession(io, sessionId, SessionManager_1.sessionManager.goToRound(sessionId, roundIndex));
    });
    socket.on('answer:submit', ({ sessionId, playerId, answer }) => {
        emitSession(io, sessionId, SessionManager_1.sessionManager.submitAnswer(sessionId, playerId, answer));
    });
    socket.on('guess:submit', ({ sessionId, playerId, guess }, callback) => {
        const { session, result } = SessionManager_1.sessionManager.submitGuess(sessionId, playerId, guess);
        emitSession(io, sessionId, session);
        if (typeof callback === 'function') {
            callback(result);
        }
    });
    socket.on('answer:reveal', ({ sessionId, answerId }) => {
        emitSession(io, sessionId, SessionManager_1.sessionManager.revealTopAnswer(sessionId, answerId));
    });
    socket.on('answer:delete', ({ sessionId, answerId }) => {
        emitSession(io, sessionId, SessionManager_1.sessionManager.deleteRawAnswer(sessionId, answerId));
    });
};
exports.registerSocketHandlers = registerSocketHandlers;
