import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { supabase } from '../lib/supabase'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

const TRAINING_STYLES = [
  { id: 'strength',    label: 'Strength',    sub: '6–8 reps' },
  { id: 'hypertrophy', label: 'Hypertrophy', sub: '8–12 reps' },
  { id: 'endurance',   label: 'Endurance',   sub: '12–15 reps' },
]

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 50, height: 28, borderRadius: 14, border: NB_BORDER,
        background: on ? NB.teal : NB.white, position: 'relative', cursor: 'pointer', flexShrink: 0,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: 10, background: NB.ink,
        position: 'absolute', top: 2, left: on ? 24 : 2, transition: 'left 0.15s',
      }} />
    </button>
  )
}

export default function Settings({ userProfile, onNavigate, onUpdateProfile, onResetOnboarding }) {
  const [signingOut, setSigningOut] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
  }

  const handleResetOnboarding = async () => {
    setResetting(true)
    await onResetOnboarding?.()
  }

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '10px 22px 6px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => onNavigate('home')} style={{ width: 38, height: 38, borderRadius: 12, border: NB_BORDER, background: NB.white, boxShadow: hardShadow(2), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', color: NB.ink }}>Settings</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 20px' }}>

        {/* Training Style */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Training Style</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TRAINING_STYLES.map(style => {
              const sel = (userProfile?.trainingStyle || 'strength') === style.id
              return (
                <button
                  key={style.id}
                  onClick={() => onUpdateProfile?.({ trainingStyle: style.id })}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', border: `2.5px solid ${NB.ink}`, borderRadius: 14,
                    background: sel ? NB.teal : NB.white, boxShadow: sel ? hardShadow(3) : 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink }}>{style.label}</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 1 }}>{style.sub}</div>
                  </div>
                  {sel && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Units */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Units</SectionLabel>
          <div style={{ display: 'flex', border: `2.5px solid ${NB.ink}`, borderRadius: 12, overflow: 'hidden' }}>
            {['metric', 'imperial'].map(u => {
              const sel = (userProfile?.units || 'metric') === u
              return (
                <button
                  key={u}
                  onClick={() => onUpdateProfile?.({ units: u })}
                  style={{
                    flex: 1, height: 42, border: 'none', cursor: 'pointer',
                    background: sel ? NB.teal : NB.white, color: NB.ink,
                    fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase',
                  }}
                >
                  {u === 'metric' ? 'Metric (kg/cm)' : 'Imperial (lb/ft)'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notifications */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Notifications</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: NB_BORDER, borderRadius: 14, padding: '14px 16px', background: NB.white }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: NB.ink }}>Missed-day reminders</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Show a banner when you miss a workout or calorie goal</div>
            </div>
            <Toggle
              on={userProfile?.notificationsEnabled !== false}
              onChange={(val) => onUpdateProfile?.({ notificationsEnabled: val })}
            />
          </div>
        </div>

        {/* Account */}
        <div>
          <SectionLabel>Account</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleResetOnboarding} disabled={resetting} style={{ height: 46, border: `2px solid ${NB.ink}`, borderRadius: 14, background: NB.white, color: NB.ink, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              {resetting ? '…' : 'Redo Onboarding'}
            </button>
            <button onClick={handleSignOut} disabled={signingOut} style={{ height: 46, border: `2px solid ${NB.ink}`, borderRadius: 14, background: NB.red, color: NB.white, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              {signingOut ? '…' : 'Sign Out'}
            </button>
          </div>
        </div>

      </div>
    </>
  )
}
