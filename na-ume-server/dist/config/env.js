"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    port: Number(process.env.PORT ?? 3001),
    clientOrigin: process.env.CLIENT_ORIGIN ?? '*',
    databaseUrl: process.env.DATABASE_URL ?? '',
    redisUrl: process.env.REDIS_URL ?? '',
    basePoints: Number(process.env.BASE_POINTS ?? 100),
    maxPlayersPerSession: Number(process.env.MAX_PLAYERS_PER_SESSION ?? 500),
    answeringDurationMs: Number(process.env.ANSWERING_DURATION_MS ?? 30_000),
    guessingDurationMs: Number(process.env.GUESSING_DURATION_MS ?? 200_000),
    leaderboardDurationMs: Number(process.env.LEADERBOARD_DURATION_MS ?? 10_000),
    adminAccessCode: process.env.ADMIN_ACCESS_CODE ?? 'admin',
};
