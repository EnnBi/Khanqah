import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LiveSession } from '../lib/types';

export function useLiveSession() {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLive() {
      const { data } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('status', 'live')
        .limit(1)
        .single();

      if (!cancelled) {
        setSession(data ?? null);
        setLoading(false);
      }
    }

    fetchLive();

    const channel = supabase
      .channel('live_sessions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_sessions' },
        () => {
          fetchLive();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { session, loading };
}
