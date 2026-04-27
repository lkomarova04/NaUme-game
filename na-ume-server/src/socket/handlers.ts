import { Server, Socket } from 'socket.io';
import { sessionManager } from '../game/SessionManager';

export const registerSocketHandlers = (io: Server, socket: Socket) => {


  socket.on('session:join', ({ sessionId, role }) => {
    console.log(`${role} joined ${sessionId}`);

    socket.join(sessionId);

    let session = sessionManager.get(sessionId);

    if (!session) {
      session = sessionManager.create(sessionId);
    }
    io.to(sessionId).emit('session:update', session);
  });

};