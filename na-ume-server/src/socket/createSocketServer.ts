import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { env } from '../config/env';

export const createSocketServer = (httpServer: HttpServer) => {
  return new Server(httpServer, {
    cors: {
      origin: env.clientOrigin,
      credentials: true,
    },
  });
};
