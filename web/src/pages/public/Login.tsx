import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import PhoneInput from '../../components/PhoneInput'

export default function Login() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setTokens = useAuthStore(s => s.setTokens)

  async function sendOTP() {
    if (!name.trim()) { setError('Please enter your name'); return }
    setLoading(true); setError('')
    try {
      await api.post('/auth/otp/send', { phone })
      setStep('otp')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function verifyOTP() {
    setLoading(true); setError('')
    try {
      const data: any = await api.post('/auth/otp/verify', { phone, otp, name: name.trim() })
      setTokens(data.access_token, data.refresh_token, data.role, data.user_id)
      navigate('/')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
    }}>
      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="serif" style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.02em', lineHeight: 1 }}>
          Khanqah
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--fg-muted)', fontFamily: 'serif', marginTop: 6 }}>خانقاہ</p>
      </div>

      {/* Card */}
      <div className="animate-fade-up" style={{
        width: '100%', maxWidth: 380,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '2rem',
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Decorative top accent */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--accent), var(--gold))', borderRadius: '3px 3px 0 0', margin: '-2rem -2rem 1.75rem', borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />

        {step === 'phone' ? (
          <>
            <h2 className="serif" style={{ fontSize: '1.4rem', fontWeight: 500, color: 'var(--fg)', marginBottom: 4 }}>
              Sign in or create account
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--fg-muted)', marginBottom: '1.5rem' }}>
              New or returning — enter your number to continue
            </p>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Your Name
            </label>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && phone && !loading && sendOTP()}
              style={{
                width: '100%', padding: '10px 14px',
                border: '1px solid var(--border)', borderRadius: 8,
                background: 'var(--bg)', color: 'var(--fg)',
                fontSize: '0.95rem', outline: 'none',
                fontFamily: 'inherit', marginBottom: '1rem',
                transition: 'border-color 0.15s', boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Phone Number
            </label>
            <PhoneInput value={phone} onChange={setPhone} onSubmit={() => !loading && sendOTP()} />
            <button
              onClick={sendOTP}
              disabled={loading || !phone || !name.trim()}
              style={{
                width: '100%', padding: '11px',
                background: loading || !phone ? 'var(--border)' : 'var(--accent)',
                color: loading || !phone ? 'var(--fg-subtle)' : '#fff',
                border: 'none', borderRadius: 8,
                fontSize: '0.88rem', fontWeight: 600,
                letterSpacing: '0.03em', cursor: loading || !phone ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <h2 className="serif" style={{ fontSize: '1.4rem', fontWeight: 500, color: 'var(--fg)', marginBottom: 4 }}>
              Enter code
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--fg-muted)', marginBottom: '1.5rem' }}>
              6-digit code sent to <strong style={{ color: 'var(--fg)' }}>{phone}</strong>
            </p>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && otp.length === 6 && !loading && verifyOTP()}
              style={{
                width: '100%', padding: '12px 14px',
                border: '1px solid var(--border)', borderRadius: 8,
                background: 'var(--bg)', color: 'var(--fg)',
                fontSize: '1.6rem', letterSpacing: '0.5em',
                textAlign: 'center', outline: 'none',
                fontFamily: 'monospace',
                marginBottom: '1.25rem',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <button
              onClick={verifyOTP}
              disabled={loading || otp.length !== 6}
              style={{
                width: '100%', padding: '11px',
                background: loading || otp.length !== 6 ? 'var(--border)' : 'var(--accent)',
                color: loading || otp.length !== 6 ? 'var(--fg-subtle)' : '#fff',
                border: 'none', borderRadius: 8,
                fontSize: '0.88rem', fontWeight: 600,
                letterSpacing: '0.03em', cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
                marginBottom: '0.75rem',
              }}
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button onClick={() => { setStep('phone'); setOtp(''); setError('') }} style={{
              width: '100%', padding: '8px',
              background: 'none', border: 'none',
              fontSize: '0.8rem', color: 'var(--fg-muted)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              ← Use a different number
            </button>
          </>
        )}

        {error && (
          <p style={{ fontSize: '0.8rem', color: 'var(--red)', marginTop: '0.75rem', padding: '8px 12px', background: '#FEF2F2', borderRadius: 6 }}>
            {error}
          </p>
        )}
      </div>

      <a href="/" style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--fg-subtle)', textDecoration: 'none' }}>
        ← Back to home
      </a>
    </div>
  )
}
