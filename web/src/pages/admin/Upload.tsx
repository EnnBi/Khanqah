import { useState, useRef } from 'react'
import { api } from '../../api/client'
import { useCategories } from '../../hooks/useCategories'


export default function Upload() {
  const { data: categories } = useCategories()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({ title_en: '', title_ur: '', type: '', category_id: '', is_video: false })
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'saving' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleUpload() {
    if (!file) return
    setStatus('uploading'); setError('')
    try {
      const { upload_url, cdn_url }: any = await api.post('/admin/upload', {
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
      })

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = e => setProgress(Math.round(e.loaded / e.total * 100))
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error('Upload failed'))
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.open('PUT', upload_url)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
      })

      setStatus('saving')
      await api.post('/admin/content', {
        ...form,
        media_url: cdn_url,
        file_size: file.size,
      })
      setStatus('done')
    } catch (e: any) {
      setError(e.message)
      setStatus('error')
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '1.5rem' }}>Upload Content</h1>

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${file ? 'var(--gold)' : 'var(--border)'}`,
          borderRadius: 10, padding: '2rem', textAlign: 'center',
          cursor: 'pointer', marginBottom: '1.25rem',
          background: file ? 'var(--gold-light)' : 'transparent',
          transition: 'all 0.15s',
        }}
      >
        {file
          ? <p style={{ color: 'var(--fg)', fontWeight: 500, fontSize: '0.9rem' }}>{file.name}</p>
          : <p style={{ color: 'var(--fg-muted)', fontSize: '0.88rem' }}>Click to choose file</p>}
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
      </div>

      {/* Form fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <input placeholder="Title (English)" value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} style={inputStyle} />
        <input placeholder="عنوان (اردو)" dir="rtl" value={form.title_ur} onChange={e => setForm(f => ({ ...f, title_ur: e.target.value }))} style={inputStyle} />
        <select
          value={form.category_id}
          onChange={e => {
            const cat = categories?.find((c: any) => c.id === e.target.value)
            setForm(f => ({ ...f, category_id: e.target.value, type: cat?.type ?? f.type }))
          }}
          style={inputStyle}
        >
          <option value="">Select category</option>
          {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
        </select>
      </div>

      {/* Progress */}
      {status === 'uploading' && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--btn-primary-bg)', transition: 'width 0.2s' }} />
          </div>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.8rem', marginTop: 6 }}>{progress}% uploaded</p>
        </div>
      )}

      {status === 'done' && <p style={{ color: 'var(--accent)', fontWeight: 500, marginBottom: '1rem' }}>Uploaded successfully!</p>}
      {error && <p style={{ color: '#e05050', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>}

      <button
        onClick={handleUpload}
        disabled={!file || !form.title_en || !form.category_id || status === 'uploading' || status === 'saving'}
        style={{ ...btnStyle, opacity: (!file || !form.title_en || !form.category_id || status === 'uploading' || status === 'saving') ? 0.5 : 1 }}
      >
        {status === 'uploading' ? 'Uploading...' : status === 'saving' ? 'Saving...' : 'Upload'}
      </button>
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
  width: '100%', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)',
  border: 'none', borderRadius: 7, padding: '10px',
  fontSize: '0.88rem', fontWeight: 500, cursor: 'pointer',
}
