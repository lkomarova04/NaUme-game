import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { TopAnswer } from '@/entities/answer/model/types';
import type { Player } from '@/entities/player/model/types';
import type { GamePhase, SessionState } from '@/entities/session/model/types';
import { mockPlayers, mockQuestions, mockTopAnswers } from '@/shared/lib/mockData';

import { GameContext } from './game-context';

const createDefaultSession = (): SessionState => ({
  sessionId: 'test',
  phase: 'lobby',
  roundIndex: 0,
  players: mockPlayers,
  rounds: [
    {
      index: 0,
      question: mockQuestions[0],
      answers: [],
      topAnswers: mockTopAnswers,
    },
  ],
  phaseEndsAt: 0,
  isActive: true,
});

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

    const existingPlayer = session.players.find((item) => item.name === playerName.trim());
    if (existingPlayer) {
      setPlayerId(existingPlayer.id);
      return;
    }

    const newPlayer: Player = {
      id: `mock-${Date.now()}`,
      name: playerName,
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

    setSession((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        players: prev.players.map((item) =>
          item.id === playerId ? { ...item, hasAnswered: true } : item,
        ),
      };
    });

    console.log('Mock answer:', answer);
  };

  const submitGuess = (guess: string) => {
    if (!session || !playerId) return;
    if (session.phase !== 'guessing') return;

    setSession((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        players: prev.players.map((item) =>
          item.id === playerId ? { ...item, hasGuessed: true } : item,
        ),
      };
    });

    console.log('Mock guess:', guess);
  };

  const __setPhase = (phase: GamePhase) => {
    setSession((prev) => {
      if (!prev) return prev;

      const durations: Record<GamePhase, number> = {
        lobby: 0,
        answering: 30000,
        guessing: 20000,
        reveal: 15000,
        leaderboard: 10000,
      };

      return {
        ...prev,
        phase,
        phaseEndsAt: Date.now() + durations[phase],
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

  return (
    <GameContext.Provider
      value={{
        session,
        player,
        isConnected: true,
        joinSession,
        submitAnswer,
        submitGuess,
        __setPhase,
        __setTopAnswers,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
