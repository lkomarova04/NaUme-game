"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.containsProfanity = void 0;
const profanityBlacklist_json_1 = __importDefault(require("../config/profanityBlacklist.json"));
const CYRILLIC_LOOKALIKES = {
    a: 'а',
    b: 'б',
    c: 'с',
    e: 'е',
    h: 'х',
    k: 'к',
    m: 'м',
    o: 'о',
    p: 'п',
    r: 'р',
    t: 'т',
    x: 'х',
    y: 'у',
};
const TRANSLITERATION_PAIRS = [
    ['shch', 'щ'],
    ['yo', 'е'],
    ['yu', 'ю'],
    ['ya', 'я'],
    ['zh', 'ж'],
    ['kh', 'х'],
    ['ts', 'ц'],
    ['ch', 'ч'],
    ['sh', 'ш'],
];
const TRANSLITERATION_CHARS = {
    a: 'а',
    b: 'б',
    v: 'в',
    g: 'г',
    d: 'д',
    e: 'е',
    z: 'з',
    i: 'и',
    j: 'й',
    k: 'к',
    l: 'л',
    m: 'м',
    n: 'н',
    o: 'о',
    p: 'п',
    r: 'р',
    s: 'с',
    t: 'т',
    u: 'у',
    f: 'ф',
    h: 'х',
    y: 'ы',
};
const PROFANITY_ROOTS = profanityBlacklist_json_1.default.roots.map((item) => item.toLocaleLowerCase('ru-RU'));
const PROFANITY_WORDS = profanityBlacklist_json_1.default.words.map((item) => item.toLocaleLowerCase('ru-RU'));
const replaceChars = (text, map) => {
    return text.replace(/[a-z]/g, (char) => map[char] ?? char);
};
const transliterateLatin = (text) => {
    let nextText = text;
    for (const [latin, cyrillic] of TRANSLITERATION_PAIRS) {
        nextText = nextText.replaceAll(latin, cyrillic);
    }
    return replaceChars(nextText, TRANSLITERATION_CHARS);
};
const getComparableVariants = (word) => {
    const normalized = word.toLocaleLowerCase('ru-RU');
    return Array.from(new Set([
        normalized,
        replaceChars(normalized, CYRILLIC_LOOKALIKES),
        transliterateLatin(normalized),
    ]));
};
const isBlocked = (word) => {
    return getComparableVariants(word).some((variant) => {
        if (PROFANITY_WORDS.some((pattern) => variant === pattern || variant.includes(pattern))) {
            return true;
        }
        return PROFANITY_ROOTS.some((pattern) => variant.startsWith(pattern));
    });
};
const containsProfanity = (text) => {
    if (!text) {
        return false;
    }
    const words = text.split(' ').filter(Boolean);
    return words.some(isBlocked);
};
exports.containsProfanity = containsProfanity;
