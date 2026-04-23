import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LiveSession } from '../lib/types';

export function useLiveSession() {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLive() {
      // Auto-close sessions whose heartbeat is older than 90 s — covers
      // tab-close / crash where the admin never hit Stop.
      const cutoff = new Date(Date.now() - 90_000).toISOString();
      await supabase
        .from('live_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('status', 'live')
        .lt('last_heartbeat_at', cutoff);

      const { data } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('status', 'live')
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        setSession(data ?? null);
        setLoading(false);
      }
    }

    fetchLive();

    // Channel name must be unique per hook instance. supabase-js reuses a
    // channel with a shared name, and calling `.on()` after another caller's
    // `.subscribe()` throws "cannot add postgres_changes callbacks after
    // subscribe()". Multiple components call this hook (home screen + live
    // card) so give each mount its own channel.
    const channelName = `live_sessions_changes_${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelName)
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
