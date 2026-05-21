import { useState, useRef, useEffect } from 'react'

const COUNTRIES = [
  { code: 'IN', flag: '🇮🇳', name: 'India', dial: '91' },
  { code: 'PK', flag: '🇵🇰', name: 'Pakistan', dial: '92' },
  { code: 'BD', flag: '🇧🇩', name: 'Bangladesh', dial: '880' },
  { code: 'AE', flag: '🇦🇪', name: 'UAE', dial: '971' },
  { code: 'SA', flag: '🇸🇦', name: 'Saudi Arabia', dial: '966' },
  { code: 'QA', flag: '🇶🇦', name: 'Qatar', dial: '974' },
  { code: 'KW', flag: '🇰🇼', name: 'Kuwait', dial: '965' },
  { code: 'BH', flag: '🇧🇭', name: 'Bahrain', dial: '973' },
  { code: 'OM', flag: '🇴🇲', name: 'Oman', dial: '968' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', dial: '44' },
  { code: 'US', flag: '🇺🇸', name: 'United States', dial: '1' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada', dial: '1' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia', dial: '61' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa', dial: '27' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany', dial: '49' },
  { code: 'FR', flag: '🇫🇷', name: 'France', dial: '33' },
  { code: 'MY', flag: '🇲🇾', name: 'Malaysia', dial: '60' },
  { code: 'SG', flag: '🇸🇬', name: 'Singapore', dial: '65' },
  { code: 'NZ', flag: '🇳🇿', name: 'New Zealand', dial: '64' },
]

interface Props {
  value: string
  onChange: (e164: string) => void
  onSubmit?: () => void
}

export default function PhoneInput({ value, onChange, onSubmit }: Props) {
  const [country, setCountry] = useState(COUNTRIES[0])
  const [number, setNumber] = useState('')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const e164 = number.trim() ? `+${country.dial}${number.replace(/\D/g, '')}` : ''
    onChange(e164)
  }, [country, number])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.dial.includes(search)
  )

  return (
    <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', overflow: 'visible', position: 'relative', marginBottom: '1.25rem' }}
      onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Country selector */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => { setOpen(v => !v); setSearch('') }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 10px 10px 12px',
            background: 'none', border: 'none', borderRight: '1px solid var(--border)',
            cursor: 'pointer', fontSize: '0.92rem', color: 'var(--fg)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>{country.flag}</span>
          <span style={{ fontSize: '0.88rem', color: 'var(--fg-muted)' }}>+{country.dial}</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--fg-subtle)', marginLeft: 2 }}>▾</span>
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 100,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            width: 240, maxHeight: 280, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            marginTop: 4,
          }}>
            <div style={{ padding: '8px' }}>
              <input
                autoFocus
                placeholder="Search country..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '7px 10px', border: '1px solid var(--border)',
                  borderRadius: 6, background: 'var(--bg)', color: 'var(--fg)',
                  fontSize: '0.82rem', outline: 'none',
                }}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { setCountry(c); setOpen(false); setSearch('') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '8px 12px',
                    background: c.code === country.code ? 'var(--nav-active-bg)' : 'none',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontSize: '0.85rem', color: 'var(--fg)',
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{c.flag}</span>
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span style={{ color: 'var(--fg-muted)', fontSize: '0.8rem' }}>+{c.dial}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p style={{ padding: '12px', color: 'var(--fg-subtle)', fontSize: '0.82rem', textAlign: 'center' }}>No results</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Number input */}
      <input
        type="tel"
        inputMode="numeric"
        placeholder="98765 43210"
        value={number}
        onChange={e => setNumber(e.target.value.replace(/[^\d\s]/g, ''))}
        onKeyDown={e => e.key === 'Enter' && value && onSubmit?.()}
        style={{
          flex: 1, padding: '10px 12px',
          border: 'none', background: 'transparent', color: 'var(--fg)',
          fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit',
        }}
      />
    </div>
  )
}
