import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Content, ContentType } from '../lib/types';

export function useLatestContent(type?: ContentType, limit = 5) {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchContent() {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('content')
          .select('*')
          // Public surfaces only show content that's fully published —
          // admins bypass the RLS equivalent of this filter, so we apply
          // it explicitly here to keep the home list clean for everyone.
          .in('mirror_status', ['ready', 'not_applicable'])
          .order('created_at', { ascending: false })
          .limit(limit);

        if (type) query = query.eq('type', type);

        const { data, error: err } = await query;
        if (!cancelled) {
          if (err) setError(err.message);
          else setContent(data ?? []);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? String(e));
          setLoading(false);
        }
      }
    }

    fetchContent();
    return () => { cancelled = true; };
  }, [type, limit]);

  return { content, loading, error };
}

export function useContentByCategory(categoryId: string) {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) {
      setContent([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('content')
        .select('*')
        .eq('category_id', categoryId)
        .in('mirror_status', ['ready', 'not_applicable'])
        .order('created_at', { ascending: false });

      if (!cancelled) {
        if (err) setError(err.message);
        else setContent(data ?? []);
        setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [categoryId]);

  return { content, loading, error };
}

/**
 * Fetches recent recorded broadcasts, i.e. content rows under the
 * "Live Sessions" category (seeded by migration 006 and written by
 * record-and-upload.sh when a broadcast ends).
 */
export function useRecentLiveSessions(limit = 5) {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSessions() {
      setLoading(true);
      setError(null);
      try {
        // Look up the category id once per render — the "Live Sessions"
        // category is seeded by migration 006 and stable, but we avoid
        // hard-coding the UUID in client code.
        const { data: cats } = await supabase
          .from('categories')
          .select('id')
          .eq('name_en', 'Live Sessions')
          .eq('type', 'bayan')
          .limit(1);
        const categoryId = cats?.[0]?.id;
        if (!categoryId) {
          if (!cancelled) {
            setContent([]);
            setLoading(false);
          }
          return;
        }

        const { data, error: err } = await supabase
          .from('content')
          .select('*')
          .eq('category_id', categoryId)
          .in('mirror_status', ['ready', 'not_applicable'])
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!cancelled) {
          if (err) setError(err.message);
          else setContent(data ?? []);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? String(e));
          setLoading(false);
        }
      }
    }

    fetchSessions();
    return () => { cancelled = true; };
  }, [limit]);

  return { content, loading, error };
}

export function useSearchContent(query: string) {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setContent([]);
      setLoading(false);
      return;
    }

    // Debounce: flipping loading true happens inside the timer, not before,
    // so the spinner doesn't flash on every keystroke while the user is
    // still typing. 500ms gives most people time to finish a word.
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      // Sanitize query to prevent PostgREST filter injection
      const sanitized = query.replace(/[,%()\\]/g, '');
      const { data, error: err } = await supabase
        .from('content')
        .select('*')
        .or(
          `title_en.ilike.%${sanitized}%,title_ur.ilike.%${sanitized}%,credit_en.ilike.%${sanitized}%,credit_ur.ilike.%${sanitized}%`,
        )
        .in('mirror_status', ['ready', 'not_applicable'])
        .order('created_at', { ascending: false });

      if (err) setError(err.message);
      else setContent(data ?? []);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  return { content, loading, error };
}
