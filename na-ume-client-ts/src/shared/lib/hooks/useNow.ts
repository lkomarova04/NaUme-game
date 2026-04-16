import { useEffect, useState } from 'react';

export const useNow = (enabled: boolean, intervalMs = 250) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);

    return () => clearInterval(interval);
  }, [enabled, intervalMs]);

  return now;
};
