import { useQuery } from '@tanstack/react-query'

export interface LiveSession {
  id: string
  title_en: string
  title_ur: string
  stream_url: string
  status: 'live' | 'ended' | 'processing'
  started_at: string
  ended_at: string | null
  speaker_en: string
  speaker_ur: string
}

// A link to a broadcast that does not exist (404) or is not a broadcast id at all (400) is an
// answer, not a failure: it resolves to null. Only real failures throw, so the page can offer a retry.
async function fetchSession(path: string): Promise<LiveSession | null> {
  const res = await fetch('/api' + path)
  if (res.status === 404 || res.status === 400) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** One broadcast by id, for shared links. Keeps checking so the page notices when it ends. */
export function useLiveSession(id: string | undefined) {
  return useQuery({
    queryKey: ['live', id],
    queryFn: () => fetchSession(`/live/${id}`),
    enabled: !!id,
    retry: 1,
    refetchInterval: (query) => (query.state.data?.status === 'live' ? 10_000 : false),
  })
}

/** The broadcast on air right now, or null. */
export function useCurrentLive(enabled = true) {
  return useQuery({
    queryKey: ['live', 'current'],
    queryFn: () => fetchSession('/live/current'),
    enabled,
    retry: 1,
    refetchInterval: 15_000,
  })
}
