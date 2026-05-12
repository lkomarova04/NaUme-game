export type Role = 'player' | 'organizer' | 'display';
export type GamePhase = 'lobby' | 'answering' | 'guessing' | 'reveal' | 'leaderboard';
export type CategoryMode = 'shared' | 'perRound';

export interface Question {
  id: string;
  text: string;
  category: string;
}

export interface RawAnswer {
  id: string;
  playerId: string;
  text: string;
  normalizedText: string;
  roundIndex: number;
  createdAt: number;
  isRejected?: boolean;
}

export interface TopAnswer {
  id: string;
  text: string;
  normalizedText: string;
  count: number;
  percentage: number;
  revealed: boolean;
  matchedBy: string[];
}

export interface Player {
  id: string;
  name: string;
  score: number;
  hasAnswered: boolean;
  hasGuessed: boolean;
}

export interface Round {
  index: number;
  question: Question;
  answers: RawAnswer[];
  topAnswers: TopAnswer[];
}

export interface SessionSettings {
  categoryMode: CategoryMode;
  sharedCategory: string | 'all';
  roundsCount: number;
  roundCategories: string[];
  answeringDurationSec: number;
  guessingDurationSec: number;
  startDelaySec: number;
}

export interface SessionState {
  sessionId: string;
  eventName: string;
  phase: GamePhase;
  roundIndex: number;
  players: Player[];
  rounds: Round[];
  settings: SessionSettings;
  availableQuestions: Question[];
  categories: string[];
  phaseEndsAt: number;
  phasePaused: boolean;
  isActive: boolean;
}

export interface SessionAuthData {
  sessionId?: string;
  role?: Role;
  playerName?: string;
}

export interface JoinSessionPayload {
  sessionId: string;
  role: Role;
}

export interface CreateSessionPayload {
  eventName: string;
}

export interface SubmitAnswerPayload {
  answer: string;
}

export interface SubmitGuessPayload {
  guess: string;
}

export interface RevealAnswerPayload {
  sessionId: string;
  answerIndex: number;
}

export interface SessionPhasePayload {
  sessionId: string;
}

export interface ForcePhasePayload extends SessionPhasePayload {
  phase: GamePhase;
}

export interface DeleteAnswerPayload extends SessionPhasePayload {
  answerId: string;
}

export interface UpdateSettingsPayload extends SessionPhasePayload {
  settings: SessionSettings;
}

export interface SetRoundPayload extends SessionPhasePayload {
  roundIndex: number;
}

export interface ResetGamePayload extends SessionPhasePayload {
  keepPlayers?: boolean;
}

export interface PauseTimerPayload extends SessionPhasePayload {
  paused: boolean;
}

export interface SetTimerPayload extends SessionPhasePayload {
  durationSec: number;
}

export interface JoinSessionResponse {
  success: boolean;
  player?: Player;
  session?: SessionState;
}

export interface GuessResult {
  matched: boolean;
  answerText?: string;
  pointsAwarded?: number;
}

export interface InternalSession extends SessionState {
  playerSockets: Map<string, Set<string>>;
  timer?: NodeJS.Timeout;
}

export interface GameErrorPayload {
  code: string;
  message: string;
}
