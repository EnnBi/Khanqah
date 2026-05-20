import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<any[]>('/categories'),
    staleTime: 5 * 60 * 1000,
  })
}
