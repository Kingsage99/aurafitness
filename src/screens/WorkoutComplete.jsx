import React, { useMemo, useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import { getMuscleRankInfo, MUSCLE_RANK_MIN_WORKOUTS } from '../utils/gamification'
import { MUSCLE_LABELS } from '../utils/muscleLabels'
import RankLadder from '../components/RankLadder'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

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

const INTENSITY_COLORS = ['#FFD8A8', '#FF9E4A', '#E5352B']

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

  const [ladderMuscle, setLadderMuscle] = useState(null)
  const muscleGateOpen = (gamification?.totalWorkouts || 0) >= MUSCLE_RANK_MIN_WORKOUTS
  const gainedMuscles  = Object.keys(sessionData?.muscleGains || {})

  return (
    <>
      <StatusBar />

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 20px' }}>

        {/* Celebration header */}
        <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 28, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.1, marginBottom: 6 }}>
            Workout Complete!
          </div>
          <div style={{ fontSize: 14, color: '#555' }}>
            {label.replace(/^Day \d+ — /, '')} · {fmt(elapsed)}
          </div>
        </div>

        {/* Rewards row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <RewardCard icon="⚡" value={`+${xp}`} label="XP Earned" bg={NB.lavender} />
          <RewardCard icon="💎" value={`+${gems}`} label="Gems" bg={NB.blue} />
          <RewardCard icon="🔥" value={streak} label="Day Streak" bg={NB.orange} />
        </div>

        {/* XP Progress bar */}
        <div style={{ border: NB_BORDER, boxShadow: hardShadow(3), padding: '14px 16px', background: NB.white, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>Level {gamification?.level ?? 1}</span>
            <span style={{ fontFamily: NB.fontMono, fontSize: 12, color: '#555' }}>{gamification?.xp ?? 0} XP</span>
          </div>
          <div style={{ height: 10, border: `2px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: NB.green, width: `${Math.min(((gamification?.xp ?? 0) % 500) / 5, 100)}%`, transition: 'width 0.6s ease' }} />
          </div>
        </div>

        {/* Muscles worked */}
        {hasColors && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Muscles Worked
            </div>
            <div style={{ border: NB_BORDER, background: NB.cream, overflow: 'hidden', padding: '10px 10px 6px', display: 'flex', gap: 6 }}>
              <div style={{ flex: 1, aspectRatio: '0.6/1' }}>
                <MuscleSVG key="front-done" url="/muscle_map_front.svg" muscleColors={frontColors} />
              </div>
              <div style={{ flex: 1, aspectRatio: '0.6/1' }}>
                <MuscleSVG key="back-done" url="/muscle_map_back.svg" muscleColors={backColors} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[['#FFD8A8','Light'],['#FF9E4A','Moderate'],['#E5352B','High']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, border: `1.5px solid ${NB.ink}`, background: c }} />
                  <span style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#555', fontWeight: 700 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Muscle Progress */}
        {muscleGateOpen && gainedMuscles.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Muscle Progress
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gainedMuscles.map(muscleId => {
                const info = getMuscleRankInfo(gamification, muscleId)
                const gained = sessionData.muscleGains[muscleId]
                const rankedUp = (sessionData.muscleRankUps || []).some(r => r.muscleId === muscleId)
                return (
                  <button key={muscleId} onClick={() => setLadderMuscle(muscleId)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `2.5px solid ${NB.ink}`,
                    background: info.tier.bg, cursor: 'pointer', textAlign: 'left',
                  }}>
                    <span style={{ fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: info.tier.color, flex: 1 }}>{MUSCLE_LABELS[muscleId] || muscleId}</span>
                    {rankedUp && <span style={{ fontSize: 11 }}>🏆</span>}
                    <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: info.tier.color, background: NB.white, border: `1.5px solid ${NB.ink}`, padding: '2px 8px' }}>{info.tier.label}</span>
                    <span style={{ fontFamily: NB.fontMono, fontSize: 11, color: info.tier.color, fontWeight: 700 }}>+{gained}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats summary */}
        <div style={{ border: NB_BORDER, boxShadow: hardShadow(3), padding: '14px 16px', background: NB.white, marginBottom: 24, display: 'flex', gap: 0 }}>
          <StatItem value={exercises.length} label="Exercises" />
          <Divider />
          <StatItem value={sessionData?.setsCompleted ?? 0} label="Sets Done" />
          <Divider />
          <StatItem value={fmt(elapsed)} label="Duration" />
        </div>

        {/* Buttons */}
        <button
          onClick={() => onNavigate('workoutPost')}
          style={{ width: '100%', padding: '15px', border: NB_BORDER, boxShadow: hardShadow(3), background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', marginBottom: 12 }}
        >
          Share Workout
        </button>
        <button
          onClick={() => onNavigate('home')}
          style={{ width: '100%', padding: '15px', border: NB_BORDER, boxShadow: hardShadow(3), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Back to Home
        </button>

      </div>

      {ladderMuscle && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setLadderMuscle(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)' }} />
          <div style={{ position: 'relative', background: NB.white, borderTop: NB_BORDER, boxShadow: `0 -6px 0 ${NB.ink}`, padding: '0 20px 24px', zIndex: 1, maxHeight: '78%', overflowY: 'auto' }}>
            <div style={{ width: 38, height: 5, background: NB.ink, margin: '14px auto 14px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 19, textTransform: 'uppercase', color: NB.ink }}>{MUSCLE_LABELS[ladderMuscle] || ladderMuscle} Rank</span>
              <button onClick={() => setLadderMuscle(null)} style={{ width: 32, height: 32, border: `2px solid ${NB.ink}`, background: NB.white, cursor: 'pointer', color: NB.ink, fontWeight: 800 }}>✕</button>
            </div>
            <RankLadder {...getMuscleRankInfo(gamification, ladderMuscle)} />
          </div>
        </div>
      )}
    </>
  )
}

function RewardCard({ icon, value, label, bg }) {
  return (
    <div style={{ flex: 1, border: NB_BORDER, boxShadow: hardShadow(3), padding: '14px 10px', background: bg, textAlign: 'center' }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontFamily: NB.fontDisplay, fontSize: 22, color: NB.ink, fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: NB.ink }}>{label}</div>
    </div>
  )
}

function StatItem({ value, label }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '4px 0' }}>
      <div style={{ fontFamily: NB.fontDisplay, fontSize: 22, color: NB.ink, fontWeight: 900, lineHeight: 1.1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: NB.fontMono, fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

function Divider() {
  return <div style={{ width: 2, background: NB.ink, alignSelf: 'stretch', margin: '4px 0' }} />
}
