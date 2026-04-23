// hooks/useBroadcastState.ts
import { useEffect, useState } from 'react';
import { broadcast, ActiveSession } from '../lib/broadcast';

export function useBroadcastState() {
  const [active, setActive] = useState<ActiveSession | null>(broadcast.getActive());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const offStart = broadcast.on('start', (s) => { setActive(s); setError(null); });
    const offStop = broadcast.on('stop', () => setActive(null));
    const offError = broadcast.on('error', (e) => setError(e.message));
    return () => { offStart(); offStop(); offError(); };
  }, []);

  return { active, error, setError };
}
