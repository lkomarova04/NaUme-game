import { useEffect, useMemo, useRef } from 'react';

import type { SessionState } from '@/entities/session';
import { getCurrentRound } from '@/entities/session';

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

const prepareAudio = (src: string, volume: number, loop = false) => {
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.loop = loop;
  audio.volume = volume;
  audio.load();
  return audio;
};

export const DisplayAudio = ({ session }: DisplayAudioProps) => {
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerStartAudioRef = useRef<HTMLAudioElement | null>(null);
  const warningAudioRef = useRef<HTMLAudioElement | null>(null);
  const revealAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerStartPlayedKeyRef = useRef('');
  const timerStartReadyRef = useRef(false);
  const warningPlayedKeyRef = useRef('');
  const warningScheduleKeyRef = useRef('');
  const revealedAnswerIdsRef = useRef<Set<string>>(new Set());
  const hasMountedRef = useRef(false);

  const currentRound = getCurrentRound(session);

  const timerKey = `${session.phase}:${session.roundIndex}:${session.phaseStartsAt}:${session.phaseEndsAt}`;
  const timerStartKey = `${session.phase}:${session.roundIndex}`;
  const warningKey = `${timerKey}:warning`;
  const revealedAnswerIds = useMemo(() => {
    return currentRound.topAnswers.filter((answer) => answer.revealed).map((answer) => answer.id);
  }, [currentRound.topAnswers]);

  useEffect(() => {
    const backgroundAudio = prepareAudio(BACKGROUND_MUSIC_SRC, 0.35, true);
    const timerStartAudio = prepareAudio(TIMER_START_SRC, 0.9);
    const warningAudio = prepareAudio(TIMER_WARNING_SRC, 0.85);
    const revealAudio = prepareAudio(ANSWER_REVEAL_SRC, 0.9);

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
    if (session.phase !== 'answering' && session.phase !== 'guessing') return;
    if (session.phasePaused || session.phaseEndsAt <= 0) return;
    if (warningScheduleKeyRef.current === warningKey) return;

    warningScheduleKeyRef.current = warningKey;

    const warningAt = session.phaseEndsAt - 5000;
    const delayMs = Math.max(0, warningAt - Date.now());
    const timeoutId = window.setTimeout(() => {
      if (warningPlayedKeyRef.current === warningKey) return;

      warningPlayedKeyRef.current = warningKey;
      if (warningAudioRef.current) {
        warningAudioRef.current.currentTime = 0;
      }
      void playAudio(warningAudioRef.current);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [session.phase, session.phaseEndsAt, session.phasePaused, warningKey]);

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
