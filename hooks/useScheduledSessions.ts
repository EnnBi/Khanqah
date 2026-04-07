import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ScheduledSession } from '../lib/types';

export function useNextScheduledSession() {
  const [session, setSession] = useState<ScheduledSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('scheduled_sessions')
        .select('*')
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        setSession(data ?? null);
        setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { session, loading };
}
