import { createContext, useContext } from 'react';

import type { RawAnswer, TopAnswer } from '@/entities/answer/model/types';
import type { Player } from '@/entities/player/model/types';
import type { GamePhase, SessionSettings, SessionState } from '@/entities/session/model/types';

export interface GameContextValue {
  session: SessionState | null;
  player: Player | null;
  isConnected: boolean;
  joinSession: (sessionId: string, playerName: string) => void;
  submitAnswer: (answer: string) => void;
  submitGuess: (guess: string) => { matched: boolean; answerText?: string } | null;
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
