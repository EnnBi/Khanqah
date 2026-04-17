import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Category } from '../lib/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchCats() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('categories')
          .select('*')
          .is('parent_id', null)
          .order('sort_order', { ascending: true });
        if (!cancelled) {
          setCategories(data ?? []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCats();
    return () => { cancelled = true; };
  }, []);

  return { categories, loading };
}
