import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Content, ContentType } from '../lib/types';

export function useLatestContent(type?: ContentType, limit = 5) {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error: err } = await query;
      if (!cancelled) {
        if (err) setError(err.message);
        else setContent(data ?? []);
        setLoading(false);
      }
    }

    fetch();
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

    setLoading(true);
    const timer = setTimeout(async () => {
      setError(null);
      const { data, error: err } = await supabase
        .from('content')
        .select('*')
        .or(`title_en.ilike.%${query}%,title_ur.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (err) setError(err.message);
      else setContent(data ?? []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return { content, loading, error };
}
