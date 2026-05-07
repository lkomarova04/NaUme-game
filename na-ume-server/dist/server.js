"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = require("./app");
const env_1 = require("./config/env");
const createPool_1 = require("./database/createPool");
const HistoryRepository_1 = require("./repositories/HistoryRepository");
const InMemorySessionRepository_1 = require("./repositories/InMemorySessionRepository");
const PostgresQuestionRepository_1 = require("./repositories/PostgresQuestionRepository");
const GameService_1 = require("./services/GameService");
const createSocketServer_1 = require("./socket/createSocketServer");
const registerGameHandlers_1 = require("./socket/registerGameHandlers");
const bootstrap = async () => {
    const app = (0, app_1.createApp)();
    const httpServer = (0, http_1.createServer)(app);
    const io = (0, createSocketServer_1.createSocketServer)(httpServer);
    const pool = (0, createPool_1.createPgPool)();
    const questionRepository = new PostgresQuestionRepository_1.PostgresQuestionRepository(pool);
    await questionRepository.init();
    const questions = await questionRepository.getAll();
    const sessionRepository = new InMemorySessionRepository_1.InMemorySessionRepository();
    const historyRepository = new HistoryRepository_1.NoopHistoryRepository();
    const gameService = new GameService_1.GameService(sessionRepository, historyRepository, questions, {
        onSessionUpdate: (session) => {
            io.to(session.sessionId).emit('session:update', session);
        },
        onTopAnswers: (sessionId, topAnswers) => {
            io.to(sessionId).emit('game:top-answers', topAnswers);
        },
    });
    io.on('connection', (socket) => {
        (0, registerGameHandlers_1.registerGameHandlers)(io, socket, gameService);
    });
    httpServer.listen(env_1.env.port, () => {
        console.log(`Na Ume server listening on http://localhost:${env_1.env.port}`);
    });
};
void bootstrap().catch((error) => {
    console.error('Failed to bootstrap server', error);
    process.exit(1);
});
