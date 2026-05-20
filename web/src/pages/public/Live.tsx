import Layout from '../../components/Layout'
import { useLive } from '../../hooks/useLive'

export default function Live() {
  const { data: session } = useLive()

  return (
    <Layout>
      {session ? (
        <div className="animate-fade-up">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <span className="live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--red)', textTransform: 'uppercase' }}>
              Live
            </span>
          </div>
          <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.02em', marginBottom: 6 }}>
            {session.title_en}
          </h1>
          {session.title_ur && (
            <p style={{ fontSize: '1.1rem', color: 'var(--fg-muted)', fontFamily: 'serif', marginBottom: '1.5rem', textAlign: 'right' }} dir="rtl">
              {session.title_ur}
            </p>
          )}
          <div style={{
            borderRadius: 12, overflow: 'hidden',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            background: '#000',
          }}>
            <video
              src={session.stream_url}
              controls
              autoPlay
              style={{ width: '100%', display: 'block', maxHeight: 500 }}
            />
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--border)', margin: '0 auto 1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', color: 'var(--fg-subtle)',
          }}>
            ◎
          </div>
          <p className="serif" style={{ fontSize: '1.5rem', color: 'var(--fg-muted)', fontStyle: 'italic', marginBottom: 8 }}>
            No live session right now
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--fg-subtle)' }}>
            Check the <a href="/schedule" style={{ color: 'var(--accent)', textDecoration: 'none' }}>schedule</a> for upcoming sessions
          </p>
        </div>
      )}
    </Layout>
  )
}
