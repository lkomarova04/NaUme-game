import { useEffect, useState } from 'react';

const getTimeLeft = (endTime?: number, paused = false, startTime = 0) => {
  if (!endTime) {
    return null;
  }

  if (paused) {
    return Math.max(0, Math.ceil(endTime / 1000));
  }

  const now = Date.now();
  const targetTime = startTime > now ? startTime : endTime;

  return Math.max(0, Math.ceil((targetTime - now) / 1000));
};

export const useTimer = (endTime?: number, paused = false, startTime = 0) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(() => getTimeLeft(endTime, paused, startTime));

  useEffect(() => {
    if (!endTime) {
      setTimeLeft(null);
      return;
    }

    const update = () => {
      setTimeLeft(getTimeLeft(endTime, paused, startTime));
    };

    update();
    if (paused) {
      return;
    }

    const interval = setInterval(update, 250);

    return () => clearInterval(interval);
  }, [endTime, paused, startTime]);

  return endTime ? timeLeft : null;
};
