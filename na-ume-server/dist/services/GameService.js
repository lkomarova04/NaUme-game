"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const crypto_1 = require("crypto");
const game_1 = require("../config/game");
const env_1 = require("../config/env");
const generateSessionId_1 = require("../lib/generateSessionId");
const containsProfanity_1 = require("../lib/containsProfanity");
const normalizeText_1 = require("../lib/normalizeText");
const PLAYER_RECONNECT_GRACE_MS = 30_000;
const TOP_REVEAL_DURATION_MS = 10_000;
class GameService {
    sessions;
    historyRepository;
    hooks;
    questionBank;
    constructor(sessions, historyRepository, questions = game_1.QUESTION_BANK, hooks = {}) {
        this.sessions = sessions;
        this.historyRepository = historyRepository;
        this.hooks = hooks;
        this.questionBank = questions.length > 0 ? questions : game_1.QUESTION_BANK;
    }
    createSession(eventName) {
        let sessionId = (0, generateSessionId_1.generateSessionId)();
        while (this.sessions.get(sessionId)) {
            sessionId = (0, generateSessionId_1.generateSessionId)();
        }
        const session = this.createInternalSession(sessionId, eventName.trim() || 'На уме');
        this.sessions.create(session);
        return this.toSessionState(session);
    }
    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        return session ? this.toSessionState(session) : undefined;
    }
    getOrganizerToken(sessionId) {
        return this.sessions.get(sessionId)?.organizerToken;
    }
    isOrganizerTokenValid(sessionId, organizerToken) {
        return Boolean(organizerToken && this.sessions.get(sessionId)?.organizerToken === organizerToken);
    }
    joinSession(sessionId, role, playerName, socketId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false };
        }
        let player;
        if (role === 'player') {
            if (!playerName?.trim()) {
                return { success: false };
            }
            player = this.findOrCreatePlayer(session, playerName.trim());
            if (!player) {
                return { success: false };
            }
            if (socketId) {
                const disconnectTimer = session.disconnectTimers.get(player.id);
                if (disconnectTimer) {
                    clearTimeout(disconnectTimer);
                    session.disconnectTimers.delete(player.id);
                }
                const sockets = session.playerSockets.get(player.id) ?? new Set();
                sockets.add(socketId);
                session.playerSockets.set(player.id, sockets);
            }
        }
        this.persist(session, { durable: false });
        if (player) {
            this.emitGameEvent(session, {
                type: 'player_joined',
                player: this.clonePlayer(player),
            });
        }
        return {
            success: true,
            player,
            session: this.toSessionState(session),
        };
    }
    startGame(sessionId) {
        const session = this.requireSession(sessionId);
        if (session.phase !== 'lobby') {
            throw new Error('Game can only start from lobby');
        }
        session.isActive = true;
        session.roundIndex = Math.min(session.roundIndex, session.rounds.length - 1);
        this.prepareRoundPlayers(session);
        this.setPhase(session, 'answering', this.getAnsweringDurationMs(session), this.getStartDelayMs(session));
        return this.toSessionState(session);
    }
    nextPhase(sessionId) {
        const session = this.requireSession(sessionId);
        this.clearTimer(session);
        switch (session.phase) {
            case 'lobby':
                return this.startGame(sessionId);
            case 'answering':
                this.finishAnswering(session);
                break;
            case 'guessing':
                this.revealRoundTop(session);
                break;
            case 'reveal':
                this.finishGuessing(session);
                break;
            case 'leaderboard':
                this.moveAfterLeaderboard(session);
                break;
            default:
                break;
        }
        return this.toSessionState(session);
    }
    forcePhase(sessionId, phase) {
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
                this.setPhase(session, 'answering', this.getAnsweringDurationMs(session), this.getStartDelayMs(session));
                break;
            case 'guessing': {
                const round = this.getCurrentRound(session);
                round.topAnswers = this.buildTopAnswers(round.answers, round.question.id);
                this.hooks.onTopAnswers?.(session.sessionId, this.cloneTopAnswers(round.topAnswers));
                this.prepareRoundPlayers(session, { resetAnswers: false, resetGuesses: true });
                this.setPhase(session, 'guessing', this.getGuessingDurationMs(session), this.getStartDelayMs(session));
                break;
            }
            case 'reveal':
                this.revealRoundTop(session);
                break;
            case 'leaderboard':
                this.setPhase(session, 'leaderboard', 0);
                break;
            default:
                break;
        }
        return this.toSessionState(session);
    }
    resetGame(sessionId, keepPlayers = true) {
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
        session.phaseStartsAt = 0;
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
    revealAnswer(sessionId, answerIndex) {
        const session = this.requireSession(sessionId);
        if (session.phase !== 'guessing' && session.phase !== 'reveal') {
            throw new Error('Answers can only be revealed during guessing phase');
        }
        const currentRound = this.getCurrentRound(session);
        const targetAnswer = currentRound.topAnswers[answerIndex];
        if (!targetAnswer) {
            throw new Error('Top answer not found');
        }
        targetAnswer.revealed = !targetAnswer.revealed;
        this.persist(session, { durable: true });
        this.emitGameEvent(session, {
            type: 'answer_revealed',
            roundIndex: session.roundIndex,
            answer: this.cloneTopAnswer(targetAnswer),
        });
        return this.toSessionState(session);
    }
    setTimerPaused(sessionId, paused) {
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
            session.phaseStartsAt = 0;
            session.phaseEndsAt = remainingMs;
            this.persist(session, { durable: true });
            this.emitGameEvent(session, {
                type: 'timer_changed',
                phaseStartsAt: session.phaseStartsAt,
                phaseEndsAt: session.phaseEndsAt,
                phasePaused: session.phasePaused,
            });
            return this.toSessionState(session);
        }
        if (!session.phasePaused) {
            return this.toSessionState(session);
        }
        const remainingMs = Math.max(0, session.phaseEndsAt);
        this.setPhase(session, session.phase, remainingMs);
        return this.toSessionState(session);
    }
    submitAnswer(sessionId, playerId, answer) {
        const session = this.requireSession(sessionId);
        if (session.phase !== 'answering' || this.isPhaseWaitingToStart(session)) {
            throw new Error('Answers are closed');
        }
        const player = session.players.find((item) => item.id === playerId);
        if (!player) {
            throw new Error('Player not found');
        }
        if (player.hasAnswered) {
            throw new Error('Player has already answered');
        }
        const normalizedText = (0, normalizeText_1.normalizeText)(answer);
        if (!normalizedText) {
            throw new Error('Answer is empty');
        }
        if ((0, containsProfanity_1.containsProfanity)(normalizedText)) {
            throw new Error('Answer contains inappropriate language');
        }
        const rawAnswer = {
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
        this.persist(session, { durable: false });
        this.emitGameEvent(session, {
            type: 'answer_submitted',
            roundIndex: session.roundIndex,
            answer: { ...rawAnswer },
            player: this.clonePlayer(player),
        });
        return {
            player: this.clonePlayer(player),
        };
    }
    submitGuess(sessionId, playerId, guess) {
        const session = this.requireSession(sessionId);
        if (session.phase !== 'guessing' || this.isPhaseWaitingToStart(session)) {
            throw new Error('Guessing is closed');
        }
        const player = session.players.find((item) => item.id === playerId);
        if (!player) {
            throw new Error('Player not found');
        }
        if (player.hasGuessed) {
            throw new Error('Player has already guessed');
        }
        const normalizedGuess = (0, normalizeText_1.normalizeText)(guess);
        if (!normalizedGuess) {
            throw new Error('Guess is empty');
        }
        if ((0, containsProfanity_1.containsProfanity)(normalizedGuess)) {
            throw new Error('Guess contains inappropriate language');
        }
        const round = this.getCurrentRound(session);
        const matchedAnswer = round.topAnswers.find((answerItem) => answerItem.normalizedText === normalizedGuess);
        let guessResult = { matched: false, pointsAwarded: 0 };
        if (matchedAnswer) {
            const awardedPoints = this.calculateGuessPoints(matchedAnswer);
            matchedAnswer.matchedBy = Array.from(new Set([...matchedAnswer.matchedBy, player.id]));
            matchedAnswer.revealed = true;
            player.score += awardedPoints;
            guessResult = {
                matched: true,
                answerText: matchedAnswer.text,
                pointsAwarded: awardedPoints,
            };
        }
        if (matchedAnswer) {
            player.hasGuessed = true;
        }
        this.persist(session, { durable: false });
        this.emitGameEvent(session, {
            type: 'guess_submitted',
            roundIndex: session.roundIndex,
            player: this.clonePlayer(player),
            answer: matchedAnswer ? this.cloneTopAnswer(matchedAnswer) : undefined,
        });
        return {
            player: this.clonePlayer(player),
            result: guessResult,
        };
    }
    disconnectPlayer(sessionId, playerId, socketId) {
        if (!sessionId || !playerId)
            return;
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const sockets = session.playerSockets.get(playerId);
        if (sockets) {
            sockets.delete(socketId);
            if (sockets.size === 0) {
                session.playerSockets.delete(playerId);
            }
        }
        if (session.playerSockets.has(playerId) || session.disconnectTimers.has(playerId)) {
            return;
        }
        const disconnectTimer = setTimeout(() => {
            const latestSession = this.sessions.get(sessionId);
            if (!latestSession || latestSession.playerSockets.has(playerId))
                return;
            latestSession.disconnectTimers.delete(playerId);
            latestSession.players = latestSession.players.filter((player) => player.id !== playerId);
            this.persist(latestSession, { durable: false });
            this.emitGameEvent(latestSession, {
                type: 'player_left',
                playerId,
            });
        }, PLAYER_RECONNECT_GRACE_MS);
        session.disconnectTimers.set(playerId, disconnectTimer);
    }
    getPlayerSockets(sessionId, playerId) {
        const session = this.sessions.get(sessionId);
        return session?.playerSockets.get(playerId) ?? new Set();
    }
    updateSettings(sessionId, settings) {
        const session = this.requireSession(sessionId);
        const previousSettings = session.settings;
        session.settings = {
            ...settings,
            roundCategories: [...settings.roundCategories],
            answeringDurationSec: this.clampTimerSeconds(settings.answeringDurationSec),
            guessingDurationSec: this.clampTimerSeconds(settings.guessingDurationSec),
            startDelaySec: this.clampDelaySeconds(settings.startDelaySec),
        };
        if (this.shouldRebuildRounds(previousSettings, session.settings)) {
            session.rounds = this.buildRoundsFromSettings(session.settings);
        }
        session.roundIndex = Math.min(session.roundIndex, session.rounds.length - 1);
        this.persistAndBroadcast(session);
        return this.toSessionState(session);
    }
    setRound(sessionId, roundIndex) {
        const session = this.requireSession(sessionId);
        session.roundIndex = Math.max(0, Math.min(roundIndex, session.rounds.length - 1));
        this.persist(session, { durable: true });
        this.emitGameEvent(session, {
            type: 'round_changed',
            roundIndex: session.roundIndex,
        });
        return this.toSessionState(session);
    }
    deleteAnswer(sessionId, answerId) {
        const session = this.requireSession(sessionId);
        const currentRound = this.getCurrentRound(session);
        currentRound.answers = currentRound.answers.filter((answer) => answer.id !== answerId);
        if (session.phase === 'guessing' || session.phase === 'reveal' || session.phase === 'leaderboard') {
            currentRound.topAnswers = this.buildTopAnswers(currentRound.answers, currentRound.question.id);
        }
        this.persist(session, { durable: true });
        this.emitGameEvent(session, {
            type: 'answer_deleted',
            roundIndex: session.roundIndex,
            answerId,
            topAnswers: this.cloneTopAnswers(currentRound.topAnswers),
        });
        return this.toSessionState(session);
    }
    setCurrentTimer(sessionId, durationSec, delaySec = 0) {
        const session = this.requireSession(sessionId);
        const durationMs = this.clampTimerSeconds(durationSec) * 1000;
        const delayMs = this.clampDelaySeconds(delaySec) * 1000;
        if (session.phase === 'lobby' || session.phasePaused) {
            session.phaseStartsAt = delayMs > 0 ? Date.now() + delayMs : 0;
            session.phaseEndsAt = Math.max(0, durationMs + delayMs);
            this.persist(session, { durable: true });
            this.emitGameEvent(session, {
                type: 'timer_changed',
                phaseStartsAt: session.phaseStartsAt,
                phaseEndsAt: session.phaseEndsAt,
                phasePaused: session.phasePaused,
            });
            return this.toSessionState(session);
        }
        this.setPhase(session, session.phase, durationMs, delayMs);
        return this.toSessionState(session);
    }
    finishAnswering(session) {
        const round = this.getCurrentRound(session);
        round.topAnswers = this.buildTopAnswers(round.answers, round.question.id);
        this.hooks.onTopAnswers?.(session.sessionId, this.cloneTopAnswers(round.topAnswers));
        this.prepareRoundPlayers(session, { resetGuesses: true });
        this.setPhase(session, 'guessing', this.getGuessingDurationMs(session), this.getStartDelayMs(session));
    }
    finishGuessing(session) {
        const hasNextRound = session.roundIndex < session.rounds.length - 1;
        if (hasNextRound) {
            session.roundIndex += 1;
            this.prepareRoundPlayers(session);
            this.setPhase(session, 'answering', this.getAnsweringDurationMs(session), this.getStartDelayMs(session));
            return;
        }
        this.setPhase(session, 'leaderboard', env_1.env.leaderboardDurationMs);
    }
    moveAfterLeaderboard(session) {
        session.isActive = false;
        this.setPhase(session, 'lobby', 0);
        void this.historyRepository.saveFinishedSession(this.toSessionState(session));
    }
    prepareRoundPlayers(session, options = {
        resetAnswers: true,
        resetGuesses: true,
    }) {
        const { resetAnswers = true, resetGuesses = true } = options;
        session.players = session.players.map((player) => ({
            ...player,
            hasAnswered: resetAnswers ? false : player.hasAnswered,
            hasGuessed: resetGuesses ? false : player.hasGuessed,
        }));
    }
    setPhase(session, phase, durationMs, delayMs = 0) {
        this.clearTimer(session);
        session.phase = phase;
        session.phasePaused = false;
        session.phaseStartsAt = delayMs > 0 ? Date.now() + delayMs : 0;
        session.phaseEndsAt = durationMs > 0 ? Date.now() + delayMs + durationMs : 0;
        if (durationMs > 0) {
            session.timer = setTimeout(() => {
                try {
                    this.nextPhase(session.sessionId);
                }
                catch (error) {
                    console.error('Failed to auto-advance phase', error);
                }
            }, delayMs + durationMs);
        }
        this.persist(session, { durable: true });
        this.emitGameEvent(session, {
            type: 'phase_changed',
            phase: session.phase,
            roundIndex: session.roundIndex,
            phaseStartsAt: session.phaseStartsAt,
            phaseEndsAt: session.phaseEndsAt,
            phasePaused: session.phasePaused,
            players: session.players.map((player) => this.clonePlayer(player)),
            topAnswers: this.cloneTopAnswers(this.getCurrentRound(session).topAnswers),
        });
    }
    revealRoundTop(session) {
        const round = this.getCurrentRound(session);
        round.topAnswers = round.topAnswers.map((answer) => ({
            ...answer,
            revealed: true,
        }));
        this.setPhase(session, 'reveal', TOP_REVEAL_DURATION_MS);
    }
    clearTimer(session) {
        if (session.timer) {
            clearTimeout(session.timer);
            session.timer = undefined;
        }
    }
    persistAndBroadcast(session) {
        this.persist(session, { durable: true });
        this.hooks.onSessionUpdate?.(this.toSessionState(session));
    }
    persist(session, options = {}) {
        this.sessions.update(session, options);
    }
    emitGameEvent(session, event) {
        this.hooks.onGameEvent?.(session.sessionId, event);
    }
    buildTopAnswers(answers, questionId) {
        const approvedAnswers = answers.filter((answer) => !answer.isRejected && answer.normalizedText);
        const grouped = new Map();
        for (const answer of approvedAnswers) {
            const existing = grouped.get(answer.normalizedText);
            if (existing) {
                existing.count += 1;
            }
            else {
                grouped.set(answer.normalizedText, {
                    text: answer.text,
                    count: 1,
                });
            }
        }
        const ranked = Array.from(grouped.entries()).sort((left, right) => right[1].count - left[1].count);
        const total = approvedAnswers.length || 1;
        const topAnswers = ranked.map(([normalizedText, value], index) => ({
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
                    text: game_1.EMPTY_TOP_ANSWER_TEXT,
                    normalizedText: game_1.EMPTY_TOP_ANSWER_TEXT,
                    count: 0,
                    percentage: 0,
                    revealed: false,
                    matchedBy: [],
                },
            ];
    }
    calculateGuessPoints(answer) {
        const rarityMultiplier = 1 + (100 - Math.max(0, Math.min(100, answer.percentage))) / 100;
        return Math.max(1, Math.round(env_1.env.basePoints * rarityMultiplier));
    }
    isPhaseWaitingToStart(session) {
        return session.phaseStartsAt > Date.now();
    }
    shouldRebuildRounds(currentSettings, nextSettings) {
        return (currentSettings.categoryMode !== nextSettings.categoryMode ||
            currentSettings.sharedCategory !== nextSettings.sharedCategory ||
            currentSettings.roundsCount !== nextSettings.roundsCount ||
            currentSettings.roundCategories.join('\u0000') !== nextSettings.roundCategories.join('\u0000'));
    }
    findOrCreatePlayer(session, playerName) {
        const existingPlayer = session.players.find((player) => player.name === playerName);
        if (existingPlayer) {
            return existingPlayer;
        }
        if (session.players.length >= env_1.env.maxPlayersPerSession) {
            return undefined;
        }
        const player = {
            id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: playerName,
            score: 0,
            hasAnswered: false,
            hasGuessed: false,
        };
        session.players.push(player);
        return player;
    }
    requireSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        return session;
    }
    getCurrentRound(session) {
        return session.rounds[session.roundIndex];
    }
    createInternalSession(sessionId, eventName) {
        const categories = Array.from(new Set(this.questionBank.map((question) => question.category)));
        const rounds = this.buildRoundsFromSettings(game_1.DEFAULT_SETTINGS);
        return {
            sessionId,
            organizerToken: (0, crypto_1.randomBytes)(24).toString('hex'),
            eventName,
            phase: 'lobby',
            roundIndex: 0,
            players: [],
            rounds,
            settings: {
                ...game_1.DEFAULT_SETTINGS,
                roundCategories: [...game_1.DEFAULT_SETTINGS.roundCategories],
            },
            availableQuestions: [...this.questionBank],
            categories,
            phaseStartsAt: 0,
            phaseEndsAt: 0,
            phasePaused: false,
            isActive: false,
            playerSockets: new Map(),
            disconnectTimers: new Map(),
        };
    }
    resumeTimers() {
        for (const session of this.sessions.getAll()) {
            if (session.phase === 'lobby' || session.phasePaused || session.phaseEndsAt <= Date.now()) {
                continue;
            }
            const timeoutMs = Math.max(0, session.phaseEndsAt - Date.now());
            session.timer = setTimeout(() => {
                try {
                    this.nextPhase(session.sessionId);
                }
                catch (error) {
                    console.error('Failed to resume auto-advance phase', error);
                }
            }, timeoutMs);
        }
    }
    buildRounds() {
        return this.buildRoundsFromSettings(game_1.DEFAULT_SETTINGS);
    }
    getAnsweringDurationMs(session) {
        return this.clampTimerSeconds(session.settings.answeringDurationSec) * 1000 || env_1.env.answeringDurationMs;
    }
    getGuessingDurationMs(session) {
        return this.clampTimerSeconds(session.settings.guessingDurationSec) * 1000 || env_1.env.guessingDurationMs;
    }
    getStartDelayMs(session) {
        return this.clampDelaySeconds(session.settings.startDelaySec) * 1000;
    }
    clampTimerSeconds(value) {
        return Math.max(5, Math.min(3600, Number.isFinite(value) ? Math.round(value) : 30));
    }
    clampDelaySeconds(value) {
        return Math.max(0, Math.min(600, Number.isFinite(value) ? Math.round(value) : 0));
    }
    buildRoundsFromSettings(settings) {
        const roundsCount = Math.max(1, settings.roundsCount);
        const usedQuestionIds = new Set();
        const shuffledQuestionBank = this.shuffleQuestions(this.questionBank);
        const getPoolForRound = (roundIndex) => {
            if (settings.categoryMode === 'shared') {
                if (settings.sharedCategory === 'all') {
                    return shuffledQuestionBank;
                }
                const categoryPool = shuffledQuestionBank.filter((question) => question.category === settings.sharedCategory);
                return categoryPool.length > 0 ? categoryPool : shuffledQuestionBank;
            }
            const roundCategory = settings.roundCategories[roundIndex] ?? 'all';
            if (roundCategory === 'all') {
                return shuffledQuestionBank;
            }
            const categoryPool = shuffledQuestionBank.filter((question) => question.category === roundCategory);
            return categoryPool.length > 0 ? categoryPool : shuffledQuestionBank;
        };
        return Array.from({ length: roundsCount }, (_, index) => {
            const roundPool = getPoolForRound(index);
            const unusedInPool = roundPool.filter((question) => !usedQuestionIds.has(question.id));
            const fallbackPool = unusedInPool.length > 0 ? unusedInPool : roundPool;
            const question = fallbackPool[0];
            usedQuestionIds.add(question.id);
            return {
                index,
                question,
                answers: [],
                topAnswers: [],
            };
        });
    }
    shuffleQuestions(questions) {
        const shuffled = [...questions];
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
        }
        return shuffled;
    }
    toSessionState(session) {
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
            phaseStartsAt: session.phaseStartsAt ?? 0,
            phaseEndsAt: session.phaseEndsAt,
            phasePaused: session.phasePaused,
            isActive: session.isActive,
        };
    }
    clonePlayer(player) {
        return { ...player };
    }
    cloneTopAnswer(answer) {
        return {
            ...answer,
            matchedBy: [...answer.matchedBy],
        };
    }
    cloneTopAnswers(topAnswers) {
        return topAnswers.map((answer) => this.cloneTopAnswer(answer));
    }
}
exports.GameService = GameService;
