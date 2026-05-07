"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const normalizeText_1 = require("./normalizeText");
(0, node_test_1.default)('normalizeText lowercases, trims, removes punctuation and collapses spaces', () => {
    const result = (0, normalizeText_1.normalizeText)('  ПрИвЕт,   мир!!!  2026  ');
    strict_1.default.equal(result, 'привет мир 2026');
});
(0, node_test_1.default)('normalizeText keeps letters and digits, but removes separators', () => {
    const result = (0, normalizeText_1.normalizeText)('Тест-набор №1 / super');
    strict_1.default.equal(result, 'тест набор 1 super');
});
