"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemorySessionRepository = void 0;
class InMemorySessionRepository {
    sessions = new Map();
    create(session) {
        this.sessions.set(session.sessionId, session);
        return session;
    }
    get(sessionId) {
        return this.sessions.get(sessionId);
    }
    getAll() {
        return Array.from(this.sessions.values());
    }
    update(session) {
        this.sessions.set(session.sessionId, session);
        return session;
    }
    delete(sessionId) {
        this.sessions.delete(sessionId);
    }
}
exports.InMemorySessionRepository = InMemorySessionRepository;
