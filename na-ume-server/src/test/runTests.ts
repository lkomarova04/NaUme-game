import assert from 'node:assert/strict';
import { containsProfanity } from '../lib/containsProfanity';
import { normalizeText } from '../lib/normalizeText';
import type { SessionState, TopAnswer } from '../domain/types';
import { NoopHistoryRepository } from '../repositories/HistoryRepository';
import { InMemorySessionRepository } from '../repositories/InMemorySessionRepository';
import { QUESTION_BANK } from '../config/game';
import { GameService } from '../services/GameService';

const createGameService = () => {
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

const run = (name: string, fn: () => void) => {
  fn();
  console.log(`PASS ${name}`);
};

run('normalizeText lowercases, trims and removes punctuation', () => {
  const result = normalizeText('  ПрИвЕт,   мир!!!  2026  ');
  assert.equal(result, 'привет мир 2026');
});

run('normalizeText removes separators and keeps letters and digits', () => {
  const result = normalizeText('Тест-набор №1 / super');
  assert.equal(result, 'тест набор 1 super');
});

run('create session and start game', () => {
  const { service } = createGameService();
  const session = service.createSession('Demo Event');

  assert.equal(session.phase, 'lobby');
  assert.equal(session.eventName, 'Demo Event');
  assert.ok(session.sessionId.length >= 6);

  const started = service.startGame(session.sessionId);
  assert.equal(started.phase, 'answering');
  assert.equal(started.roundIndex, 0);
  assert.ok(started.phaseEndsAt > Date.now());

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

  assert.equal(aliceJoin.success, true);
  assert.equal(borisJoin.success, true);
  assert.equal(veraJoin.success, true);

  const alice = aliceJoin.player!;
  const boris = borisJoin.player!;
  const vera = veraJoin.player!;

  service.startGame(session.sessionId);
  service.submitAnswer(session.sessionId, alice.id, 'Кофе');
  service.submitAnswer(session.sessionId, boris.id, ' кофе ');
  service.submitAnswer(session.sessionId, vera.id, 'Чай');

  const afterGuessingStart = service.nextPhase(session.sessionId);
  assert.equal(afterGuessingStart.phase, 'guessing');
  assert.equal(topAnswersEvents.length, 1);
  assert.equal(topAnswersEvents[0].topAnswers[0]?.text, 'Кофе');
  assert.equal(topAnswersEvents[0].topAnswers[0]?.percentage, 67);

  const guessResult = service.submitGuess(session.sessionId, alice.id, 'кофе');
  assert.equal(guessResult.result.matched, true);
  assert.equal(guessResult.player.score, 67);

  const missResult = service.submitGuess(session.sessionId, boris.id, 'сок');
  assert.equal(missResult.result.matched, false);
  assert.equal(missResult.player.score, 0);

  const nextState = service.nextPhase(session.sessionId);
  assert.equal(nextState.phase, 'answering');
  assert.equal(nextState.roundIndex, 1);
});

run('disconnect removes player from session roster', () => {
  const { service } = createGameService();
  const session = service.createSession('Disconnect Event');
  const joinResult = service.joinSession(session.sessionId, 'player', 'Игрок', 'socket-player');

  assert.equal(joinResult.success, true);
  assert.equal(joinResult.session?.players.length, 1);

  service.disconnectPlayer(session.sessionId, joinResult.player?.id, 'socket-player');

  const updatedSession = service.getSession(session.sessionId);
  assert.equal(updatedSession?.players.length, 0);
});

run('reset game returns session to lobby and preserves players with zeroed scores', () => {
  const { service } = createGameService();
  const session = service.createSession('Reset Event');
  const alice = service.joinSession(session.sessionId, 'player', 'Алиса', 'socket-alice').player!;
  const boris = service.joinSession(session.sessionId, 'player', 'Борис', 'socket-boris').player!;

  service.startGame(session.sessionId);
  service.submitAnswer(session.sessionId, alice.id, 'Кофе');
  service.submitAnswer(session.sessionId, boris.id, 'Чай');
  service.nextPhase(session.sessionId);
  service.submitGuess(session.sessionId, alice.id, 'кофе');

  const reset = service.resetGame(session.sessionId, true);
  assert.equal(reset.phase, 'lobby');
  assert.equal(reset.roundIndex, 0);
  assert.equal(reset.players.length, 2);
  assert.equal(reset.players[0]?.score, 0);
  assert.equal(reset.rounds[0]?.answers.length, 0);
  assert.equal(reset.rounds[0]?.topAnswers.length, 0);
});

run('leaderboard appears only after last round', () => {
  const { service } = createGameService();
  const session = service.createSession('Round Flow Event');
  const alice = service.joinSession(session.sessionId, 'player', 'Алиса', 'socket-alice').player!;
  const boris = service.joinSession(session.sessionId, 'player', 'Борис', 'socket-boris').player!;

  service.startGame(session.sessionId);
  service.submitAnswer(session.sessionId, alice.id, 'Кофе');
  service.submitAnswer(session.sessionId, boris.id, 'Чай');
  let state = service.nextPhase(session.sessionId);
  assert.equal(state.phase, 'guessing');

  state = service.nextPhase(session.sessionId);
  assert.equal(state.phase, 'answering');
  assert.equal(state.roundIndex, 1);

  for (let roundIndex = 1; roundIndex < state.rounds.length; roundIndex += 1) {
    const currentPlayers = service.getSession(session.sessionId)?.players ?? [];

    for (const [playerIndex, currentPlayer] of currentPlayers.entries()) {
      service.submitAnswer(session.sessionId, currentPlayer.id, `Ответ ${roundIndex}-${playerIndex}`);
    }

    state = service.nextPhase(session.sessionId);
    assert.equal(state.phase, 'guessing');

    if (roundIndex < state.rounds.length - 1) {
      state = service.nextPhase(session.sessionId);
      assert.equal(state.phase, 'answering');
      assert.equal(state.roundIndex, roundIndex + 1);
    }
  }

  const finalState = service.nextPhase(session.sessionId);
  assert.equal(finalState.phase, 'leaderboard');
});

run('normalizeText groups simple word forms together', () => {
  assert.equal(normalizeText('сова'), normalizeText('совушка'));
  assert.equal(normalizeText('СОВА'), normalizeText('совушка'));
});

run('containsProfanity catches rude words without false positives for normal words', () => {
  assert.equal(containsProfanity(normalizeText('бляха')), true);
  assert.equal(containsProfanity(normalizeText('лебедь')), false);
  assert.equal(containsProfanity(normalizeText('кофе')), false);
});

run('pause timer preserves phase and resumes countdown', () => {
  const { service } = createGameService();
  const session = service.createSession('Pause Event');

  const started = service.startGame(session.sessionId);
  assert.equal(started.phasePaused, false);
  assert.ok(started.phaseEndsAt > Date.now());

  const paused = service.setTimerPaused(session.sessionId, true);
  assert.equal(paused.phasePaused, true);
  assert.ok(paused.phaseEndsAt > 0);

  const resumed = service.setTimerPaused(session.sessionId, false);
  assert.equal(resumed.phasePaused, false);
  assert.ok(resumed.phaseEndsAt > Date.now());

  service.nextPhase(session.sessionId);
  service.nextPhase(session.sessionId);
  service.nextPhase(session.sessionId);
  service.nextPhase(session.sessionId);
});

run('inappropriate answer does not count and does not lock the player', () => {
  const { service } = createGameService();
  const session = service.createSession('Moderation Event');
  const player = service.joinSession(session.sessionId, 'player', 'Игрок', 'socket-player').player!;

  service.startGame(session.sessionId);

  assert.throws(() => service.submitAnswer(session.sessionId, player.id, 'бляха'), /inappropriate language/);

  const updatedSession = service.getSession(session.sessionId)!;
  const updatedPlayer = updatedSession.players.find((item) => item.id === player.id)!;
  assert.equal(updatedSession.rounds[0]?.answers.length, 0);
  assert.equal(updatedPlayer.hasAnswered, false);
});

console.log('All tests passed');
process.exit(0);
