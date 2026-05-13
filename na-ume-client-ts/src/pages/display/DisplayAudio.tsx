import { useEffect, useMemo, useRef, useState } from 'react';

import type { SessionState } from '@/entities/session';
import { getCurrentRound } from '@/entities/session';
import { useTimer } from '@/shared/lib';

import './DisplayAudio.css';

const BACKGROUND_MUSIC_SRC = '/audio/background.mp3';
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
  const warningAudioRef = useRef<HTMLAudioElement | null>(null);
  const revealAudioRef = useRef<HTMLAudioElement | null>(null);
  const warningPlayedKeyRef = useRef('');
  const revealedAnswerIdsRef = useRef<Set<string>>(new Set());
  const hasMountedRef = useRef(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);

  const currentRound = getCurrentRound(session);
  const timeLeft = useTimer(session.phaseEndsAt || undefined, session.phasePaused, session.phaseStartsAt);

  const timerKey = `${session.phase}:${session.roundIndex}:${session.phaseStartsAt}:${session.phaseEndsAt}`;
  const revealedAnswerIds = useMemo(() => {
    return currentRound.topAnswers.filter((answer) => answer.revealed).map((answer) => answer.id);
  }, [currentRound.topAnswers]);

  useEffect(() => {
    const backgroundAudio = new Audio(BACKGROUND_MUSIC_SRC);
    backgroundAudio.loop = true;
    backgroundAudio.volume = 0.35;

    const warningAudio = new Audio(TIMER_WARNING_SRC);
    warningAudio.volume = 0.85;

    const revealAudio = new Audio(ANSWER_REVEAL_SRC);
    revealAudio.volume = 0.9;

    backgroundAudioRef.current = backgroundAudio;
    warningAudioRef.current = warningAudio;
    revealAudioRef.current = revealAudio;

    void playAudio(backgroundAudio).then((played) => {
      setNeedsUnlock(!played);
    });

    return () => {
      backgroundAudio.pause();
      warningAudio.pause();
      revealAudio.pause();
      backgroundAudioRef.current = null;
      warningAudioRef.current = null;
      revealAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (timeLeft === null || session.phasePaused) return;
    if (session.phase !== 'answering' && session.phase !== 'guessing') return;
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

  const unlockAudio = async () => {
    const played = await playAudio(backgroundAudioRef.current);
    setNeedsUnlock(!played);
  };

  return needsUnlock ? (
    <button className="display-audio-unlock" onClick={unlockAudio}>
      Включить звук
    </button>
  ) : null;
};
