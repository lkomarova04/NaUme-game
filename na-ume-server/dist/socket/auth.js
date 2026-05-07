"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSocketAuth = void 0;
const VALID_ROLES = new Set(['player', 'organizer', 'display']);
const parseSocketAuth = (socket) => {
    const rawAuth = socket.handshake.auth;
    return {
        sessionId: typeof rawAuth?.sessionId === 'string' ? rawAuth.sessionId : undefined,
        role: typeof rawAuth?.role === 'string' && VALID_ROLES.has(rawAuth.role) ? rawAuth.role : undefined,
        playerName: typeof rawAuth?.playerName === 'string' ? rawAuth.playerName : undefined,
    };
};
exports.parseSocketAuth = parseSocketAuth;
