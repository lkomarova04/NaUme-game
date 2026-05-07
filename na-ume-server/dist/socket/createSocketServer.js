"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSocketServer = void 0;
const socket_io_1 = require("socket.io");
const env_1 = require("../config/env");
const createSocketServer = (httpServer) => {
    return new socket_io_1.Server(httpServer, {
        cors: {
            origin: env_1.env.clientOrigin,
            credentials: true,
        },
    });
};
exports.createSocketServer = createSocketServer;
