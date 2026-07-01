import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { StatusBar } from '../components/PhoneFrame'

export default function Auth() {
  const [mode, setMode] = useState(null) // null | 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return }
    if (mode === 'signup' && !name.trim()) { setError('Please enter your name.'); return }
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) setError(error.message)
      else setSent(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) setError(error.message === 'Invalid login credentials'
        ? 'Incorrect email or password.' : error.message)
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', height: 52, borderRadius: 14,
    border: '1.5px solid #EDE4F8', padding: '0 16px',
    fontSize: 15, color: '#2E1065', fontFamily: 'inherit',
    outline: 'none', background: '#FAFAFF', boxSizing: 'border-box',
  }

  if (sent) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
        </div>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: '#2E1065', marginBottom: 10 }}>Check your email</div>
        <div style={{ fontSize: 14, color: '#8478A0', lineHeight: 1.6, marginBottom: 28 }}>
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
        </div>
        <button onClick={() => { setSent(false); setMode('login') }}
          style={{ fontSize: 14, fontWeight: 700, color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer' }}>
          Back to login
        </button>
      </div>
    )
  }

  // Email/password form
  if (mode === 'login' || mode === 'signup') {
    return (
      <>
        <StatusBar />
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 26px 0' }}>
          {/* Back + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, marginTop: 8 }}>
            <button onClick={() => { setMode(null); setError('') }}
              style={{ background: '#F0E8FF', border: 'none', borderRadius: 12, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, color: '#2E1065' }}>
              {mode === 'login' ? 'Log in' : 'Create account'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'signup' && (
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name" style={inputStyle} />
            )}
            <input value={email} onChange={e => setEmail(e.target.value)}
              type="email" placeholder="Email address" style={inputStyle} autoComplete="email" />
            <input value={password} onChange={e => setPassword(e.target.value)}
              type="password" placeholder="Password" style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleEmailAuth()} />
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
              <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{error}</span>
            </div>
          )}

          <button onClick={handleEmailAuth} disabled={loading}
            style={{ width: '100%', height: 52, borderRadius: 16, background: loading ? '#C4B0E0' : '#7C3AED', border: 'none', color: '#fff', fontWeight: 700, fontSize: 16, cursor: loading ? 'default' : 'pointer', marginTop: 20, boxShadow: '0 12px 28px rgba(124,58,237,.3)' }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 20, paddingBottom: 32 }}>
            <span style={{ fontSize: 14, color: '#8478A0' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              style={{ fontSize: 14, fontWeight: 700, color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer' }}>
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
          <div style={{ width: 80, height: 80, borderRadius: 26, background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 12px 32px rgba(124,58,237,.35)' }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.2 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.8-.5z"/></svg>
          </div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 34, color: '#2E1065', marginBottom: 8 }}>Aura</div>
          <div style={{ fontSize: 15, color: '#8478A0' }}>Your women's strength companion</div>
        </div>

        {/* Google — primary CTA */}
        <button onClick={handleGoogle} disabled={loading}
          style={{ width: '100%', height: 58, borderRadius: 18, border: '1.5px solid #EDE4F8', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, fontSize: 16, fontWeight: 700, color: '#2E1065', cursor: 'pointer', marginBottom: 16, boxShadow: '0 4px 20px rgba(76,36,120,.12)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Please wait…' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: '#EDE4F8' }} />
          <span style={{ fontSize: 12, color: '#A99BC4', fontWeight: 600 }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#EDE4F8' }} />
        </div>

        {/* Email options */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setMode('login'); setError('') }}
            style={{ flex: 1, height: 50, borderRadius: 14, background: '#F0E8FF', border: 'none', color: '#7C3AED', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Log in
          </button>
          <button onClick={() => { setMode('signup'); setError('') }}
            style={{ flex: 1, height: 50, borderRadius: 14, background: '#F0E8FF', border: 'none', color: '#7C3AED', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Sign up
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
            <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{error}</span>
          </div>
        )}

      </div>
    </>
  )
}
