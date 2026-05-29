import { useEffect, useMemo, useRef } from 'react';

import type { SessionState } from '@/entities/session';
import { getCurrentRound } from '@/entities/session';
import { useTimer } from '@/shared/lib';

const BACKGROUND_MUSIC_SRC = '/audio/background.mp3';
const TIMER_START_SRC = '/audio/timer-start.mp3';
const TIMER_WARNING_SRC = '/audio/timer-warning.mp3';
const ANSWER_REVEAL_SRC = '/audio/answer-reveal.mp3';

type DisplayAudioProps = {
  session: SessionState;
};

const playAudio = async (audio: HTMLAudioElement | null) => {
  if (!audio) return false;

  try {
    await audio.play();
    return true;
  } catch {
    return false;
  }
};

export const DisplayAudio = ({ session }: DisplayAudioProps) => {
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerStartAudioRef = useRef<HTMLAudioElement | null>(null);
  const warningAudioRef = useRef<HTMLAudioElement | null>(null);
  const revealAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerStartPlayedKeyRef = useRef('');
  const timerStartReadyRef = useRef(false);
  const warningPlayedKeyRef = useRef('');
  const revealedAnswerIdsRef = useRef<Set<string>>(new Set());
  const hasMountedRef = useRef(false);

  const currentRound = getCurrentRound(session);
  const timeLeft = useTimer(session.phaseEndsAt || undefined, session.phasePaused, session.phaseStartsAt);

  const timerKey = `${session.phase}:${session.roundIndex}:${session.phaseStartsAt}:${session.phaseEndsAt}`;
  const timerStartKey = `${session.phase}:${session.roundIndex}`;
  const revealedAnswerIds = useMemo(() => {
    return currentRound.topAnswers.filter((answer) => answer.revealed).map((answer) => answer.id);
  }, [currentRound.topAnswers]);

  useEffect(() => {
    const backgroundAudio = new Audio(BACKGROUND_MUSIC_SRC);
    backgroundAudio.loop = true;
    backgroundAudio.volume = 0.35;

    const timerStartAudio = new Audio(TIMER_START_SRC);
    timerStartAudio.volume = 0.9;

    const warningAudio = new Audio(TIMER_WARNING_SRC);
    warningAudio.volume = 0.85;

    const revealAudio = new Audio(ANSWER_REVEAL_SRC);
    revealAudio.volume = 0.9;

    backgroundAudioRef.current = backgroundAudio;
    timerStartAudioRef.current = timerStartAudio;
    warningAudioRef.current = warningAudio;
    revealAudioRef.current = revealAudio;

    void playAudio(backgroundAudio);

    const unlockAudio = () => {
      void playAudio(backgroundAudio);
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      backgroundAudio.pause();
      timerStartAudio.pause();
      warningAudio.pause();
      revealAudio.pause();
      backgroundAudioRef.current = null;
      timerStartAudioRef.current = null;
      warningAudioRef.current = null;
      revealAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!timerStartReadyRef.current) {
      timerStartReadyRef.current = true;
      timerStartPlayedKeyRef.current = timerStartKey;
      return;
    }

    if (session.phase !== 'answering' && session.phase !== 'guessing') return;
    if (session.phasePaused || session.phaseEndsAt <= 0) return;
    if (timerStartPlayedKeyRef.current === timerStartKey) return;

    timerStartPlayedKeyRef.current = timerStartKey;

    const delayMs = Math.max(0, session.phaseStartsAt - Date.now());
    const timeoutId = window.setTimeout(() => {
      if (timerStartAudioRef.current) {
        timerStartAudioRef.current.currentTime = 0;
      }
      void playAudio(timerStartAudioRef.current);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [session.phase, session.phaseEndsAt, session.phasePaused, session.phaseStartsAt, timerStartKey]);

  useEffect(() => {
    if (timeLeft === null || session.phasePaused) return;
    if (session.phase !== 'answering' && session.phase !== 'guessing') return;
    if (session.phaseStartsAt > Date.now()) return;
    if (timeLeft > 5) return;
    if (warningPlayedKeyRef.current === timerKey) return;

    warningPlayedKeyRef.current = timerKey;
    void playAudio(warningAudioRef.current);
  }, [session.phase, session.phasePaused, timeLeft, timerKey]);

  useEffect(() => {
    const previousIds = revealedAnswerIdsRef.current;
    const currentIds = new Set(revealedAnswerIds);

    if (hasMountedRef.current) {
      const hasNewReveal = revealedAnswerIds.some((answerId) => !previousIds.has(answerId));

      if (hasNewReveal && (session.phase === 'guessing' || session.phase === 'reveal')) {
        if (revealAudioRef.current) {
          revealAudioRef.current.currentTime = 0;
        }
        void playAudio(revealAudioRef.current);
      }
    }

    hasMountedRef.current = true;
    revealedAnswerIdsRef.current = currentIds;
  }, [revealedAnswerIds, session.phase]);

  return null;
};
