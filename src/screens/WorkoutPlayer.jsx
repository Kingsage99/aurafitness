import React, { useState, useEffect, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { BodyOutline, MUSCLE_MAP } from '../components/AvatarSilhouette'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import { NB, NB_BORDER, hardShadow, NB_INTENSITY_RAMP } from '../styles/neoBrutalism'

const FALLBACK_EXERCISES = [
  { name: 'Glute Bridge', sets: 3, reps: 12, muscles: { glutes: NB.red, legs: NB.orange }, target: 'Glutes · Hams', category: 'MAIN' },
  { name: 'Romanian Deadlift', sets: 4, reps: 10, muscles: { glutes: NB.orange, legs: NB.gold }, target: 'Glutes · Hams', category: 'MAIN' },
  { name: 'Sumo Squat', sets: 3, reps: 15, muscles: { legs: NB.red, glutes: NB.gold }, target: 'Quads · Glutes', category: 'MAIN' },
  { name: 'Lateral Lunges', sets: 3, reps: 12, muscles: { legs: NB.gold }, target: 'Quads · Adductors', category: 'SECONDARY' },
  { name: 'Cable Kickback', sets: 3, reps: 15, muscles: { glutes: NB.red }, target: 'Glutes', category: 'ACCESSORY' },
  { name: 'Calf Raises', sets: 4, reps: 20, muscles: { calves: NB.orange }, target: 'Calves', category: 'FINISHER' },
  { name: 'Plank', sets: 3, reps: '45s', muscles: { core: NB.gold }, target: 'Core', category: 'FINISHER' },
]

const CATEGORY_COLOR = { MAIN: NB.magenta, SECONDARY: NB.blue, ACCESSORY: NB.yellow, FINISHER: NB.pink }

function buildExerciseList(workout) {
  if (!workout || !workout.exercises || workout.exercises.length === 0) return FALLBACK_EXERCISES
  return workout.exercises.map(ex => ({
    name: ex.name || ex.id,
    sets: ex.sets,
    reps: ex.repsRange ? `${ex.repsRange.min}–${ex.repsRange.max}` : (ex.reps || 10),
    muscles: { [ex.muscles?.primary?.[0] || 'full body']: NB.red },
    target: ex.muscles?.primary?.join(' · ') || 'Full Body',
    category: ex.slot ? ex.slot.toUpperCase() : 'MAIN',
    image: ex.image || null,
  }))
}

export default function WorkoutPlayer({ workout, userProfile, onSwapExercise, onWorkoutComplete, onNavigate }) {
  const exercises = buildExerciseList(workout)

  const [view, setView] = useState('list') // 'list' | 'active'
  const [exerciseIdx, setExerciseIdx] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [restTimer, setRestTimer] = useState(null)
  const [restCount, setRestCount] = useState(45)
  const [completedSets, setCompletedSets] = useState({})
  const [completedExercises, setCompletedExercises] = useState(new Set())

  const exercise = exercises[exerciseIdx]
  const progress = (completedExercises.size / exercises.length) * 100

  useEffect(() => {
    if (!restTimer) return
    const interval = setInterval(() => {
      setRestCount(c => {
        if (c <= 1) { clearInterval(interval); setRestTimer(null); return 45 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [restTimer])

  const logSet = (setNum) => {
    const key = `${exerciseIdx}-${setNum}`
    setCompletedSets(prev => ({ ...prev, [key]: true }))
    if (setNum < exercise.sets) {
      setCurrentSet(setNum + 1)
      setRestCount(45)
      setRestTimer(true)
    } else {
      setCompletedExercises(prev => new Set([...prev, exerciseIdx]))
    }
  }

  const isSetDone = (setNum) => completedSets[`${exerciseIdx}-${setNum}`]

  const goToExercise = (idx) => {
    setExerciseIdx(idx)
    setCurrentSet(1)
    setRestTimer(null)
    setRestCount(45)
    setView('active')
  }

  const nextExercise = () => {
    if (exerciseIdx < exercises.length - 1) { goToExercise(exerciseIdx + 1) }
    else { if (onWorkoutComplete) onWorkoutComplete(); onNavigate('home') }
  }

  const prevExercise = () => {
    if (exerciseIdx > 0) { goToExercise(exerciseIdx - 1) }
  }

  const workoutName = workout?.name || 'Today\'s Workout'
  const totalMin = Math.round(exercises.length * 5.5)

  const workoutFrontColors = useMemo(() => {
    const counts = {}
    exercises.forEach(ex => {
      Object.keys(ex.muscles || {}).forEach(group => {
        MUSCLE_SVG_IDS[group]?.front?.forEach(id => { counts[id] = (counts[id] || 0) + 1 })
      })
    })
    const colors = {}
    Object.entries(counts).forEach(([id, n]) => {
      colors[id] = n >= 3 ? NB_INTENSITY_RAMP[4] : n >= 2 ? NB_INTENSITY_RAMP[3] : NB_INTENSITY_RAMP[1]
    })
    return colors
  }, [exercises])

  const workoutBackColors = useMemo(() => {
    const counts = {}
    exercises.forEach(ex => {
      Object.keys(ex.muscles || {}).forEach(group => {
        MUSCLE_SVG_IDS[group]?.back?.forEach(id => { counts[id] = (counts[id] || 0) + 1 })
      })
    })
    const colors = {}
    Object.entries(counts).forEach(([id, n]) => {
      colors[id] = n >= 3 ? NB_INTENSITY_RAMP[4] : n >= 2 ? NB_INTENSITY_RAMP[3] : NB_INTENSITY_RAMP[1]
    })
    return colors
  }, [exercises])

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <>
        <StatusBar />
        <div style={{ padding: '10px 22px 0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => onNavigate('home')} style={{ width: 38, height: 38, borderRadius: 12, border: NB_BORDER, boxShadow: hardShadow(2), background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.1 }}>{workoutName}</div>
            <div style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>{exercises.length} exercises · ~{totalMin} min</div>
          </div>
        </div>

        {/* Progress bar */}
        {completedExercises.size > 0 && (
          <div style={{ padding: '10px 22px 0', flexShrink: 0 }}>
            <div style={{ height: 8, borderRadius: 4, border: `2px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: NB.green, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#555', fontWeight: 700, marginTop: 4 }}>{completedExercises.size} of {exercises.length} done</div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 22px 0' }}>

          {/* Muscles today */}
          <div style={{ border: NB_BORDER, borderRadius: 18, background: NB.lavender, padding: '12px 16px', marginBottom: 14 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: NB.ink, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Muscles Today</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              <div style={{ width: 110, height: 185 }}>
                <MuscleSVG url="/muscle_map_front.svg" muscleColors={workoutFrontColors} />
              </div>
              <div style={{ width: 110, height: 185 }}>
                <MuscleSVG url="/muscle_map_back.svg" muscleColors={workoutBackColors} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {exercises.map((ex, idx) => {
              const done = completedExercises.has(idx)
              const catColor = CATEGORY_COLOR[ex.category] || NB.ink
              return (
                <button
                  key={idx}
                  onClick={() => goToExercise(idx)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: `2.5px solid ${NB.ink}`, borderRadius: 16, boxShadow: hardShadow(2), background: done ? NB.green : NB.white, cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, border: `2px solid ${NB.ink}`, background: done ? NB.ink : catColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {done
                      ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>
                      : <span style={{ fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, color: NB.ink }}>{idx + 1}</span>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: NB.ink }}>{ex.name}</div>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{ex.sets} sets · {ex.reps} reps</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, color: NB.ink, background: catColor, border: `1.5px solid ${NB.ink}`, borderRadius: 7, padding: '3px 8px' }}>{ex.category}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
                  </div>
                </button>
              )
            })}
          </div>
          <div style={{ height: 16 }} />
        </div>

        <div style={{ padding: '10px 22px 16px', flexShrink: 0 }}>
          <button
            onClick={() => goToExercise(0)}
            style={{ width: '100%', height: 56, border: NB_BORDER, borderRadius: 16, background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', boxShadow: hardShadow(5) }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={NB.white}><path d="M7 4v16l13-8z"/></svg>
            Start workout
          </button>
        </div>

        <BottomNav active="workout" onNavigate={onNavigate} />
      </>
    )
  }

  // ── ACTIVE / PLAYER VIEW ──────────────────────────────────────────────────
  return (
    <>
      <StatusBar />

      <div style={{ padding: '8px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button onClick={() => setView('list')} style={{ width: 38, height: 38, borderRadius: 12, border: NB_BORDER, boxShadow: hardShadow(2), background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6H5v14h14v-4M15 3h6v6M10 14L21 3"/></svg>
        </button>
        <div style={{ flex: 1, margin: '0 14px', height: 8, border: `2px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: NB.green, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontFamily: NB.fontMono, fontSize: 13, fontWeight: 800, color: NB.ink }}>{exerciseIdx + 1}/{exercises.length}</span>
      </div>

      <div style={{ padding: '14px 22px 4px', flexShrink: 0 }}>
        <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1, textTransform: 'uppercase' }}>{exercise.category} · Exercise {exerciseIdx + 1} of {exercises.length}</div>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 26, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.1, marginTop: 3 }}>{exercise.name}</div>
      </div>

      <div style={{ padding: '10px 22px 0', flexShrink: 0, display: 'flex', gap: 11 }}>
        <div style={{ flex: 1.5, border: NB_BORDER, borderRadius: 16, background: exercise.image ? NB.white : NB.yellow, height: 180, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {exercise.image
            ? <img src={exercise.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: NB.fontDisplay, fontSize: 32, opacity: 0.2, color: NB.ink }}>▶</span>
          }
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <span style={{ fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, color: NB.ink, background: NB.white, border: `1.5px solid ${NB.ink}`, borderRadius: 7, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill={NB.ink}><path d="M7 4v16l13-8z"/></svg>
              LOOP
            </span>
          </div>
          <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{ fontFamily: NB.fontMono, fontSize: 13, fontWeight: 700, color: NB.ink }}>{exercise.sets} sets · {exercise.reps} reps</span>
          </div>
        </div>

        <div style={{ flex: 1, border: NB_BORDER, borderRadius: 16, background: NB.lavender, height: 180, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ position: 'absolute', top: 9, left: 0, right: 0, textAlign: 'center', fontFamily: NB.fontMono, fontSize: 9, fontWeight: 800, color: NB.ink, letterSpacing: 1 }}>Target</span>
          <div style={{ marginTop: 12 }}>
            <BodyOutline muscleColors={exercise.muscles} height={140} />
          </div>
          <span style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', fontSize: 11, fontWeight: 800, color: NB.ink }}>{exercise.target}</span>
        </div>
      </div>

      <div style={{ padding: '14px 22px 0', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{exercise.sets} sets · {exercise.reps} reps</span>
          <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>{exercise.target}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {Array.from({ length: exercise.sets }, (_, i) => {
            const setNum = i + 1
            const done = isSetDone(setNum)
            const active = !done && setNum === currentSet
            return (
              <div
                key={setNum}
                onClick={() => !done && active && logSet(setNum)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', border: active ? `2.5px solid ${NB.ink}` : `2px solid ${NB.ink}`, borderRadius: 14, boxShadow: active ? hardShadow(2) : 'none', background: done ? NB.green : NB.white, opacity: !done && !active ? 0.55 : 1, cursor: active ? 'pointer' : 'default' }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 9, border: `1.5px solid ${NB.ink}`, background: done || active ? NB.ink : NB.white, color: done || active ? NB.white : NB.ink, fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{setNum}</div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: NB.ink }}>{exercise.reps} reps</span>
                {done
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4.5 4.5L19 8"/></svg>
                  : active ? <span style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: NB.ink, textTransform: 'uppercase' }}>Tap to log</span>
                  : null
                }
              </div>
            )
          })}
        </div>

        {restTimer && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', border: NB_BORDER, borderRadius: 14, background: NB.lavender }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: NB.ink }}>Rest · 0:{restCount.toString().padStart(2, '0')}</span>
            <button onClick={() => setRestTimer(null)} style={{ marginLeft: 'auto', fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: NB.ink, textTransform: 'uppercase', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Skip</button>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 22px 16px', flexShrink: 0, display: 'flex', gap: 12 }}>
        <button onClick={prevExercise} disabled={exerciseIdx === 0} style={{ flex: 1, height: 54, borderRadius: 14, border: NB_BORDER, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: exerciseIdx === 0 ? 'not-allowed' : 'pointer', opacity: exerciseIdx === 0 ? 0.5 : 1 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Prev
        </button>
        <button onClick={nextExercise} style={{ flex: 1.6, height: 54, borderRadius: 14, border: NB_BORDER, background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', boxShadow: hardShadow(4), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
          {exerciseIdx === exercises.length - 1 ? 'Finish' : 'Next exercise'}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </div>

      <BottomNav active="workout" onNavigate={onNavigate} />
    </>
  )
}
