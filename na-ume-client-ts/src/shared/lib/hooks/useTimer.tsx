import { useEffect, useState } from 'react';

export const useTimer = (endTime?: number) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!endTime) {
      setTimeLeft(null);
      return;
    }

    const update = () => {
      const seconds = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(seconds);
    };

    update();
    const interval = setInterval(update, 200);

    return () => clearInterval(interval);
  }, [endTime]);

  return timeLeft;
};