"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSessionId = void 0;
const game_1 = require("../config/game");
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateSessionId = (length = game_1.DEFAULT_SESSION_ID_LENGTH) => {
    let result = '';
    for (let index = 0; index < length; index += 1) {
        const randomIndex = Math.floor(Math.random() * ALPHABET.length);
        result += ALPHABET[randomIndex];
    }
    return result;
};
exports.generateSessionId = generateSessionId;
