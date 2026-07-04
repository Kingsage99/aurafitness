import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import AvatarSilhouette from '../components/AvatarSilhouette'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

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
          <div style={{ fontFamily: NB.fontMono, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#555' }}>Your path to</div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 28, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.1 }}>{physiqueLabel}</div>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginBottom: 10 }}>
          <AvatarSilhouette height={200} color={NB.lavender} style={{ position: 'relative', filter: `drop-shadow(${hardShadow(3)})` }} />
          <div style={{ position: 'absolute', top: 8, right: 0, background: NB.white, border: NB_BORDER, boxShadow: hardShadow(3), padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            <div>
              <div style={{ fontFamily: NB.fontMono, fontSize: 9, color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>Timeline</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: NB.ink }}>~16 weeks</div>
            </div>
          </div>
        </div>

        {/* Calorie target card — only shown when real data collected */}
        {dailyCalorieTarget && (
          <div style={{ border: NB_BORDER, boxShadow: hardShadow(4), background: NB.yellow, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: NB.ink, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Your nutrition target</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 32, color: NB.ink, lineHeight: 1 }}>{dailyCalorieTarget.toLocaleString()}</span>
              <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.ink, fontWeight: 700 }}>kcal / day</span>
            </div>
            <div style={{ fontSize: 13, color: NB.ink, lineHeight: 1.4 }}>
              We'll {goalCopy.verb} <strong>{dailyCalorieTarget.toLocaleString()} kcal</strong> — {goalCopy.detail}.
              {tdee && <span> Maintenance: {tdee.toLocaleString()} kcal.</span>}
            </div>
          </div>
        )}

        {/* Plan phases */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { num: 1, title: 'Foundation', sub: 'Build form, mobility & the habit · weeks 1–4', active: true, locked: false },
            { num: 2, title: 'Build', sub: 'Glute & leg volume, progressive load · weeks 5–10', active: false, locked: true },
            { num: 3, title: 'Sculpt', sub: 'Definition cuts & conditioning · weeks 11–16', active: false, locked: true },
          ].map(phase => (
            <div key={phase.num} style={{
              display: 'flex', gap: 13, alignItems: 'center',
              padding: 15, border: NB_BORDER,
              background: phase.active ? NB.teal : NB.white,
              boxShadow: phase.active ? hardShadow(4) : 'none',
            }}>
              <div style={{ width: 42, height: 42, border: NB_BORDER, background: phase.active ? NB.ink : NB.white, color: phase.active ? NB.white : NB.ink, fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {phase.num}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{phase.title}</div>
                <div style={{ fontSize: 12, color: '#444' }}>{phase.sub}</div>
              </div>
              {phase.active ? (
                <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, color: NB.ink, background: NB.white, border: `2px solid ${NB.ink}`, padding: '4px 8px', textTransform: 'uppercase' }}>Start</span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" opacity="0.5">
                  <rect x="5" y="11" width="14" height="9"/>
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
            width: '100%', height: 56, border: NB_BORDER,
            background: NB.magenta, color: NB.white,
            fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase',
            boxShadow: hardShadow(5),
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'pointer',
          }}
        >
          Let's go
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>
      </div>
    </>
  )
}
