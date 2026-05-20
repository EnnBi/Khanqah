import Layout from '../../components/Layout'
import { useCategories } from '../../hooks/useCategories'

export default function Library() {
  const { data: categories } = useCategories()
  const roots = categories?.filter((c: any) => !c.parent_id) ?? []

  return (
    <Layout>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
          Library
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginTop: 4 }}>
          Browse the collection by category
        </p>
      </div>

      {roots.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {roots.map((cat: any, i: number) => (
            <a key={cat.id} href={`/library/${cat.id}`} className="animate-fade-up" style={{
              textDecoration: 'none',
              display: 'block',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '1.25rem 1.25rem 1rem',
              boxShadow: 'var(--shadow-sm)',
              transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
              animationDelay: `${i * 0.04}s`,
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--accent)'
              el.style.boxShadow = 'var(--shadow)'
              el.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border)'
              el.style.boxShadow = 'var(--shadow-sm)'
              el.style.transform = 'translateY(0)'
            }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--accent-light)', marginBottom: '0.75rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)', fontSize: '1rem',
              }}>
                ◈
              </div>
              <p style={{ fontWeight: 600, color: 'var(--fg)', fontSize: '0.9rem', marginBottom: 4 }}>
                {cat.name_en}
              </p>
              {cat.name_ur && (
                <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', textAlign: 'right', fontFamily: 'serif' }} dir="rtl">
                  {cat.name_ur}
                </p>
              )}
            </a>
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          border: '1px dashed var(--border)', borderRadius: 12,
        }}>
          <p className="serif" style={{ fontSize: '1.4rem', color: 'var(--fg-muted)', fontStyle: 'italic' }}>
            No categories yet
          </p>
        </div>
      )}
    </Layout>
  )
}
