import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';

import type { RawAnswer, TopAnswer } from '@/entities/answer/model/types';
import type { Player } from '@/entities/player/model/types';
import type { GamePhase, SessionSettings, SessionState } from '@/entities/session/model/types';

import { GameContext, type GameContextValue } from './game-context';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL && import.meta.env.VITE_SERVER_URL.trim().length > 0
    ? import.meta.env.VITE_SERVER_URL
    : window.location.origin;
type SocketRole = 'player' | 'organizer' | 'display';
type AnswerResult = { success: boolean; message?: string };
type GuessResult = { matched: boolean; answerText?: string; error?: string } | null;
type SocketAuthPayload = {
  sessionId?: string;
  role: SocketRole;
  playerName?: string;
};

const getRouteSessionId = (pathname: string) => {
  const match = pathname.match(/^\/(?:display|player|admin)\/([^/]+)/);
  return match?.[1];
};

const getRouteRole = (pathname: string): SocketRole => {
  if (pathname.startsWith('/player')) return 'player';
  if (pathname.startsWith('/display')) return 'display';
  return 'organizer';
};

export const SocketGameProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const routeRole = getRouteRole(location.pathname);
  const routeSessionId = getRouteSessionId(location.pathname);

  const [session, setSession] = useState<SessionState | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const authRef = useRef<SocketAuthPayload>({ role: routeRole, sessionId: routeSessionId });
  const pendingJoinRef = useRef<{ sessionId: string; playerName: string } | null>(null);

  const connectSocket = (auth: SocketAuthPayload) => {
    socketRef.current?.removeAllListeners();
    socketRef.current?.disconnect();

    const socket = io(SERVER_URL, {
      autoConnect: true,
      transports: ['polling', 'websocket'],
      auth,
    });

    authRef.current = auth;
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);

      if (auth.sessionId) {
        socket.emit(
          'session:join',
          { sessionId: auth.sessionId, role: auth.role },
          (response: { success: boolean; player?: Player; session?: SessionState }) => {
            if (response.session) {
              setSession(response.session);
            }

            if (response.player) {
              setPlayer(response.player);
            }
          },
        );
      }
    });

    socket.on('connect_error', (error) => {
      setIsConnected(false);
      setConnectionError(error.message);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('error', (payload: { message?: string }) => {
      setConnectionError(payload.message ?? 'Socket error');
    });

    socket.on('session:update', (nextSession: SessionState) => {
      setSession(nextSession);
      setPlayer((prevPlayer) => {
        if (!prevPlayer) return prevPlayer;
        return nextSession.players.find((item) => item.id === prevPlayer.id) ?? prevPlayer;
      });
    });

    socket.on('player:update', (nextPlayer: Player) => {
      setPlayer(nextPlayer);
    });
  };

  useEffect(() => {
    const nextAuth: SocketAuthPayload = {
      role: routeRole,
      sessionId: routeSessionId,
      playerName: pendingJoinRef.current?.playerName,
    };

    if (routeRole === 'player' && !pendingJoinRef.current) {
      setSession(null);
      setPlayer(null);
      setIsConnected(false);
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    connectSocket(nextAuth);

    return () => {
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [routeRole, routeSessionId]);

  const contextValue = useMemo<GameContextValue>(() => {
    return {
      session,
      player,
      isConnected,
      connectionError,
      createSession: async (eventName: string) => {
        if (!socketRef.current) return null;

        return new Promise<string | null>((resolve) => {
          socketRef.current?.emit(
            'organizer:create-session',
            { eventName },
            (response: { sessionId: string }) => {
              if (!response?.sessionId) {
                resolve(null);
                return;
              }

              navigate(`/admin/${response.sessionId}`);
              resolve(response.sessionId);
            },
          );
        });
      },
      joinSession: (sessionId: string, playerName: string) => {
        pendingJoinRef.current = {
          sessionId,
          playerName,
        };
        navigate(`/player/${sessionId}`);
        connectSocket({
          role: 'player',
          sessionId,
          playerName,
        });
      },
      startGame: () => {
        if (!session) return;
        socketRef.current?.emit('organizer:start-game', {
          sessionId: session.sessionId,
        });
      },
      nextPhase: () => {
        if (!session) return;
        socketRef.current?.emit('organizer:next-phase', {
          sessionId: session.sessionId,
        });
      },
      resetGame: () => {
        if (!session) return;
        socketRef.current?.emit('organizer:reset-game', {
          sessionId: session.sessionId,
          keepPlayers: true,
        });
      },
      setTimerPaused: (paused: boolean) => {
        if (!session) return;
        socketRef.current?.emit('organizer:pause-timer', {
          sessionId: session.sessionId,
          paused,
        });
      },
      setCurrentTimer: (durationSec: number) => {
        if (!session) return;
        socketRef.current?.emit('organizer:set-timer', {
          sessionId: session.sessionId,
          durationSec,
        });
      },
      submitAnswer: async (answer: string) => {
        if (!socketRef.current) {
          return { success: false, message: 'Нет соединения с сервером.' };
        }

        return new Promise<AnswerResult>((resolve) => {
          socketRef.current?.emit('game:submit-answer', { answer }, (result: AnswerResult) => {
            resolve(result ?? { success: false, message: 'Не удалось отправить ответ.' });
          });
        });
      },
      submitGuess: async (guess: string) => {
        if (!socketRef.current) return null;

        return new Promise<GuessResult>((resolve) => {
          socketRef.current?.emit('game:submit-guess', { guess }, (result: GuessResult) => {
            resolve(result);
          });
        });
      },
      revealTopAnswer: (answerId: string) => {
        if (!session) return;

        const currentRound = session.rounds[session.roundIndex];
        const answerIndex = currentRound.topAnswers.findIndex((item) => item.id === answerId);

        if (answerIndex < 0) return;

        socketRef.current?.emit('organizer:reveal-answer', {
          sessionId: session.sessionId,
          answerIndex,
        });
      },
      deleteRawAnswer: (answerId: string) => {
        if (!session) return;

        socketRef.current?.emit('answer:delete', {
          sessionId: session.sessionId,
          answerId,
        });
      },
      updateSettings: (settings: SessionSettings) => {
        if (!session) return;

        socketRef.current?.emit('session:settings:update', {
          sessionId: session.sessionId,
          settings,
        });
      },
      goToRound: (roundIndex: number) => {
        if (!session) return;

        socketRef.current?.emit('session:round:set', {
          sessionId: session.sessionId,
          roundIndex,
        });
      },
      __setPhase: (phase: GamePhase) => {
        if (!session) return;

        socketRef.current?.emit('session:phase:set', {
          sessionId: session.sessionId,
          phase,
        });
      },
      __setTopAnswers: (_answers: TopAnswer[]) => {},
      __setRawAnswers: (_answers: RawAnswer[]) => {},
    };
  }, [connectionError, isConnected, navigate, player, session]);

  return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>;
};
