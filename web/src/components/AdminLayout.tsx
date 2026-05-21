import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { useUploadStore } from '../stores/upload'

const NAV = [
  { href: '/admin/content', label: 'Content' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/schedule', label: 'Schedule' },
  { href: '/admin/live', label: 'Live' },
  { href: '/admin/team', label: 'Team' },
  { href: '/admin/bugs', label: 'Bug Reports' },
]

export default function AdminLayout() {
  const { pathname } = useLocation()
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const { status, progress, filename } = useUploadStore()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        height: 52, display: 'flex', alignItems: 'center',
        padding: '0 1.5rem', gap: '1rem',
      }}>
        <span className="serif" style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--fg)' }}>
          Admin Panel
        </span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <Link to="/" style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', textDecoration: 'none' }}>
          ← Back to site
        </Link>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => { logout(); navigate('/') }}
          style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
        >
          Sign out
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        <nav style={{
          width: 190, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          padding: '1.25rem 0.75rem',
          display: 'flex', flexDirection: 'column', gap: '0.2rem',
          position: 'relative',
        }}>
          {NAV.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link key={href} to={href} style={{
                textDecoration: 'none',
                fontSize: '0.84rem', fontWeight: 500,
                letterSpacing: '0.01em',
                color: active ? 'var(--nav-link-active)' : 'var(--nav-link)',
                padding: '7px 12px', borderRadius: 6,
                background: active ? 'var(--nav-active-bg)' : 'transparent',
                transition: 'background 0.12s, color 0.12s',
              }}>
                {label}
              </Link>
            )
          })}
          {/* Upload status in sidebar */}
          {(status === 'uploading' || status === 'saving') && (
            <div style={{ marginTop: 'auto', padding: '0.75rem', borderTop: '1px solid var(--border)', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {status === 'saving' ? 'Saving…' : `${progress}%`} — {filename}
              </p>
              <div style={{ height: 3, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${status === 'saving' ? 100 : progress}%`, background: 'var(--gold)', transition: 'width 0.3s' }} />
              </div>
            </div>
          )}
        </nav>

        <main style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
