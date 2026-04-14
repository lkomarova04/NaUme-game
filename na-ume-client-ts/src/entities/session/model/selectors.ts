import type { SessionState } from './types';

export const getCurrentRound = (state: SessionState) => {
  return state.rounds[state.roundIndex];
};

export const getTopAnswers = (state: SessionState) => {
  return getCurrentRound(state)?.topAnswers ?? [];
};

export const getPlayersSorted = (state: SessionState) => {
  return [...state.players].sort((a, b) => b.score - a.score);
};

export const getCurrentQuestion = (state: SessionState) => {
  return getCurrentRound(state)?.question;
};