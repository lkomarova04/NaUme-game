import type { Socket } from 'socket.io';
import type { SessionAuthData } from '../domain/types';

const VALID_ROLES = new Set(['player', 'organizer', 'display']);

export const parseSocketAuth = (socket: Socket): SessionAuthData => {
  const rawAuth = socket.handshake.auth as SessionAuthData | undefined;

  return {
    sessionId: typeof rawAuth?.sessionId === 'string' ? rawAuth.sessionId : undefined,
    role: typeof rawAuth?.role === 'string' && VALID_ROLES.has(rawAuth.role) ? rawAuth.role : undefined,
    playerName: typeof rawAuth?.playerName === 'string' ? rawAuth.playerName : undefined,
  };
};
