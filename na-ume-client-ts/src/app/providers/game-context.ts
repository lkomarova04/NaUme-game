import { createContext, useContext } from 'react';

import type { RawAnswer, TopAnswer } from '@/entities/answer/model/types';
import type { Player } from '@/entities/player/model/types';
import type { GamePhase, SessionSettings, SessionState } from '@/entities/session/model/types';

export interface GameContextValue {
  session: SessionState | null;
  player: Player | null;
  isConnected: boolean;
  connectionError: string | null;
  createSession: (eventName: string) => Promise<string | null>;
  joinSession: (sessionId: string, playerName: string) => void;
  startGame: () => void;
  nextPhase: () => void;
  resetGame: () => void;
  setTimerPaused: (paused: boolean) => void;
  setCurrentTimer: (durationSec: number) => void;
  submitAnswer: (answer: string) => Promise<{ success: boolean; message?: string }>;
  submitGuess: (guess: string) => Promise<{ matched: boolean; answerText?: string; error?: string } | null>;
  revealTopAnswer: (answerId: string) => void;
  deleteRawAnswer: (answerId: string) => void;
  updateSettings: (settings: SessionSettings) => void;
  goToRound: (roundIndex: number) => void;
  __setPhase: (phase: GamePhase) => void;
  __setTopAnswers: (answers: TopAnswer[]) => void;
  __setRawAnswers: (answers: RawAnswer[]) => void;
}

export const GameContext = createContext<GameContextValue | null>(null);

export const useGame = () => {
  const ctx = useContext(GameContext);

  if (!ctx) {
    throw new Error('useGame must be used within GameProvider');
  }

  return ctx;
};
