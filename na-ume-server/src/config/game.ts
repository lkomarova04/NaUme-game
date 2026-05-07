import type { GamePhase, Question, SessionSettings } from '../domain/types';

export const DEFAULT_SESSION_ID_LENGTH = 6;
export const EMPTY_TOP_ANSWER_TEXT = 'Пусто';

export const PHASE_SEQUENCE: GamePhase[] = [
  'lobby',
  'answering',
  'guessing',
  'reveal',
  'leaderboard',
];

export const QUESTION_BANK: Question[] = [
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

export const DEFAULT_SETTINGS: SessionSettings = {
  categoryMode: 'shared',
  sharedCategory: 'all',
  roundsCount: 5,
  roundCategories: Array.from({ length: 5 }, () => 'all'),
};
