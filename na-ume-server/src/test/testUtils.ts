import { QUESTION_BANK } from '../config/game';
import type { SessionState, TopAnswer } from '../domain/types';
import { NoopHistoryRepository } from '../repositories/HistoryRepository';
import { InMemorySessionRepository } from '../repositories/InMemorySessionRepository';
import { GameService } from '../services/GameService';

export const createGameService = () => {
  const sessionUpdates: SessionState[] = [];
  const topAnswersEvents: Array<{ sessionId: string; topAnswers: TopAnswer[] }> = [];

  const service = new GameService(
    new InMemorySessionRepository(),
    new NoopHistoryRepository(),
    QUESTION_BANK,
    {
      onSessionUpdate: (session) => {
        sessionUpdates.push(session);
      },
      onTopAnswers: (sessionId, topAnswers) => {
        topAnswersEvents.push({ sessionId, topAnswers });
      },
    },
  );

  return { service, sessionUpdates, topAnswersEvents };
};
