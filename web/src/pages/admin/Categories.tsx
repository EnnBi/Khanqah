import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'

const blank = { name_en: '', name_ur: '' }

export default function Categories() {
  const qc = useQueryClient()
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState<{ id: string; name_en: string; name_ur: string } | null>(null)
  const [error, setError] = useState('')

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<any[]>('/categories'),
  })

  const create = useMutation({
    mutationFn: (body: typeof blank) => api.post('/admin/categories', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setForm(blank); setError('') },
    onError: (e: any) => setError(e.message),
  })

  const rename = useMutation({
    mutationFn: ({ id, name_en, name_ur }: { id: string; name_en: string; name_ur: string }) =>
      api.put(`/admin/categories/${id}`, { name_en, name_ur }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setEditing(null) },
  })

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '1.5rem' }}>Categories</h1>

      {/* Create form */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg-muted)', marginBottom: '1rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>New Category</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <input placeholder="Name (English)" value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} style={inputStyle} />
          <input placeholder="نام (اردو)" dir="rtl" value={form.name_ur} onChange={e => setForm(f => ({ ...f, name_ur: e.target.value }))} style={inputStyle} />
        </div>
        {error && <p style={{ color: '#e05050', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}
        <button onClick={() => create.mutate(form)} disabled={!form.name_en || !form.name_ur || create.isPending} style={btnStyle}>
          {create.isPending ? 'Creating...' : 'Create Category'}
        </button>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {categories?.length === 0 && (
          <p style={{ color: 'var(--fg-subtle)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>No categories yet</p>
        )}
        {categories?.map((c: any) => (
          <div key={c.id}>
            {editing?.id === c.id ? (
              <div style={{ ...rowStyle, flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input value={editing!.name_en} onChange={e => setEditing(ed => ed && ({ ...ed, name_en: e.target.value }))} style={inputStyle} />
                  <input dir="rtl" value={editing!.name_ur} onChange={e => setEditing(ed => ed && ({ ...ed, name_ur: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditing(null)} style={{ ...btnStyle, background: 'var(--border)', color: 'var(--fg)' }}>Cancel</button>
                  <button onClick={() => editing && rename.mutate(editing)} disabled={rename.isPending} style={btnStyle}>
                    {rename.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={rowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div>
                    <p style={{ fontWeight: 500, color: 'var(--fg)', fontSize: '0.9rem' }}>{c.name_en}</p>
                    <p style={{ color: 'var(--fg-muted)', fontSize: '0.82rem' }}>{c.name_ur}</p>
                  </div>
                  {c.slug && (
                    <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: 999, background: 'var(--gold-light)', color: 'var(--gold)', fontWeight: 500 }}>
                      system
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setEditing({ id: c.id, name_en: c.name_en, name_ur: c.name_ur })}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--fg-muted)', fontSize: '0.8rem', padding: '4px 10px' }}
                  >
                    Rename
                  </button>
                  {!c.slug && (
                    <button onClick={() => del.mutate(c.id)} style={deleteBtnStyle}>Delete</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid var(--border)', borderRadius: 7,
  padding: '8px 12px', fontSize: '0.88rem',
  background: 'var(--bg)', color: 'var(--fg)', outline: 'none',
}

const btnStyle: React.CSSProperties = {
  background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)',
  border: 'none', borderRadius: 7, padding: '8px 18px',
  fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
}

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '10px 14px',
}

const deleteBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#e05050', fontSize: '0.82rem', padding: '4px 8px',
}
