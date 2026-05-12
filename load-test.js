import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 200 },
    { duration: '30s', target: 500 },
  ],
};

const SESSION_ID = '97HDL7';

export default function () {

  const userId = `user-${__VU}`;
  const playerName = `Player-${__VU}`;

  const url = `ws://localhost:3000/ws`;

  const response = ws.connect(url, {}, function (socket) {

    socket.on('open', () => {

      console.log(`connected: ${userId}`);

      // join room
      socket.send(JSON.stringify({
        type: 'join_session',
        sessionId: SESSION_ID,
        role: 'player',
        playerName,
      }));

      // отправка answer каждые 3 сек
      socket.setInterval(() => {

        socket.send(JSON.stringify({
          type: 'submit_answer',
          sessionId: SESSION_ID,
          playerId: userId,
          answer: `answer-${Math.random()}`,
        }));

      }, 3000);

      // отправка guess каждые 5 сек
      socket.setInterval(() => {

        socket.send(JSON.stringify({
          type: 'submit_guess',
          sessionId: SESSION_ID,
          playerId: userId,
          guess: `guess-${Math.random()}`,
        }));

      }, 5000);
    });

    socket.on('message', (data) => {
      console.log(`message: ${data}`);
    });

    socket.on('error', (e) => {
      console.log(`error: ${JSON.stringify(e)}`);
    });

    socket.on('close', () => {
      console.log(`disconnected: ${userId}`);
    });

    // держим соединение
    sleep(30);
  });

  check(response, {
    'websocket connected': (r) => r && r.status === 101,
  });
}