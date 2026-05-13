const { io } = require('socket.io-client');

const parseArgs = () => {
  const args = new Map();

  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) {
      args.set(match[1], match[2]);
    }
  }

  return args;
};

const args = parseArgs();

const getConfigString = (name, fallback) => args.get(name) ?? process.env[`LOAD_TEST_${name.toUpperCase().replaceAll('-', '_')}`] ?? fallback;
const getConfigNumber = (name, fallback) => Number(getConfigString(name, String(fallback)));

const SERVER_URL = getConfigString('server-url', 'http://localhost:3001');
const PLAYERS = getConfigNumber('players', 100);
const RAMP_MS = getConfigNumber('ramp-ms', 15000);
const DURATION_MS = getConfigNumber('duration-ms', 60000);
const ANSWER_EVERY_MS = getConfigNumber('answer-every-ms', 1000);
const GUESS_EVERY_MS = getConfigNumber('guess-every-ms', 1000);
const ANSWERING_SEC = getConfigNumber('answering-sec', 15);
const GUESSING_SEC = getConfigNumber('guessing-sec', 20);
const ACK_TIMEOUT_MS = getConfigNumber('ack-timeout-ms', 10000);
const REPEAT_IN_PHASE = getConfigString('repeat-in-phase', 'false') === 'true';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const metrics = {
  connected: 0,
  answers: 0,
  guesses: 0,
  errors: new Map(),
  latency: {
    join: [],
    answer: [],
    guess: [],
  },
};

const incError = (type) => {
  metrics.errors.set(type, (metrics.errors.get(type) ?? 0) + 1);
};

const nowMs = () => Number(process.hrtime.bigint() / 1_000_000n);

const percentile = (values, p) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
};

const latencySummary = (values) => ({
  count: values.length,
  min: values.length ? Math.min(...values) : 0,
  p50: percentile(values, 0.5),
  p95: percentile(values, 0.95),
  p99: percentile(values, 0.99),
  max: values.length ? Math.max(...values) : 0,
});

const getErrorType = (payload) => {
  if (!payload) return 'unknown';
  if (payload instanceof Error) return payload.message;
  if (typeof payload === 'string') return payload;
  return payload.message ?? payload.code ?? 'unknown';
};

const connectSocket = (auth) =>
  new Promise((resolve, reject) => {
    const socket = io(SERVER_URL, {
      auth,
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: ACK_TIMEOUT_MS,
    });

    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });

const emitWithAck = (socket, event, payload, bucket, timeoutMs = ACK_TIMEOUT_MS) =>
  new Promise((resolve, reject) => {
    const startedAt = nowMs();
    const timer = setTimeout(() => {
      reject(new Error('ack timeout'));
    }, timeoutMs);

    socket.emit(event, payload, (response) => {
      clearTimeout(timer);
      if (bucket) {
        metrics.latency[bucket].push(nowMs() - startedAt);
      }
      resolve(response);
    });
  });

const waitForSession = (socket) =>
  new Promise((resolve) => {
    socket.once('session:update', resolve);
  });

const main = async () => {
  const organizer = await connectSocket({ role: 'organizer' });
  let phase = 'lobby';
  let roundIndex = 0;
  let latestSession = null;

  organizer.on('session:update', (session) => {
    latestSession = session;
    phase = session.phase;
    roundIndex = session.roundIndex;
  });

  organizer.on('game:event', (event) => {
    if (event.type === 'phase_changed') {
      phase = event.phase;
      roundIndex = event.roundIndex;
    }
  });

  organizer.on('error', (payload) => {
    incError(getErrorType(payload));
  });

  const sessionPromise = waitForSession(organizer);
  const created = await emitWithAck(organizer, 'organizer:create-session', {
    eventName: `Load test ${new Date().toISOString()}`,
  });
  const sessionId = created.sessionId;
  latestSession = await sessionPromise;

  const settings = {
    ...latestSession.settings,
    answeringDurationSec: ANSWERING_SEC,
    guessingDurationSec: GUESSING_SEC,
    startDelaySec: 0,
  };
  organizer.emit('session:settings:update', { sessionId, settings });

  console.log(`session=${sessionId} players=${PLAYERS} server=${SERVER_URL}`);
  console.log(`answering=${ANSWERING_SEC}s guessing=${GUESSING_SEC}s repeatInPhase=${REPEAT_IN_PHASE}`);

  const clients = [];

  for (let index = 0; index < PLAYERS; index += 1) {
    await sleep(Math.max(0, Math.floor(RAMP_MS / Math.max(PLAYERS, 1))));

    const playerName = `LoadPlayer-${index + 1}`;
    const socket = await connectSocket({ role: 'player', sessionId, playerName });
    const joinResponse = await emitWithAck(socket, 'session:join', { sessionId, role: 'player' }, 'join');

    if (!joinResponse.success) {
      throw new Error(`join failed for ${playerName}`);
    }

    const client = {
      socket,
      playerName,
      answeredRound: -1,
      guessedRound: -1,
      answerTimer: null,
      guessTimer: null,
    };

    socket.on('error', (payload) => {
      incError(getErrorType(payload));
    });

    client.answerTimer = setInterval(() => {
      if (phase !== 'answering') return;
      if (!REPEAT_IN_PHASE && client.answeredRound === roundIndex) return;

      emitWithAck(
        socket,
        'game:submit-answer',
        { answer: `answer-${roundIndex}-${index}` },
        'answer',
      )
        .then((result) => {
          if (result?.success) {
            metrics.answers += 1;
            client.answeredRound = roundIndex;
            return;
          }

          incError(result?.message ?? 'submit-answer failed');
        })
        .catch((error) => incError(getErrorType(error)));
    }, ANSWER_EVERY_MS);

    client.guessTimer = setInterval(() => {
      if (phase !== 'guessing') return;
      if (!REPEAT_IN_PHASE && client.guessedRound === roundIndex) return;

      emitWithAck(
        socket,
        'game:submit-guess',
        { guess: `answer-${roundIndex}-${index}` },
        'guess',
      )
        .then((result) => {
          if (result?.error) {
            incError(result.error);
            return;
          }

          metrics.guesses += 1;
          client.guessedRound = roundIndex;
        })
        .catch((error) => incError(getErrorType(error)));
    }, GUESS_EVERY_MS);

    clients.push(client);
    metrics.connected += 1;

    if (metrics.connected % 25 === 0 || metrics.connected === PLAYERS) {
      console.log(`connected=${metrics.connected}`);
    }
  }

  organizer.emit('organizer:start-game', { sessionId });
  await sleep(DURATION_MS);

  for (const client of clients) {
    clearInterval(client.answerTimer);
    clearInterval(client.guessTimer);
    client.socket.disconnect();
  }
  organizer.disconnect();

  console.log(
    JSON.stringify(
      {
        connected: metrics.connected,
        answers: metrics.answers,
        guesses: metrics.guesses,
        errors: Object.fromEntries(metrics.errors.entries()),
        latencyMs: {
          join: latencySummary(metrics.latency.join),
          answer: latencySummary(metrics.latency.answer),
          guess: latencySummary(metrics.latency.guess),
        },
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
