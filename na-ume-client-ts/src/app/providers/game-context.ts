import { createContext, useContext } from 'react';

import type { GamePhase, SessionState } from '@/entities/session/model/types';
import type { TopAnswer } from '@/entities/answer/model/types';
import type { Player } from '@/entities/player/model/types';

export interface GameContextValue {
  session: SessionState | null;
  player: Player | null;
  isConnected: boolean;
  joinSession: (sessionId: string, playerName: string) => void;
  submitAnswer: (answer: string) => void;
  submitGuess: (guess: string) => void;
  __setPhase: (phase: GamePhase) => void;
  __setTopAnswers: (answers: TopAnswer[]) => void;
}

export const GameContext = createContext<GameContextValue | null>(null);

export const useGame = () => {
  const ctx = useContext(GameContext);

  if (!ctx) {
    throw new Error('useGame must be used within GameProvider');
  }

  return ctx;
};
