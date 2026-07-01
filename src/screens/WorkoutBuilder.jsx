import React, { useState, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import allExercises from '../data/exercises.json'

const SLOT_COLORS = {
  main:      '#7C3AED',
  secondary: '#3B82F6',
  accessory: '#F59E0B',
  finisher:  '#EC4899',
}

const MUSCLE_GROUPS = [
  { id: 'glutes',    label: 'Glutes',    url: '/muscle_map_back.svg',  side: 'back' },
  { id: 'legs',      label: 'Legs',      url: '/muscle_map_front.svg', side: 'front' },
  { id: 'core',      label: 'Core',      url: '/muscle_map_front.svg', side: 'front' },
  { id: 'back',      label: 'Back',      url: '/muscle_map_back.svg',  side: 'back' },
  { id: 'arms',      label: 'Arms',      url: '/muscle_map_front.svg', side: 'front' },
  { id: 'chest',     label: 'Chest',     url: '/muscle_map_front.svg', side: 'front' },
  { id: 'shoulders', label: 'Shoulders', url: '/muscle_map_back.svg',  side: 'back' },
  { id: 'calves',    label: 'Calves',    url: '/muscle_map_back.svg',  side: 'back' },
]

// Map group id → primary muscle names in exercises.json
const GROUP_TO_MUSCLES = {
  glutes:    ['glutes', 'glute'],
  legs:      ['hamstrings', 'quads', 'legs'],
  core:      ['core', 'abs'],
  back:      ['back', 'lats', 'lat'],
  arms:      ['biceps', 'triceps', 'arms'],
  chest:     ['chest', 'pecs'],
  shoulders: ['shoulders', 'delts'],
  calves:    ['calves'],
}

function estimateDuration(exercises) {
  if (!exercises.length) return 0
  return Math.max(15, exercises.reduce((acc, ex) => acc + (ex.sets || 3) * 2, 0) + 5)
}

function MuscleGroupCard({ group, selected, onToggle }) {
  const colors = useMemo(() => {
    const mc = {}
    MUSCLE_SVG_IDS[group.id]?.[group.side]?.forEach(id => { mc[id] = '#7C3AED' })
    return mc
  }, [group.id, group.side])

  return (
    <div
      onClick={() => onToggle(group.id)}
      style={{
        borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        border: `2px solid ${selected ? '#7C3AED' : '#EDE4F8'}`,
        background: selected ? '#F0E8FF' : '#fff',
        boxShadow: selected ? '0 4px 14px rgba(124,58,237,.16)' : '0 2px 6px rgba(76,36,120,.04)',
        transition: 'all 0.15s', position: 'relative',
      }}
    >
      {selected && (
        <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      )}
      <div style={{ height: 80, background: '#F8F4FF', overflow: 'hidden' }}>
        <MuscleSVG url={group.url} muscleColors={colors} />
      </div>
      <div style={{ padding: '8px 6px 10px', textAlign: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: selected ? '#7C3AED' : '#2E1065' }}>{group.label}</span>
      </div>
    </div>
  )
}

export default function WorkoutBuilder({ onSaveWorkout, onNavigate }) {
  const [workoutName,  setWorkoutName]  = useState('')
  const [selectedMGs,  setSelectedMGs]  = useState(new Set())
  const [myExercises,  setMyExercises]  = useState([])

  const filteredExercises = useMemo(() => {
    if (!selectedMGs.size) return []
    return allExercises.filter(ex => {
      const primaries = (ex.muscles?.primary || []).map(m => m.toLowerCase())
      return [...selectedMGs].some(gId =>
        GROUP_TO_MUSCLES[gId]?.some(m => primaries.includes(m))
      )
    })
  }, [selectedMGs])

  const myExIds = useMemo(() => new Set(myExercises.map(e => e.id)), [myExercises])

  function toggleMuscle(id) {
    setSelectedMGs(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function addExercise(ex) {
    if (!myExIds.has(ex.id)) {
      setMyExercises(prev => [...prev, { ...ex, sets: 3, reps: ex.repsRange?.min || 8 }])
    }
  }

  function removeExercise(id) {
    setMyExercises(prev => prev.filter(e => e.id !== id))
  }

  function handleSave() {
    if (!myExercises.length) return
    const name = workoutName.trim() || 'My Workout'
    onSaveWorkout({ label: name, exercises: myExercises })
    onNavigate('workout')
  }

  const duration = estimateDuration(myExercises)

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '10px 22px 10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => onNavigate('workout')} style={{ background: '#F0E8FF', border: 'none', borderRadius: 12, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#2E1065', flex: 1 }}>Create Workout</div>
        <button
          onClick={handleSave}
          disabled={!myExercises.length}
          style={{ padding: '8px 16px', borderRadius: 12, border: 'none', background: myExercises.length ? '#7C3AED' : '#EDE4F8', color: myExercises.length ? '#fff' : '#8478A0', fontSize: 13, fontWeight: 800, cursor: myExercises.length ? 'pointer' : 'default' }}
        >
          Save
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 20px' }}>

        {/* Workout name */}
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            value={workoutName}
            onChange={e => setWorkoutName(e.target.value)}
            placeholder="Workout name (e.g. Glute Finisher)"
            style={{ width: '100%', padding: '13px 16px', borderRadius: 14, border: '1.5px solid #EDE4F8', fontSize: 15, color: '#2E1065', fontFamily: 'inherit', background: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Muscle group picker */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#8478A0', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10 }}>
            Pick Target Muscles
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {MUSCLE_GROUPS.map(g => (
              <MuscleGroupCard
                key={g.id}
                group={g}
                selected={selectedMGs.has(g.id)}
                onToggle={toggleMuscle}
              />
            ))}
          </div>
        </div>

        {/* Exercise picker */}
        {filteredExercises.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#8478A0', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10 }}>
              Exercises — tap + to add
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredExercises.map(ex => {
                const added = myExIds.has(ex.id)
                const color = SLOT_COLORS[ex.slot] || '#8478A0'
                return (
                  <div key={ex.id} style={{ borderRadius: 14, padding: '10px 12px', background: '#fff', border: `1.5px solid ${added ? '#7C3AED44' : '#EDE4F8'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#2E1065', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                      <div style={{ fontSize: 11, color: '#8478A0' }}>{ex.repsRange?.min ?? 8}–{ex.repsRange?.max ?? 12} reps · {ex.slot}</div>
                    </div>
                    <button
                      onClick={() => added ? removeExercise(ex.id) : addExercise(ex)}
                      style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: added ? '#7C3AED' : '#F0E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      {added
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      }
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* My Workout list */}
        {myExercises.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#8478A0', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 4 }}>
              Your Workout
            </div>
            <div style={{ fontSize: 12, color: '#8478A0', marginBottom: 10 }}>{myExercises.length} exercises · ~{duration} min</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myExercises.map((ex, i) => (
                <div key={ex.id} style={{ borderRadius: 14, padding: '10px 12px', background: '#F0E8FF', border: '1.5px solid #DDD0FA', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>{i + 1}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#2E1065', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                    <div style={{ fontSize: 11, color: '#7C3AED' }}>{ex.sets} sets × {ex.reps} reps</div>
                  </div>
                  <button
                    onClick={() => removeExercise(ex.id)}
                    style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#7C3AED22', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedMGs.size && (
          <div style={{ textAlign: 'center', padding: '32px 20px', background: '#F8F4FF', borderRadius: 18, border: '1.5px solid #EDE4F8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💪</div>
            <div style={{ fontSize: 14, color: '#8478A0', lineHeight: 1.5 }}>
              Select one or more muscle groups above to see exercises
            </div>
          </div>
        )}

        {/* Save button */}
        {myExercises.length > 0 && (
          <button
            onClick={handleSave}
            style={{ width: '100%', padding: '15px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #7C3AED, #4C1D95)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 18px rgba(124,58,237,.3)' }}
          >
            Save Workout ({myExercises.length} exercises)
          </button>
        )}

      </div>

      <BottomNav active="workout" onNavigate={onNavigate} />
    </>
  )
}
