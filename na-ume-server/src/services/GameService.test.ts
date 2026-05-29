import { createGameService } from '../test/testUtils';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-05-13T10:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('GameService', () => {
  it('creates session and starts answering phase', () => {
    const { service } = createGameService();
    const session = service.createSession('Demo Event');

    expect(session.phase).toBe('lobby');
    expect(session.eventName).toBe('Demo Event');
    expect(session.sessionId.length).toBeGreaterThanOrEqual(6);

    const started = service.startGame(session.sessionId);
    expect(started.phase).toBe('answering');
    expect(started.roundIndex).toBe(0);
    expect(started.phaseEndsAt).toBeGreaterThan(Date.now());
  });

  it('opens answering phase immediately and delays answer submission until timer starts', () => {
    const { service } = createGameService();
    const session = service.createSession('Delayed Event');
    const player = service.joinSession(session.sessionId, 'player', 'Игрок', 'socket-player').player!;

    service.updateSettings(session.sessionId, {
      ...session.settings,
      startDelaySec: 5,
    });

    const started = service.startGame(session.sessionId);
    expect(started.phase).toBe('answering');
    expect(started.phaseStartsAt).toBe(Date.now() + 5000);
    expect(started.phaseEndsAt).toBe(Date.now() + 35000);
    expect(() => service.submitAnswer(session.sessionId, player.id, 'Кофе')).toThrow(/Answers are closed/);

    jest.advanceTimersByTime(5000);
    expect(service.submitAnswer(session.sessionId, player.id, 'Кофе').player.hasAnswered).toBe(true);
  });

  it('aggregates top answers and awards more score for less popular answers', () => {
    const { service, topAnswersEvents } = createGameService();
    const session = service.createSession('Scoring Event');

    const alice = service.joinSession(session.sessionId, 'player', 'Алиса', 'socket-alice').player!;
    const boris = service.joinSession(session.sessionId, 'player', 'Борис', 'socket-boris').player!;
    const vera = service.joinSession(session.sessionId, 'player', 'Вера', 'socket-vera').player!;

    service.startGame(session.sessionId);
    service.submitAnswer(session.sessionId, alice.id, 'coffee');
    service.submitAnswer(session.sessionId, boris.id, ' coffee ');
    service.submitAnswer(session.sessionId, vera.id, 'tea');

    const afterGuessingStart = service.nextPhase(session.sessionId);
    expect(afterGuessingStart.phase).toBe('guessing');
    expect(topAnswersEvents).toHaveLength(1);
    expect(topAnswersEvents[0].topAnswers[0]?.text).toBe('coffee');
    expect(topAnswersEvents[0].topAnswers[0]?.percentage).toBe(67);

    const popularGuess = service.submitGuess(session.sessionId, alice.id, 'coffee');
    expect(popularGuess.result.matched).toBe(true);
    expect(popularGuess.player.score).toBe(133);

    const rareGuess = service.submitGuess(session.sessionId, boris.id, 'tea');
    expect(rareGuess.result.matched).toBe(true);
    expect(rareGuess.player.score).toBe(167);
    expect(rareGuess.player.score).toBeGreaterThan(popularGuess.player.score);
  });

  it('allows another guess after an incorrect guess', () => {
    const { service } = createGameService();
    const session = service.createSession('Retry Guess Event');
    const alice = service.joinSession(session.sessionId, 'player', 'Алиса', 'socket-alice').player!;
    const boris = service.joinSession(session.sessionId, 'player', 'Борис', 'socket-boris').player!;

    service.startGame(session.sessionId);
    service.submitAnswer(session.sessionId, alice.id, 'coffee');
    service.submitAnswer(session.sessionId, boris.id, 'tea');
    service.nextPhase(session.sessionId);

    const missedGuess = service.submitGuess(session.sessionId, alice.id, 'milk');
    expect(missedGuess.result.matched).toBe(false);
    expect(missedGuess.player.hasGuessed).toBe(false);

    const matchedGuess = service.submitGuess(session.sessionId, alice.id, 'coffee');
    expect(matchedGuess.result.matched).toBe(true);
    expect(matchedGuess.player.hasGuessed).toBe(true);
  });

  it('delays guess submission until the guessing timer starts', () => {
    const { service } = createGameService();
    const session = service.createSession('Delayed Guess Event');
    const alice = service.joinSession(session.sessionId, 'player', 'Алиса', 'socket-alice').player!;
    const boris = service.joinSession(session.sessionId, 'player', 'Борис', 'socket-boris').player!;

    service.updateSettings(session.sessionId, {
      ...session.settings,
      startDelaySec: 5,
    });

    service.startGame(session.sessionId);
    jest.advanceTimersByTime(5000);
    service.submitAnswer(session.sessionId, alice.id, 'coffee');
    service.submitAnswer(session.sessionId, boris.id, 'tea');

    const guessing = service.nextPhase(session.sessionId);
    expect(guessing.phase).toBe('guessing');
    expect(guessing.phaseStartsAt).toBe(Date.now() + 5000);
    expect(() => service.submitGuess(session.sessionId, alice.id, 'coffee')).toThrow(/Guessing is closed/);

    jest.advanceTimersByTime(5000);
    expect(service.submitGuess(session.sessionId, alice.id, 'coffee').result.matched).toBe(true);
  });

  it('reveals the top answers before moving to the next round', () => {
    const { service } = createGameService();
    const session = service.createSession('Reveal Top Event');
    const alice = service.joinSession(session.sessionId, 'player', 'Алиса', 'socket-alice').player!;
    const boris = service.joinSession(session.sessionId, 'player', 'Борис', 'socket-boris').player!;

    service.startGame(session.sessionId);
    service.submitAnswer(session.sessionId, alice.id, 'coffee');
    service.submitAnswer(session.sessionId, boris.id, 'tea');
    service.nextPhase(session.sessionId);

    const revealed = service.nextPhase(session.sessionId);
    expect(revealed.phase).toBe('reveal');
    expect(revealed.rounds[0]?.topAnswers.every((answer) => answer.revealed)).toBe(true);

    const nextRound = service.nextPhase(session.sessionId);
    expect(nextRound.phase).toBe('answering');
    expect(nextRound.roundIndex).toBe(1);
  });

  it('disconnect removes player from session roster', () => {
    const { service } = createGameService();
    const session = service.createSession('Disconnect Event');
    const joinResult = service.joinSession(session.sessionId, 'player', 'Игрок', 'socket-player');

    expect(joinResult.success).toBe(true);
    expect(joinResult.session?.players).toHaveLength(1);

    service.disconnectPlayer(session.sessionId, joinResult.player?.id, 'socket-player');
    expect(service.getSession(session.sessionId)?.players).toHaveLength(1);
    jest.advanceTimersByTime(30000);
    expect(service.getSession(session.sessionId)?.players).toHaveLength(0);
  });

  it('reset game returns session to lobby and preserves players with zeroed scores', () => {
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
    expect(reset.phase).toBe('lobby');
    expect(reset.roundIndex).toBe(0);
    expect(reset.players).toHaveLength(2);
    expect(reset.players[0]?.score).toBe(0);
    expect(reset.rounds[0]?.answers).toHaveLength(0);
    expect(reset.rounds[0]?.topAnswers).toHaveLength(0);
  });

  it('leaderboard appears only after last round', () => {
    const { service } = createGameService();
    const session = service.createSession('Round Flow Event');
    const alice = service.joinSession(session.sessionId, 'player', 'Алиса', 'socket-alice').player!;
    const boris = service.joinSession(session.sessionId, 'player', 'Борис', 'socket-boris').player!;

    service.startGame(session.sessionId);
    service.submitAnswer(session.sessionId, alice.id, 'Кофе');
    service.submitAnswer(session.sessionId, boris.id, 'Чай');
    let state = service.nextPhase(session.sessionId);
    expect(state.phase).toBe('guessing');

    state = service.nextPhase(session.sessionId);
    expect(state.phase).toBe('reveal');

    state = service.nextPhase(session.sessionId);
    expect(state.phase).toBe('answering');
    expect(state.roundIndex).toBe(1);

    for (let roundIndex = 1; roundIndex < state.rounds.length; roundIndex += 1) {
      const currentPlayers = service.getSession(session.sessionId)?.players ?? [];

      for (const [playerIndex, currentPlayer] of currentPlayers.entries()) {
        service.submitAnswer(session.sessionId, currentPlayer.id, `Ответ ${roundIndex}-${playerIndex}`);
      }

      state = service.nextPhase(session.sessionId);
      expect(state.phase).toBe('guessing');

      if (roundIndex < state.rounds.length - 1) {
        state = service.nextPhase(session.sessionId);
        expect(state.phase).toBe('reveal');

        state = service.nextPhase(session.sessionId);
        expect(state.phase).toBe('answering');
        expect(state.roundIndex).toBe(roundIndex + 1);
      }
    }

    expect(service.nextPhase(session.sessionId).phase).toBe('reveal');
    expect(service.nextPhase(session.sessionId).phase).toBe('leaderboard');
  });

  it('pause timer preserves phase and resumes countdown', () => {
    const { service } = createGameService();
    const session = service.createSession('Pause Event');

    const started = service.startGame(session.sessionId);
    expect(started.phasePaused).toBe(false);
    expect(started.phaseEndsAt).toBeGreaterThan(Date.now());

    jest.advanceTimersByTime(1000);
    const paused = service.setTimerPaused(session.sessionId, true);
    expect(paused.phasePaused).toBe(true);
    expect(paused.phaseEndsAt).toBeGreaterThan(0);

    const resumed = service.setTimerPaused(session.sessionId, false);
    expect(resumed.phasePaused).toBe(false);
    expect(resumed.phaseEndsAt).toBeGreaterThan(Date.now());
  });

  it('inappropriate answer does not count and does not lock the player', () => {
    const { service } = createGameService();
    const session = service.createSession('Moderation Event');
    const player = service.joinSession(session.sessionId, 'player', 'Игрок', 'socket-player').player!;

    service.startGame(session.sessionId);
    expect(() => service.submitAnswer(session.sessionId, player.id, 'kakashka')).toThrow(/inappropriate language/);

    const updatedSession = service.getSession(session.sessionId)!;
    const updatedPlayer = updatedSession.players.find((item) => item.id === player.id)!;
    expect(updatedSession.rounds[0]?.answers).toHaveLength(0);
    expect(updatedPlayer.hasAnswered).toBe(false);
  });
});
