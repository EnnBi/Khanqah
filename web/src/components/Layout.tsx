import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/library', label: 'Library' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/live', label: 'Live' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { accessToken, role, logout } = useAuthStore()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: 960, margin: '0 auto',
          padding: '0 1.5rem',
          height: 58,
          display: 'flex', alignItems: 'center', gap: '2.5rem',
        }}>
          {/* Brand */}
          <a href="/" style={{ textDecoration: 'none', flexShrink: 0, lineHeight: 1 }}>
            <span className="serif" style={{ fontSize: '1.45rem', fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.01em' }}>
              Khanqah
            </span>
            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--fg-muted)', letterSpacing: '0.06em', marginTop: 1, fontFamily: 'serif' }}>
              خانقاہ
            </span>
          </a>

          {/* Links */}
          <nav style={{ display: 'flex', gap: '0.25rem', flex: 1 }}>
            {NAV.map(({ href, label }) => {
              const active = pathname === href
              return (
                <a key={href} href={href} style={{
                  textDecoration: 'none',
                  fontSize: '0.83rem',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  color: active ? 'var(--nav-link-active)' : 'var(--nav-link)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: active ? 'var(--nav-active-bg)' : 'transparent',
                  transition: 'all 0.15s',
                }}>
                  {label}
                </a>
              )
            })}
          </nav>

          {/* Auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            {accessToken ? (
              <>
                {(role === 'admin' || role === 'editor' || role === 'broadcaster') && (
                  <a href="/admin/content" style={{
                    fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.03em',
                    color: 'var(--gold)', textDecoration: 'none',
                    padding: '4px 10px', borderRadius: 6,
                    border: '1px solid var(--gold-light)',
                    background: 'var(--gold-light)',
                  }}>
                    Admin
                  </a>
                )}
                <button onClick={() => { logout(); navigate('/') }} style={{
                  fontSize: '0.78rem', color: 'var(--fg-muted)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 8px',
                }}>
                  Sign out
                </button>
              </>
            ) : (
              <a href="/login" style={{
                fontSize: '0.8rem', fontWeight: 500,
                color: 'var(--btn-primary-fg)',
                background: 'var(--btn-primary-bg)',
                textDecoration: 'none',
                padding: '5px 14px',
                borderRadius: 6,
                letterSpacing: '0.02em',
              }}>
                Sign in / Register
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Decorative line */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, var(--btn-primary-bg) 30%, var(--gold) 70%, transparent)' }} />

      {/* Content */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        marginTop: '4rem',
        padding: '2rem 1.5rem',
        textAlign: 'center',
      }}>
        <p className="serif" style={{ fontSize: '1.1rem', color: 'var(--fg-muted)', fontStyle: 'italic' }}>
          خانقاہ
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--fg-subtle)', marginTop: 6, letterSpacing: '0.04em' }}>
          A DIGITAL ARCHIVE OF SACRED KNOWLEDGE
        </p>
      </footer>
    </div>
  )
}
