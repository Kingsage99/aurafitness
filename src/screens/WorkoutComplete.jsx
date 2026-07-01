import React, { useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'

// Map exercise primary muscle → MUSCLE_SVG_IDS key
const MUSCLE_TO_GROUP = {
  glutes: 'glutes', glute: 'glutes',
  hamstrings: 'legs', quads: 'legs', legs: 'legs',
  chest: 'chest', pecs: 'chest',
  shoulders: 'shoulders', delts: 'shoulders',
  back: 'back', lats: 'back', lat: 'back',
  core: 'core', abs: 'core',
  arms: 'arms', biceps: 'arms', triceps: 'arms',
  calves: 'calves',
}

const INTENSITY_COLORS = ['#FFB3C1', '#FF6B6B', '#CC2936']

function buildColors(exercises, side) {
  const counts = {}
  ;(exercises || []).forEach(ex => {
    ;(ex.muscles?.primary || []).forEach(m => {
      const group = MUSCLE_TO_GROUP[m.toLowerCase()]
      if (!group) return
      MUSCLE_SVG_IDS[group]?.[side]?.forEach(id => {
        counts[id] = (counts[id] || 0) + 1
      })
    })
  })
  const colors = {}
  Object.entries(counts).forEach(([id, n]) => {
    colors[id] = INTENSITY_COLORS[Math.min(n - 1, 2)]
  })
  return colors
}

function fmt(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m === 0) return `${sec}s`
  return `${m}m ${sec > 0 ? sec + 's' : ''}`.trim()
}

export default function WorkoutComplete({ sessionData, gamification, onNavigate }) {
  const exercises = sessionData?.exercises ?? []
  const label     = sessionData?.workoutLabel ?? 'Workout'
  const elapsed   = sessionData?.elapsed ?? 0
  const xp        = sessionData?.xpEarned ?? 50
  const gems      = sessionData?.gemsEarned ?? 30
  const streak    = sessionData?.streak ?? gamification?.workoutStreak ?? 1

  const frontColors = useMemo(() => buildColors(exercises, 'front'), [exercises])
  const backColors  = useMemo(() => buildColors(exercises, 'back'),  [exercises])

  const hasColors = Object.keys(frontColors).length + Object.keys(backColors).length > 0

  return (
    <>
      <StatusBar />

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 20px' }}>

        {/* Celebration header */}
        <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#2E1065', lineHeight: 1.1, marginBottom: 6 }}>
            Workout Complete!
          </div>
          <div style={{ fontSize: 14, color: '#8478A0' }}>
            {label.replace(/^Day \d+ — /, '')} · {fmt(elapsed)}
          </div>
        </div>

        {/* Rewards row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <RewardCard icon="⚡" value={`+${xp}`} label="XP Earned" color="#7C3AED" bg="#F0E8FF" />
          <RewardCard icon="💎" value={`+${gems}`} label="Gems" color="#0EA5E9" bg="#E0F2FE" />
          <RewardCard icon="🔥" value={streak} label={`Day Streak`} color="#F97316" bg="#FFF7ED" />
        </div>

        {/* XP Progress bar */}
        <div style={{ borderRadius: 16, padding: '14px 16px', background: '#fff', border: '1.5px solid #EDE4F8', marginBottom: 20, boxShadow: '0 2px 8px rgba(76,36,120,.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#2E1065' }}>Level {gamification?.level ?? 1}</span>
            <span style={{ fontSize: 12, color: '#8478A0' }}>{gamification?.xp ?? 0} XP</span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: '#EDE4F8', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #7C3AED, #A78BFA)', width: `${Math.min(((gamification?.xp ?? 0) % 500) / 5, 100)}%`, transition: 'width 0.6s ease' }} />
          </div>
        </div>

        {/* Muscles worked */}
        {hasColors && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#8478A0', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10 }}>
              Muscles Worked
            </div>
            <div style={{ borderRadius: 18, background: '#F8F4FF', border: '1.5px solid #EDE4F8', overflow: 'hidden', padding: '10px 10px 6px', display: 'flex', gap: 6 }}>
              <div style={{ flex: 1, aspectRatio: '0.6/1' }}>
                <MuscleSVG key="front-done" url="/muscle_map_front.svg" muscleColors={frontColors} />
              </div>
              <div style={{ flex: 1, aspectRatio: '0.6/1' }}>
                <MuscleSVG key="back-done" url="/muscle_map_back.svg" muscleColors={backColors} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[['#FFB3C1','Light'],['#FF6B6B','Moderate'],['#CC2936','High']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                  <span style={{ fontSize: 11, color: '#8478A0', fontWeight: 600 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats summary */}
        <div style={{ borderRadius: 16, padding: '14px 16px', background: '#fff', border: '1.5px solid #EDE4F8', marginBottom: 24, display: 'flex', gap: 0 }}>
          <StatItem value={exercises.length} label="Exercises" />
          <Divider />
          <StatItem value={sessionData?.setsCompleted ?? 0} label="Sets Done" />
          <Divider />
          <StatItem value={fmt(elapsed)} label="Duration" />
        </div>

        {/* Buttons */}
        <button
          onClick={() => onNavigate('workoutPost')}
          style={{ width: '100%', padding: '15px', borderRadius: 16, border: '1.5px solid #EDE4F8', background: '#fff', color: '#7C3AED', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}
        >
          Share Workout
        </button>
        <button
          onClick={() => onNavigate('home')}
          style={{ width: '100%', padding: '15px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #7C3AED, #4C1D95)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 18px rgba(124,58,237,.3)' }}
        >
          Back to Home
        </button>

      </div>
    </>
  )
}

function RewardCard({ icon, value, label, color, bg }) {
  return (
    <div style={{ flex: 1, borderRadius: 16, padding: '14px 10px', background: bg, textAlign: 'center', border: `1.5px solid ${color}22` }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color, fontWeight: 400, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color }}>  {label}</div>
    </div>
  )
}

function StatItem({ value, label }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '4px 0' }}>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#2E1065', lineHeight: 1.1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#8478A0', fontWeight: 700 }}>{label}</div>
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, background: '#EDE4F8', alignSelf: 'stretch', margin: '4px 0' }} />
}
