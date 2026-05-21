import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/auth'

const ROLES = ['listener', 'editor', 'admin', 'broadcaster']

const btnIcon: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.35rem',
  padding: '5px 10px', borderRadius: 7, border: '1px solid var(--gold)',
  background: 'transparent', color: 'var(--gold)', cursor: 'pointer',
  fontSize: '0.78rem', fontWeight: 500, fontFamily: 'inherit',
  transition: 'background 0.12s, color 0.12s',
}

export default function Team() {
  const qc = useQueryClient()
  const myId = useAuthStore(s => {
    try { return JSON.parse(atob(s.accessToken!.split('.')[1])).sub } catch { return null }
  })
  const { data: users } = useQuery({ queryKey: ['team'], queryFn: () => api.get<any[]>('/admin/team') })

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.put(`/admin/team/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })
  const updateName = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.put(`/admin/team/${id}/name`, { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); setEditId(null) },
  })
  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/team/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); setDeleteId(null) },
  })

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '1.5rem' }}>Team</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {users?.length === 0 && (
          <p style={{ color: 'var(--fg-subtle)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>No users yet</p>
        )}
        {users?.map((u: any) => (
          <div key={u.id} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            {/* Left: name + phone */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {editId === u.id ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && editName.trim()) updateName.mutate({ id: u.id, name: editName.trim() })
                      if (e.key === 'Escape') setEditId(null)
                    }}
                    style={{
                      flex: 1, padding: '4px 8px', fontSize: '0.88rem',
                      border: '1px solid var(--accent)', borderRadius: 6,
                      background: 'var(--bg)', color: 'var(--fg)',
                      fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => editName.trim() && updateName.mutate({ id: u.id, name: editName.trim() })}
                    disabled={!editName.trim() || updateName.isPending}
                    style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                  >Save</button>
                  <button
                    onClick={() => setEditId(null)}
                    style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >Cancel</button>
                </div>
              ) : (
                <p style={{ fontWeight: 500, color: 'var(--fg)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.display_name || <span style={{ color: 'var(--fg-subtle)', fontStyle: 'italic' }}>No name</span>}
                </p>
              )}
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.8rem', marginTop: 2 }}>{u.phone}</p>
            </div>

            {/* Center: role dropdown */}
            <select
              value={u.role}
              onChange={e => updateRole.mutate({ id: u.id, role: e.target.value })}
              style={{
                border: '1px solid var(--border)', borderRadius: 6,
                padding: '5px 10px', fontSize: '0.82rem',
                background: 'var(--bg)', color: 'var(--fg)', cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            {/* Right: edit + delete icon buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem', flexShrink: 0 }}>
              {editId !== u.id && (
                <button
                  onClick={() => { setEditId(u.id); setEditName(u.display_name || ''); setDeleteId(null) }}
                  title="Edit name"
                  style={btnIcon}
                >
                  <Pencil size={13} strokeWidth={2} /> Edit
                </button>
              )}
              {u.id !== myId && editId !== u.id && (
                deleteId === u.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>Delete?</span>
                    <button
                      onClick={() => deleteUser.mutate(u.id)}
                      disabled={deleteUser.isPending}
                      style={{ fontSize: '0.72rem', fontWeight: 600, color: '#fff', background: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                    >Yes</button>
                    <button
                      onClick={() => setDeleteId(null)}
                      style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setDeleteId(u.id); setEditId(null) }}
                    title="Delete user"
                    style={{ ...btnIcon, borderColor: '#dc2626', color: '#dc2626' }}
                  >
                    <Trash2 size={13} strokeWidth={2} /> Delete
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
