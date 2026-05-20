import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useContent(params?: { type?: string; category_id?: string }) {
  const qs = params ? new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null)) as Record<string, string>
  ).toString() : ''
  return useQuery({
    queryKey: ['content', params],
    queryFn: () => api.get<any[]>(`/content${qs ? '?' + qs : ''}`),
  })
}

export function useContentItem(id: string) {
  return useQuery({
    queryKey: ['content', id],
    queryFn: () => api.get<any>(`/content/${id}`),
    enabled: !!id,
  })
}
