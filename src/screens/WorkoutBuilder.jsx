import React, { useState, useMemo, useRef } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import ExerciseThumb, { SLOT_COLORS } from '../components/ExerciseThumb'
import { uploadExerciseImage } from '../lib/social'
import allExercises from '../data/exercises.json'
import { NB, NB_BORDER, hardShadow } from '../styles/neoBrutalism'

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

const EQUIPMENT_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'bands', label: 'Bands' },
  { id: 'gym', label: 'Gym' },
]

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
        borderRadius: 14,
        background: selected ? NB.teal : NB.white,
        boxShadow: selected ? hardShadow(3) : hardShadow(1),
        position: 'relative',
      }}
    >
      {selected && (
        <div style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 6, border: `2px solid ${NB.ink}`, background: NB.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
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

export default function WorkoutBuilder({ onSaveWorkout, onNavigate, postSaveScreen = 'workout', isOnboarding = false, userId, customExercises = [], onAddCustomExercise }) {
  const [workoutName,  setWorkoutName]  = useState('')
  const [selectedMGs,  setSelectedMGs]  = useState(new Set())
  const [myExercises,  setMyExercises]  = useState([])

  const [showAddForm,     setShowAddForm]     = useState(false)
  const [customName,      setCustomName]      = useState('')
  const [customMGs,       setCustomMGs]       = useState(new Set())
  const [customEquipment, setCustomEquipment] = useState(new Set(['none']))
  const [customImage,     setCustomImage]     = useState(null)
  const [uploading,       setUploading]       = useState(false)
  const fileInputRef = useRef(null)

  const exercisePool = useMemo(() => [...allExercises, ...customExercises], [customExercises])

  const filteredExercises = useMemo(() => {
    if (!selectedMGs.size) return []
    return exercisePool.filter(ex => {
      const primaries = (ex.muscles?.primary || []).map(m => m.toLowerCase())
      return [...selectedMGs].some(gId =>
        GROUP_TO_MUSCLES[gId]?.some(m => primaries.includes(m))
      )
    })
  }, [selectedMGs, exercisePool])

  const myExIds = useMemo(() => new Set(myExercises.map(e => e.id)), [myExercises])

  function toggleMuscle(id) {
    setSelectedMGs(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleCustomMuscle(id) {
    setCustomMGs(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleCustomEquipment(id) {
    setCustomEquipment(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      if (next.size === 0) next.add('none')
      return next
    })
  }

  async function handleImagePick(e) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploading(true)
    const url = await uploadExerciseImage(userId, file)
    if (url) setCustomImage(url)
    setUploading(false)
  }

  function handleSaveCustomExercise() {
    if (!customName.trim() || !customMGs.size) return
    const primary = [...customMGs].map(g => GROUP_TO_MUSCLES[g]?.[0]).filter(Boolean)
    const id = `custom-${customName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
    onAddCustomExercise?.({
      id,
      name: customName.trim(),
      muscles: { primary, secondary: [], other: [] },
      equipment: [...customEquipment],
      difficulty: ['starter', 'intermediate', 'advanced'],
      slot: 'accessory',
      repsRange: { min: 8, max: 12 },
      injuries_avoid: [],
      custom: true,
      image: customImage,
    })
    setCustomName(''); setCustomMGs(new Set()); setCustomEquipment(new Set(['none'])); setCustomImage(null)
    setShowAddForm(false)
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
    onNavigate(postSaveScreen)
  }

  const duration = estimateDuration(myExercises)

  return (
    <>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '10px 22px 10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        {!isOnboarding && (
          <button onClick={() => onNavigate('workout')} style={{ background: NB.white, border: NB_BORDER, borderRadius: 11, boxShadow: hardShadow(2), width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: NB.ink, flex: 1 }}>Create Workout</div>
        <button
          onClick={handleSave}
          disabled={!myExercises.length}
          style={{ padding: '8px 16px', border: `2px solid ${NB.ink}`, borderRadius: 12, boxShadow: myExercises.length ? hardShadow(2) : 'none', background: myExercises.length ? NB.teal : NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', cursor: myExercises.length ? 'pointer' : 'default' }}
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
            style={{ width: '100%', padding: '13px 16px', border: NB_BORDER, borderRadius: 14, fontSize: 15, color: NB.ink, fontFamily: NB.fontDisplay, background: NB.white, outline: 'none', boxSizing: 'border-box' }}
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
                return (
                  <div key={ex.id} style={{ border: `2px solid ${NB.ink}`, borderRadius: 14, boxShadow: hardShadow(1), padding: '10px 12px', background: NB.white, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ExerciseThumb src={ex.image} slot={ex.slot} size={34} radius={10} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: NB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                      <div style={{ fontSize: 11, color: '#555' }}>{ex.repsRange?.min ?? 8}–{ex.repsRange?.max ?? 12} reps · {ex.slot}</div>
                    </div>
                    <button
                      onClick={() => added ? removeExercise(ex.id) : addExercise(ex)}
                      style={{ width: 34, height: 34, borderRadius: 10, border: `2px solid ${NB.ink}`, background: added ? NB.ink : NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
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

        {/* Add your own exercise */}
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => setShowAddForm(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `2.5px dashed ${NB.ink}`, borderRadius: 14, background: NB.white, cursor: 'pointer' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <span style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', color: NB.ink }}>Add your own exercise</span>
          </button>
        </div>

        {/* My Workout list */}
        {myExercises.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
              Your Workout
            </div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>{myExercises.length} exercises · ~{duration} min</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myExercises.map((ex, i) => (
                <div key={ex.id} style={{ border: `2px solid ${NB.ink}`, borderRadius: 14, boxShadow: hardShadow(1), padding: '10px 12px', background: NB.yellow, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <ExerciseThumb src={ex.image} slot={ex.slot} size={28} radius={9} />
                    <span style={{ position: 'absolute', bottom: -4, right: -4, width: 15, height: 15, borderRadius: 5, border: `1.5px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: NB.fontDisplay, fontSize: 9, fontWeight: 900, color: NB.ink }}>{i + 1}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: NB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                    <div style={{ fontSize: 11, color: NB.ink }}>{ex.sets} sets × {ex.reps} reps</div>
                  </div>
                  <button
                    onClick={() => removeExercise(ex.id)}
                    style={{ width: 28, height: 28, borderRadius: 9, border: `1.5px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
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
          <div style={{ textAlign: 'center', padding: '32px 20px', background: NB.white, border: `2.5px dashed ${NB.ink}`, borderRadius: 18 }}>
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
            style={{ width: '100%', padding: '15px', border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(4), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Save Workout ({myExercises.length} exercises)
          </button>
        )}

      </div>

      {/* Add your own exercise — sheet */}
      {showAddForm && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', zIndex: 20 }} onClick={() => setShowAddForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: '85%', overflowY: 'auto', background: NB.cream, border: `2.5px solid ${NB.ink}`, borderRadius: '20px 20px 0 0', padding: '18px 22px 26px', boxSizing: 'border-box' }}>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', color: NB.ink, marginBottom: 14 }}>
              Add Your Own Exercise
            </div>

            <input
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="Exercise name"
              style={{ width: '100%', padding: '13px 16px', border: NB_BORDER, borderRadius: 14, fontSize: 15, color: NB.ink, fontFamily: NB.fontDisplay, background: NB.white, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />

            <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Target muscle(s)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {MUSCLE_GROUPS.map(g => {
                const sel = customMGs.has(g.id)
                return (
                  <button key={g.id} onClick={() => toggleCustomMuscle(g.id)} style={{ padding: '8px 14px', border: `2px solid ${NB.ink}`, borderRadius: 11, background: sel ? NB.teal : NB.white, fontFamily: NB.fontDisplay, fontSize: 12, fontWeight: 800, color: NB.ink, cursor: 'pointer' }}>
                    {g.label}
                  </button>
                )
              })}
            </div>

            <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Equipment</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {EQUIPMENT_OPTIONS.map(eq => {
                const sel = customEquipment.has(eq.id)
                return (
                  <button key={eq.id} onClick={() => toggleCustomEquipment(eq.id)} style={{ padding: '8px 14px', border: `2px solid ${NB.ink}`, borderRadius: 11, background: sel ? NB.teal : NB.white, fontFamily: NB.fontDisplay, fontSize: 12, fontWeight: 800, color: NB.ink, cursor: 'pointer' }}>
                    {eq.label}
                  </button>
                )
              })}
            </div>

            <div style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Photo (optional)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <ExerciseThumb src={customImage} slot="accessory" size={52} radius={12} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ padding: '10px 16px', border: `2px solid ${NB.ink}`, borderRadius: 12, background: NB.white, fontFamily: NB.fontDisplay, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, cursor: uploading ? 'default' : 'pointer' }}
              >
                {uploading ? 'Uploading…' : customImage ? 'Change photo' : 'Upload photo'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} style={{ display: 'none' }} />
            </div>

            <button
              onClick={handleSaveCustomExercise}
              disabled={!customName.trim() || !customMGs.size}
              style={{
                width: '100%', height: 50, borderRadius: 16, border: NB_BORDER,
                boxShadow: (customName.trim() && customMGs.size) ? hardShadow(4) : 'none',
                background: (customName.trim() && customMGs.size) ? NB.magenta : NB.white,
                color: (customName.trim() && customMGs.size) ? NB.white : '#999',
                fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase',
                cursor: (customName.trim() && customMGs.size) ? 'pointer' : 'default',
              }}
            >
              Save Exercise
            </button>
          </div>
        </div>
      )}

      {!isOnboarding && <BottomNav active="workout" onNavigate={onNavigate} />}
    </>
  )
}
