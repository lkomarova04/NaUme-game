import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { createPgPool } from './database/createPool';
import { NoopHistoryRepository } from './repositories/HistoryRepository';
import { InMemorySessionRepository } from './repositories/InMemorySessionRepository';
import { PostgresQuestionRepository } from './repositories/PostgresQuestionRepository';
import { RedisSessionRepository } from './repositories/RedisSessionRepository';
import { GameService } from './services/GameService';
import { createSocketServer } from './socket/createSocketServer';
import { registerGameHandlers } from './socket/registerGameHandlers';
import type { GameEvent } from './domain/types';

const getEventRoom = (sessionId: string, event: GameEvent) => {
  switch (event.type) {
    case 'player_joined':
    case 'player_left':
    case 'answer_submitted':
      return `${sessionId}:staff`;
    default:
      return sessionId;
  }
};

const bootstrap = async () => {
  const app = createApp();
  const httpServer = createServer(app);
  const io = createSocketServer(httpServer);

  const pool = createPgPool();
  const questionRepository = new PostgresQuestionRepository(pool);
  await questionRepository.init();
  const questions = await questionRepository.getAll();

  const sessionRepository = env.redisUrl
    ? new RedisSessionRepository(env.redisUrl)
    : new InMemorySessionRepository();
  if (sessionRepository instanceof RedisSessionRepository) {
    await sessionRepository.hydrate();
  }
  const historyRepository = new NoopHistoryRepository();

  const gameService = new GameService(sessionRepository, historyRepository, questions, {
    onSessionUpdate: (session) => {
      io.to(session.sessionId).emit('session:update', session);
    },
    onTopAnswers: (sessionId, topAnswers) => {
      io.to(sessionId).emit('game:top-answers', topAnswers);
    },
    onGameEvent: (sessionId, event) => {
      io.to(getEventRoom(sessionId, event)).emit('game:event', event);
    },
  });
  gameService.resumeTimers();

  io.on('connection', (socket) => {
    registerGameHandlers(io, socket, gameService);
  });

  httpServer.listen(env.port, () => {
    console.log(`Na Ume server listening on http://localhost:${env.port}`);
  });
};

void bootstrap().catch((error) => {
  console.error('Failed to bootstrap server', error);
  process.exit(1);
});
