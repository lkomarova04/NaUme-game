"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGameService = void 0;
const game_1 = require("../config/game");
const HistoryRepository_1 = require("../repositories/HistoryRepository");
const InMemorySessionRepository_1 = require("../repositories/InMemorySessionRepository");
const GameService_1 = require("../services/GameService");
const createGameService = () => {
    const sessionUpdates = [];
    const topAnswersEvents = [];
    const closedSessions = [];
    const service = new GameService_1.GameService(new InMemorySessionRepository_1.InMemorySessionRepository(), new HistoryRepository_1.NoopHistoryRepository(), game_1.QUESTION_BANK, {
        onSessionUpdate: (session) => {
            sessionUpdates.push(session);
        },
        onTopAnswers: (sessionId, topAnswers) => {
            topAnswersEvents.push({ sessionId, topAnswers });
        },
        onSessionClosed: (sessionId) => {
            closedSessions.push(sessionId);
        },
    });
    return { service, sessionUpdates, topAnswersEvents, closedSessions };
};
exports.createGameService = createGameService;
