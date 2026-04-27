import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { RawAnswer, TopAnswer } from '@/entities/answer/model/types';
import type { Player } from '@/entities/player/model/types';
import type {
  GamePhase,
  Round,
  SessionSettings,
  SessionState,
} from '@/entities/session/model/types';
import { mockPlayers, mockQuestions, mockTopAnswers } from '@/shared/lib/mockData';

import { GameContext } from './game-context';

const PHASE_DURATIONS: Record<GamePhase, number> = {
  lobby: 0,
  answering: 30000,
  guessing: 20000,
  reveal: 15000,
  leaderboard: 10000,
};

const EMPTY_TOP_ANSWER_TEXT = 'Пусто';

const normalizeText = (value: string) => value.trim().toLocaleLowerCase('ru-RU');

const getQuestionsByCategory = (category: string | 'all') =>
  category === 'all'
    ? mockQuestions
    : mockQuestions.filter((item) => item.category === category);

const getFallbackQuestion = (excludedIds: string[]) =>
  mockQuestions.find((item) => !excludedIds.includes(item.id)) ?? mockQuestions[excludedIds.length % mockQuestions.length];

const buildRound = (questionId: string, questionIndex: number): Round => {
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

const buildRounds = (settings: SessionSettings) => {
  const usedQuestionIds: string[] = [];

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

const rebuildTopAnswers = (answers: RawAnswer[], prevTopAnswers: TopAnswer[]) => {
  const approvedAnswers = answers.filter((item) => !item.isRejected && item.text.trim());
  const grouped = new Map<string, { text: string; count: number }>();

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

const createDefaultSession = (): SessionState => {
  const categories = Array.from(new Set(mockQuestions.map((item) => item.category)));
  const settings: SessionSettings = {
    categoryMode: 'shared',
    sharedCategory: 'all',
    roundsCount: 5,
    roundCategories: Array.from({ length: 5 }, () => 'all'),
  };

  return {
    sessionId: 'test',
    phase: 'lobby',
    roundIndex: 0,
    players: mockPlayers,
    rounds: buildRounds(settings),
    settings,
    availableQuestions: mockQuestions,
    categories,
    phaseEndsAt: 0,
    isActive: true,
  };
};

export const MockGameProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<SessionState | null>(() => createDefaultSession());
  const [playerId, setPlayerId] = useState<string | null>(null);

  const player = useMemo(() => {
    if (!session || !playerId) return null;
    return session.players.find((item) => item.id === playerId) ?? null;
  }, [session, playerId]);

  const joinSession = (sessionId: string, playerName: string) => {
    if (!session) return;

    if (session.sessionId !== sessionId) {
      console.warn('Mock: session not found');
      return;
    }

    const normalizedName = playerName.trim();
    const existingPlayer = session.players.find((item) => item.name === normalizedName);

    if (existingPlayer) {
      setPlayerId(existingPlayer.id);
      return;
    }

    const newPlayer: Player = {
      id: `mock-${Date.now()}`,
      name: normalizedName,
      score: 0,
      hasAnswered: false,
      hasGuessed: false,
    };

    setSession((prev) =>
      prev
        ? {
            ...prev,
            players: [...prev.players, newPlayer],
          }
        : prev,
    );

    setPlayerId(newPlayer.id);
  };

  const submitAnswer = (answer: string) => {
    if (!session || !playerId) return;
    if (session.phase !== 'answering') return;

    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer) return;

    setSession((prev) => {
      if (!prev) return prev;

      const rounds = [...prev.rounds];
      const currentRound = rounds[prev.roundIndex];
      const nextAnswers = [
        ...currentRound.answers,
        {
          id: `raw-${Date.now()}`,
          playerId,
          text: trimmedAnswer,
          roundIndex: prev.roundIndex,
          createdAt: Date.now(),
          isRejected: false,
        },
      ];

      rounds[prev.roundIndex] = {
        ...currentRound,
        answers: nextAnswers,
        topAnswers: rebuildTopAnswers(nextAnswers, currentRound.topAnswers),
      };

      return {
        ...prev,
        rounds,
        players: prev.players.map((item) =>
          item.id === playerId ? { ...item, hasAnswered: true } : item,
        ),
      };
    });
  };

  const submitGuess = (guess: string) => {
    if (!session || !playerId) return null;
    if (session.phase !== 'guessing') return null;

    const normalizedGuess = normalizeText(guess);
    if (!normalizedGuess) return null;

    let result: { matched: boolean; answerText?: string } | null = null;

    setSession((prev) => {
      if (!prev) return prev;

      const rounds = [...prev.rounds];
      const currentRound = rounds[prev.roundIndex];
      const matchingAnswer = currentRound.topAnswers.find(
        (item) => item.text !== EMPTY_TOP_ANSWER_TEXT && normalizeText(item.text) === normalizedGuess,
      );

      rounds[prev.roundIndex] = {
        ...currentRound,
        topAnswers: currentRound.topAnswers.map((item) =>
          item.id === matchingAnswer?.id
            ? {
                ...item,
                revealed: true,
                matchedBy: Array.from(new Set([...(item.matchedBy ?? []), playerId])),
              }
            : item,
        ),
      };

      result = matchingAnswer
        ? { matched: true, answerText: matchingAnswer.text }
        : { matched: false };

      return {
        ...prev,
        rounds,
        players: prev.players.map((item) =>
          item.id === playerId
            ? {
                ...item,
                hasGuessed: true,
                score: matchingAnswer ? item.score + matchingAnswer.count * 10 : item.score,
              }
            : item,
        ),
      };
    });

    return result;
  };

  const revealTopAnswer = (answerId: string) => {
    setSession((prev) => {
      if (!prev) return prev;

      const rounds = [...prev.rounds];
      const currentRound = rounds[prev.roundIndex];

      rounds[prev.roundIndex] = {
        ...currentRound,
        topAnswers: currentRound.topAnswers.map((item) =>
          item.id === answerId ? { ...item, revealed: !item.revealed } : item,
        ),
      };

      return {
        ...prev,
        rounds,
      };
    });
  };

  const deleteRawAnswer = (answerId: string) => {
    setSession((prev) => {
      if (!prev) return prev;

      const rounds = [...prev.rounds];
      const currentRound = rounds[prev.roundIndex];
      const nextAnswers = currentRound.answers.filter((item) => item.id !== answerId);

      rounds[prev.roundIndex] = {
        ...currentRound,
        answers: nextAnswers,
        topAnswers: rebuildTopAnswers(nextAnswers, currentRound.topAnswers),
      };

      return {
        ...prev,
        rounds,
      };
    });
  };

  const updateSettings = (settings: SessionSettings) => {
    setSession((prev) => {
      if (!prev) return prev;

      const normalizedRoundCategories = Array.from({ length: settings.roundsCount }, (_, index) => {
        return settings.roundCategories[index] ?? settings.sharedCategory ?? 'all';
      });

      const nextSettings: SessionSettings = {
        ...settings,
        roundCategories: normalizedRoundCategories,
      };

      return {
        ...prev,
        settings: nextSettings,
        roundIndex: 0,
        rounds: buildRounds(nextSettings),
      };
    });
  };

  const goToRound = (roundIndex: number) => {
    setSession((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        roundIndex: Math.max(0, Math.min(roundIndex, prev.rounds.length - 1)),
      };
    });
  };

  const __setPhase = (phase: GamePhase) => {
    setSession((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        phase,
        phaseEndsAt: Date.now() + PHASE_DURATIONS[phase],
        players: prev.players.map((item) => ({
          ...item,
          hasAnswered: phase === 'answering' ? false : item.hasAnswered,
          hasGuessed: phase === 'guessing' ? false : item.hasGuessed,
        })),
      };
    });
  };

  const __setTopAnswers = (answers: TopAnswer[]) => {
    setSession((prev) => {
      if (!prev) return prev;

      const rounds = [...prev.rounds];
      const currentRound = rounds[prev.roundIndex];

      rounds[prev.roundIndex] = {
        ...currentRound,
        topAnswers: answers,
      };

      return {
        ...prev,
        rounds,
      };
    });
  };

  const __setRawAnswers = (answers: RawAnswer[]) => {
    setSession((prev) => {
      if (!prev) return prev;

      const rounds = [...prev.rounds];
      const currentRound = rounds[prev.roundIndex];

      rounds[prev.roundIndex] = {
        ...currentRound,
        answers,
        topAnswers: rebuildTopAnswers(answers, currentRound.topAnswers),
      };

      return {
        ...prev,
        rounds,
      };
    });
  };

  return (
    <GameContext.Provider
      value={{
        session,
        player,
        isConnected: true,
        joinSession,
        submitAnswer,
        submitGuess,
        revealTopAnswer,
        deleteRawAnswer,
        updateSettings,
        goToRound,
        __setPhase,
        __setTopAnswers,
        __setRawAnswers,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
