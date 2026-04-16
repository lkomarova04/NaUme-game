import { useEffect, useState } from 'react';

const getTimeLeft = (endTime?: number) => {
  if (!endTime) {
    return null;
  }

  return Math.max(0, Math.floor((endTime - Date.now()) / 1000));
};

export const useTimer = (endTime?: number) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(() => getTimeLeft(endTime));

  useEffect(() => {
    if (!endTime) {
      return;
    }

    const update = () => {
      setTimeLeft(getTimeLeft(endTime));
    };

    update();
    const interval = setInterval(update, 200);

    return () => clearInterval(interval);
  }, [endTime]);

  return endTime ? timeLeft : null;
};
