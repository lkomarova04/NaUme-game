import 'socket.io';
import type { Role } from '../domain/types';

declare module 'socket.io' {
  interface Socket {
    data: {
      sessionId?: string;
      role?: Role;
      playerName?: string;
      playerId?: string;
    };
  }
}
