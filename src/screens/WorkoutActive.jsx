import React, { useState, useEffect, useRef, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'

const SLOT_COLORS = {
  main:      '#7C3AED',
  secondary: '#3B82F6',
  accessory: '#F59E0B',
  finisher:  '#EC4899',
}

function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function buildInitSets(exercises) {
  const init = {}
  ;(exercises || []).forEach((ex, i) => {
    const numSets   = ex.sets || 3
    const defaultR  = ex.reps || ex.repsRange?.min || 8
    init[i] = Array.from({ length: numSets }, () => ({ weight: '', reps: defaultR, done: false }))
  })
  return init
}

export default function WorkoutActive({ activeWorkout, onWorkoutComplete, onNavigate }) {
  const exercises = activeWorkout?.exercises ?? []
  const label     = activeWorkout?.label ?? 'Workout'

  const [elapsed,     setElapsed]     = useState(0)
  const [exIdx,       setExIdx]       = useState(0)
  const [sets,        setSets]        = useState(() => buildInitSets(exercises))
  const chipsRef = useRef(null)

  // Timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Scroll active chip into view
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
    onWorkoutComplete({
      workoutLabel: label,
      exercises,
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
          <p style={{ color: '#8478A0', fontSize: 14 }}>No workout loaded</p>
          <button onClick={() => onNavigate('workout')} style={btnStyle('#7C3AED')}>Back to Workout</button>
        </div>
      </>
    )
  }

  const slotColor = SLOT_COLORS[curExercise.slot] || '#8478A0'

  return (
    <>
      <StatusBar />

      {/* Top bar */}
      <div style={{ padding: '10px 22px 8px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => onNavigate('workoutDetail')} style={{ background: '#F0E8FF', border: 'none', borderRadius: 12, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800, fontSize: 15, color: '#2E1065' }}>
          {label.replace(/^Day \d+ — /, '')}
        </div>
        {/* Timer */}
        <div style={{ background: '#2E1065', borderRadius: 20, padding: '6px 14px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmt(elapsed)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 22px 10px', flexShrink: 0 }}>
        <div style={{ height: 5, borderRadius: 4, background: '#EDE4F8', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, background: '#7C3AED', width: `${exercises.length ? (completedExIdx.size / exercises.length) * 100 : 0}%`, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: '#8478A0' }}>{completedExIdx.size} of {exercises.length} complete</span>
          <span style={{ fontSize: 11, color: '#8478A0' }}>{doneSets}/{totalSets} sets logged</span>
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
          const color   = SLOT_COLORS[ex.slot] || '#8478A0'
          return (
            <button
              key={i}
              onClick={() => setExIdx(i)}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 20, border: `2px solid ${active ? color : done ? '#4ADE80' : '#EDE4F8'}`,
                background: active ? `${color}18` : done ? '#DCFCE7' : '#fff',
                fontSize: 12, fontWeight: 700, color: active ? color : done ? '#16A34A' : '#8478A0',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              {ex.name.length > 14 ? ex.name.slice(0, 13) + '…' : ex.name}
            </button>
          )
        })}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px' }}>

        {/* Exercise name + badge */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${slotColor}18`, borderRadius: 10, padding: '4px 10px', marginBottom: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: slotColor }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: slotColor, textTransform: 'capitalize' }}>{curExercise.slot}</span>
          </div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#2E1065', lineHeight: 1.15, marginBottom: 4 }}>
            {curExercise.name}
          </div>
          {curExercise.muscles?.primary?.[0] && (
            <div style={{ fontSize: 13, color: '#8478A0', textTransform: 'capitalize' }}>
              Primary: {curExercise.muscles.primary.join(', ')}
            </div>
          )}
        </div>

        {/* Form cues */}
        {curExercise.cues?.length > 0 && (
          <div style={{ borderRadius: 14, background: 'linear-gradient(135deg, #F0E8FF, #F8F4FF)', padding: '10px 14px', marginBottom: 16, border: '1.5px solid #EDE4F8' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#7C3AED', marginBottom: 6, letterSpacing: 0.5 }}>FORM CUES</div>
            {curExercise.cues.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: i < curExercise.cues.length - 1 ? 4 : 0 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#7C3AED', marginTop: 5, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#5B3D8A', lineHeight: 1.4 }}>{c}</span>
              </div>
            ))}
          </div>
        )}

        {/* Set rows */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#8478A0', letterSpacing: 1, textTransform: 'uppercase', flex: 1 }}>Sets</span>
          </div>

          {/* Column headers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, padding: '0 4px' }}>
            <div style={{ width: 32, fontSize: 10, fontWeight: 700, color: '#8478A0', textAlign: 'center' }}>SET</div>
            <div style={{ flex: 1, fontSize: 10, fontWeight: 700, color: '#8478A0', textAlign: 'center' }}>KG</div>
            <div style={{ width: 14, fontSize: 10, color: 'transparent' }}>×</div>
            <div style={{ flex: 1, fontSize: 10, fontWeight: 700, color: '#8478A0', textAlign: 'center' }}>REPS</div>
            <div style={{ width: 38 }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {curSets.map((s, si) => (
              <div
                key={si}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  borderRadius: 14, padding: '10px 10px',
                  background: s.done ? '#F0FDF4' : '#fff',
                  border: `1.5px solid ${s.done ? '#86EFAC' : '#EDE4F8'}`,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 10, background: s.done ? '#4ADE8022' : `${slotColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: s.done ? '#16A34A' : slotColor }}>{si + 1}</span>
                </div>
                <input
                  type="number"
                  value={s.weight}
                  onChange={e => updateSet(si, 'weight', e.target.value)}
                  placeholder="0"
                  style={{ flex: 1, textAlign: 'center', border: `1.5px solid ${s.done ? '#86EFAC' : '#EDE4F8'}`, borderRadius: 10, padding: '7px 4px', fontSize: 15, fontWeight: 800, color: '#2E1065', background: 'transparent', outline: 'none', minWidth: 0 }}
                />
                <div style={{ fontSize: 14, fontWeight: 700, color: '#8478A0', width: 14, textAlign: 'center', flexShrink: 0 }}>×</div>
                <input
                  type="number"
                  value={s.reps}
                  onChange={e => updateSet(si, 'reps', e.target.value)}
                  style={{ flex: 1, textAlign: 'center', border: `1.5px solid ${s.done ? '#86EFAC' : '#EDE4F8'}`, borderRadius: 10, padding: '7px 4px', fontSize: 15, fontWeight: 800, color: '#2E1065', background: 'transparent', outline: 'none', minWidth: 0 }}
                />
                <button
                  onClick={() => toggleSet(si)}
                  style={{ width: 38, height: 38, borderRadius: 12, border: 'none', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.done ? '#4ADE80' : '#EDE4F8', transition: 'all 0.15s' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.done ? '#fff' : '#8478A0'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addSet}
            style={{ marginTop: 10, width: '100%', padding: '10px', borderRadius: 12, border: `1.5px dashed #EDE4F8`, background: 'transparent', color: '#7C3AED', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Set
          </button>
        </div>

      </div>

      {/* Bottom nav buttons */}
      <div style={{ padding: '10px 22px 16px', flexShrink: 0, display: 'flex', gap: 10 }}>
        {exIdx > 0 && (
          <button
            onClick={() => setExIdx(i => i - 1)}
            style={{ flex: 1, padding: '13px', borderRadius: 16, border: '1.5px solid #EDE4F8', background: '#fff', color: '#2E1065', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            ← Prev
          </button>
        )}
        {!isLast ? (
          <button
            onClick={() => setExIdx(i => i + 1)}
            style={{ flex: 2, padding: '13px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #7C3AED, #4C1D95)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,.28)' }}
          >
            Next Exercise →
          </button>
        ) : (
          <button
            onClick={handleFinish}
            style={{ flex: 2, padding: '13px', borderRadius: 16, border: 'none', background: allDone ? 'linear-gradient(135deg, #16A34A, #15803D)' : 'linear-gradient(135deg, #7C3AED, #4C1D95)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 14px ${allDone ? 'rgba(22,163,74,.28)' : 'rgba(124,58,237,.28)'}` }}
          >
            {allDone ? '✓ Finish Workout' : 'Finish Workout'}
          </button>
        )}
      </div>
    </>
  )
}

function btnStyle(bg) {
  return { padding: '12px 24px', borderRadius: 14, border: 'none', background: bg, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
}
