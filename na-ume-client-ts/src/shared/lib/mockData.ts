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

export const mockPlayers: Player[] = [
  { id: 'p1', name: 'Алиса', score: 100, hasAnswered: true, hasGuessed: false },
  { id: 'p2', name: 'Борис', score: 950, hasAnswered: true, hasGuessed: false },
  { id: 'p3', name: 'Виктор', score: 100, hasAnswered: false, hasGuessed: false },
  { id: 'p4', name: 'Галина', score: 800, hasAnswered: true, hasGuessed: false },
];

export const mockTopAnswers: TopAnswer[] = [
  { id: '1', text: 'Нож', count: 45, percentage: 45, revealed: false },
  { id: '2', text: 'Спички', count: 30, percentage: 30, revealed: false },
  { id: '3', text: 'Вода', count: 15, percentage: 15, revealed: false },
  { id: '4', text: 'Веревка', count: 7, percentage: 7, revealed: false },
  { id: '5', text: 'Аптечка', count: 3, percentage: 3, revealed: false },
];
