import type { Server, Socket } from 'socket.io';
import type {
  CreateSessionPayload,
  DeleteAnswerPayload,
  ForcePhasePayload,
  GameErrorPayload,
  JoinSessionPayload,
  JoinSessionResponse,
  CreateSessionResponse,
  PauseTimerPayload,
  RevealAnswerPayload,
  ResetGamePayload,
  SetRoundPayload,
  SetTimerPayload,
  SessionPhasePayload,
  SubmitAnswerPayload,
  SubmitGuessPayload,
  UpdateSettingsPayload,
} from '../domain/types';
import { parseSocketAuth } from './auth';
import type { GameService } from '../services/GameService';
import { env } from '../config/env';

const emitError = (socket: Socket, payload: GameErrorPayload) => {
  socket.emit('error', payload);
};

const requireOrganizer = (socket: Socket) => {
  if (socket.data.role !== 'organizer') {
    throw new Error('Organizer privileges required');
  }
};

const requireOrganizerForSession = (socket: Socket) => {
  requireOrganizer(socket);

  if (!socket.data.adminAuthorized) {
    throw new Error('Organizer privileges required');
  }
};

const isOrganizerAuthorized = (role: string | undefined, adminCode: string | undefined) => {
  return role === 'organizer' && adminCode === env.adminAccessCode;
};

const joinRoleRooms = (socket: Socket, sessionId: string, role: string | undefined) => {
  if (!role) return;

  socket.join(`${sessionId}:${role}`);

  if (role === 'organizer' || role === 'display') {
    socket.join(`${sessionId}:staff`);
  }
};

