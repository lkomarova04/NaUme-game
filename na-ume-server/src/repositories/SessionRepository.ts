import type { InternalSession } from '../domain/types';

export interface SessionRepository {
  create(session: InternalSession): InternalSession;
  get(sessionId: string): InternalSession | undefined;
  getAll(): InternalSession[];
  update(session: InternalSession): InternalSession;
  delete(sessionId: string): void;
}
