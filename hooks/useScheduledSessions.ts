import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ScheduledSession } from '../lib/types';
import { nextOccurrence, isUpcoming } from '../lib/schedule';

export function useNextScheduledSession() {
  const [session, setSession] = useState<ScheduledSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      const now = new Date().toISOString();

      // Fetch upcoming one-time sessions and all recurring sessions separately,
      // because recurring sessions may have a base scheduled_at in the past
      // but their next computed occurrence is still in the future.
      const [onceRes, recurringRes] = await Promise.all([
        supabase
          .from('scheduled_sessions')
          .select('*')
          .eq('is_recurring', false)
          .gte('scheduled_at', now)
          .order('scheduled_at', { ascending: true }),
        supabase
          .from('scheduled_sessions')
          .select('*')
          .eq('is_recurring', true),
      ]);

      if (cancelled) return;

      const all: ScheduledSession[] = [
        ...((onceRes.data ?? []) as ScheduledSession[]),
        ...((recurringRes.data ?? []) as ScheduledSession[]),
      ];

      const next = all
        .filter((s) => isUpcoming(s))
        .sort((a, b) => nextOccurrence(a).getTime() - nextOccurrence(b).getTime())[0] ?? null;

      setSession(next);
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { session, loading };
}
