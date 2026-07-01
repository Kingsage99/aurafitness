import React, { useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'

const SLOT_COLORS = {
  main:      '#7C3AED',
  secondary: '#3B82F6',
  accessory: '#F59E0B',
  finisher:  '#EC4899',
}

// Map exercise primary muscle name → MUSCLE_SVG_IDS key
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

// Which SVG file + side shows this muscle group best
const GROUP_CONFIG = {
  glutes:    { label: 'Glutes',     url: '/muscle_map_back.svg',  side: 'back' },
  legs:      { label: 'Legs',       url: '/muscle_map_front.svg', side: 'front' },
  chest:     { label: 'Chest',      url: '/muscle_map_front.svg', side: 'front' },
  shoulders: { label: 'Shoulders',  url: '/muscle_map_back.svg',  side: 'back' },
  back:      { label: 'Back',       url: '/muscle_map_back.svg',  side: 'back' },
  core:      { label: 'Core',       url: '/muscle_map_front.svg', side: 'front' },
  arms:      { label: 'Arms',       url: '/muscle_map_front.svg', side: 'front' },
  calves:    { label: 'Calves',     url: '/muscle_map_back.svg',  side: 'back' },
}

function getMuscleUsage(exercises) {
  const counts = {}
  exercises.forEach(ex => {
    ;(ex.muscles?.primary || []).forEach(m => {
      const g = MUSCLE_TO_GROUP[m.toLowerCase()]
      if (g) counts[g] = (counts[g] || 0) + 1
    })
  })
  const total = exercises.length || 1
  return Object.entries(counts)
    .map(([group, count]) => ({ group, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
}

function estimateDuration(exercises) {
  if (!exercises?.length) return 0
  return Math.max(15, exercises.reduce((acc, ex) => acc + (ex.sets || 3) * 2, 0) + 5)
}

function MuscleCard({ group, pct }) {
  const config = GROUP_CONFIG[group]
  const colors = useMemo(() => {
    if (!config) return {}
    const mc = {}
    MUSCLE_SVG_IDS[group]?.[config.side]?.forEach(id => { mc[id] = '#7C3AED' })
    return mc
  }, [group, config])

  if (!config) return null

  return (
    <div style={{ flexShrink: 0, width: 82, borderRadius: 16, background: '#fff', border: '1.5px solid #EDE4F8', boxShadow: '0 2px 8px rgba(76,36,120,.06)', overflow: 'hidden' }}>
      <div style={{ height: 86, background: '#F8F4FF', overflow: 'hidden' }}>
        <MuscleSVG url={config.url} muscleColors={colors} />
      </div>
      <div style={{ padding: '8px 6px 10px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#2E1065', marginBottom: 4 }}>{config.label}</div>
        <div style={{ background: '#F0E8FF', borderRadius: 8, padding: '2px 8px', display: 'inline-block' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#7C3AED' }}>{pct}%</span>
        </div>
      </div>
    </div>
  )
}

export default function WorkoutDetail({ activeWorkout, onNavigate }) {
  const exercises  = activeWorkout?.exercises ?? []
  const label      = activeWorkout?.label ?? 'Workout'
  const split      = activeWorkout?.split
  const duration   = estimateDuration(exercises)
  const usage      = useMemo(() => getMuscleUsage(exercises), [exercises])

  if (!activeWorkout) {
    return (
      <>
        <StatusBar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#8478A0', fontSize: 14 }}>No workout selected</p>
        </div>
        <BottomNav active="workout" onNavigate={onNavigate} />
      </>
    )
  }

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '10px 22px 10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => onNavigate('workout')} style={{ background: '#F0E8FF', border: 'none', borderRadius: 12, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#2E1065', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </div>
          {split && <div style={{ fontSize: 12, color: '#8478A0', marginTop: 1 }}>{split}</div>}
        </div>
        <div style={{ background: '#F0E8FF', borderRadius: 20, padding: '5px 11px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span style={{ fontSize: 12, color: '#7C3AED', fontWeight: 800 }}>~{duration} min</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Target Muscles row */}
        {usage.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ padding: '0 22px', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#8478A0', letterSpacing: 1.1, textTransform: 'uppercase' }}>Target Muscles</span>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '2px 22px 6px', scrollbarWidth: 'none' }}>
              {usage.map(({ group, pct }) => <MuscleCard key={group} group={group} pct={pct} />)}
            </div>
          </div>
        )}

        {/* Exercise list */}
        <div style={{ padding: '0 22px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#8478A0', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10 }}>
            {exercises.length} Exercises
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
            {exercises.map((ex, i) => {
              const color   = SLOT_COLORS[ex.slot] || '#8478A0'
              const sets    = ex.sets || 3
              const repsStr = ex.reps
                ? String(ex.reps)
                : `${ex.repsRange?.min ?? 8}–${ex.repsRange?.max ?? 12}`

              return (
                <div key={ex.id || i} style={{ borderRadius: 16, padding: '12px 14px', background: '#fff', border: '1.5px solid #EDE4F8', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 6px rgba(76,36,120,.04)' }}>
                  {/* Colour badge */}
                  <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: `${color}18`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <span style={{ fontSize: 17, fontWeight: 900, color, lineHeight: 1 }}>{i + 1}</span>
                    <span style={{ fontSize: 7, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: 0.4 }}>{ex.slot}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#2E1065', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                    <div style={{ fontSize: 12, color: '#8478A0' }}>{sets} sets × {repsStr} reps</div>
                  </div>
                  {ex.cues?.length > 0 && (
                    <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Start Workout button */}
      <div style={{ padding: '10px 22px 12px', flexShrink: 0 }}>
        <button
          onClick={() => onNavigate('workoutActive')}
          style={{ width: '100%', padding: '16px', borderRadius: 18, border: 'none', background: 'linear-gradient(135deg, #7C3AED, #4C1D95)', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 20px rgba(124,58,237,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Start Workout
        </button>
      </div>

      <BottomNav active="workout" onNavigate={onNavigate} />
    </>
  )
}
