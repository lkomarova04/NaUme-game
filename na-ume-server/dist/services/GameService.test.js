"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const HistoryRepository_1 = require("../repositories/HistoryRepository");
const InMemorySessionRepository_1 = require("../repositories/InMemorySessionRepository");
const GameService_1 = require("./GameService");
const createGameService = () => {
    const sessionUpdates = [];
    const topAnswersEvents = [];
    const service = new GameService_1.GameService(new InMemorySessionRepository_1.InMemorySessionRepository(), new HistoryRepository_1.NoopHistoryRepository(), {
        onSessionUpdate: (session) => {
            sessionUpdates.push(session);
        },
        onTopAnswers: (sessionId, topAnswers) => {
            topAnswersEvents.push({ sessionId, topAnswers });
        },
    });
    return { service, sessionUpdates, topAnswersEvents };
};
(0, node_test_1.default)('organizer can create session and start the game in answering phase', () => {
    const { service } = createGameService();
    const session = service.createSession('Demo Event');
    strict_1.default.equal(session.phase, 'lobby');
    strict_1.default.equal(session.eventName, 'Demo Event');
    strict_1.default.ok(session.sessionId.length >= 6);
    const started = service.startGame(session.sessionId);
    strict_1.default.equal(started.phase, 'answering');
    strict_1.default.equal(started.roundIndex, 0);
    strict_1.default.ok(started.phaseEndsAt > Date.now());
    service.nextPhase(session.sessionId);
    service.nextPhase(session.sessionId);
    service.nextPhase(session.sessionId);
    service.nextPhase(session.sessionId);
});
(0, node_test_1.default)('answers are aggregated into top answers and guesses award score', () => {
    const { service, topAnswersEvents } = createGameService();
    const session = service.createSession('Scoring Event');
    const aliceJoin = service.joinSession(session.sessionId, 'player', 'Алиса', 'socket-alice');
    const borisJoin = service.joinSession(session.sessionId, 'player', 'Борис', 'socket-boris');
    const veraJoin = service.joinSession(session.sessionId, 'player', 'Вера', 'socket-vera');
    strict_1.default.equal(aliceJoin.success, true);
    strict_1.default.equal(borisJoin.success, true);
    strict_1.default.equal(veraJoin.success, true);
    const alice = aliceJoin.player;
    const boris = borisJoin.player;
    const vera = veraJoin.player;
    service.startGame(session.sessionId);
    service.submitAnswer(session.sessionId, alice.id, 'Кофе');
    service.submitAnswer(session.sessionId, boris.id, ' кофе ');
    service.submitAnswer(session.sessionId, vera.id, 'Чай');
    const afterGuessingStart = service.nextPhase(session.sessionId);
    strict_1.default.equal(afterGuessingStart.phase, 'guessing');
    strict_1.default.equal(topAnswersEvents.length, 1);
    strict_1.default.equal(topAnswersEvents[0].topAnswers[0]?.text, 'Кофе');
    strict_1.default.equal(topAnswersEvents[0].topAnswers[0]?.percentage, 67);
    const guessResult = service.submitGuess(session.sessionId, alice.id, 'кофе');
    strict_1.default.equal(guessResult.result.matched, true);
    strict_1.default.equal(guessResult.player.score, 67);
    const missResult = service.submitGuess(session.sessionId, boris.id, 'сок');
    strict_1.default.equal(missResult.result.matched, false);
    strict_1.default.equal(missResult.player.score, 0);
    service.nextPhase(session.sessionId);
    service.revealAnswer(session.sessionId, 1);
    service.revealAnswer(session.sessionId, 0);
});
(0, node_test_1.default)('disconnect removes player from session roster', () => {
    const { service } = createGameService();
    const session = service.createSession('Disconnect Event');
    const joinResult = service.joinSession(session.sessionId, 'player', 'Игрок', 'socket-player');
    strict_1.default.equal(joinResult.success, true);
    strict_1.default.equal(joinResult.session?.players.length, 1);
    service.disconnectPlayer(session.sessionId, joinResult.player?.id, 'socket-player');
    const updatedSession = service.getSession(session.sessionId);
    strict_1.default.equal(updatedSession?.players.length, 0);
});
