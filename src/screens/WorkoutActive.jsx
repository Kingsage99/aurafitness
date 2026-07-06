import React, { useState, useEffect, useRef, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { fetchWorkoutHistory } from '../lib/social'
import { estimateStartingWeight } from '../utils/workoutBuilder'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

const SLOT_COLORS = {
  main:      NB.magenta,
  secondary: NB.blue,
  accessory: NB.yellow,
  orange:    NB.orange,
  finisher:  NB.pink,
}

function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function buildInitSets(exercises, userProfile, workoutHistory) {
  const init = {}
  ;(exercises || []).forEach((ex, i) => {
    const numSets   = ex.sets || 3
    const defaultR  = ex.reps || ex.repsRange?.min || 8
    const suggested = estimateStartingWeight({ exerciseId: ex.id, userProfile, workoutHistory })
    const weight    = suggested != null ? String(suggested) : ''
    init[i] = Array.from({ length: numSets }, () => ({ weight, reps: defaultR, done: false }))
  })
  return init
}

export default function WorkoutActive({ activeWorkout, userProfile, session, onWorkoutComplete, onNavigate }) {
  const exercises = activeWorkout?.exercises ?? []
  const label     = activeWorkout?.label ?? 'Workout'

  const [elapsed,     setElapsed]     = useState(0)
  const [exIdx,       setExIdx]       = useState(0)
  const [sets,        setSets]        = useState(() => buildInitSets(exercises))
  const chipsRef = useRef(null)
  const userEditedWeight = useRef(false)

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return
    fetchWorkoutHistory(userId).then(history => {
      // Skip if the user already started typing a weight while this was loading —
      // a wholesale replace would clobber what they've entered.
      if (userEditedWeight.current) return
      setSets(buildInitSets(exercises, userProfile, history))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (chipsRef.current) {
      const chip = chipsRef.current.children[exIdx]
      chip?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [exIdx])

  const curExercise = exercises[exIdx]
  const curSets     = sets[exIdx] || []
  const totalSets   = Object.values(sets).flat().length
  const doneSets    = Object.values(sets).flat().filter(s => s.done).length

  const completedExIdx = useMemo(() => {
    return new Set(
      Object.entries(sets)
        .filter(([, sArr]) => sArr.every(s => s.done))
        .map(([k]) => Number(k))
    )
  }, [sets])

  const allDone = exercises.length > 0 && completedExIdx.size === exercises.length
  const isLast  = exIdx === exercises.length - 1

  function toggleSet(setIdx) {
    setSets(prev => {
      const arr = [...(prev[exIdx] || [])]
      arr[setIdx] = { ...arr[setIdx], done: !arr[setIdx].done }
      return { ...prev, [exIdx]: arr }
    })
  }

  function updateSet(setIdx, field, value) {
    if (field === 'weight') userEditedWeight.current = true
    setSets(prev => {
      const arr = [...(prev[exIdx] || [])]
      arr[setIdx] = { ...arr[setIdx], [field]: value }
      return { ...prev, [exIdx]: arr }
    })
  }

  function addSet() {
    setSets(prev => {
      const arr = prev[exIdx] || []
      const last = arr[arr.length - 1] || { weight: '', reps: 8, done: false }
      return { ...prev, [exIdx]: [...arr, { weight: last.weight, reps: last.reps, done: false }] }
    })
  }

  function handleFinish() {
    const exercisesWithSets = exercises.map((ex, i) => ({ ...ex, loggedSets: sets[i] || [] }))
    onWorkoutComplete({
      workoutLabel: label,
      exercises: exercisesWithSets,
      elapsed,
      totalSets,
      setsCompleted: doneSets,
    })
    onNavigate('workoutComplete')
  }

  if (!curExercise) {
    return (
      <>
        <StatusBar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: '#555', fontSize: 14 }}>No workout loaded</p>
          <button onClick={() => onNavigate('workout')} style={btnStyle(NB.teal)}>Back to Workout</button>
        </div>
      </>
    )
  }

  const slotColor = SLOT_COLORS[curExercise.slot] || NB.ink

  return (
    <>
      <StatusBar />

      {/* Top bar */}
      <div style={{ padding: '10px 22px 8px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => onNavigate('workoutDetail')} style={{ background: NB.white, border: NB_BORDER, borderRadius: 11, boxShadow: hardShadow(2), width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: NB.ink }}>
          {label.replace(/^Day \d+ — /, '')}
        </div>
        {/* Timer */}
        <div style={{ background: NB.lavender, border: NB_BORDER, borderRadius: 12, padding: '6px 14px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span style={{ fontFamily: NB.fontMono, fontSize: 14, fontWeight: 800, color: NB.ink, fontVariantNumeric: 'tabular-nums' }}>{fmt(elapsed)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 22px 10px', flexShrink: 0 }}>
        <div style={{ height: 8, borderRadius: 4, border: `2px solid ${NB.ink}`, background: NB.white, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: NB.green, width: `${exercises.length ? (completedExIdx.size / exercises.length) * 100 : 0}%`, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#555' }}>{completedExIdx.size} of {exercises.length} complete</span>
          <span style={{ fontFamily: NB.fontMono, fontSize: 11, color: '#555' }}>{doneSets}/{totalSets} sets logged</span>
        </div>
      </div>

      {/* Exercise chips */}
      <div
        ref={chipsRef}
        style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 22px 12px', scrollbarWidth: 'none', flexShrink: 0 }}
      >
        {exercises.map((ex, i) => {
          const done    = completedExIdx.has(i)
          const active  = i === exIdx
          const color   = SLOT_COLORS[ex.slot] || NB.ink
          return (
            <button
              key={i}
              onClick={() => setExIdx(i)}
              style={{
                flexShrink: 0, padding: '7px 14px', border: `2.5px solid ${NB.ink}`, borderRadius: 12,
                background: active ? color : done ? NB.green : NB.white,
                fontFamily: NB.fontMono, fontSize: 12, fontWeight: 700, color: NB.ink,
                boxShadow: active ? hardShadow(2) : 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              {ex.name.length > 14 ? ex.name.slice(0, 13) + '…' : ex.name}
            </button>
          )
        })}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px' }}>

        {/* Exercise name + badge */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: slotColor, border: `1.5px solid ${NB.ink}`, borderRadius: 8, padding: '4px 10px', marginBottom: 8 }}>
            <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: NB.ink, textTransform: 'uppercase' }}>{curExercise.slot}</span>
          </div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.15, marginBottom: 4 }}>
            {curExercise.name}
          </div>
          {curExercise.muscles?.primary?.[0] && (
            <div style={{ fontSize: 13, color: '#555', textTransform: 'capitalize' }}>
              Primary: {curExercise.muscles.primary.join(', ')}
            </div>
          )}
        </div>

        {/* Form cues */}
        {curExercise.cues?.length > 0 && (
          <div style={{ border: NB_BORDER, borderRadius: 16, background: NB.yellow, padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: NB.ink, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Form Cues</div>
            {curExercise.cues.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: i < curExercise.cues.length - 1 ? 4 : 0 }}>
                <span style={{ fontWeight: 900, color: NB.ink }}>·</span>
                <span style={{ fontSize: 12, color: NB.ink, lineHeight: 1.4 }}>{c}</span>
              </div>
            ))}
          </div>
        )}

        {/* Set rows */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
            <span style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1, textTransform: 'uppercase', flex: 1 }}>Sets</span>
          </div>

          {/* Column headers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '0 4px' }}>
            <div style={{ width: 32, fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: '#555', textAlign: 'center' }}>SET</div>
            <div style={{ flex: 1, fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: '#555', textAlign: 'center' }}>KG</div>
            <div style={{ width: 14, fontSize: 10, color: 'transparent' }}>×</div>
            <div style={{ flex: 1, fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: '#555', textAlign: 'center' }}>REPS</div>
            <div style={{ width: 38 }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {curSets.map((s, si) => (
              <div
                key={si}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  border: `2px solid ${NB.ink}`, borderRadius: 12, padding: '10px 10px',
                  background: s.done ? NB.green : NB.white,
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 900, color: NB.ink }}>{si + 1}</span>
                </div>
                <input
                  type="number"
                  value={s.weight}
                  onChange={e => updateSet(si, 'weight', e.target.value)}
                  placeholder="0"
                  style={{ flex: 1, textAlign: 'center', border: `2px solid ${NB.ink}`, borderRadius: 8, padding: '7px 4px', fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, color: NB.ink, background: NB.white, outline: 'none', minWidth: 0 }}
                />
                <div style={{ fontSize: 14, fontWeight: 700, color: '#555', width: 14, textAlign: 'center', flexShrink: 0 }}>×</div>
                <input
                  type="number"
                  value={s.reps}
                  onChange={e => updateSet(si, 'reps', e.target.value)}
                  style={{ flex: 1, textAlign: 'center', border: `2px solid ${NB.ink}`, borderRadius: 8, padding: '7px 4px', fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, color: NB.ink, background: NB.white, outline: 'none', minWidth: 0 }}
                />
                <button
                  onClick={() => toggleSet(si)}
                  style={{ width: 38, height: 38, borderRadius: 10, border: `2px solid ${NB.ink}`, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.done ? NB.ink : NB.white, transition: 'all 0.15s' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.done ? NB.white : NB.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addSet}
            style={{ marginTop: 10, width: '100%', padding: '10px', border: `2.5px dashed ${NB.ink}`, borderRadius: 14, background: 'transparent', color: NB.ink, fontFamily: NB.fontMono, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Set
          </button>
        </div>

      </div>

      {/* Bottom nav buttons */}
      <div style={{ padding: '10px 22px 16px', flexShrink: 0, display: 'flex', gap: 10 }}>
        {exIdx > 0 && (
          <button
            onClick={() => setExIdx(i => i - 1)}
            style={{ flex: 1, padding: '13px', border: NB_BORDER, borderRadius: 14, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}
          >
            ← Prev
          </button>
        )}
        {!isLast ? (
          <button
            onClick={() => setExIdx(i => i + 1)}
            style={{ flex: 2, padding: '13px', border: NB_BORDER, borderRadius: 14, background: NB.teal, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', boxShadow: hardShadow(3) }}
          >
            Next Exercise →
          </button>
        ) : (
          <button
            onClick={handleFinish}
            style={{ flex: 2, padding: '13px', border: NB_BORDER, borderRadius: 14, background: allDone ? NB.green : NB.teal, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', boxShadow: hardShadow(3) }}
          >
            {allDone ? '✓ Finish Workout' : 'Finish Workout'}
          </button>
        )}
      </div>
    </>
  )
}

function btnStyle(bg) {
  return { padding: '12px 24px', border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(3), background: bg, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }
}
