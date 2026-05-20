import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useLive() {
  return useQuery({
    queryKey: ['live'],
    queryFn: () => api.get<any | null>('/live/current'),
    refetchInterval: 30_000,
  })
}
