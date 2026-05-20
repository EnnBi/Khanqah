import Layout from '../../components/Layout'
import { useContent } from '../../hooks/useContent'
import { useLive } from '../../hooks/useLive'
import { useSchedule } from '../../hooks/useSchedule'

const TYPE_LABELS: Record<string, string> = {
  bayan: 'Bayan', clip: 'Clip', nazam: 'Nazam',
  quran: 'Quran', hamd_naat: 'Hamd / Naat',
  book: 'Book', mamulat: 'Mamulat',
}

export default function Home() {
  const { data: recent } = useContent()
  const { data: live } = useLive()
  const { data: schedule } = useSchedule()

  return (
    <Layout>
      {/* Live banner */}
      {live && (
        <a href="/live" style={{ textDecoration: 'none' }}>
          <div className="animate-fade-up" style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'var(--accent)', color: '#fff',
            borderRadius: 10, padding: '12px 20px',
            marginBottom: '2rem',
            boxShadow: 'var(--shadow-md)',
          }}>
            <span className="live-dot" style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#4ADE80', flexShrink: 0,
            }} />
            <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Live now: {live.title_en}</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', opacity: 0.75 }}>Watch →</span>
          </div>
        </a>
      )}

      {/* Upcoming session */}
      {schedule && schedule.length > 0 && (
        <div className="animate-fade-up" style={{ marginBottom: '2.5rem', animationDelay: '0.05s' }}>
          <SectionLabel>Next Session</SectionLabel>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <p className="serif" style={{ fontSize: '1.15rem', fontWeight: 500, color: 'var(--fg)' }}>
              {schedule[0].title_en}
            </p>
            {schedule[0].title_ur && (
              <p style={{ fontSize: '0.95rem', color: 'var(--fg-muted)', marginTop: 2, textAlign: 'right', fontFamily: 'serif' }} dir="rtl">
                {schedule[0].title_ur}
              </p>
            )}
            <p style={{ fontSize: '0.8rem', color: 'var(--fg-subtle)', marginTop: 8, letterSpacing: '0.02em' }}>
              {new Date(schedule[0].scheduled_at).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
        </div>
      )}

      {/* Recent content */}
      <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <SectionLabel>Recent</SectionLabel>
        {recent && recent.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recent.map((item: any, i: number) => (
              <a key={item.id} href={`/player/${item.id}`} style={{
                textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '14px 18px',
                boxShadow: 'var(--shadow-sm)',
                transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                animationDelay: `${0.1 + i * 0.04}s`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)'
                ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'
                ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'
              }}
              >
                {item.thumbnail_url ? (
                  <img src={item.thumbnail_url} style={{
                    width: 48, height: 48, borderRadius: 8,
                    objectFit: 'cover', flexShrink: 0,
                  }} alt="" />
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                    background: 'var(--accent-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent)', fontSize: '1.2rem',
                  }}>
                    {item.type === 'quran' ? '☽' : item.type === 'nazam' || item.type === 'hamd_naat' ? '♪' : '◉'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, color: 'var(--fg)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title_en}
                  </p>
                  {item.title_ur && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', textAlign: 'right', fontFamily: 'serif' }} dir="rtl">
                      {item.title_ur}
                    </p>
                  )}
                </div>
                <TypeBadge type={item.type} />
              </a>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </Layout>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.04em',
      color: 'var(--fg-subtle)', textTransform: 'uppercase',
      padding: '2px 8px', borderRadius: 4,
      border: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      {TYPE_LABELS[type] ?? type}
    </span>
  )
}

function EmptyState() {
  return (
    <div style={{
      textAlign: 'center', padding: '4rem 2rem',
      border: '1px dashed var(--border)',
      borderRadius: 12,
    }}>
      <p className="serif" style={{ fontSize: '1.6rem', color: 'var(--fg-muted)', fontStyle: 'italic', marginBottom: 8 }}>
        No content yet
      </p>
      <p style={{ fontSize: '0.8rem', color: 'var(--fg-subtle)', letterSpacing: '0.04em' }}>
        Content will appear here once published
      </p>
    </div>
  )
}
