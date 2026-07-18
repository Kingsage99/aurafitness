import React, { useMemo, useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import ExerciseThumb from '../components/ExerciseThumb'
import { getSwapOptions, formatExercise, estimateDuration, resolveExerciseImage } from '../utils/workoutBuilder'
import { MUSCLE_TO_GROUP } from '../utils/muscleIntensity'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'

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

function MuscleCard({ group, pct }) {
  const config = GROUP_CONFIG[group]
  const colors = useMemo(() => {
    if (!config) return {}
    const mc = {}
    MUSCLE_SVG_IDS[group]?.[config.side]?.forEach(id => { mc[id] = NB.purpleDeep })
    return mc
  }, [group, config])

  if (!config) return null

  return (
    <div style={{ flexShrink: 0, width: 82, ...nbCardStyle(NB_CARD_NEUTRAL, 2, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ height: 86, background: NB.cream, overflow: 'hidden' }}>
        <MuscleSVG url={config.url} muscleColors={colors} />
      </div>
      <div style={{ padding: '8px 6px 10px', textAlign: 'center' }}>
        <div style={{ fontFamily: NB.fontDisplay, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, marginBottom: 4 }}>{config.label}</div>
        <div style={{ background: NB.yellow, border: `1.5px solid ${NB.ink}`, borderRadius: 6, padding: '2px 8px', display: 'inline-block' }}>
          <span style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.ink }}>{pct}%</span>
        </div>
      </div>
    </div>
  )
}

export default function WorkoutDetail({ activeWorkout, userProfile = {}, setActiveWorkout, onUpdateProfile, onNavigate }) {
  const exercises  = activeWorkout?.exercises ?? []
  const label      = activeWorkout?.label ?? 'Workout'
  const split      = activeWorkout?.split
  const duration   = estimateDuration(exercises)
  const usage      = useMemo(() => getMuscleUsage(exercises), [exercises])

  const [swappingIdx, setSwappingIdx] = useState(null) // index of exercise being swapped, or null
  const [cuesIdx, setCuesIdx] = useState(null) // index whose cues sheet is open, or null

  const swapOptions = useMemo(() => {
    if (swappingIdx == null) return []
    const target = exercises[swappingIdx]
    if (!target) return []
    return getSwapOptions(target.id, userProfile, exercises.map(e => e.id))
  }, [swappingIdx, exercises, userProfile])

  function handleSwap(alt) {
    const original = exercises[swappingIdx]
    if (!original || !setActiveWorkout) { setSwappingIdx(null); return }
    const repRange = { min: original.repsMin ?? original.repsRange?.min ?? 6, max: original.repsMax ?? original.repsRange?.max ?? 8 }
    const replacement = formatExercise(alt, original.sets || 3, repRange, userProfile.equipment)
    const nextExercises = exercises.map((ex, i) => i === swappingIdx ? replacement : ex)
    setActiveWorkout({ ...activeWorkout, exercises: nextExercises })
    if (onUpdateProfile) {
      const disliked = userProfile.dislikedExercises || []
      if (!disliked.includes(original.id)) onUpdateProfile({ dislikedExercises: [...disliked, original.id] })
    }
    setSwappingIdx(null)
  }

  if (!activeWorkout) {
    return (
      <>
        <StatusBar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#555', fontSize: 14 }}>No workout selected</p>
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
        <button onClick={() => onNavigate('workout')} style={{ background: NB.white, border: NB_BORDER, borderRadius: 11, boxShadow: hardShadow(2), width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </div>
          {split && <div style={{ fontSize: 12, color: '#555', marginTop: 1 }}>{split}</div>}
        </div>
        <div style={{ background: NB.yellow, border: `2px solid ${NB.ink}`, borderRadius: 10, padding: '5px 11px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span style={{ fontFamily: NB.fontMono, fontSize: 12, color: NB.ink, fontWeight: 800 }}>~{duration} min</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto' }}>

        {/* Target Muscles row */}
        {usage.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ padding: '0 22px', marginBottom: 10 }}>
              <span style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase' }}>Target Muscles</span>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '2px 22px 6px', scrollbarWidth: 'none' }}>
              {usage.map(({ group, pct }) => <MuscleCard key={group} group={group} pct={pct} />)}
            </div>
          </div>
        )}

        {/* Exercise list */}
        <div style={{ padding: '0 22px' }}>
          <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            {exercises.length} Exercises
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
            {exercises.map((ex, i) => {
              const sets    = ex.sets || 3
              const repsStr = ex.timeBased
                ? `${ex.duration ?? ex.repsRange?.max ?? 30}s hold`
                : ex.reps
                  ? `${ex.reps} reps`
                  : `${ex.repsRange?.min ?? 8}–${ex.repsRange?.max ?? 12} reps`

              return (
                <div key={ex.id || i} style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 2, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <ExerciseThumb src={resolveExerciseImage(ex, userProfile.equipment)} slot={ex.slot} size={48} radius={12} />
                    <span style={{ position: 'absolute', bottom: -5, right: -5, width: 18, height: 18, borderRadius: 6, border: `1.5px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: NB.fontDisplay, fontSize: 10, fontWeight: 900, color: NB.ink }}>{i + 1}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: NB.ink, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                    <div style={{ fontSize: 12, color: '#555' }}>{sets} sets × {repsStr}</div>
                  </div>
                  {ex.cues?.length > 0 && (
                    <button onClick={() => setCuesIdx(i)} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 9, border: `1.5px solid ${NB.ink}`, background: NB.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    </button>
                  )}
                  {setActiveWorkout && (
                    <button onClick={() => setSwappingIdx(i)} title="Swap exercise" style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 9, border: `1.5px solid ${NB.ink}`, background: NB.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Start Workout button */}
      <div style={{ padding: '10px 22px 12px', flexShrink: 0 }}>
        {exercises.length === 0 ? (
          <div style={{ padding: '14px 16px', ...nbCardStyle(NB.cream, 3), border: `3px solid ${NB.white}`, borderRadius: 16, textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: '#555' }}>This workout has no exercises yet.</span>
          </div>
        ) : (
          <button
            onClick={() => onNavigate('workoutActive')}
            style={{ width: '100%', padding: '16px', border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(4), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontSize: 16, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Start Workout
          </button>
        )}
      </div>

      <BottomNav active="workout" onNavigate={onNavigate} />

      <BottomSheet open={cuesIdx != null} onClose={() => setCuesIdx(null)} title={cuesIdx != null ? exercises[cuesIdx]?.name : ''}>
        {cuesIdx != null && (exercises[cuesIdx]?.cues || []).map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
            <span style={{ fontWeight: 900, color: NB.ink }}>·</span>
            <span style={{ fontSize: 14, color: NB.ink, lineHeight: 1.4 }}>{c}</span>
          </div>
        ))}
      </BottomSheet>

      <BottomSheet open={swappingIdx != null} onClose={() => setSwappingIdx(null)} title="Swap Exercise">
        {swapOptions.length === 0 ? (
          <p style={{ fontSize: 13, color: '#555' }}>No alternatives available for this exercise right now.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {swapOptions.map(alt => (
              <button key={alt.id} onClick={() => handleSwap(alt)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: 'none', borderRadius: 14, background: NB.lavenderMist, cursor: 'pointer', textAlign: 'left' }}>
                <ExerciseThumb src={resolveExerciseImage(alt, userProfile.equipment)} slot={alt.slot} size={40} radius={11} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: NB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alt.name}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>{alt.repsRange?.min ?? 8}–{alt.repsRange?.max ?? 12} reps · {alt.slot}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </>
  )
}
