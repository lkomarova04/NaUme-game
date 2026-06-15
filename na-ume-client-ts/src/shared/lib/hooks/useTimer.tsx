import { useMemo } from 'react';

import { useNow } from './useNow';

const getTimeLeft = (endTime: number | undefined, paused: boolean, startTime: number, now: number) => {
  if (!endTime) {
    return null;
  }

  if (paused) {
    return Math.max(0, Math.ceil(endTime / 1000));
  }

  const targetTime = startTime > now ? startTime : endTime;

  return Math.max(0, Math.ceil((targetTime - now) / 1000));
};

export const useTimer = (endTime?: number, paused = false, startTime = 0) => {
  const now = useNow(Boolean(endTime) && !paused);

  return useMemo(() => {
    return getTimeLeft(endTime, paused, startTime, now);
  }, [endTime, now, paused, startTime]);
};
