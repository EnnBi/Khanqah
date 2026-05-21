import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'

export default function Bugs() {
  const { data: reports } = useQuery({ queryKey: ['bugs'], queryFn: () => api.get<any[]>('/admin/bugs') })

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '1.5rem' }}>Bug Reports</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {reports?.length === 0 && (
          <p style={{ color: 'var(--fg-subtle)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>No bug reports</p>
        )}
        {reports?.map((r: any) => (
          <div key={r.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{
                fontSize: '0.75rem', padding: '2px 8px', borderRadius: 999, fontWeight: 500,
                background: r.status === 'open' ? 'rgba(224,80,80,0.12)' : 'var(--nav-active-bg)',
                color: r.status === 'open' ? '#e05050' : 'var(--fg-muted)',
              }}>{r.status}</span>
              <span style={{ color: 'var(--fg-subtle)', fontSize: '0.78rem' }}>{r.platform} · v{r.app_version}</span>
            </div>
            <p style={{ color: 'var(--fg)', fontSize: '0.88rem' }}>{r.note || r.type}</p>
            <p style={{ color: 'var(--fg-subtle)', fontSize: '0.78rem', marginTop: 4 }}>{new Date(r.timestamp).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
