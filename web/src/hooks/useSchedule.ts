import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useSchedule() {
  return useQuery({
    queryKey: ['schedule'],
    queryFn: () => api.get<any[]>('/schedule'),
  })
}
