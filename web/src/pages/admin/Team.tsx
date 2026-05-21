import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/auth'

const ROLES = ['listener', 'editor', 'admin', 'broadcaster']

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
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '1.5rem' }}>Team</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {users?.length === 0 && (
          <p style={{ color: 'var(--fg-subtle)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>No users yet</p>
        )}
        {users?.map((u: any) => (
          <div key={u.id} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>

              {/* Name / inline edit */}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <p style={{ fontWeight: 500, color: 'var(--fg)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.display_name || <span style={{ color: 'var(--fg-subtle)', fontStyle: 'italic' }}>No name</span>}
                    </p>
                    <button
                      onClick={() => { setEditId(u.id); setEditName(u.display_name || '') }}
                      title="Edit name"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}
                    >✎</button>
                  </div>
                )}
                <p style={{ color: 'var(--fg-muted)', fontSize: '0.8rem', marginTop: 2 }}>{u.phone}</p>
              </div>

              {/* Role + delete */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <select
                  value={u.role}
                  onChange={e => updateRole.mutate({ id: u.id, role: e.target.value })}
                  style={{
                    border: '1px solid var(--border)', borderRadius: 6,
                    padding: '5px 10px', fontSize: '0.82rem',
                    background: 'var(--bg)', color: 'var(--fg)', cursor: 'pointer',
                  }}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                {u.id !== myId && (
                  deleteId === u.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>Delete?</span>
                      <button
                        onClick={() => deleteUser.mutate(u.id)}
                        disabled={deleteUser.isPending}
                        style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', background: 'var(--red, #dc2626)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}
                      >Yes</button>
                      <button
                        onClick={() => setDeleteId(null)}
                        style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteId(u.id)}
                      title="Delete user"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '1rem', padding: '4px', lineHeight: 1 }}
                    >🗑</button>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
