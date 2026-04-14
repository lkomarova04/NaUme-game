import type { Player } from '@/entities/player';
import type { Question } from '@/entities/question';
import type { RawAnswer, TopAnswer } from '@/entities/answer';

export type GamePhase =
  | 'lobby'        // ожидание игроков
  | 'answering'    // ввод ассоциаций
  | 'guessing'     // угадывание
  | 'reveal'       // раскрытие ответов
  | 'leaderboard'; // таблица лидеров

export interface Round {
  index: number;
  question: Question;

  answers: RawAnswer[];
  topAnswers: TopAnswer[];
}

export interface SessionState {
  sessionId: string;

  phase: GamePhase;
  roundIndex: number;

  players: Player[];

  rounds: Round[];

  // таймер синхронизированный
  phaseEndsAt: number;

  // статус сессии
  isActive: boolean;
}