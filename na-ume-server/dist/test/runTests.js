"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const containsProfanity_1 = require("../lib/containsProfanity");
const normalizeText_1 = require("../lib/normalizeText");
const HistoryRepository_1 = require("../repositories/HistoryRepository");
const InMemorySessionRepository_1 = require("../repositories/InMemorySessionRepository");
const game_1 = require("../config/game");
const GameService_1 = require("../services/GameService");
const createGameService = () => {
    const sessionUpdates = [];
    const topAnswersEvents = [];
    const service = new GameService_1.GameService(new InMemorySessionRepository_1.InMemorySessionRepository(), new HistoryRepository_1.NoopHistoryRepository(), game_1.QUESTION_BANK, {
        onSessionUpdate: (session) => {
            sessionUpdates.push(session);
        },
        onTopAnswers: (sessionId, topAnswers) => {
            topAnswersEvents.push({ sessionId, topAnswers });
        },
    });
    return { service, sessionUpdates, topAnswersEvents };
};
const run = (name, fn) => {
    fn();
    console.log(`PASS ${name}`);
};
run('normalizeText lowercases, trims and removes punctuation', () => {
    const result = (0, normalizeText_1.normalizeText)('  ПрИвЕт,   мир!!!  2026  ');
    strict_1.default.equal(result, 'привет мир 2026');
});
run('normalizeText removes separators and keeps letters and digits', () => {
    const result = (0, normalizeText_1.normalizeText)('Тест-набор №1 / super');
    strict_1.default.equal(result, 'тест набор 1 super');
});
run('create session and start game', () => {
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
run('aggregate top answers and award score for correct guess', () => {
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
    const nextState = service.nextPhase(session.sessionId);
    strict_1.default.equal(nextState.phase, 'answering');
    strict_1.default.equal(nextState.roundIndex, 1);
});
run('disconnect removes player from session roster', () => {
    const { service } = createGameService();
    const session = service.createSession('Disconnect Event');
    const joinResult = service.joinSession(session.sessionId, 'player', 'Игрок', 'socket-player');
    strict_1.default.equal(joinResult.success, true);
    strict_1.default.equal(joinResult.session?.players.length, 1);
    service.disconnectPlayer(session.sessionId, joinResult.player?.id, 'socket-player');
    const updatedSession = service.getSession(session.sessionId);
    strict_1.default.equal(updatedSession?.players.length, 0);
});
run('reset game returns session to lobby and preserves players with zeroed scores', () => {
    const { service } = createGameService();
    const session = service.createSession('Reset Event');
    const alice = service.joinSession(session.sessionId, 'player', 'Алиса', 'socket-alice').player;
    const boris = service.joinSession(session.sessionId, 'player', 'Борис', 'socket-boris').player;
    service.startGame(session.sessionId);
    service.submitAnswer(session.sessionId, alice.id, 'Кофе');
    service.submitAnswer(session.sessionId, boris.id, 'Чай');
    service.nextPhase(session.sessionId);
    service.submitGuess(session.sessionId, alice.id, 'кофе');
    const reset = service.resetGame(session.sessionId, true);
    strict_1.default.equal(reset.phase, 'lobby');
    strict_1.default.equal(reset.roundIndex, 0);
    strict_1.default.equal(reset.players.length, 2);
    strict_1.default.equal(reset.players[0]?.score, 0);
    strict_1.default.equal(reset.rounds[0]?.answers.length, 0);
    strict_1.default.equal(reset.rounds[0]?.topAnswers.length, 0);
});
run('leaderboard appears only after last round', () => {
    const { service } = createGameService();
    const session = service.createSession('Round Flow Event');
    const alice = service.joinSession(session.sessionId, 'player', 'Алиса', 'socket-alice').player;
    const boris = service.joinSession(session.sessionId, 'player', 'Борис', 'socket-boris').player;
    service.startGame(session.sessionId);
    service.submitAnswer(session.sessionId, alice.id, 'Кофе');
    service.submitAnswer(session.sessionId, boris.id, 'Чай');
    let state = service.nextPhase(session.sessionId);
    strict_1.default.equal(state.phase, 'guessing');
    state = service.nextPhase(session.sessionId);
    strict_1.default.equal(state.phase, 'answering');
    strict_1.default.equal(state.roundIndex, 1);
    for (let roundIndex = 1; roundIndex < state.rounds.length; roundIndex += 1) {
        const currentPlayers = service.getSession(session.sessionId)?.players ?? [];
        for (const [playerIndex, currentPlayer] of currentPlayers.entries()) {
            service.submitAnswer(session.sessionId, currentPlayer.id, `Ответ ${roundIndex}-${playerIndex}`);
        }
        state = service.nextPhase(session.sessionId);
        strict_1.default.equal(state.phase, 'guessing');
        if (roundIndex < state.rounds.length - 1) {
            state = service.nextPhase(session.sessionId);
            strict_1.default.equal(state.phase, 'answering');
            strict_1.default.equal(state.roundIndex, roundIndex + 1);
        }
    }
    const finalState = service.nextPhase(session.sessionId);
    strict_1.default.equal(finalState.phase, 'leaderboard');
});
run('normalizeText groups simple word forms together', () => {
    strict_1.default.equal((0, normalizeText_1.normalizeText)('сова'), (0, normalizeText_1.normalizeText)('совушка'));
    strict_1.default.equal((0, normalizeText_1.normalizeText)('СОВА'), (0, normalizeText_1.normalizeText)('совушка'));
});
run('containsProfanity catches rude words without false positives for normal words', () => {
    strict_1.default.equal((0, containsProfanity_1.containsProfanity)((0, normalizeText_1.normalizeText)('бляха')), true);
    strict_1.default.equal((0, containsProfanity_1.containsProfanity)((0, normalizeText_1.normalizeText)('какашка')), true);
    strict_1.default.equal((0, containsProfanity_1.containsProfanity)((0, normalizeText_1.normalizeText)('какаshka')), true);
    strict_1.default.equal((0, containsProfanity_1.containsProfanity)((0, normalizeText_1.normalizeText)('лебедь')), false);
    strict_1.default.equal((0, containsProfanity_1.containsProfanity)((0, normalizeText_1.normalizeText)('кофе')), false);
});
run('pause timer preserves phase and resumes countdown', () => {
    const { service } = createGameService();
    const session = service.createSession('Pause Event');
    const started = service.startGame(session.sessionId);
    strict_1.default.equal(started.phasePaused, false);
    strict_1.default.ok(started.phaseEndsAt > Date.now());
    const paused = service.setTimerPaused(session.sessionId, true);
    strict_1.default.equal(paused.phasePaused, true);
    strict_1.default.ok(paused.phaseEndsAt > 0);
    const resumed = service.setTimerPaused(session.sessionId, false);
    strict_1.default.equal(resumed.phasePaused, false);
    strict_1.default.ok(resumed.phaseEndsAt > Date.now());
    service.nextPhase(session.sessionId);
    service.nextPhase(session.sessionId);
    service.nextPhase(session.sessionId);
    service.nextPhase(session.sessionId);
});
run('inappropriate answer does not count and does not lock the player', () => {
    const { service } = createGameService();
    const session = service.createSession('Moderation Event');
    const player = service.joinSession(session.sessionId, 'player', 'Игрок', 'socket-player').player;
    service.startGame(session.sessionId);
    strict_1.default.throws(() => service.submitAnswer(session.sessionId, player.id, 'бляха'), /inappropriate language/);
    const updatedSession = service.getSession(session.sessionId);
    const updatedPlayer = updatedSession.players.find((item) => item.id === player.id);
    strict_1.default.equal(updatedSession.rounds[0]?.answers.length, 0);
    strict_1.default.equal(updatedPlayer.hasAnswered, false);
});
console.log('All tests passed');
process.exit(0);
