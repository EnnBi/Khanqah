import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useCategories } from '../../hooks/useCategories'
import { useUploadStore } from '../../stores/upload'

const blankForm = { title_en: '', title_ur: '', type: 'bayan', category_id: '', is_video: false }

export default function Content() {
  const qc = useQueryClient()
  const [showUpload, setShowUpload] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>(null)
  const { data: categories } = useCategories()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState(blankForm)

  const { status, progress, filename, error, start, reset } = useUploadStore()

  const { data: items } = useQuery({
    queryKey: ['admin-content'],
    queryFn: () => api.get<any[]>('/content'),
    refetchInterval: status === 'done' ? 2000 : false,
  })

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/content/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-content'] }); setExpandedId(null) },
  })

  const update = useMutation({
    mutationFn: ({ id, ...body }: any) => api.put(`/admin/content/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-content'] }); setExpandedId(null) },
  })

  function openEdit(item: any) {
    if (expandedId === item.id) { setExpandedId(null); return }
    setExpandedId(item.id)
    setEditForm({
      id: item.id,
      title_en: item.title_en,
      title_ur: item.title_ur,
      category_id: item.category_id,
      type: item.type,
      media_url: item.media_url,
      is_video: item.is_video,
    })
  }

  async function handleUpload() {
    if (!file) return
    setShowUpload(false); setFile(null); setForm(blankForm)
    await start(file, form)
    qc.invalidateQueries({ queryKey: ['admin-content'] })
  }

  const isUploading = status === 'uploading' || status === 'saving'
  const uploadDisabled = !file || !form.title_en || !form.category_id || isUploading

  const categoryName = (id: string) => categories?.find((c: any) => c.id === id)?.name_en ?? '—'

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--fg)' }}>Content</h1>
        {!isUploading && (
          <button onClick={() => { setShowUpload(v => !v); reset() }}
            style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>
            {showUpload ? 'Cancel' : '+ Upload'}
          </button>
        )}
      </div>

      {/* Upload status bar */}
      {status !== 'idle' && (
        <div style={{ background: 'var(--bg-card)', border: `1px solid ${status === 'error' ? '#e05050' : status === 'done' ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 8, padding: '12px 14px', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isUploading ? 8 : 0 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--fg)', fontWeight: 500 }}>
              {status === 'uploading' && `Uploading ${filename}… ${progress}%`}
              {status === 'saving' && `Saving ${filename}…`}
              {status === 'done' && `✓ ${filename} uploaded`}
              {status === 'error' && `✗ Upload failed — ${error}`}
            </p>
            {(status === 'done' || status === 'error') && (
              <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', fontSize: '0.8rem' }}>✕</button>
            )}
          </div>
          {isUploading && (
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${status === 'saving' ? 100 : progress}%`, background: 'var(--btn-primary-bg)', transition: 'width 0.3s' }} />
            </div>
          )}
        </div>
      )}

      {/* Upload form */}
      {showUpload && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${file ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 8, padding: '1.5rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1rem', background: file ? 'var(--gold-light)' : 'transparent' }}>
            {file ? <p style={{ color: 'var(--fg)', fontWeight: 500, fontSize: '0.9rem' }}>{file.name}</p> : <p style={{ color: 'var(--fg-muted)', fontSize: '0.88rem' }}>Click to choose file</p>}
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input placeholder="Title (English)" value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} style={inputStyle} />
            <input placeholder="عنوان (اردو)" dir="rtl" value={form.title_ur} onChange={e => setForm(f => ({ ...f, title_ur: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} style={inputStyle}>
              <option value="">Select category</option>
              {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
            </select>
          </div>
          <button onClick={handleUpload} disabled={uploadDisabled} style={{ ...btnStyle, width: '100%', opacity: uploadDisabled ? 0.5 : 1 }}>
            Upload in background
          </button>
        </div>
      )}

      {/* Content list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items?.length === 0 && (
          <p style={{ color: 'var(--fg-subtle)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>No content yet</p>
        )}
        {items?.map((item: any) => (
          <div key={item.id} style={{ background: 'var(--bg-card)', border: `1px solid ${expandedId === item.id ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.15s' }}>
            {/* Row */}
            <div
              onClick={() => openEdit(item)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer' }}
            >
              <div>
                <p style={{ fontWeight: 500, color: 'var(--fg)', fontSize: '0.9rem' }}>{item.title_en}</p>
                <p style={{ color: 'var(--fg-muted)', fontSize: '0.78rem', marginTop: 2 }}>
                  {categoryName(item.category_id)}
                  <span style={{ margin: '0 6px', color: 'var(--border)' }}>·</span>
                  <span style={{ color: 'var(--gold)' }}>{item.type}</span>
                  <span style={{ margin: '0 6px', color: 'var(--border)' }}>·</span>
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
              <span style={{ color: 'var(--fg-subtle)', fontSize: '0.8rem' }}>{expandedId === item.id ? '▲' : '▼'}</span>
            </div>

            {/* Expanded edit form */}
            {expandedId === item.id && editForm && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <input value={editForm.title_en} onChange={e => setEditForm((f: any) => ({ ...f, title_en: e.target.value }))} placeholder="Title (English)" style={inputStyle} />
                  <input dir="rtl" value={editForm.title_ur} onChange={e => setEditForm((f: any) => ({ ...f, title_ur: e.target.value }))} placeholder="عنوان (اردو)" style={inputStyle} />
                </div>
                <select value={editForm.category_id} onChange={e => setEditForm((f: any) => ({ ...f, category_id: e.target.value }))} style={inputStyle}>
                  <option value="">Select category</option>
                  {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
                </select>
                {item.media_url && (
                  <a href={item.media_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: 'var(--gold)', wordBreak: 'break-all' }}>
                    View file ↗
                  </a>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => del.mutate(item.id)} style={{ background: 'none', border: '1px solid #e05050', borderRadius: 6, color: '#e05050', fontSize: '0.82rem', padding: '6px 14px', cursor: 'pointer' }}>
                    Delete
                  </button>
                  <button onClick={() => setExpandedId(null)} style={{ background: 'var(--border)', border: 'none', borderRadius: 6, color: 'var(--fg)', fontSize: '0.82rem', padding: '6px 14px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={() => update.mutate(editForm)} disabled={update.isPending} style={{ ...btnStyle, padding: '6px 18px' }}>
                    {update.isPending ? 'Saving…' : 'Save'}
                  </button>
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
