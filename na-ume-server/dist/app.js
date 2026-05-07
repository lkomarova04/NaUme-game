"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const env_1 = require("./config/env");
const createApp = () => {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({ origin: env_1.env.clientOrigin, credentials: true }));
    app.use(express_1.default.json());
    app.get('/health', (_req, res) => {
        res.json({
            ok: true,
            uptime: process.uptime(),
            timestamp: Date.now(),
        });
    });
    return app;
};
exports.createApp = createApp;
