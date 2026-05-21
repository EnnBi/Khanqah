import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'

const ROLES = ['listener', 'editor', 'admin', 'broadcaster']

export default function Team() {
  const qc = useQueryClient()
  const { data: users } = useQuery({ queryKey: ['team'], queryFn: () => api.get<any[]>('/admin/team') })
  const update = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.put(`/admin/team/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '1.5rem' }}>Team</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {users?.length === 0 && (
          <p style={{ color: 'var(--fg-subtle)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>No users yet</p>
        )}
        {users?.map((u: any) => (
          <div key={u.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px',
          }}>
            <div>
              <p style={{ fontWeight: 500, color: 'var(--fg)', fontSize: '0.9rem' }}>{u.display_name || u.phone}</p>
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.8rem' }}>{u.phone}</p>
            </div>
            <select
              value={u.role}
              onChange={e => update.mutate({ id: u.id, role: e.target.value })}
              style={{
                border: '1px solid var(--border)', borderRadius: 6,
                padding: '5px 10px', fontSize: '0.82rem',
                background: 'var(--bg)', color: 'var(--fg)', cursor: 'pointer',
              }}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
