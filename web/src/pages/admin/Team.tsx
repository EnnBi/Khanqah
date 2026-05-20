import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'

const ROLES = ['listener', 'editor', 'admin', 'broadcaster']

export default function Team() {
  const qc = useQueryClient()
  const { data: users } = useQuery({ queryKey: ['team'], queryFn: () => api.get<any[]>('/admin/team') })
  const update = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.put(`/admin/team/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-semibold text-stone-800 mb-6">Team</h1>
      <div className="space-y-2">
        {users?.map((u: any) => (
          <div key={u.id} className="flex items-center justify-between bg-white border border-stone-100 rounded-xl px-4 py-3">
            <div>
              <p className="font-medium text-stone-800">{u.display_name || u.phone}</p>
              <p className="text-stone-400 text-sm">{u.phone}</p>
            </div>
            <select className="border border-stone-200 rounded-lg px-2 py-1 text-sm"
              value={u.role}
              onChange={e => update.mutate({ id: u.id, role: e.target.value })}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
