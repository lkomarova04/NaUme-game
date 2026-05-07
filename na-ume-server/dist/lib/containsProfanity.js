"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.containsProfanity = void 0;
const PROFANITY_ROOTS = ['хуй', 'хуе', 'пизд', 'бля', 'бляд', 'сук', 'мраз', 'гандон', 'долбо', 'мудак', 'шлюх'];
const PROFANITY_WORDS = ['ебало', 'ебан', 'ебать', 'еблан', 'чмо'];
const containsProfanity = (text) => {
    if (!text) {
        return false;
    }
    const words = text.split(' ').filter(Boolean);
    return words.some((word) => {
        if (PROFANITY_WORDS.some((pattern) => word.includes(pattern))) {
            return true;
        }
        return PROFANITY_ROOTS.some((pattern) => word.startsWith(pattern));
    });
};
exports.containsProfanity = containsProfanity;
