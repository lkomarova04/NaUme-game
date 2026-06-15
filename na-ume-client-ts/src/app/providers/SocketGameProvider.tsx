import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
type AdminVerifyResult = { success: boolean; message?: string };
type SocketAuthPayload = {
  sessionId?: string;
  role: SocketRole;
  playerName?: string;
  adminCode?: string;
  organizerToken?: string;
};

const LAST_ADMIN_SESSION_KEY = 'na-ume-last-admin-session';
type GameEvent =
  | { type: 'player_joined'; player: Player }
  | { type: 'player_left'; playerId: string }
  | { type: 'answer_submitted'; roundIndex: number; answer: RawAnswer; player: Player }
  | { type: 'answer_deleted'; roundIndex: number; answerId: string; topAnswers: TopAnswer[] }
  | { type: 'answer_revealed'; roundIndex: number; answer: TopAnswer }
  | { type: 'guess_submitted'; roundIndex: number; player: Player; answer?: TopAnswer }
  | {
      type: 'phase_changed';
      phase: GamePhase;
      roundIndex: number;
      phaseStartsAt: number;
      phaseEndsAt: number;
      phasePaused: boolean;
      players: Player[];
      topAnswers?: TopAnswer[];
    }
  | { type: 'timer_changed'; phaseStartsAt: number; phaseEndsAt: number; phasePaused: boolean }
  | { type: 'round_changed'; roundIndex: number };

const getStoredOrganizerToken = (sessionId: string | undefined) => {
  if (!sessionId) return undefined;
  return window.localStorage.getItem(`na-ume-organizer-token:${sessionId}`) ?? undefined;
};

const clearStoredSession = (sessionId: string | undefined) => {
  if (sessionId) {
    window.localStorage.removeItem(`na-ume-organizer-token:${sessionId}`);
  }
  window.localStorage.removeItem(LAST_ADMIN_SESSION_KEY);
};

const getRouteSessionId = (pathname: string) => {
  const match = pathname.match(/^\/(?:display|player|admin)\/([^/]+)/);
  return match?.[1];
};

const getRouteRole = (pathname: string): SocketRole => {
  if (pathname === '/') return 'player';
  if (pathname.startsWith('/player')) return 'player';
  if (pathname.startsWith('/display')) return 'display';
  return 'organizer';
};

const upsertPlayer = (players: Player[], player: Player) => {
  const exists = players.some((item) => item.id === player.id);
  return exists ? players.map((item) => (item.id === player.id ? player : item)) : [...players, player];
};

const updateRound = (
  session: SessionState,
  roundIndex: number,
  update: (round: SessionState['rounds'][number]) => SessionState['rounds'][number],
) => ({
  ...session,
  rounds: session.rounds.map((round) => (round.index === roundIndex ? update(round) : round)),
});

