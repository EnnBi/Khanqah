import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/auth'

export default function Login() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setTokens = useAuthStore(s => s.setTokens)

  async function sendOTP() {
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
      const data: any = await api.post('/auth/otp/verify', { phone, otp })
      setTokens(data.access_token, data.refresh_token, data.role)
      navigate('/')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-800 mb-6">Khanqah</h1>
        {step === 'phone' ? (
          <>
            <input
              className="w-full border border-stone-200 rounded-lg px-4 py-2 mb-4 text-stone-800"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            <button
              className="w-full bg-emerald-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
              onClick={sendOTP}
              disabled={loading || !phone}
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <p className="text-stone-500 text-sm mb-4">Enter the 6-digit code sent to {phone}</p>
            <input
              className="w-full border border-stone-200 rounded-lg px-4 py-2 mb-4 text-stone-800 text-center text-2xl tracking-widest"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value)}
            />
            <button
              className="w-full bg-emerald-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
              onClick={verifyOTP}
              disabled={loading || otp.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </>
        )}
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>
    </div>
  )
}
