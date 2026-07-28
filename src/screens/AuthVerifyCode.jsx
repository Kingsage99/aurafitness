import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { StatusBar } from '../components/PhoneFrame'
import { NB, NB_BORDER, hardShadow, nbCardStyle } from '../styles/neoBrutalism'
import { mapAuthError } from '../utils/authErrors'

// Matches Supabase's current documented default cooldown for both the
// signup-confirmation and password-reset endpoints. This is a UX nicety on
// top of the server's own enforcement, not a substitute for it — if the
// dashboard rate limit (Authentication → Rate Limits) ever changes, update
// this to match, but a stale value here can't be exploited (the server still
// rejects over-frequent requests regardless of what the button shows).
const RESEND_COOLDOWN_SECONDS = 60

// Confirmed against this project's actual dashboard setting (Authentication →
// Sign In / Providers → Email → "Email OTP length") — NOT Supabase's 6-digit
// default. If that setting is ever changed, update this to match.
export const OTP_LENGTH = 8

// Shared code entry, used for both signup confirmation and password
// reset — the only thing that differs between the two is which Supabase call
// verifies/resends the code, so `type` picks that instead of duplicating the
// whole screen. `verifyOtp` succeeding for type:'signup' fires SIGNED_IN
// (App.jsx's existing onAuthStateChange handles the rest automatically);
// for type:'recovery' it fires PASSWORD_RECOVERY, which the caller must react
// to explicitly via onVerified — see Auth.jsx's usage.
export default function AuthVerifyCode({ email, type, onVerified, onBack, infoOverride = null }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS)

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft(s => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [])

  const errorContext = type === 'recovery' ? 'recovery' : 'verify'

  const handleVerify = async () => {
    if (!code.trim()) { setError('Enter the 6-digit code.'); return }
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase.auth.verifyOtp({ email, token: code.trim(), type })
    setLoading(false)
    if (err) { setError(mapAuthError(err, { context: errorContext })); return }
    onVerified?.(data)
  }

  const handleResend = async () => {
    if (secondsLeft > 0 || loading) return
    setLoading(true)
    setError('')
    // resend() only supports type 'signup' | 'email_change' — password reset
    // has no equivalent, so resending a recovery code means re-requesting one.
    const { error: err } = type === 'recovery'
      ? await supabase.auth.resetPasswordForEmail(email)
      : await supabase.auth.resend({ type: 'signup', email })
    setLoading(false)
    if (err) { setError(mapAuthError(err, { context: type === 'recovery' ? 'recovery' : 'signup' })); return }
    setSecondsLeft(RESEND_COOLDOWN_SECONDS)
  }

  const inputStyle = {
    width: '100%', height: 52, border: NB_BORDER, borderRadius: 14,
    padding: '0 16px', fontSize: 20, letterSpacing: 4, textAlign: 'center',
    color: NB.ink, fontFamily: NB.fontDisplay, outline: 'none', background: NB.white, boxSizing: 'border-box',
  }

  return (
    <>
      <StatusBar />
      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '24px 26px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, marginTop: 8 }}>
          <button onClick={onBack}
            style={{ background: NB.white, border: NB_BORDER, borderRadius: 12, boxShadow: hardShadow(3), width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink }}>
            Enter code
          </div>
        </div>

        <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6, marginBottom: 20 }}>
          {infoOverride || <>We sent a code ({OTP_LENGTH} digits) to <strong>{email}</strong>.</>}
        </div>

        <input
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
          onKeyDown={e => e.key === 'Enter' && handleVerify()}
          type="text" inputMode="numeric" pattern="[0-9]*" maxLength={OTP_LENGTH} autoComplete="one-time-code"
          placeholder={'0'.repeat(OTP_LENGTH)} style={inputStyle}
        />

        {error && (
          <div style={{ marginTop: 14, padding: '10px 14px', ...nbCardStyle(NB.red, 3), border: `3px solid ${NB.white}`, borderRadius: 12 }}>
            <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.white, fontWeight: 700 }}>{error}</span>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button onClick={handleResend} disabled={secondsLeft > 0 || loading}
            style={{ fontSize: 14, fontWeight: 700, color: secondsLeft > 0 ? '#999' : NB.ink, textDecoration: secondsLeft > 0 ? 'none' : 'underline', background: 'none', border: 'none', cursor: secondsLeft > 0 ? 'default' : 'pointer' }}>
            {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code'}
          </button>
        </div>
      </div>

      <div style={{ flexShrink: 0, padding: '10px 26px 26px' }}>
        <button onClick={handleVerify} disabled={loading}
          style={{ width: '100%', height: 54, border: NB_BORDER, borderRadius: 16, boxShadow: loading ? 'none' : hardShadow(5), background: loading ? '#ccc' : NB.teal, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer' }}>
          {loading ? 'Please wait…' : 'Verify'}
        </button>
      </div>
    </>
  )
}