export const registerGameHandlers = (_io: Server, socket: Socket, gameService: GameService) => {
  const auth = parseSocketAuth(socket);
  socket.data.sessionId = auth.sessionId;
  socket.data.role = auth.role;
  socket.data.playerName = auth.playerName;
  socket.data.adminAuthorized = isOrganizerAuthorized(auth.role, auth.adminCode);
  socket.data.organizerToken = auth.organizerToken;

  if (
    auth.sessionId &&
    (auth.role !== 'organizer' || socket.data.adminAuthorized)
  ) {
    socket.join(auth.sessionId);
    joinRoleRooms(socket, auth.sessionId, auth.role);
  }

  socket.on('session:join', (payload: JoinSessionPayload, callback?: (response: JoinSessionResponse) => void) => {
    try {
      const role = payload.role ?? socket.data.role;
      if (!role) {
        callback?.({ success: false });
        emitError(socket, { code: 'INVALID_ROLE', message: 'Не удалось определить роль подключения.' });
        return;
      }

      socket.data.role = role;
      socket.data.sessionId = payload.sessionId;

      if (
        role === 'organizer' &&
        !socket.data.adminAuthorized
      ) {
        callback?.({ success: false });
        emitError(socket, { code: 'INVALID_ADMIN_ACCESS_CODE', message: 'Неверный код администратора.' });
        return;
      }

      socket.join(payload.sessionId);
      joinRoleRooms(socket, payload.sessionId, role);

      const response = gameService.joinSession(
        payload.sessionId,
        role,
        socket.data.playerName,
        role === 'player' ? socket.id : undefined,
      );

      if (response.player) {
        socket.data.playerId = response.player.id;
        socket.emit('player:update', response.player);
      }

      callback?.(response);

      if (!response.success) {
        emitError(socket, { code: 'JOIN_FAILED', message: 'Не удалось присоединиться к сессии.' });
      }
    } catch (error) {
      callback?.({ success: false });
      emitError(socket, {
        code: 'JOIN_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось присоединиться к сессии.',
      });
    }
  });

  socket.on('organizer:verify-access', (callback?: (response: { success: boolean; message?: string }) => void) => {
    if (socket.data.adminAuthorized) {
      callback?.({ success: true });
      return;
    }

    callback?.({ success: false, message: 'Неверный код администратора.' });
    emitError(socket, { code: 'INVALID_ADMIN_ACCESS_CODE', message: 'Неверный код администратора.' });
  });

  socket.on('organizer:create-session', (payload: CreateSessionPayload, callback?: (response: CreateSessionResponse) => void) => {
    try {
      if (!socket.data.adminAuthorized) {
        throw new Error('Organizer privileges required');
      }

      const session = gameService.createSession(payload.eventName);
      const organizerToken = gameService.getOrganizerToken(session.sessionId);
      socket.data.sessionId = session.sessionId;
      socket.data.role = 'organizer';
      socket.data.organizerToken = organizerToken;
      socket.join(session.sessionId);
      callback?.({ sessionId: session.sessionId, organizerToken });
      socket.emit('session:update', session);
    } catch (error) {
      callback?.({});
      emitError(socket, {
        code: 'CREATE_SESSION_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось создать сессию.',
      });
    }
  });

  socket.on('organizer:start-game', (payload: SessionPhasePayload) => {
    try {
      requireOrganizerForSession(socket);
      gameService.startGame(payload.sessionId);
    } catch (error) {
      emitError(socket, {
        code: 'START_GAME_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось запустить игру.',
      });
    }
  });

  socket.on('organizer:next-phase', (payload: SessionPhasePayload) => {
    try {
      requireOrganizerForSession(socket);
      gameService.nextPhase(payload.sessionId);
    } catch (error) {
      emitError(socket, {
        code: 'NEXT_PHASE_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось переключить фазу.',
      });
    }
  });

  socket.on('organizer:reveal-answer', (payload: RevealAnswerPayload) => {
    try {
      requireOrganizerForSession(socket);
      gameService.revealAnswer(payload.sessionId, payload.answerIndex);
    } catch (error) {
      emitError(socket, {
        code: 'REVEAL_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось раскрыть ответ.',
      });
    }
  });

  socket.on('organizer:pause-timer', (payload: PauseTimerPayload) => {
    try {
      requireOrganizerForSession(socket);
      gameService.setTimerPaused(payload.sessionId, payload.paused);
    } catch (error) {
      emitError(socket, {
        code: 'PAUSE_TIMER_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось изменить состояние таймера.',
      });
    }
  });

  socket.on('organizer:set-timer', (payload: SetTimerPayload) => {
    try {
      requireOrganizerForSession(socket);
      gameService.setCurrentTimer(payload.sessionId, payload.durationSec, payload.delaySec);
    } catch (error) {
      emitError(socket, {
        code: 'SET_TIMER_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось изменить таймер.',
      });
    }
  });

  socket.on('session:phase:set', (payload: ForcePhasePayload) => {
    try {
      requireOrganizerForSession(socket);
      gameService.forcePhase(payload.sessionId, payload.phase);
    } catch (error) {
      emitError(socket, {
        code: 'FORCE_PHASE_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось установить фазу.',
      });
    }
  });

  socket.on('session:settings:update', (payload: UpdateSettingsPayload) => {
    try {
      requireOrganizerForSession(socket);
      gameService.updateSettings(payload.sessionId, payload.settings);
    } catch (error) {
      emitError(socket, {
        code: 'UPDATE_SETTINGS_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось обновить настройки.',
      });
    }
  });

  socket.on('session:round:set', (payload: SetRoundPayload) => {
    try {
      requireOrganizerForSession(socket);
      gameService.setRound(payload.sessionId, payload.roundIndex);
    } catch (error) {
      emitError(socket, {
        code: 'SET_ROUND_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось переключить раунд.',
      });
    }
  });

  socket.on('answer:delete', (payload: DeleteAnswerPayload) => {
    try {
      requireOrganizerForSession(socket);
      gameService.deleteAnswer(payload.sessionId, payload.answerId);
    } catch (error) {
      emitError(socket, {
        code: 'DELETE_ANSWER_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось удалить ответ.',
      });
    }
  });

  socket.on('organizer:reset-game', (payload: ResetGamePayload) => {
    try {
      requireOrganizerForSession(socket);
      gameService.resetGame(payload.sessionId, payload.keepPlayers ?? true);
    } catch (error) {
      emitError(socket, {
        code: 'RESET_GAME_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось сбросить игру.',
      });
    }
  });

  socket.on('game:submit-answer', (payload: SubmitAnswerPayload, callback?: (result: { success: boolean; message?: string }) => void) => {
    try {
      if (!socket.data.sessionId || !socket.data.playerId) {
        throw new Error('Player is not attached to a session');
      }

      const result = gameService.submitAnswer(socket.data.sessionId, socket.data.playerId, payload.answer);
      socket.emit('player:update', result.player);
      callback?.({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось отправить ответ.';
      const clientMessage =
        error instanceof Error && error.message === 'Answer contains inappropriate language'
          ? 'Ответ не отправлен из-за недопустимой брани.'
          : message;

      emitError(socket, {
        code: 'SUBMIT_ANSWER_FAILED',
        message: clientMessage,
      });
      callback?.({ success: false, message: clientMessage });
    }
  });

  socket.on('game:submit-guess', (payload: SubmitGuessPayload, callback?: (result: unknown) => void) => {
    try {
      if (!socket.data.sessionId || !socket.data.playerId) {
        throw new Error('Player is not attached to a session');
      }

      const result = gameService.submitGuess(socket.data.sessionId, socket.data.playerId, payload.guess);
      socket.emit('player:update', result.player);
      callback?.(result.result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось отправить догадку.';
      const clientMessage =
        error instanceof Error && error.message === 'Guess contains inappropriate language'
          ? 'Ответ не отправлен из-за недопустимой брани.'
          : message;

      emitError(socket, {
        code: 'SUBMIT_GUESS_FAILED',
        message: clientMessage,
      });
      callback?.({ matched: false, error: clientMessage });
    }
  });

  socket.on('disconnect', () => {
    gameService.disconnectPlayer(socket.data.sessionId, socket.data.playerId, socket.id);
  });
};
