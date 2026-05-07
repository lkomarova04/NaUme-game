import type { SessionState } from '../domain/types';

export interface HistoryRepository {
  saveFinishedSession(session: SessionState): Promise<void>;
}

export class NoopHistoryRepository implements HistoryRepository {
  async saveFinishedSession(_session: SessionState): Promise<void> {
    return Promise.resolve();
  }
}
