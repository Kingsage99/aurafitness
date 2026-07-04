import React, { useState, useMemo } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import allExercises from '../data/exercises.json'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

const SLOT_COLORS = {
  main:      NB.magenta,
  secondary: NB.blue,
  accessory: NB.yellow,
  finisher:  NB.pink,
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
    MUSCLE_SVG_IDS[group.id]?.[group.side]?.forEach(id => { mc[id] = NB.ink })
    return mc
  }, [group.id, group.side])

  return (
    <div
      onClick={() => onToggle(group.id)}
      style={{
        overflow: 'hidden', cursor: 'pointer',
        border: `2.5px solid ${NB.ink}`,
        background: selected ? NB.teal : NB.white,
        boxShadow: selected ? hardShadow(3) : hardShadow(1),
        position: 'relative',
      }}
    >
      {selected && (
        <div style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, border: `2px solid ${NB.ink}`, background: NB.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      )}
      <div style={{ height: 80, background: NB.cream, overflow: 'hidden' }}>
        <MuscleSVG url={group.url} muscleColors={colors} />
      </div>
      <div style={{ padding: '8px 6px 10px', textAlign: 'center' }}>
        <span style={{ fontFamily: NB.fontDisplay, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{group.label}</span>
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
        <button onClick={() => onNavigate('workout')} style={{ background: NB.white, border: NB_BORDER, boxShadow: hardShadow(2), width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink, flex: 1 }}>Create Workout</div>
        <button
          onClick={handleSave}
          disabled={!myExercises.length}
          style={{ padding: '8px 16px', border: `2px solid ${NB.ink}`, boxShadow: myExercises.length ? hardShadow(2) : 'none', background: myExercises.length ? NB.teal : NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', cursor: myExercises.length ? 'pointer' : 'default' }}
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
            style={{ width: '100%', padding: '13px 16px', border: NB_BORDER, fontSize: 15, color: NB.ink, fontFamily: NB.fontDisplay, background: NB.white, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Muscle group picker */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
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
            <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Exercises — tap + to add
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredExercises.map(ex => {
                const added = myExIds.has(ex.id)
                const color = SLOT_COLORS[ex.slot] || NB.ink
                return (
                  <div key={ex.id} style={{ border: `2px solid ${NB.ink}`, boxShadow: hardShadow(1), padding: '10px 12px', background: NB.white, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, border: `1.5px solid ${NB.ink}`, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: NB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                      <div style={{ fontSize: 11, color: '#555' }}>{ex.repsRange?.min ?? 8}–{ex.repsRange?.max ?? 12} reps · {ex.slot}</div>
                    </div>
                    <button
                      onClick={() => added ? removeExercise(ex.id) : addExercise(ex)}
                      style={{ width: 34, height: 34, border: `2px solid ${NB.ink}`, background: added ? NB.ink : NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      {added
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
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
            <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
              Your Workout
            </div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>{myExercises.length} exercises · ~{duration} min</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myExercises.map((ex, i) => (
                <div key={ex.id} style={{ border: `2px solid ${NB.ink}`, boxShadow: hardShadow(1), padding: '10px 12px', background: NB.yellow, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, border: `1.5px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: NB.fontDisplay, fontSize: 12, fontWeight: 900, color: NB.ink }}>{i + 1}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: NB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                    <div style={{ fontSize: 11, color: NB.ink }}>{ex.sets} sets × {ex.reps} reps</div>
                  </div>
                  <button
                    onClick={() => removeExercise(ex.id)}
                    style={{ width: 28, height: 28, border: `1.5px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedMGs.size && (
          <div style={{ textAlign: 'center', padding: '32px 20px', background: NB.white, border: `2.5px dashed ${NB.ink}` }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💪</div>
            <div style={{ fontSize: 14, color: '#555', lineHeight: 1.5 }}>
              Select one or more muscle groups above to see exercises
            </div>
          </div>
        )}

        {/* Save button */}
        {myExercises.length > 0 && (
          <button
            onClick={handleSave}
            style={{ width: '100%', padding: '15px', border: NB_BORDER, boxShadow: hardShadow(4), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Save Workout ({myExercises.length} exercises)
          </button>
        )}

      </div>

      <BottomNav active="workout" onNavigate={onNavigate} />
    </>
  )
}
