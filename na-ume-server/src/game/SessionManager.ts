type SessionState = {
  sessionId: string;
  phase: string;
};

export class SessionManager {
  private sessions = new Map<string, SessionState>();

  create(sessionId: string) {
    const session: SessionState = {
      sessionId,
      phase: 'lobby',
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  get(sessionId: string) {
    return this.sessions.get(sessionId);
  }
}

export const sessionManager = new SessionManager();