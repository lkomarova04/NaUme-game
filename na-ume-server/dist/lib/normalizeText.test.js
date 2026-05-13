"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const containsProfanity_1 = require("./containsProfanity");
const normalizeText_1 = require("./normalizeText");
describe('normalizeText', () => {
    it('lowercases, trims and removes punctuation', () => {
        const result = (0, normalizeText_1.normalizeText)('  Hello,   WORLD!!!  2026  ');
        expect(result).toBe('hello world 2026');
    });
    it('removes separators and keeps letters and digits', () => {
        const result = (0, normalizeText_1.normalizeText)('test-set #1 / super');
        expect(result).toBe('test set 1 super');
    });
    it('keeps equal answers comparable after case changes', () => {
        expect((0, normalizeText_1.normalizeText)('Coffee')).toBe((0, normalizeText_1.normalizeText)(' coffee '));
    });
});
describe('containsProfanity', () => {
    it('catches rude words without false positives for normal words', () => {
        expect((0, containsProfanity_1.containsProfanity)((0, normalizeText_1.normalizeText)('kakashka'))).toBe(true);
        expect((0, containsProfanity_1.containsProfanity)((0, normalizeText_1.normalizeText)('coffee'))).toBe(false);
    });
});
