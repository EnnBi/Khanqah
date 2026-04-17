import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Category } from '../lib/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchCats() {
      console.log('[useCategories] fetching');
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .is('parent_id', null)
          .order('sort_order', { ascending: true });
        console.log('[useCategories] response', { rows: data?.length, err: error?.message });
        if (!cancelled) {
          setCategories(data ?? []);
          setLoading(false);
        }
      } catch (e: any) {
        console.error('[useCategories] threw', e?.message ?? e);
        if (!cancelled) setLoading(false);
      }
    }

    fetchCats();
    return () => { cancelled = true; };
  }, []);

  return { categories, loading };
}
