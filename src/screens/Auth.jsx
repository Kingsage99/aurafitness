import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { StatusBar } from '../components/PhoneFrame'
import LegalDoc from './LegalDoc'
import AuthVerifyCode, { OTP_LENGTH } from './AuthVerifyCode'
import { mapAuthError } from '../utils/authErrors'
import { validatePassword } from '../utils/passwordPolicy'
import { NB, NB_BORDER, hardShadow, nbCardStyle } from '../styles/neoBrutalism'

// `recoveryMode`/`onRecoveryDone` are passed by App.jsx when a PASSWORD_RECOVERY
// auth event fires (i.e. the user just verified a password-reset code) — see
// the onAuthStateChange handler there. They're a defensive fallback only: the
// normal path sets local `mode` to 'setNewPassword' directly from the
// verifyOtp promise below, without waiting on this prop.
export default function Auth({ recoveryMode, onRecoveryDone } = {}) {
  // null | 'login' | 'signup' | 'verifySignup' | 'forgotPassword' | 'verifyRecovery' | 'setNewPassword'
  const [mode, setMode] = useState(() => (recoveryMode ? 'setNewPassword' : null))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  // True when signUp's response was Supabase's obfuscated "account already
  // exists" shape (data.user.identities is an empty array) — no email was
  // actually sent, so AuthVerifyCode shows softer, non-committal copy instead
  // of falsely claiming a code was sent.
  const [signupAmbiguous, setSignupAmbiguous] = useState(false)
  const [legalDoc, setLegalDoc] = useState(null) // null | 'terms' | 'privacy' — Auth renders before the app router exists, so it views these itself

  if (legalDoc) {
    return <LegalDoc doc={legalDoc} onBack={() => setLegalDoc(null)} />
  }

  const switchMode = (next) => { setMode(next); setError(''); setSuccessMessage('') }

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/app' },
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return }
    if (mode === 'signup' && !name.trim()) { setError('Please enter your name.'); return }
    if (mode === 'signup') {
      const { valid, message } = validatePassword(password)
      if (!valid) { setError(message); return }
    }
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: window.location.origin + '/app',
        },
      })
      if (error) {
        setError(mapAuthError(error, { context: 'signup' }))
      } else if (data?.session) {
        // Email confirmation is disabled at the project level — signUp()
        // already returned an active session. Nothing to verify; the
        // session-driven render in App.jsx takes over on its own.
      } else {
        setSignupAmbiguous(data?.user?.identities?.length === 0)
        setMode('verifySignup')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) setError(mapAuthError(error, { context: 'signin' }))
    }
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError('Enter your email address.'); return }
    setLoading(true)
    setError('')
    // Anti-enumeration by design — Supabase resolves this the same way
    // whether or not the email has an account, so the UI copy must too.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    setLoading(false)
    if (error) setError(mapAuthError(error, { context: 'recovery' }))
    else setMode('verifyRecovery')
  }

  const handleSetNewPassword = async () => {
    const { valid, message } = validatePassword(newPassword)
    if (!valid) { setError(message); return }
    if (newPassword !== newPasswordConfirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (error) { setError(mapAuthError(error, { context: 'recovery' })); return }
    // Clean end to the recovery session — nobody explicitly "logged in" with
    // it, so don't resume into the app on the back of it.
    await supabase.auth.signOut()
    onRecoveryDone?.()
    setNewPassword('')
    setNewPasswordConfirm('')
    setSuccessMessage('Password updated — log in with your new password.')
    setMode('login')
  }

  const inputStyle = {
    width: '100%', height: 52, border: NB_BORDER, borderRadius: 14,
    padding: '0 16px', fontSize: 15, color: NB.ink, fontFamily: NB.fontDisplay,
    outline: 'none', background: NB.white, boxSizing: 'border-box',
  }

  if (mode === 'verifySignup') {
    return (
      <AuthVerifyCode
        email={email}
        type="signup"
        onVerified={() => {}} // SIGNED_IN fires from verifyOtp itself — App.jsx's existing handler takes it from here
        onBack={() => switchMode('signup')}
        infoOverride={signupAmbiguous
          ? `If this email doesn't already have an account, check your inbox for a code (${OTP_LENGTH} digits). Already registered? Log in instead.`
          : null}
      />
    )
  }

  if (mode === 'verifyRecovery') {
    return (
      <AuthVerifyCode
        email={email}
        type="recovery"
        onVerified={() => switchMode('setNewPassword')}
        onBack={() => switchMode('login')}
      />
    )
  }

  if (mode === 'setNewPassword') {
    return (
      <>
        <StatusBar />
        <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '24px 26px 0' }}>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink, marginBottom: 32, marginTop: 8 }}>
            Set new password
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input value={newPassword} onChange={e => setNewPassword(e.target.value)}
              type="password" placeholder="New password" style={inputStyle} autoComplete="new-password" />
            <input value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)}
              type="password" placeholder="Confirm new password" style={inputStyle} autoComplete="new-password"
              onKeyDown={e => e.key === 'Enter' && handleSetNewPassword()} />
          </div>
          {error && (
            <div style={{ marginTop: 14, padding: '10px 14px', ...nbCardStyle(NB.red, 3), border: `3px solid ${NB.white}`, borderRadius: 12 }}>
              <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.white, fontWeight: 700 }}>{error}</span>
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0, padding: '10px 26px 26px' }}>
          <button onClick={handleSetNewPassword} disabled={loading}
            style={{ width: '100%', height: 54, border: NB_BORDER, borderRadius: 16, boxShadow: loading ? 'none' : hardShadow(5), background: loading ? '#ccc' : NB.teal, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'Please wait…' : 'Update password'}
          </button>
        </div>
      </>
    )
  }

  if (mode === 'forgotPassword') {
    return (
      <>
        <StatusBar />
        <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '24px 26px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, marginTop: 8 }}>
            <button onClick={() => switchMode('login')}
              style={{ background: NB.white, border: NB_BORDER, borderRadius: 12, boxShadow: hardShadow(3), width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink }}>
              Reset password
            </div>
          </div>
          <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6, marginBottom: 20 }}>
            Enter your email and we'll send you a code ({OTP_LENGTH} digits) to reset your password.
          </div>
          <input value={email} onChange={e => setEmail(e.target.value)}
            type="email" placeholder="Email address" style={inputStyle} autoComplete="email"
            onKeyDown={e => e.key === 'Enter' && handleForgotPassword()} />
          {error && (
            <div style={{ marginTop: 14, padding: '10px 14px', ...nbCardStyle(NB.red, 3), border: `3px solid ${NB.white}`, borderRadius: 12 }}>
              <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.white, fontWeight: 700 }}>{error}</span>
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0, padding: '10px 26px 26px' }}>
          <button onClick={handleForgotPassword} disabled={loading}
            style={{ width: '100%', height: 54, border: NB_BORDER, borderRadius: 16, boxShadow: loading ? 'none' : hardShadow(5), background: loading ? '#ccc' : NB.teal, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'Please wait…' : 'Send code'}
          </button>
        </div>
      </>
    )
  }

  // Email/password form
  if (mode === 'login' || mode === 'signup') {
    return (
      <>
        <StatusBar />
        <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '24px 26px 0' }}>
          {/* Back + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, marginTop: 8 }}>
            <button onClick={() => switchMode(null)}
              style={{ background: NB.white, border: NB_BORDER, borderRadius: 12, boxShadow: hardShadow(3), width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink }}>
              {mode === 'login' ? 'Log in' : 'Create account'}
            </div>
          </div>

          {successMessage && (
            <div style={{ marginBottom: 14, padding: '10px 14px', ...nbCardStyle(NB.green, 3), border: `3px solid ${NB.white}`, borderRadius: 12 }}>
              <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.ink, fontWeight: 700 }}>{successMessage}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name" style={inputStyle} />
            )}
            <input value={email} onChange={e => setEmail(e.target.value)}
              type="email" placeholder="Email address" style={inputStyle} autoComplete="email" />
            <input value={password} onChange={e => setPassword(e.target.value)}
              type="password" placeholder="Password" style={inputStyle}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              onKeyDown={e => e.key === 'Enter' && handleEmailAuth()} />
          </div>

          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginTop: 10 }}>
              <button onClick={() => switchMode('forgotPassword')}
                style={{ fontSize: 13, fontWeight: 700, color: '#555', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                Forgot password?
              </button>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, padding: '10px 14px', ...nbCardStyle(NB.red, 3), border: `3px solid ${NB.white}`, borderRadius: 12 }}>
              <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.white, fontWeight: 700 }}>{error}</span>
            </div>
          )}
        </div>

        {/* Pinned footer — stays on screen while the fields above scroll */}
        <div style={{ flexShrink: 0, padding: '10px 26px 26px' }}>
          <button onClick={handleEmailAuth} disabled={loading}
            style={{ width: '100%', height: 54, border: NB_BORDER, borderRadius: 16, boxShadow: loading ? 'none' : hardShadow(5), background: loading ? '#ccc' : NB.teal, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>

          {mode === 'signup' && (
            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#666', lineHeight: 1.6 }}>
              By creating an account, you agree to our{' '}
              <button onClick={() => setLegalDoc('terms')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: NB.ink, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>Terms of Service</button>
              {' '}and{' '}
              <button onClick={() => setLegalDoc('privacy')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: NB.ink, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</button>.
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span style={{ fontSize: 14, color: '#555' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              style={{ fontSize: 14, fontWeight: 800, color: NB.ink, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </>
    )
  }

  // Default: Google-first landing
  return (
    <>
      <StatusBar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 26px', justifyContent: 'center' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, border: NB_BORDER, boxShadow: hardShadow(6), overflow: 'hidden', margin: '0 auto 18px' }}>
            <img src="/cute_logo.png" alt="MissVfit" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 40, textTransform: 'uppercase', letterSpacing: -1, color: NB.ink, marginBottom: 8 }}>MissVfit</div>
          <div style={{ fontFamily: NB.fontMono, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#555' }}>Your women's strength companion</div>
        </div>

        {/* Google — primary CTA */}
        <button onClick={handleGoogle} disabled={loading}
          style={{ width: '100%', height: 58, border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(5), background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, fontFamily: NB.fontDisplay, fontSize: 16, fontWeight: 800, color: NB.ink, cursor: 'pointer', marginBottom: 18 }}>
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Please wait…' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1, height: 3, background: NB.ink }} />
          <span style={{ fontFamily: NB.fontMono, fontSize: 12, color: NB.ink, fontWeight: 700, textTransform: 'uppercase' }}>or</span>
          <div style={{ flex: 1, height: 3, background: NB.ink }} />
        </div>

        {/* Email options */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => switchMode('login')}
            style={{ flex: 1, height: 50, border: NB_BORDER, borderRadius: 14, boxShadow: hardShadow(3), background: NB.yellow, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', cursor: 'pointer' }}>
            Log in
          </button>
          <button onClick={() => switchMode('signup')}
            style={{ flex: 1, height: 50, border: NB_BORDER, borderRadius: 14, boxShadow: hardShadow(3), background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', cursor: 'pointer' }}>
            Sign up
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 16, padding: '10px 14px', ...nbCardStyle(NB.red, 3), border: `3px solid ${NB.white}`, borderRadius: 12 }}>
            <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.white, fontWeight: 700 }}>{error}</span>
          </div>
        )}

      </div>
    </>
  )
}
