import type { InternalSession } from '../domain/types';
import type { SessionRepository } from './SessionRepository';

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, InternalSession>();

  create(session: InternalSession) {
    this.sessions.set(session.sessionId, session);
    return session;
  }

  get(sessionId: string) {
    return this.sessions.get(sessionId);
  }

  getAll() {
    return Array.from(this.sessions.values());
  }

  update(session: InternalSession) {
    this.sessions.set(session.sessionId, session);
    return session;
  }

  delete(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}
