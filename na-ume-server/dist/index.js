"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const handlers_1 = require("./socket/handlers");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const port = Number(process.env.PORT ?? 3001);
app.get('/health', (_req, res) => {
    res.json({ ok: true });
});
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
    },
});
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    (0, handlers_1.registerSocketHandlers)(io, socket);
});
httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
