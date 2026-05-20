import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { useContentItem } from '../../hooks/useContent'

export default function Player() {
  const { id } = useParams<{ id: string }>()
  const { data: item, isLoading } = useContentItem(id!)
  const navigate = useNavigate()

  return (
    <Layout>
      {isLoading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : !item ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <p className="serif" style={{ fontSize: '1.4rem', color: 'var(--fg-muted)', fontStyle: 'italic', marginBottom: '1rem' }}>
            Content not found
          </p>
          <button onClick={() => navigate(-1)} style={{ fontSize: '0.82rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Go back
          </button>
        </div>
      ) : (
        <div className="animate-fade-up">
          {/* Back */}
          <button onClick={() => navigate(-1)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.8rem', color: 'var(--fg-muted)',
            background: 'none', border: 'none', cursor: 'pointer',
            marginBottom: '1.5rem', padding: 0,
          }}>
            ← Back
          </button>

          {/* Title */}
          <h1 className="serif" style={{ fontSize: '1.9rem', fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 6 }}>
            {item.title_en}
          </h1>
          {item.title_ur && (
            <p style={{ fontSize: '1.1rem', color: 'var(--fg-muted)', fontFamily: 'serif', marginBottom: '1.5rem', textAlign: 'right', lineHeight: 1.6 }} dir="rtl">
              {item.title_ur}
            </p>
          )}

          {/* Media */}
          <div style={{
            borderRadius: 12, overflow: 'hidden',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            marginBottom: '1.5rem',
            background: item.is_video ? '#000' : 'var(--bg-card)',
          }}>
            {item.is_video ? (
              <video src={item.media_url} controls style={{ width: '100%', display: 'block', maxHeight: 480 }} />
            ) : (
              <div style={{ padding: '2rem' }}>
                <audio src={item.media_url} controls style={{ width: '100%' }} />
              </div>
            )}
          </div>

          {/* Description */}
          {item.description_en && (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '1.25rem 1.5rem',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--fg-muted)', lineHeight: 1.75 }}>
                {item.description_en}
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </Layout>
  )
}
