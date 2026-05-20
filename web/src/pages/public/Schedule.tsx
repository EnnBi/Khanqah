import Layout from '../../components/Layout'
import { useSchedule } from '../../hooks/useSchedule'

export default function Schedule() {
  const { data: sessions } = useSchedule()

  return (
    <Layout>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
          Schedule
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginTop: 4 }}>
          Upcoming sessions and programmes
        </p>
      </div>

      {sessions && sessions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sessions.map((s: any, i: number) => {
            const date = new Date(s.scheduled_at)
            return (
              <div key={s.id} className="animate-fade-up" style={{
                display: 'flex', gap: '1.25rem', alignItems: 'flex-start',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '16px 20px',
                boxShadow: 'var(--shadow-sm)',
                animationDelay: `${i * 0.04}s`,
              }}>
                {/* Date block */}
                <div style={{
                  flexShrink: 0, textAlign: 'center',
                  background: 'var(--accent-light)', borderRadius: 8,
                  padding: '8px 12px', minWidth: 52,
                }}>
                  <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
                    {date.getDate()}
                  </p>
                  <p style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', color: 'var(--accent)', textTransform: 'uppercase', marginTop: 2 }}>
                    {date.toLocaleString('en-US', { month: 'short' })}
                  </p>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="serif" style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--fg)' }}>
                    {s.title_en}
                  </p>
                  {s.title_ur && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', textAlign: 'right', fontFamily: 'serif', marginTop: 2 }} dir="rtl">
                      {s.title_ur}
                    </p>
                  )}
                  <p style={{ fontSize: '0.78rem', color: 'var(--fg-subtle)', marginTop: 6, letterSpacing: '0.02em' }}>
                    {date.toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' })}
                  </p>
                  {s.is_recurring && (
                    <span style={{
                      display: 'inline-block', marginTop: 6,
                      fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em',
                      color: 'var(--gold)', textTransform: 'uppercase',
                      background: 'var(--gold-light)', padding: '2px 8px', borderRadius: 4,
                    }}>
                      Weekly
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          border: '1px dashed var(--border)', borderRadius: 12,
        }}>
          <p className="serif" style={{ fontSize: '1.4rem', color: 'var(--fg-muted)', fontStyle: 'italic' }}>
            No upcoming sessions
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--fg-subtle)', marginTop: 6 }}>
            Check back soon
          </p>
        </div>
      )}
    </Layout>
  )
}
