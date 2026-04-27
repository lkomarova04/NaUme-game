import type { RawAnswer, TopAnswer } from '@/entities/answer';
import type { Player } from '@/entities/player';
import type { Question } from '@/entities/question';

export type GamePhase = 'lobby' | 'answering' | 'guessing' | 'reveal' | 'leaderboard';
export type CategoryMode = 'shared' | 'perRound';

export interface Round {
  index: number;
  question: Question;
  answers: RawAnswer[];
  topAnswers: TopAnswer[];
}

export interface SessionSettings {
  categoryMode: CategoryMode;
  sharedCategory: string | 'all';
  roundsCount: number;
  roundCategories: string[];
}

export interface SessionState {
  sessionId: string;
  phase: GamePhase;
  roundIndex: number;
  players: Player[];
  rounds: Round[];
  settings: SessionSettings;
  availableQuestions: Question[];
  categories: string[];
  phaseEndsAt: number;
  isActive: boolean;
}
