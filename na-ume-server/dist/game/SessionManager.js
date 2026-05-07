"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionManager = exports.SessionManager = void 0;
const PHASE_DURATIONS = {
    lobby: 0,
    answering: 30000,
    guessing: 20000,
    reveal: 15000,
    leaderboard: 10000,
};
const EMPTY_TOP_ANSWER_TEXT = 'Пусто';
const mockQuestions = [
    {
        id: 'q1',
        text: 'Что чаще всего берут с собой на необитаемый остров?',
        category: 'Выживание',
    },
    {
        id: 'q2',
        text: 'Какое животное символизирует мудрость?',
        category: 'Животные',
    },
    {
        id: 'q3',
        text: 'Без какого изобретения невозможно представить современный мир?',
        category: 'Технологии',
    },
    {
        id: 'q4',
        text: 'Что первым делом делают утром перед работой?',
        category: 'Быт',
    },
    {
        id: 'q5',
        text: 'Что обычно покупают в кинотеатре?',
        category: 'Развлечения',
    },
    {
        id: 'q6',
        text: 'Что берут с собой в поездку на море?',
        category: 'Путешествия',
    },
];
const mockTopAnswers = [
    { id: '1', text: 'Нож', count: 45, percentage: 45, revealed: false },
    { id: '2', text: 'Спички', count: 30, percentage: 30, revealed: false },
    { id: '3', text: 'Вода', count: 15, percentage: 15, revealed: false },
    { id: '4', text: 'Веревка', count: 7, percentage: 7, revealed: false },
    { id: '5', text: 'Аптечка', count: 3, percentage: 3, revealed: false },
];
const normalizeText = (value) => value.trim().toLocaleLowerCase('ru-RU');
const getQuestionsByCategory = (category) => category === 'all'
    ? mockQuestions
    : mockQuestions.filter((item) => item.category === category);
const getFallbackQuestion = (excludedIds) => mockQuestions.find((item) => !excludedIds.includes(item.id)) ??
    mockQuestions[excludedIds.length % mockQuestions.length];
