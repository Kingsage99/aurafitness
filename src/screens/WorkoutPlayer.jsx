import React, { useState, useEffect, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { BodyOutline, MUSCLE_MAP } from '../components/AvatarSilhouette'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'

const FALLBACK_EXERCISES = [
  { name: 'Glute Bridge', sets: 3, reps: 12, muscles: { glutes: '#FF3B3B', legs: '#FF5A2F' }, target: 'Glutes · Hams', category: 'MAIN' },
  { name: 'Romanian Deadlift', sets: 4, reps: 10, muscles: { glutes: '#FF5A2F', legs: '#FFAA30' }, target: 'Glutes · Hams', category: 'MAIN' },
  { name: 'Sumo Squat', sets: 3, reps: 15, muscles: { legs: '#FF3B3B', glutes: '#FFAA30' }, target: 'Quads · Glutes', category: 'MAIN' },
  { name: 'Lateral Lunges', sets: 3, reps: 12, muscles: { legs: '#FFAA30' }, target: 'Quads · Adductors', category: 'SECONDARY' },
  { name: 'Cable Kickback', sets: 3, reps: 15, muscles: { glutes: '#FF3B3B' }, target: 'Glutes', category: 'ACCESSORY' },
  { name: 'Calf Raises', sets: 4, reps: 20, muscles: { calves: '#FF5A2F' }, target: 'Calves', category: 'FINISHER' },
  { name: 'Plank', sets: 3, reps: '45s', muscles: { core: '#FFAA30' }, target: 'Core', category: 'FINISHER' },
]

const CATEGORY_COLOR = { MAIN: '#7C3AED', SECONDARY: '#0EA5E9', ACCESSORY: '#F59E0B', FINISHER: '#DB2777' }

function buildExerciseList(workout) {
  if (!workout || !workout.exercises || workout.exercises.length === 0) return FALLBACK_EXERCISES
  return workout.exercises.map(ex => ({
    name: ex.name || ex.id,
    sets: ex.sets,
    reps: ex.repsRange ? `${ex.repsRange.min}–${ex.repsRange.max}` : (ex.reps || 10),
    muscles: { [ex.muscles?.primary?.[0] || 'full body']: '#FF3B3B' },
    target: ex.muscles?.primary?.join(' · ') || 'Full Body',
    category: ex.slot ? ex.slot.toUpperCase() : 'MAIN',
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

  // Build muscle color maps for the "Muscles today" overview
  const workoutFrontColors = useMemo(() => {
    const counts = {}
    exercises.forEach(ex => {
      Object.keys(ex.muscles || {}).forEach(group => {
        MUSCLE_SVG_IDS[group]?.front?.forEach(id => { counts[id] = (counts[id] || 0) + 1 })
      })
    })
    const colors = {}
    Object.entries(counts).forEach(([id, n]) => {
      colors[id] = n >= 3 ? '#FF3B3B' : n >= 2 ? '#FFAA30' : '#4ADE80'
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
      colors[id] = n >= 3 ? '#FF3B3B' : n >= 2 ? '#FFAA30' : '#4ADE80'
    })
    return colors
  }, [exercises])

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <>
        <StatusBar />
        <div style={{ padding: '10px 22px 0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => onNavigate('home')} style={{ width: 38, height: 38, borderRadius: '50%', background: '#fff', boxShadow: '0 4px 14px rgba(76,36,120,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E1065" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#2E1065', lineHeight: 1.1 }}>{workoutName}</div>
            <div style={{ fontSize: 12, color: '#8478A0', fontWeight: 600 }}>{exercises.length} exercises · ~{totalMin} min</div>
          </div>
        </div>

        {/* Progress bar */}
        {completedExercises.size > 0 && (
          <div style={{ padding: '10px 22px 0', flexShrink: 0 }}>
            <div style={{ height: 7, borderRadius: 4, background: '#E9DAF7', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#7C3AED', borderRadius: 4, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#8478A0', fontWeight: 700, marginTop: 4 }}>{completedExercises.size} of {exercises.length} done</div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 22px 0' }}>

          {/* Muscles today */}
          <div style={{ borderRadius: 20, background: '#1E1430', padding: '12px 16px', marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#C9B7E8', letterSpacing: '.5px', marginBottom: 8 }}>MUSCLES TODAY</div>
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
              const catColor = CATEGORY_COLOR[ex.category] || '#7C3AED'
              return (
                <button
                  key={idx}
                  onClick={() => goToExercise(idx)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 20, background: done ? '#F3E8FF' : '#fff', border: `1.5px solid ${done ? '#D8B4FE' : '#EDE4F8'}`, boxShadow: '0 4px 12px rgba(76,36,120,.05)', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: done ? '#7C3AED' : `${catColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {done
                      ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6"/></svg>
                      : <span style={{ fontSize: 13, fontWeight: 800, color: catColor }}>{idx + 1}</span>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#2E1065' }}>{ex.name}</div>
                    <div style={{ fontSize: 12, color: '#8478A0', marginTop: 2 }}>{ex.sets} sets · {ex.reps} reps</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: catColor, background: `${catColor}18`, padding: '3px 8px', borderRadius: 999 }}>{ex.category}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4B0E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
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
            style={{ width: '100%', height: 56, borderRadius: 18, background: 'linear-gradient(135deg,#5B21B6,#7C3AED)', color: '#fff', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: 'none', cursor: 'pointer', boxShadow: '0 14px 30px rgba(124,58,237,.36)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M7 4v16l13-8z"/></svg>
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
        <button onClick={() => setView('list')} style={{ width: 38, height: 38, borderRadius: '50%', background: '#fff', boxShadow: '0 4px 14px rgba(76,36,120,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E1065" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6H5v14h14v-4M15 3h6v6M10 14L21 3"/></svg>
        </button>
        <div style={{ flex: 1, margin: '0 14px', height: 7, borderRadius: 4, background: '#E9DAF7', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#7C3AED', borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#7C3AED' }}>{exerciseIdx + 1}/{exercises.length}</span>
      </div>

      <div style={{ padding: '14px 22px 4px', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#A99BC4', letterSpacing: '.4px' }}>{exercise.category} · EXERCISE {exerciseIdx + 1} OF {exercises.length}</div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#2E1065', lineHeight: 1.1, marginTop: 3 }}>{exercise.name}</div>
      </div>

      <div style={{ padding: '10px 22px 0', flexShrink: 0, display: 'flex', gap: 11 }}>
        <div style={{ flex: 1.5, borderRadius: 20, background: 'linear-gradient(150deg,#EAD9FF,#F7ECFF)', height: 180, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, opacity: 0.15, color: '#7C3AED' }}>▶</span>
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#7C3AED', background: '#fff', padding: '4px 8px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#7C3AED"><path d="M7 4v16l13-8z"/></svg>
              LOOP
            </span>
          </div>
          <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#5B3D8A' }}>{exercise.sets} sets · {exercise.reps} reps</span>
          </div>
        </div>

        <div style={{ flex: 1, borderRadius: 20, background: '#1E1430', height: 180, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ position: 'absolute', top: 9, left: 0, right: 0, textAlign: 'center', fontSize: 9, fontWeight: 800, color: '#C9B7E8', letterSpacing: '.5px' }}>TARGET</span>
          <div style={{ marginTop: 12 }}>
            <BodyOutline muscleColors={exercise.muscles} height={140} />
          </div>
          <span style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>{exercise.target}</span>
        </div>
      </div>

      <div style={{ padding: '14px 22px 0', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#2E1065' }}>{exercise.sets} sets · {exercise.reps} reps</span>
          <span style={{ fontSize: 12, color: '#8478A0', fontWeight: 600 }}>{exercise.target}</span>
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
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 16, background: done ? '#F3E8FF' : '#fff', border: active ? '2px solid #7C3AED' : 'none', boxShadow: active ? '0 6px 14px rgba(124,58,237,.12)' : 'none', opacity: !done && !active ? 0.6 : 1, cursor: active ? 'pointer' : 'default', transition: 'all 0.2s' }}
              >
                <div style={{ width: 26, height: 26, borderRadius: 8, background: done ? '#7C3AED' : active ? '#7C3AED' : '#E9E2F2', color: done || active ? '#fff' : '#A99BC4', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{setNum}</div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: done ? '#2E1065' : active ? '#2E1065' : '#A99BC4' }}>{exercise.reps} reps</span>
                {done
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="#7C3AED"><circle cx="12" cy="12" r="11"/><path d="M5 12l4.5 4.5L19 8" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : active ? <span style={{ fontSize: 12, fontWeight: 800, color: '#7C3AED' }}>Tap to log</span>
                  : null
                }
              </div>
            )
          })}
        </div>

        {restTimer && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 16, background: '#EDE4FF' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#5B3D8A' }}>Rest · 0:{restCount.toString().padStart(2, '0')}</span>
            <button onClick={() => setRestTimer(null)} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer' }}>Skip</button>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 22px 16px', flexShrink: 0, display: 'flex', gap: 12 }}>
        <button onClick={prevExercise} disabled={exerciseIdx === 0} style={{ flex: 1, height: 54, borderRadius: 18, background: '#F0E8FB', color: '#6D28D9', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, border: 'none', cursor: exerciseIdx === 0 ? 'not-allowed' : 'pointer', opacity: exerciseIdx === 0 ? 0.5 : 1 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Prev
        </button>
        <button onClick={nextExercise} style={{ flex: 1.6, height: 54, borderRadius: 18, background: '#7C3AED', color: '#fff', fontWeight: 800, fontSize: 15, boxShadow: '0 12px 26px rgba(124,58,237,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', cursor: 'pointer' }}>
          {exerciseIdx === exercises.length - 1 ? 'Finish' : 'Next exercise'}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </div>

      <BottomNav active="workout" onNavigate={onNavigate} />
    </>
  )
}
