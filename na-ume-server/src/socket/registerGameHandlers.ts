import type { Server, Socket } from 'socket.io';
import type {
  CreateSessionPayload,
  DeleteAnswerPayload,
  ForcePhasePayload,
  GameErrorPayload,
  JoinSessionPayload,
  JoinSessionResponse,
  PauseTimerPayload,
  RevealAnswerPayload,
  ResetGamePayload,
  SetRoundPayload,
  SessionPhasePayload,
  SubmitAnswerPayload,
  SubmitGuessPayload,
  UpdateSettingsPayload,
} from '../domain/types';
import { parseSocketAuth } from './auth';
import type { GameService } from '../services/GameService';

const emitError = (socket: Socket, payload: GameErrorPayload) => {
  socket.emit('error', payload);
};

const requireOrganizer = (socket: Socket) => {
  if (socket.data.role !== 'organizer') {
    throw new Error('Organizer privileges required');
  }
};

export const registerGameHandlers = (_io: Server, socket: Socket, gameService: GameService) => {
  const auth = parseSocketAuth(socket);
  socket.data.sessionId = auth.sessionId;
  socket.data.role = auth.role;
  socket.data.playerName = auth.playerName;

  if (auth.sessionId) {
    socket.join(auth.sessionId);
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
      socket.join(payload.sessionId);

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

  socket.on('organizer:create-session', (payload: CreateSessionPayload, callback: (response: { sessionId: string }) => void) => {
    try {
      requireOrganizer(socket);
      const session = gameService.createSession(payload.eventName);
      socket.data.sessionId = session.sessionId;
      socket.join(session.sessionId);
      callback({ sessionId: session.sessionId });
      socket.emit('session:update', session);
    } catch (error) {
      emitError(socket, {
        code: 'CREATE_SESSION_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось создать сессию.',
      });
    }
  });

  socket.on('organizer:start-game', (payload: SessionPhasePayload) => {
    try {
      requireOrganizer(socket);
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
      requireOrganizer(socket);
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
      requireOrganizer(socket);
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
      requireOrganizer(socket);
      gameService.setTimerPaused(payload.sessionId, payload.paused);
    } catch (error) {
      emitError(socket, {
        code: 'PAUSE_TIMER_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось изменить состояние таймера.',
      });
    }
  });

  socket.on('session:phase:set', (payload: ForcePhasePayload) => {
    try {
      requireOrganizer(socket);
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
      requireOrganizer(socket);
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
      requireOrganizer(socket);
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
      requireOrganizer(socket);
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
      requireOrganizer(socket);
      gameService.resetGame(payload.sessionId, payload.keepPlayers ?? true);
    } catch (error) {
      emitError(socket, {
        code: 'RESET_GAME_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось сбросить игру.',
      });
    }
  });

  socket.on('game:submit-answer', (payload: SubmitAnswerPayload) => {
    try {
      if (!socket.data.sessionId || !socket.data.playerId) {
        throw new Error('Player is not attached to a session');
      }

      const result = gameService.submitAnswer(socket.data.sessionId, socket.data.playerId, payload.answer);
      socket.emit('player:update', result.player);
    } catch (error) {
      emitError(socket, {
        code: 'SUBMIT_ANSWER_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось отправить ответ.',
      });
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
      emitError(socket, {
        code: 'SUBMIT_GUESS_FAILED',
        message: error instanceof Error ? error.message : 'Не удалось отправить догадку.',
      });
    }
  });

  socket.on('disconnect', () => {
    gameService.disconnectPlayer(socket.data.sessionId, socket.data.playerId, socket.id);
  });
};
