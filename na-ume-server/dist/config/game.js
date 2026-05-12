"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = exports.QUESTION_BANK = exports.PHASE_SEQUENCE = exports.EMPTY_TOP_ANSWER_TEXT = exports.DEFAULT_SESSION_ID_LENGTH = void 0;
exports.DEFAULT_SESSION_ID_LENGTH = 6;
exports.EMPTY_TOP_ANSWER_TEXT = 'Пусто';
exports.PHASE_SEQUENCE = [
    'lobby',
    'answering',
    'guessing',
    'reveal',
    'leaderboard',
];
exports.QUESTION_BANK = [
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
exports.DEFAULT_SETTINGS = {
    categoryMode: 'shared',
    sharedCategory: 'all',
    roundsCount: 5,
    roundCategories: Array.from({ length: 5 }, () => 'all'),
    answeringDurationSec: 30,
    guessingDurationSec: 200,
    startDelaySec: 0,
};
