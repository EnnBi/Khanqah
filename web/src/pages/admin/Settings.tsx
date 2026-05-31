import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'

interface NotificationSetting { key: string; enabled: boolean }

const LABELS: Record<string, { title: string; description: string }> = {
  broadcast_live:  { title: 'Broadcast notifications',    description: 'Notify all users when a live session starts' },
  content_upload:  { title: 'Content upload notifications', description: 'Notify all users when new content is published' },
}

export default function Settings() {
  const queryClient = useQueryClient()
  const { data: settings, isLoading } = useQuery<NotificationSetting[]>({
    queryKey: ['notification-settings'],
    queryFn: () => api.get('/admin/notification-settings'),
  })

  const { mutate: toggle } = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      api.put(`/admin/notification-settings/${key}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-settings'] }),
  })

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--fg)', marginBottom: '0.4rem' }}>Settings</h1>
      <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
        Manage push notification settings for the Khanqah app.
      </p>

      <section>
        <h2 style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: '0.75rem' }}>
          Push Notifications
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {isLoading && (
            <p style={{ color: 'var(--fg-subtle)', fontStyle: 'italic' }}>Loading…</p>
          )}
          {settings?.map(s => {
            const label = LABELS[s.key] ?? { title: s.key, description: '' }
            return (
              <div key={s.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '14px 16px',
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--fg)' }}>{label.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: 2 }}>{label.description}</div>
                </div>
                <button
                  onClick={() => toggle({ key: s.key, enabled: !s.enabled })}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: s.enabled ? 'var(--gold, #C8A24A)' : 'var(--border)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}
                  aria-checked={s.enabled}
                  role="switch"
                >
                  <span style={{
                    position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                    left: s.enabled ? 23 : 3,
                  }} />
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
