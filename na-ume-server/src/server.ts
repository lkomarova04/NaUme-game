import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { createPgPool } from './database/createPool';
import { NoopHistoryRepository } from './repositories/HistoryRepository';
import { InMemorySessionRepository } from './repositories/InMemorySessionRepository';
import { PostgresQuestionRepository } from './repositories/PostgresQuestionRepository';
import { GameService } from './services/GameService';
import { createSocketServer } from './socket/createSocketServer';
import { registerGameHandlers } from './socket/registerGameHandlers';

const bootstrap = async () => {
  const app = createApp();
  const httpServer = createServer(app);
  const io = createSocketServer(httpServer);

  const pool = createPgPool();
  const questionRepository = new PostgresQuestionRepository(pool);
  await questionRepository.init();
  const questions = await questionRepository.getAll();

  const sessionRepository = new InMemorySessionRepository();
  const historyRepository = new NoopHistoryRepository();

  const gameService = new GameService(sessionRepository, historyRepository, questions, {
    onSessionUpdate: (session) => {
      io.to(session.sessionId).emit('session:update', session);
    },
    onTopAnswers: (sessionId, topAnswers) => {
      io.to(sessionId).emit('game:top-answers', topAnswers);
    },
  });

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