export const SocketGameProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const routeRole = getRouteRole(location.pathname);
  const routeSessionId = getRouteSessionId(location.pathname);

  const [session, setSession] = useState<SessionState | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [adminAccessCode, setAdminAccessCodeState] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const authRef = useRef<SocketAuthPayload>({ role: routeRole, sessionId: routeSessionId });
  const pendingJoinRef = useRef<{ sessionId: string; playerName: string } | null>(null);

  const connectSocket = useCallback((auth: SocketAuthPayload) => {
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

    socket.on('session:closed', (payload: { sessionId?: string }) => {
      clearStoredSession(payload.sessionId ?? auth.sessionId);
      setSession(null);
      setPlayer(null);

      if (auth.role === 'organizer') {
        navigate('/admin');
      } else if (auth.role === 'player') {
        navigate('/');
      }
    });

    socket.on('player:update', (nextPlayer: Player) => {
      setPlayer(nextPlayer);
    });

    socket.on('game:top-answers', (topAnswers: TopAnswer[]) => {
      setSession((prevSession) => {
        if (!prevSession) return prevSession;
        return updateRound(prevSession, prevSession.roundIndex, (round) => ({
          ...round,
          topAnswers,
        }));
      });
    });

    socket.on('game:event', (event: GameEvent) => {
      setSession((prevSession) => {
        if (!prevSession) return prevSession;

        switch (event.type) {
          case 'player_joined':
            return {
              ...prevSession,
              players: upsertPlayer(prevSession.players, event.player),
            };
          case 'player_left':
            return {
              ...prevSession,
              players: prevSession.players.filter((item) => item.id !== event.playerId),
            };
          case 'answer_submitted':
            return updateRound(
              {
                ...prevSession,
                players: upsertPlayer(prevSession.players, event.player),
              },
              event.roundIndex,
              (round) => ({
                ...round,
                answers: round.answers.some((answer) => answer.id === event.answer.id)
                  ? round.answers
                  : [...round.answers, event.answer],
              }),
            );
          case 'answer_deleted':
            return updateRound(prevSession, event.roundIndex, (round) => ({
              ...round,
              answers: round.answers.filter((answer) => answer.id !== event.answerId),
              topAnswers: event.topAnswers,
            }));
          case 'answer_revealed':
            return updateRound(prevSession, event.roundIndex, (round) => ({
              ...round,
              topAnswers: round.topAnswers.map((answer) =>
                answer.id === event.answer.id ? event.answer : answer,
              ),
            }));
          case 'guess_submitted':
            return updateRound(
              {
                ...prevSession,
                players: upsertPlayer(prevSession.players, event.player),
              },
              event.roundIndex,
              (round) => ({
                ...round,
                topAnswers: event.answer
                  ? round.topAnswers.map((answer) =>
                      answer.id === event.answer?.id ? event.answer : answer,
                    )
                  : round.topAnswers,
              }),
            );
          case 'phase_changed':
            return updateRound(
              {
                ...prevSession,
                phase: event.phase,
                roundIndex: event.roundIndex,
                phaseStartsAt: event.phaseStartsAt,
                phaseEndsAt: event.phaseEndsAt,
                phasePaused: event.phasePaused,
                players: event.players,
              },
              event.roundIndex,
              (round) => ({
                ...round,
                topAnswers: event.topAnswers ?? round.topAnswers,
              }),
            );
          case 'timer_changed':
            return {
              ...prevSession,
              phaseStartsAt: event.phaseStartsAt,
              phaseEndsAt: event.phaseEndsAt,
              phasePaused: event.phasePaused,
            };
          case 'round_changed':
            return {
              ...prevSession,
              roundIndex: event.roundIndex,
            };
          default:
            return prevSession;
        }
      });

      if ('player' in event) {
        setPlayer((prevPlayer) => (prevPlayer?.id === event.player.id ? event.player : prevPlayer));
      }

      if (event.type === 'player_left') {
        setPlayer((prevPlayer) => (prevPlayer?.id === event.playerId ? null : prevPlayer));
      }
    });
  }, [navigate]);

  useEffect(() => {
    const nextAuth: SocketAuthPayload = {
      role: routeRole,
      sessionId: routeSessionId,
      playerName: pendingJoinRef.current?.playerName,
      adminCode: routeRole === 'organizer' ? adminAccessCode : undefined,
      organizerToken:
        routeRole === 'organizer' && adminAccessCode ? getStoredOrganizerToken(routeSessionId) : undefined,
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
  }, [adminAccessCode, connectSocket, routeRole, routeSessionId]);

  const contextValue = useMemo<GameContextValue>(() => {
    return {
      session,
      player,
      isConnected,
      connectionError,
      adminAccessCode,
      setAdminAccessCode: (code: string) => {
        const normalizedCode = code.trim();
        setAdminAccessCodeState(normalizedCode);
        setConnectionError(null);
      },
      verifyAdminAccess: async (code: string) => {
        const normalizedCode = code.trim();

        if (!normalizedCode) {
          setAdminAccessCodeState('');
          setConnectionError('Введите код администратора.');
          return false;
        }

        return new Promise<boolean>((resolve) => {
          const verifySocket = io(SERVER_URL, {
            autoConnect: true,
            transports: ['polling', 'websocket'],
            auth: {
              role: 'organizer',
              adminCode: normalizedCode,
            },
          });
          let finished = false;
          const finish = (success: boolean, message?: string) => {
            if (finished) return;
            finished = true;

            verifySocket.removeAllListeners();
            verifySocket.disconnect();

            if (success) {
              setAdminAccessCodeState(normalizedCode);
              setConnectionError(null);
              connectSocket({
                role: 'organizer',
                sessionId: routeSessionId,
                adminCode: normalizedCode,
                organizerToken: getStoredOrganizerToken(routeSessionId),
              });
            } else {
              setAdminAccessCodeState('');
              setConnectionError(message ?? 'Неверный код администратора.');
            }

            resolve(success);
          };
          const timeoutId = window.setTimeout(() => {
            finish(false, 'Не удалось проверить код администратора.');
          }, 5000);

          verifySocket.on('connect', () => {
            verifySocket.emit('organizer:verify-access', (response: AdminVerifyResult) => {
              window.clearTimeout(timeoutId);
              finish(response.success, response.message);
            });
          });

          verifySocket.on('connect_error', (error) => {
            window.clearTimeout(timeoutId);
            finish(false, error.message);
          });
        });
      },
      createSession: async (eventName: string) => {
        if (!socketRef.current) return null;

        return new Promise<string | null>((resolve) => {
          socketRef.current?.emit(
            'organizer:create-session',
            { eventName },
            (response: { sessionId?: string; organizerToken?: string }) => {
              if (!response?.sessionId) {
                resolve(null);
                return;
              }

              if (response.organizerToken) {
                window.localStorage.setItem(
                  `na-ume-organizer-token:${response.sessionId}`,
                  response.organizerToken,
                );
              }

              window.localStorage.setItem(LAST_ADMIN_SESSION_KEY, response.sessionId);
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
        const sessionId = session.sessionId;
        socketRef.current?.emit(
          'organizer:reset-game',
          {
            sessionId,
            keepPlayers: false,
          },
          (response: { success: boolean }) => {
            if (!response.success) return;

            clearStoredSession(sessionId);
            setSession(null);
            setPlayer(null);
            navigate('/admin');
          },
        );
      },
      setTimerPaused: (paused: boolean) => {
        if (!session) return;
        socketRef.current?.emit('organizer:pause-timer', {
          sessionId: session.sessionId,
          paused,
        });
      },
      setCurrentTimer: (durationSec: number, delaySec = 0) => {
        if (!session) return;
        socketRef.current?.emit('organizer:set-timer', {
          sessionId: session.sessionId,
          durationSec,
          delaySec,
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
      __setTopAnswers: () => {},
      __setRawAnswers: () => {},
    };
  }, [adminAccessCode, connectSocket, connectionError, isConnected, navigate, player, routeSessionId, session]);

  return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>;
};
