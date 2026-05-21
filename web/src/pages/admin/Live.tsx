import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'

export default function AdminLive() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ stream_url: '', title_en: '', title_ur: '' })
  const [error, setError] = useState('')

  const { data: current } = useQuery({
    queryKey: ['live'],
    queryFn: () => api.get<any | null>('/live/current'),
    refetchInterval: 15_000,
  })

  const start = useMutation({
    mutationFn: (body: typeof form) => api.post('/admin/live/start', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['live'] }); setForm({ stream_url: '', title_en: '', title_ur: '' }); setError('') },
    onError: (e: any) => setError(e.message),
  })

  const end = useMutation({
    mutationFn: (id: string) => api.post(`/admin/live/end/${id}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live'] }),
  })

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '1.5rem' }}>Go Live</h1>

      {/* Active session */}
      {current && (
        <div style={{ background: 'var(--bg-card)', border: '2px solid var(--gold)', borderRadius: 10, padding: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e05050', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            <p style={{ fontWeight: 600, color: 'var(--fg)', fontSize: '0.9rem' }}>LIVE NOW</p>
          </div>
          <p style={{ fontWeight: 500, color: 'var(--fg)', marginBottom: 4 }}>{current.title_en}</p>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.82rem', marginBottom: '1rem', wordBreak: 'break-all' }}>{current.stream_url}</p>
          <button
            onClick={() => end.mutate(current.id)}
            disabled={end.isPending}
            style={{ background: '#e05050', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 18px', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}
          >
            {end.isPending ? 'Ending...' : 'End Live Session'}
          </button>
        </div>
      )}

      {/* Start form */}
      {!current && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--fg-muted)', marginBottom: '1rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Start Live Session</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            <input
              placeholder="Stream URL (YouTube, HLS, RTMP...)"
              value={form.stream_url}
              onChange={e => setForm(f => ({ ...f, stream_url: e.target.value }))}
              style={inputStyle}
            />
            <input
              placeholder="Title (English)"
              value={form.title_en}
              onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))}
              style={inputStyle}
            />
            <input
              placeholder="عنوان (اردو)"
              dir="rtl"
              value={form.title_ur}
              onChange={e => setForm(f => ({ ...f, title_ur: e.target.value }))}
              style={inputStyle}
            />
          </div>
          {error && <p style={{ color: '#e05050', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}
          <button
            onClick={() => start.mutate(form)}
            disabled={!form.stream_url || !form.title_en || start.isPending}
            style={btnStyle}
          >
            {start.isPending ? 'Starting...' : 'Go Live'}
          </button>
        </div>
      )}
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
