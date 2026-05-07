import { DEFAULT_SETTINGS, EMPTY_TOP_ANSWER_TEXT, QUESTION_BANK } from '../config/game';
import { env } from '../config/env';
import type {
  ForcePhasePayload,
  GamePhase,
  GuessResult,
  InternalSession,
  JoinSessionResponse,
  Player,
  Question,
  RawAnswer,
  Role,
  Round,
  SessionSettings,
  SessionState,
  TopAnswer,
} from '../domain/types';
import { generateSessionId } from '../lib/generateSessionId';
import { containsProfanity } from '../lib/containsProfanity';
import { normalizeText } from '../lib/normalizeText';
import type { HistoryRepository } from '../repositories/HistoryRepository';
import type { SessionRepository } from '../repositories/SessionRepository';

type PhaseHooks = {
  onSessionUpdate?: (session: SessionState) => void;
  onTopAnswers?: (sessionId: string, topAnswers: TopAnswer[]) => void;
};

export class GameService {
  private readonly questionBank: Question[];

  constructor(
    private readonly sessions: SessionRepository,
    private readonly historyRepository: HistoryRepository,
    questions: Question[] = QUESTION_BANK,
    private readonly hooks: PhaseHooks = {},
  ) {
    this.questionBank = questions.length > 0 ? questions : QUESTION_BANK;
  }

  createSession(eventName: string) {
    let sessionId = generateSessionId();
    while (this.sessions.get(sessionId)) {
      sessionId = generateSessionId();
    }

    const session = this.createInternalSession(sessionId, eventName.trim() || 'На уме');
    this.sessions.create(session);
    return this.toSessionState(session);
  }

  getSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    return session ? this.toSessionState(session) : undefined;
  }

  joinSession(sessionId: string, role: Role, playerName?: string, socketId?: string): JoinSessionResponse {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false };
    }

    let player: Player | undefined;

    if (role === 'player') {
      if (!playerName?.trim()) {
        return { success: false };
      }

      player = this.findOrCreatePlayer(session, playerName.trim());
      if (!player) {
        return { success: false };
      }

      if (socketId) {
        const sockets = session.playerSockets.get(player.id) ?? new Set<string>();
        sockets.add(socketId);
        session.playerSockets.set(player.id, sockets);
      }
    }

    this.persistAndBroadcast(session);
    return {
      success: true,
      player,
      session: this.toSessionState(session),
    };
  }

  startGame(sessionId: string) {
    const session = this.requireSession(sessionId);
    if (session.phase !== 'lobby') {
      throw new Error('Game can only start from lobby');
    }

    session.isActive = true;
    session.roundIndex = Math.min(session.roundIndex, session.rounds.length - 1);
    this.prepareRoundPlayers(session);
    this.setPhase(session, 'answering', env.answeringDurationMs);
    return this.toSessionState(session);
  }

  nextPhase(sessionId: string) {
    const session = this.requireSession(sessionId);
    this.clearTimer(session);

    switch (session.phase) {
      case 'lobby':
        return this.startGame(sessionId);
      case 'answering':
        this.finishAnswering(session);
        break;
      case 'guessing':
        this.finishGuessing(session);
        break;
      case 'reveal':
        this.finishReveal(session);
        break;
      case 'leaderboard':
        this.moveAfterLeaderboard(session);
        break;
      default:
        break;
    }

    return this.toSessionState(session);
  }

  forcePhase(sessionId: string, phase: GamePhase) {
    const session = this.requireSession(sessionId);

    switch (phase) {
      case 'lobby':
        session.isActive = false;
        session.roundIndex = 0;
        this.setPhase(session, 'lobby', 0);
        break;
      case 'answering':
        session.isActive = true;
        this.prepareRoundPlayers(session);
        this.setPhase(session, 'answering', env.answeringDurationMs);
        break;
      case 'guessing': {
        const round = this.getCurrentRound(session);
        round.topAnswers = this.buildTopAnswers(round.answers, round.question.id);
        this.hooks.onTopAnswers?.(session.sessionId, this.cloneTopAnswers(round.topAnswers));
        this.prepareRoundPlayers(session, { resetAnswers: false, resetGuesses: true });
        this.setPhase(session, 'guessing', env.guessingDurationMs);
        break;
      }
      case 'reveal':
        this.setPhase(session, 'reveal', 0);
        break;
      case 'leaderboard':
        this.setPhase(session, 'leaderboard', 0);
        break;
      default:
        break;
    }

    return this.toSessionState(session);
  }

  resetGame(sessionId: string, keepPlayers = true) {
    const session = this.requireSession(sessionId);
    this.clearTimer(session);

    const preservedPlayers = keepPlayers
      ? session.players.map((player) => ({
          ...player,
          score: 0,
          hasAnswered: false,
          hasGuessed: false,
        }))
      : [];

    session.players = preservedPlayers;
    session.roundIndex = 0;
    session.phase = 'lobby';
    session.phaseEndsAt = 0;
    session.phasePaused = false;
    session.isActive = false;
    session.rounds = this.buildRoundsFromSettings(session.settings);

    if (!keepPlayers) {
      session.playerSockets.clear();
    }

    this.persistAndBroadcast(session);
    return this.toSessionState(session);
  }

  revealAnswer(sessionId: string, answerIndex: number) {
    const session = this.requireSession(sessionId);
    if (session.phase !== 'reveal') {
      throw new Error('Answers can only be revealed during reveal phase');
    }

    const currentRound = this.getCurrentRound(session);
    const targetAnswer = currentRound.topAnswers[answerIndex];
    if (!targetAnswer) {
      throw new Error('Top answer not found');
    }

    targetAnswer.revealed = true;
    this.persistAndBroadcast(session);

    if (currentRound.topAnswers.every((answer) => answer.revealed)) {
      this.finishReveal(session);
    }

    return this.toSessionState(session);
  }

  setTimerPaused(sessionId: string, paused: boolean) {
    const session = this.requireSession(sessionId);

    if (session.phase === 'lobby' || session.phaseEndsAt <= 0) {
      return this.toSessionState(session);
    }

    if (paused) {
      if (session.phasePaused) {
        return this.toSessionState(session);
      }

      const remainingMs = Math.max(0, session.phaseEndsAt - Date.now());
      this.clearTimer(session);
      session.phasePaused = true;
      session.phaseEndsAt = remainingMs;
      this.persistAndBroadcast(session);
      return this.toSessionState(session);
    }

    if (!session.phasePaused) {
      return this.toSessionState(session);
    }

    const remainingMs = Math.max(0, session.phaseEndsAt);
    this.setPhase(session, session.phase, remainingMs);
    return this.toSessionState(session);
  }

  submitAnswer(sessionId: string, playerId: string, answer: string) {
    const session = this.requireSession(sessionId);
    if (session.phase !== 'answering') {
      throw new Error('Answers are closed');
    }

    const player = session.players.find((item) => item.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (player.hasAnswered) {
      throw new Error('Player has already answered');
    }

    const normalizedText = normalizeText(answer);
    if (!normalizedText) {
      throw new Error('Answer is empty');
    }

    if (containsProfanity(normalizedText)) {
      throw new Error('Answer contains inappropriate language');
    }

    const rawAnswer: RawAnswer = {
      id: `answer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playerId,
      text: answer.trim(),
      normalizedText,
      roundIndex: session.roundIndex,
      createdAt: Date.now(),
    };

    const round = this.getCurrentRound(session);
    round.answers.push(rawAnswer);
    player.hasAnswered = true;

    this.persistAndBroadcast(session);
    return {
      session: this.toSessionState(session),
      player: this.clonePlayer(player),
    };
  }

  submitGuess(sessionId: string, playerId: string, guess: string) {
    const session = this.requireSession(sessionId);
    if (session.phase !== 'guessing') {
      throw new Error('Guessing is closed');
    }

    const player = session.players.find((item) => item.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (player.hasGuessed) {
      throw new Error('Player has already guessed');
    }

    const normalizedGuess = normalizeText(guess);
    if (!normalizedGuess) {
      throw new Error('Guess is empty');
    }

    if (containsProfanity(normalizedGuess)) {
      throw new Error('Guess contains inappropriate language');
    }

    const round = this.getCurrentRound(session);
    const matchedAnswer = round.topAnswers.find((answerItem) => answerItem.normalizedText === normalizedGuess);

    let guessResult: GuessResult = { matched: false, pointsAwarded: 0 };

    if (matchedAnswer) {
      const awardedPoints = Math.round(env.basePoints * (matchedAnswer.percentage / 100));
      matchedAnswer.matchedBy = Array.from(new Set([...matchedAnswer.matchedBy, player.id]));
      matchedAnswer.revealed = true;
      player.score += awardedPoints;
      guessResult = {
        matched: true,
        answerText: matchedAnswer.text,
        pointsAwarded: awardedPoints,
      };
    }

    player.hasGuessed = true;

    this.persistAndBroadcast(session);
    return {
      session: this.toSessionState(session),
      player: this.clonePlayer(player),
      result: guessResult,
    };
  }

  disconnectPlayer(sessionId: string | undefined, playerId: string | undefined, socketId: string) {
    if (!sessionId || !playerId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const sockets = session.playerSockets.get(playerId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        session.playerSockets.delete(playerId);
      }
    }

    session.players = session.players.filter((player) => player.id !== playerId);
    this.persistAndBroadcast(session);
  }

  getPlayerSockets(sessionId: string, playerId: string) {
    const session = this.sessions.get(sessionId);
    return session?.playerSockets.get(playerId) ?? new Set<string>();
  }

  updateSettings(sessionId: string, settings: SessionSettings) {
    const session = this.requireSession(sessionId);

    session.settings = {
      ...settings,
      roundCategories: [...settings.roundCategories],
    };
    session.rounds = this.buildRoundsFromSettings(session.settings);

    session.roundIndex = Math.min(session.roundIndex, session.rounds.length - 1);
    this.persistAndBroadcast(session);
    return this.toSessionState(session);
  }

  setRound(sessionId: string, roundIndex: number) {
    const session = this.requireSession(sessionId);
    session.roundIndex = Math.max(0, Math.min(roundIndex, session.rounds.length - 1));
    this.persistAndBroadcast(session);
    return this.toSessionState(session);
  }

  deleteAnswer(sessionId: string, answerId: string) {
    const session = this.requireSession(sessionId);
    const currentRound = this.getCurrentRound(session);
    currentRound.answers = currentRound.answers.filter((answer) => answer.id !== answerId);

    if (session.phase === 'guessing' || session.phase === 'reveal' || session.phase === 'leaderboard') {
      currentRound.topAnswers = this.buildTopAnswers(currentRound.answers, currentRound.question.id);
    }

    this.persistAndBroadcast(session);
    return this.toSessionState(session);
  }

  private finishAnswering(session: InternalSession) {
    const round = this.getCurrentRound(session);
    round.topAnswers = this.buildTopAnswers(round.answers, round.question.id);
    this.hooks.onTopAnswers?.(session.sessionId, this.cloneTopAnswers(round.topAnswers));
    this.prepareRoundPlayers(session, { resetGuesses: true });
    this.setPhase(session, 'guessing', env.guessingDurationMs);
  }

  private finishGuessing(session: InternalSession) {
    const hasNextRound = session.roundIndex < session.rounds.length - 1;

    if (hasNextRound) {
      session.roundIndex += 1;
      this.prepareRoundPlayers(session);
      this.setPhase(session, 'answering', env.answeringDurationMs);
      return;
    }

    this.setPhase(session, 'leaderboard', env.leaderboardDurationMs);
  }

  private finishReveal(session: InternalSession) {
    const hasNextRound = session.roundIndex < session.rounds.length - 1;

    if (hasNextRound) {
      session.roundIndex += 1;
      this.prepareRoundPlayers(session);
      this.setPhase(session, 'answering', env.answeringDurationMs);
      return;
    }

    this.setPhase(session, 'leaderboard', env.leaderboardDurationMs);
  }

  private moveAfterLeaderboard(session: InternalSession) {
    session.isActive = false;
    this.setPhase(session, 'lobby', 0);
    void this.historyRepository.saveFinishedSession(this.toSessionState(session));
  }

  private prepareRoundPlayers(
    session: InternalSession,
    options: { resetAnswers?: boolean; resetGuesses?: boolean } = {
      resetAnswers: true,
      resetGuesses: true,
    },
  ) {
    const { resetAnswers = true, resetGuesses = true } = options;

    session.players = session.players.map((player) => ({
      ...player,
      hasAnswered: resetAnswers ? false : player.hasAnswered,
      hasGuessed: resetGuesses ? false : player.hasGuessed,
    }));
  }

  private setPhase(session: InternalSession, phase: GamePhase, durationMs: number) {
    this.clearTimer(session);
    session.phase = phase;
    session.phasePaused = false;
    session.phaseEndsAt = durationMs > 0 ? Date.now() + durationMs : 0;

    if (durationMs > 0) {
      session.timer = setTimeout(() => {
        try {
          this.nextPhase(session.sessionId);
        } catch (error) {
          console.error('Failed to auto-advance phase', error);
        }
      }, durationMs);
    }

    this.persistAndBroadcast(session);
  }

  private clearTimer(session: InternalSession) {
    if (session.timer) {
      clearTimeout(session.timer);
      session.timer = undefined;
    }
  }

  private persistAndBroadcast(session: InternalSession) {
    this.sessions.update(session);
    this.hooks.onSessionUpdate?.(this.toSessionState(session));
  }

  private buildTopAnswers(answers: RawAnswer[], questionId: string) {
    const approvedAnswers = answers.filter((answer) => !answer.isRejected && answer.normalizedText);
    const grouped = new Map<string, { text: string; count: number }>();

    for (const answer of approvedAnswers) {
      const existing = grouped.get(answer.normalizedText);
      if (existing) {
        existing.count += 1;
      } else {
        grouped.set(answer.normalizedText, {
          text: answer.text,
          count: 1,
        });
      }
    }

    const ranked = Array.from(grouped.entries()).sort((left, right) => right[1].count - left[1].count);
    const total = approvedAnswers.length || 1;
    const topAnswers: TopAnswer[] = ranked.map(([normalizedText, value], index) => ({
      id: `${questionId}-top-${index + 1}`,
      text: value.text,
      normalizedText,
      count: value.count,
      percentage: Math.round((value.count / total) * 100),
      revealed: false,
      matchedBy: [],
    }));

    return topAnswers.length > 0
      ? topAnswers
      : [
          {
            id: `${questionId}-top-empty`,
            text: EMPTY_TOP_ANSWER_TEXT,
            normalizedText: EMPTY_TOP_ANSWER_TEXT,
            count: 0,
            percentage: 0,
            revealed: false,
            matchedBy: [],
          },
        ];
  }

  private findOrCreatePlayer(session: InternalSession, playerName: string) {
    const existingPlayer = session.players.find((player) => player.name === playerName);
    if (existingPlayer) {
      return existingPlayer;
    }

    if (session.players.length >= env.maxPlayersPerSession) {
      return undefined;
    }

    const player: Player = {
      id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: playerName,
      score: 0,
      hasAnswered: false,
      hasGuessed: false,
    };

    session.players.push(player);
    return player;
  }

  private requireSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    return session;
  }

  private getCurrentRound(session: InternalSession) {
    return session.rounds[session.roundIndex];
  }

  private createInternalSession(sessionId: string, eventName: string): InternalSession {
    const categories = Array.from(new Set(this.questionBank.map((question) => question.category)));
    const rounds = this.buildRoundsFromSettings(DEFAULT_SETTINGS);

    return {
      sessionId,
      eventName,
      phase: 'lobby',
      roundIndex: 0,
      players: [],
      rounds,
      settings: {
        ...DEFAULT_SETTINGS,
        roundCategories: [...DEFAULT_SETTINGS.roundCategories],
      },
      availableQuestions: [...this.questionBank],
      categories,
      phaseEndsAt: 0,
      phasePaused: false,
      isActive: false,
      playerSockets: new Map<string, Set<string>>(),
    };
  }

  private buildRounds(): Round[] {
    return this.buildRoundsFromSettings(DEFAULT_SETTINGS);
  }

  private buildRoundsFromSettings(settings: SessionSettings): Round[] {
    const roundsCount = Math.max(1, settings.roundsCount);
    const usedQuestionIds = new Set<string>();

    const getPoolForRound = (roundIndex: number) => {
      if (settings.categoryMode === 'shared') {
        if (settings.sharedCategory === 'all') {
          return this.questionBank;
        }

        const categoryPool = this.questionBank.filter((question) => question.category === settings.sharedCategory);
        return categoryPool.length > 0 ? categoryPool : this.questionBank;
      }

      const roundCategory = settings.roundCategories[roundIndex] ?? 'all';
      if (roundCategory === 'all') {
        return this.questionBank;
      }

      const categoryPool = this.questionBank.filter((question) => question.category === roundCategory);
      return categoryPool.length > 0 ? categoryPool : this.questionBank;
    };

    return Array.from({ length: roundsCount }, (_, index) => {
      const roundPool = getPoolForRound(index);
      const unusedInPool = roundPool.filter((question) => !usedQuestionIds.has(question.id));
      const fallbackPool = unusedInPool.length > 0 ? unusedInPool : roundPool;
      const randomIndex = Math.floor(Math.random() * fallbackPool.length);
      const question = fallbackPool[randomIndex];

      usedQuestionIds.add(question.id);

      return {
        index,
        question,
        answers: [],
        topAnswers: [],
      };
    });
  }

  private toSessionState(session: InternalSession): SessionState {
    return {
      sessionId: session.sessionId,
      eventName: session.eventName,
      phase: session.phase,
      roundIndex: session.roundIndex,
      players: session.players.map((player) => this.clonePlayer(player)),
      rounds: session.rounds.map((round) => ({
        index: round.index,
        question: { ...round.question },
        answers: round.answers.map((answer) => ({ ...answer })),
        topAnswers: this.cloneTopAnswers(round.topAnswers),
      })),
      settings: {
        ...session.settings,
        roundCategories: [...session.settings.roundCategories],
      },
      availableQuestions: session.availableQuestions.map((question) => ({ ...question })),
      categories: [...session.categories],
      phaseEndsAt: session.phaseEndsAt,
      phasePaused: session.phasePaused,
      isActive: session.isActive,
    };
  }

  private clonePlayer(player: Player): Player {
    return { ...player };
  }

  private cloneTopAnswers(topAnswers: TopAnswer[]) {
    return topAnswers.map((answer) => ({
      ...answer,
      matchedBy: [...answer.matchedBy],
    }));
  }
}