const buildRound = (questionId, questionIndex) => {
    const question = mockQuestions.find((item) => item.id === questionId) ?? mockQuestions[0];
    return {
        index: questionIndex,
        question,
        answers: [],
        topAnswers: mockTopAnswers.map((answer) => ({
            ...answer,
            id: `${question.id}-${answer.id}`,
            revealed: false,
            matchedBy: [],
        })),
    };
};
const buildRounds = (settings) => {
    const usedQuestionIds = [];
    if (settings.categoryMode === 'shared') {
        const pool = getQuestionsByCategory(settings.sharedCategory);
        const safePool = pool.length > 0 ? pool : mockQuestions;
        return Array.from({ length: settings.roundsCount }, (_, index) => {
            const question = safePool[index] ?? safePool[index % safePool.length];
            usedQuestionIds.push(question.id);
            return buildRound(question.id, index);
        });
    }
    return Array.from({ length: settings.roundsCount }, (_, index) => {
        const category = settings.roundCategories[index] ?? 'all';
        const pool = getQuestionsByCategory(category).filter((item) => !usedQuestionIds.includes(item.id));
        const question = pool[0] ?? getFallbackQuestion(usedQuestionIds);
        usedQuestionIds.push(question.id);
        return buildRound(question.id, index);
    });
};
const rebuildTopAnswers = (answers, prevTopAnswers) => {
    const approvedAnswers = answers.filter((item) => !item.isRejected && item.text.trim());
    const grouped = new Map();
    approvedAnswers.forEach((answer) => {
        const normalized = normalizeText(answer.text);
        const existing = grouped.get(normalized);
        if (existing) {
            existing.count += 1;
            return;
        }
        grouped.set(normalized, {
            text: answer.text.trim(),
            count: 1,
        });
    });
    const total = approvedAnswers.length || 1;
    const ranked = Array.from(grouped.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, prevTopAnswers.length);
    return prevTopAnswers.map((prevAnswer, index) => {
        const nextAnswer = ranked[index];
        if (!nextAnswer) {
            return {
                ...prevAnswer,
                text: EMPTY_TOP_ANSWER_TEXT,
                count: 0,
                percentage: 0,
                matchedBy: [],
            };
        }
        return {
            ...prevAnswer,
            text: nextAnswer[1].text,
            count: nextAnswer[1].count,
            percentage: Math.round((nextAnswer[1].count / total) * 100),
        };
    });
};
const createDefaultSession = (sessionId) => {
    const categories = Array.from(new Set(mockQuestions.map((item) => item.category)));
    const settings = {
        categoryMode: 'shared',
        sharedCategory: 'all',
        roundsCount: 5,
        roundCategories: Array.from({ length: 5 }, () => 'all'),
    };
    return {
        sessionId,
        phase: 'lobby',
        roundIndex: 0,
        players: [],
        rounds: buildRounds(settings),
        settings,
        availableQuestions: mockQuestions,
        categories,
        phaseEndsAt: 0,
        isActive: true,
    };
};
class SessionManager {
    sessions = new Map();
    create(sessionId) {
        const session = createDefaultSession(sessionId);
        this.sessions.set(sessionId, session);
        return session;
    }
    get(sessionId) {
        return this.sessions.get(sessionId);
    }
    ensure(sessionId) {
        return this.get(sessionId) ?? this.create(sessionId);
    }
    joinPlayer(sessionId, playerName) {
        const session = this.ensure(sessionId);
        const normalizedName = playerName.trim();
        if (!normalizedName) {
            return { session, player: null };
        }
        const existingPlayer = session.players.find((item) => item.name === normalizedName);
        if (existingPlayer) {
            return { session, player: existingPlayer };
        }
        const newPlayer = {
            id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: normalizedName,
            score: 0,
            hasAnswered: false,
            hasGuessed: false,
        };
        session.players.push(newPlayer);
        return { session, player: newPlayer };
    }
    submitAnswer(sessionId, playerId, answerText) {
        const session = this.get(sessionId);
        if (!session || session.phase !== 'answering')
            return session ?? null;
        const trimmedAnswer = answerText.trim();
        if (!trimmedAnswer)
            return session;
        const currentRound = session.rounds[session.roundIndex];
        currentRound.answers.push({
            id: `raw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            playerId,
            text: trimmedAnswer,
            roundIndex: session.roundIndex,
            createdAt: Date.now(),
            isRejected: false,
        });
        currentRound.topAnswers = rebuildTopAnswers(currentRound.answers, currentRound.topAnswers);
        session.players = session.players.map((item) => item.id === playerId ? { ...item, hasAnswered: true } : item);
        return session;
    }
    submitGuess(sessionId, playerId, guess) {
        const session = this.get(sessionId);
        if (!session || session.phase !== 'guessing') {
            return { session: session ?? null, result: null };
        }
        const normalizedGuess = normalizeText(guess);
        if (!normalizedGuess) {
            return { session, result: null };
        }
        const currentRound = session.rounds[session.roundIndex];
        const matchingAnswer = currentRound.topAnswers.find((item) => item.text !== EMPTY_TOP_ANSWER_TEXT && normalizeText(item.text) === normalizedGuess);
        currentRound.topAnswers = currentRound.topAnswers.map((item) => item.id === matchingAnswer?.id
            ? {
                ...item,
                revealed: true,
                matchedBy: Array.from(new Set([...(item.matchedBy ?? []), playerId])),
            }
            : item);
        session.players = session.players.map((item) => item.id === playerId
            ? {
                ...item,
                hasGuessed: true,
                score: matchingAnswer ? item.score + matchingAnswer.count * 10 : item.score,
            }
            : item);
        return {
            session,
            result: matchingAnswer
                ? { matched: true, answerText: matchingAnswer.text }
                : { matched: false },
        };
    }
    revealTopAnswer(sessionId, answerId) {
        const session = this.get(sessionId);
        if (!session)
            return null;
        const currentRound = session.rounds[session.roundIndex];
        currentRound.topAnswers = currentRound.topAnswers.map((item) => item.id === answerId ? { ...item, revealed: !item.revealed } : item);
        return session;
    }
    deleteRawAnswer(sessionId, answerId) {
        const session = this.get(sessionId);
        if (!session)
            return null;
        const currentRound = session.rounds[session.roundIndex];
        currentRound.answers = currentRound.answers.filter((item) => item.id !== answerId);
        currentRound.topAnswers = rebuildTopAnswers(currentRound.answers, currentRound.topAnswers);
        return session;
    }
    updateSettings(sessionId, settings) {
        const session = this.get(sessionId);
        if (!session)
            return null;
        const normalizedRoundCategories = Array.from({ length: settings.roundsCount }, (_, index) => {
            return settings.roundCategories[index] ?? settings.sharedCategory ?? 'all';
        });
        const nextSettings = {
            ...settings,
            roundCategories: normalizedRoundCategories,
        };
        session.settings = nextSettings;
        session.roundIndex = 0;
        session.rounds = buildRounds(nextSettings);
        return session;
    }
    goToRound(sessionId, roundIndex) {
        const session = this.get(sessionId);
        if (!session)
            return null;
        session.roundIndex = Math.max(0, Math.min(roundIndex, session.rounds.length - 1));
        return session;
    }
    setPhase(sessionId, phase) {
        const session = this.get(sessionId);
        if (!session)
            return null;
        session.phase = phase;
        session.phaseEndsAt = Date.now() + PHASE_DURATIONS[phase];
        session.players = session.players.map((item) => ({
            ...item,
            hasAnswered: phase === 'answering' ? false : item.hasAnswered,
            hasGuessed: phase === 'guessing' ? false : item.hasGuessed,
        }));
        return session;
    }
}
exports.SessionManager = SessionManager;
exports.sessionManager = new SessionManager();
