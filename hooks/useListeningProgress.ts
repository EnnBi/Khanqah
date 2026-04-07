import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Content } from '../lib/types';
import { useAuth } from '../hooks/useAuth';

// ── saveProgress ────────────────────────────────────────────────────────────

export async function saveProgress(
  userId: string,
  contentId: string,
  positionSeconds: number,
  completed?: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('listening_progress')
    .upsert(
      {
        user_id: userId,
        content_id: contentId,
        position_seconds: Math.floor(positionSeconds),
        completed: completed ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,content_id' },
    );

  if (error) {
    console.error('[saveProgress] error:', error);
  }
}

// ── useProgress ─────────────────────────────────────────────────────────────

export function useProgress(
  contentId: string,
): { position: number; completed: boolean } | null {
  const { user } = useAuth();
  const [progress, setProgress] = useState<{ position: number; completed: boolean } | null>(null);

  useEffect(() => {
    if (!user?.id || !contentId) {
      setProgress(null);
      return;
    }

    let cancelled = false;

    async function fetch() {
      const { data } = await supabase
        .from('listening_progress')
        .select('position_seconds, completed')
        .eq('user_id', user!.id)
        .eq('content_id', contentId)
        .maybeSingle();

      if (!cancelled) {
        if (data) {
          setProgress({ position: data.position_seconds, completed: data.completed });
        } else {
          setProgress(null);
        }
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [user?.id, contentId]);

  return progress;
}

// ── useContinueListening ─────────────────────────────────────────────────────

export function useContinueListening(): {
  content: Content;
  position: number;
  duration: number;
} | null {
  const { user } = useAuth();
  const [result, setResult] = useState<{
    content: Content;
    position: number;
    duration: number;
  } | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setResult(null);
      return;
    }

    let cancelled = false;

    async function fetch() {
      const { data } = await supabase
        .from('listening_progress')
        .select('*, content(*)')
        .eq('user_id', user!.id)
        .eq('completed', false)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        if (data && data.content) {
          setResult({
            content: data.content as Content,
            position: data.position_seconds,
            duration: (data.content as Content).duration ?? 0,
          });
        } else {
          setResult(null);
        }
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [user?.id]);

  return result;
}

// ── useHistory ───────────────────────────────────────────────────────────────

export function useHistory(limit = 20): {
  items: { content: Content; position: number; completed: boolean; updatedAt: string }[];
  loading: boolean;
} {
  const { user } = useAuth();
  const [items, setItems] = useState<
    { content: Content; position: number; completed: boolean; updatedAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      setLoading(true);
      const { data } = await supabase
        .from('listening_progress')
        .select('*, content(*)')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (!cancelled) {
        const mapped = (data ?? [])
          .filter((row: any) => row.content != null)
          .map((row: any) => ({
            content: row.content as Content,
            position: row.position_seconds as number,
            completed: row.completed as boolean,
            updatedAt: row.updated_at as string,
          }));
        setItems(mapped);
        setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [user?.id, limit]);

  return { items, loading };
}
