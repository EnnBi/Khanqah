import { useCallback } from 'react';
import { useRouter } from 'expo-router';

// Fallback target when history is empty (e.g., direct deep link).
const DEFAULT_FALLBACK = '/(tabs)' as const;

export function useSafeBack(fallback: string = DEFAULT_FALLBACK) {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback as any);
    }
  }, [router, fallback]);
}
