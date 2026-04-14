import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socket/handlers';

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log('🔌 Connected:', socket.id);

  registerSocketHandlers(io, socket);
});

httpServer.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});