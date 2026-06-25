import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import AvatarSilhouette from '../components/AvatarSilhouette'

const PHYSIQUE_LABELS = {
  lean_toned: 'Lean & Toned', slim_thick: 'Slim Thick', hourglass: 'Hourglass',
  athletic: 'Athletic & Strong', soft_curvy: 'Soft & Curvy', functional: 'Fit & Functional',
}

const GOAL_COPY = {
  lose_weight:          { verb: 'burn fat at', detail: 'a caloric deficit' },
  build_muscle:         { verb: 'build muscle at', detail: 'a lean bulk surplus' },
  tone_recomp:          { verb: 'recompose at', detail: 'maintenance calories' },
  maintain:             { verb: 'maintain at', detail: 'your maintenance calories' },
  athletic_performance: { verb: 'perform at', detail: 'a performance surplus' },
}

export default function WhyAura({ userProfile = {}, onContinue }) {
  const {
    physique = 'lean_toned',
    fitnessGoal = 'tone_recomp',
    dailyCalorieTarget = null,
    tdee = null,
  } = userProfile

  const physiqueLabel = PHYSIQUE_LABELS[physique] || 'Your Physique'
  const goalCopy = GOAL_COPY[fitnessGoal] || GOAL_COPY.tone_recomp

  return (
    <>
      <StatusBar />
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 0', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', margin: '20px 0 10px' }}>
          <div style={{ fontSize: 13, color: '#8478A0' }}>Your path to</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#2E1065', lineHeight: 1.1 }}>{physiqueLabel}</div>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginBottom: 10 }}>
          <div style={{ position: 'absolute', bottom: 18, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,#EAD9FF,rgba(234,217,255,0))' }}></div>
          <AvatarSilhouette height={200} color='#C4A8E8' style={{ position: 'relative', filter: 'drop-shadow(0 12px 18px rgba(124,58,237,.25))' }} />
          <div style={{ position: 'absolute', top: 8, right: 0, background: '#fff', borderRadius: 14, padding: '8px 12px', boxShadow: '0 8px 18px rgba(76,36,120,.14)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            <div>
              <div style={{ fontSize: 9, color: '#A99BC4', fontWeight: 700 }}>TIMELINE</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#2E1065' }}>~16 weeks</div>
            </div>
          </div>
        </div>

        {/* Calorie target card — only shown when real data collected */}
        {dailyCalorieTarget && (
          <div style={{ borderRadius: 20, background: '#FAF5FF', border: '1.5px solid #EDE4F8', padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#A99BC4', letterSpacing: '.5px', marginBottom: 4 }}>YOUR NUTRITION TARGET</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: '#7C3AED', lineHeight: 1 }}>{dailyCalorieTarget.toLocaleString()}</span>
              <span style={{ fontSize: 14, color: '#8478A0', fontWeight: 600 }}>kcal / day</span>
            </div>
            <div style={{ fontSize: 13, color: '#5B3D8A', lineHeight: 1.4 }}>
              We'll {goalCopy.verb} <strong>{dailyCalorieTarget.toLocaleString()} kcal</strong> — {goalCopy.detail}.
              {tdee && <span style={{ color: '#A99BC4' }}> Maintenance: {tdee.toLocaleString()} kcal.</span>}
            </div>
          </div>
        )}

        {/* Plan phases */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {[
            { num: 1, title: 'Foundation', sub: 'Build form, mobility & the habit · weeks 1–4', active: true, locked: false },
            { num: 2, title: 'Build', sub: 'Glute & leg volume, progressive load · weeks 5–10', active: false, locked: true },
            { num: 3, title: 'Sculpt', sub: 'Definition cuts & conditioning · weeks 11–16', active: false, locked: true },
          ].map(phase => (
            <div key={phase.num} style={{
              display: 'flex', gap: 13, alignItems: 'center',
              padding: 15, borderRadius: 20,
              background: '#fff',
              border: `2px solid ${phase.active ? '#7C3AED' : '#EDE4F8'}`,
              boxShadow: phase.active ? '0 8px 18px rgba(124,58,237,.12)' : 'none',
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: phase.active ? '#7C3AED' : '#EDE4FF', color: phase.active ? '#fff' : '#7C3AED', fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {phase.num}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#2E1065' }}>{phase.title}</div>
                <div style={{ fontSize: 12, color: '#8478A0' }}>{phase.sub}</div>
              </div>
              {phase.active ? (
                <span style={{ fontSize: 9, fontWeight: 800, color: '#7C3AED', background: '#F3E8FF', padding: '4px 8px', borderRadius: 999 }}>START</span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4B0E0" strokeWidth="2.2">
                  <rect x="5" y="11" width="14" height="9" rx="2"/>
                  <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 22px 26px', flexShrink: 0 }}>
        <button
          onClick={onContinue}
          style={{
            width: '100%', height: 54, borderRadius: 18,
            background: '#7C3AED', color: '#fff',
            fontWeight: 700, fontSize: 16,
            boxShadow: '0 12px 26px rgba(124,58,237,.32)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: 'none', cursor: 'pointer',
          }}
        >
          Let's go
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>
      </div>
    </>
  )
}
