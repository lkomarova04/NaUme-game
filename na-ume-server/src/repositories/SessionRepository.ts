import type { InternalSession } from '../domain/types';

export type SessionUpdateOptions = {
  durable?: boolean;
};

export interface SessionRepository {
  create(session: InternalSession): InternalSession;
  get(sessionId: string): InternalSession | undefined;
  getAll(): InternalSession[];
  update(session: InternalSession, options?: SessionUpdateOptions): InternalSession;
  delete(sessionId: string): void;
}