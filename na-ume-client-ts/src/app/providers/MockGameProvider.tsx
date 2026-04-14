import { createContext, useContext, useState, useMemo } from 'react';
import type {ReactNode} from 'react'
import type { SessionState, GamePhase } from '@/entities/session/model/types';
import type { Player } from '@/entities/player/model/types';
import type { Question } from '@/entities/question/model/types';
import type { TopAnswer } from '@/entities/answer/model/types';

import { mockQuestions, mockPlayers, mockTopAnswers } from '@/shared/lib/mockData';


interface GameContextValue  {
    session: SessionState | null;
    player: Player | null;
    isConnected: boolean;

    joinSession: (sessionId: string, playerName: string) => void;
    submitAnswer: (answer: string) => void;
  submitGuess: (guess: string) => void;

   __setPhase: (phase: GamePhase) => void;
  __setTopAnswers: (answers: TopAnswer[]) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export const useGame = () => {
    const ctx = useContext(GameContext);
    if (!ctx) throw new Error('useGame must be used within GameProvider')
    return ctx;
}

const defaultSession: SessionState = {
  sessionId: 'mock-session',
  phase: 'lobby',
  roundIndex: 0,
  players: mockPlayers,
  rounds: [
    {
      index: 0,
      question: mockQuestions[0],
      answers: [],
      topAnswers: [],
    },
  ],
  phaseEndsAt: 0,
  isActive: true,
};


export const MockGameProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<SessionState | null>(defaultSession);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const isConnected = true;
  const player = useMemo(() => {
    if (!session || !playerId) return null;
    return session.players.find((p) => p.id === playerId) ?? null;
  }, [session, playerId]);

  const joinSession = (sessionId: string, playerName: string) => {
    if (!session) return;

    if (session.sessionId !== sessionId) {
      console.warn('Mock: session not found');
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
        : prev
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
        players: prev.players.map((p) =>
          p.id === playerId ? { ...p, hasAnswered: true } : p
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
        players: prev.players.map((p) =>
          p.id === playerId ? { ...p, hasGuessed: true } : p
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
        phaseEndsAt: Date.now() + (durations[phase] || 0),
      };
    });
  };

  const __setTopAnswers = (answers: TopAnswer[]) => {
    setSession((prev) => {
      if (!prev) return prev;

      const rounds = [...prev.rounds];
      const current = rounds[prev.roundIndex];

      rounds[prev.roundIndex] = {
        ...current,
        topAnswers: answers,
      };

      return {
        ...prev,
        rounds,
      };
    });
  };

  const value: GameContextValue = {
    session,
    player,
    isConnected,
    joinSession,
    submitAnswer,
    submitGuess,
    __setPhase,
    __setTopAnswers,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}