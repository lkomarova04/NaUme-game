import type { Question } from '@/entities/question';
import type { Player } from '@/entities/player';
import type { TopAnswer } from '@/entities/answer';

export const mockQuestions: Question[] = [
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
];


export const mockPlayers: Player[] = [
  { id: 'p1', name: 'Алиса', score: 1200, hasAnswered: true, hasGuessed: false },
  { id: 'p2', name: 'Борис', score: 950, hasAnswered: true, hasGuessed: false },
  { id: 'p3', name: 'Виктор', score: 2100, hasAnswered: false, hasGuessed: false },
  { id: 'p4', name: 'Галина', score: 800, hasAnswered: true, hasGuessed: false },
];

export const mockTopAnswers: TopAnswer[] = [
  { text: 'Нож', count: 45, percentage: 45, revealed: false },
  { text: 'Спички', count: 30, percentage: 30, revealed: false },
  { text: 'Вода', count: 15, percentage: 15, revealed: false },
  { text: 'Верёвка', count: 7, percentage: 7, revealed: false },
  { text: 'Аптечка', count: 3, percentage: 3, revealed: false },
];
