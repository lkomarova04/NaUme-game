import { useEffect, useState } from 'react';

const getTimeLeft = (endTime?: number, paused = false) => {
  if (!endTime) {
    return null;
  }

  if (paused) {
    return Math.max(0, Math.ceil(endTime / 1000));
  }

  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
};

export const useTimer = (endTime?: number, paused = false) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(() => getTimeLeft(endTime, paused));

  useEffect(() => {
    if (!endTime) {
      setTimeLeft(null);
      return;
    }

    const update = () => {
      setTimeLeft(getTimeLeft(endTime, paused));
    };

    update();
    if (paused) {
      return;
    }

    const interval = setInterval(update, 250);

    return () => clearInterval(interval);
  }, [endTime, paused]);

  return endTime ? timeLeft : null;
};
