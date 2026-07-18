import React, { useState, useMemo, useRef } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import MuscleSVG, { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import ExerciseThumb, { SLOT_COLORS } from '../components/ExerciseThumb'
import { uploadExerciseImage } from '../lib/social'
import ImageCropSheet from '../components/ImageCropSheet'
import { estimateDuration, resolveExerciseImage } from '../utils/workoutBuilder'
import { toDisplayWeight, fromDisplayWeight, weightUnitLabel } from '../utils/units'
import allExercises from '../data/exercises.json'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'

// focusViewBox tightly crops the full-body silhouette (base viewBox '640 0 640 1080')
// down to just the region where this muscle group sits, for the zoomed-in tile/carousel card.
const MUSCLE_GROUPS = [
  { id: 'glutes',     label: 'Glutes',     url: '/muscle_map_back.svg',  side: 'back',  focusViewBox: '640 470 640 380' },
  { id: 'hamstrings', label: 'Hamstrings', url: '/muscle_map_back.svg',  side: 'back',  focusViewBox: '640 550 640 350' },
  { id: 'quads',      label: 'Quads',      url: '/muscle_map_front.svg', side: 'front', focusViewBox: '640 520 640 350' },
  { id: 'adductors',  label: 'Adductors',  url: '/muscle_map_front.svg', side: 'front', focusViewBox: '640 520 640 350' },
  { id: 'abductors',  label: 'Abductors',  url: '/muscle_map_front.svg', side: 'front', focusViewBox: '640 500 640 350' },
  { id: 'calves',     label: 'Calves',     url: '/muscle_map_back.svg',  side: 'back',  focusViewBox: '640 710 640 280' },
  { id: 'core',       label: 'Core',       url: '/muscle_map_front.svg', side: 'front', focusViewBox: '640 300 640 380' },
  { id: 'chest',      label: 'Chest',      url: '/muscle_map_front.svg', side: 'front', focusViewBox: '640 170 640 340' },
  { id: 'trap',       label: 'Trap',       url: '/muscle_map_back.svg',  side: 'back',  focusViewBox: '640 180 640 300' },
  { id: 'lats',       label: 'Lats',       url: '/muscle_map_back.svg',  side: 'back',  focusViewBox: '640 200 640 400' },
  { id: 'shoulders',  label: 'Shoulders',  url: '/muscle_map_back.svg',  side: 'back',  focusViewBox: '640 90 640 340' },
  { id: 'arms',       label: 'Arms',       url: '/muscle_map_front.svg', side: 'front', focusViewBox: '640 150 640 600' },
]

const GROUP_TO_MUSCLES = {
  glutes:     ['glutes', 'glute_medius'],
  hamstrings: ['hamstrings'],
  quads:      ['quads'],
  adductors:  ['inner_thighs'],
  abductors:  ['hip_abductors'],
  calves:     ['calves'],
  core:       ['core', 'obliques'],
  chest:      ['chest'],
  trap:       ['traps'],
  lats:       ['lats'],
  shoulders:  ['shoulders', 'front_deltoids', 'rear_delts', 'side_delts'],
  arms:       ['biceps', 'triceps', 'forearm'],
}

const EQUIPMENT_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'bands', label: 'Bands' },
  { id: 'gym', label: 'Gym' },
]

function MuscleGroupCard({ group, selected, onToggle }) {
  const colors = useMemo(() => {
    const mc = {}
    MUSCLE_SVG_IDS[group.id]?.[group.side]?.forEach(id => { mc[id] = NB.purpleDeep })
    return mc
  }, [group.id, group.side])

  return (
    <div
      onClick={() => onToggle(group.id)}
      style={{
        overflow: 'hidden', cursor: 'pointer',
        ...nbCardStyle(selected ? NB.teal : NB_CARD_NEUTRAL, selected ? 3 : 1, selected ? undefined : NB_CARD_NEUTRAL_SHADOW),
        border: `3px solid ${NB.white}`,
        borderRadius: 14,
        position: 'relative',
      }}
    >
      {selected && (
        <div style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 6, border: `2px solid ${NB.ink}`, background: NB.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      )}
      <div style={{ height: 120, background: NB.cream, overflow: 'hidden' }}>
        <MuscleSVG url={group.url} muscleColors={colors} focusViewBox={group.focusViewBox} />
      </div>
      <div style={{ padding: '8px 6px 10px', textAlign: 'center' }}>
        <span style={{ fontFamily: NB.fontDisplay, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{group.label}</span>
      </div>
    </div>
  )
}

// Big zoomed-in display card for the single muscle group currently being stepped
// through in Stage 2, with a tight focusViewBox crop instead of the tiny full-body view.
function MuscleCarouselCard({ group }) {
  const colors = useMemo(() => {
    const mc = {}
    MUSCLE_SVG_IDS[group.id]?.[group.side]?.forEach(id => { mc[id] = NB.purpleDeep })
    return mc
  }, [group.id, group.side])

  return (
    <div
      style={{
        overflow: 'hidden',
        ...nbCardStyle(NB.teal, 3),
        border: `3px solid ${NB.white}`,
        borderRadius: 18,
      }}
    >
      <div style={{ height: 200, background: NB.cream, overflow: 'hidden' }}>
        <MuscleSVG url={group.url} muscleColors={colors} focusViewBox={group.focusViewBox} />
      </div>
      <div style={{ padding: '10px 6px 12px', textAlign: 'center' }}>
        <span style={{ fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}>{group.label}</span>
      </div>
    </div>
  )
}

const cellLabelStyle = { fontFamily: NB.fontMono, fontSize: 10, fontWeight: 800, color: '#555', letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center' }
const cellInputStyle = { width: '100%', height: 32, border: `1.5px solid ${NB.ink}`, borderRadius: 8, textAlign: 'center', fontFamily: NB.fontDisplay, fontWeight: 700, fontSize: 13, color: NB.ink, background: NB.white, outline: 'none', boxSizing: 'border-box' }

// A per-exercise card in the Review stage: a visible SET / KG / REPS (or TIME) table,
// one row per set — each row has its own independent weight/reps, with per-row
// remove and an Add Set button. Every field is always on screen and editable, no
// hidden tap-to-reveal interaction.
function ReviewExerciseCard({ ex, equipment, units, onRemove, onAddSet, onRemoveSetRow, onChangeRowField }) {
  const isTime = ex.timeBased
  const rows = ex.setRows?.length ? ex.setRows : [{ weight: '', reps: ex.reps ?? 8, duration: ex.duration ?? 30 }]
  const unitLabel = weightUnitLabel(units)

  return (
    <div style={{ ...nbCardStyle(NB.yellow, 3), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <ExerciseThumb src={resolveExerciseImage(ex, equipment)} slot={ex.slot} size={38} radius={11} />
        <div style={{ flex: 1, minWidth: 0, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, color: NB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
        <button
          onClick={onRemove}
          title="Remove exercise"
          style={{ width: 30, height: 30, borderRadius: 9, border: `1.5px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 26px', gap: 8, marginBottom: 6, padding: '0 2px' }}>
        <span style={cellLabelStyle}>Set</span>
        <span style={cellLabelStyle}>{isTime ? 'None' : unitLabel}</span>
        <span style={cellLabelStyle}>{isTime ? 'Time' : 'Reps'}</span>
        <span />
      </div>

      {rows.map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 26px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <div style={{ width: 30, height: 32, borderRadius: 8, border: `1.5px solid ${NB.ink}`, background: NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 12, color: NB.ink }}>{i + 1}</div>
          {isTime ? (
            <div />
          ) : (
            <input
              type="number"
              value={toDisplayWeight(row.weight, units)}
              onChange={e => onChangeRowField(i, 'weight', fromDisplayWeight(e.target.value, units))}
              placeholder="–"
              style={cellInputStyle}
            />
          )}
          {isTime ? (
            <input
              type="number"
              value={row.duration ?? 30}
              onChange={e => onChangeRowField(i, 'duration', Number(e.target.value) || 0)}
              style={cellInputStyle}
            />
          ) : (
            <input
              type="number"
              value={row.reps ?? 8}
              onChange={e => onChangeRowField(i, 'reps', Number(e.target.value) || 0)}
              style={cellInputStyle}
            />
          )}
          <button
            onClick={() => onRemoveSetRow(i)}
            style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: NB.red, color: NB.white, fontWeight: 900, fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            −
          </button>
        </div>
      ))}

      <button
        onClick={onAddSet}
        style={{ width: '100%', marginTop: 4, padding: '9px', border: `1.5px solid ${NB.ink}`, borderRadius: 10, background: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 11, textTransform: 'uppercase', color: NB.ink, cursor: 'pointer' }}
      >
        + Add Set
      </button>
    </div>
  )
}

export default function WorkoutBuilder({ onSaveWorkout, onNavigate, postSaveScreen = 'workout', isOnboarding = false, userId, customExercises = [], onAddCustomExercise, equipment = [], units }) {
  const [workoutName,  setWorkoutName]  = useState('')
  const [builderStage, setBuilderStage] = useState('muscles') // 'muscles' | 'exercises' | 'review'
  const [selectedMGs,  setSelectedMGs]  = useState(new Set())  // Stage 1: muscles picked, not yet confirmed
  const [carouselGroups, setCarouselGroups] = useState([]) // Stage 2: confirmed, ordered muscle-group ids to step through
  const [focusedIdx,   setFocusedIdx]   = useState(0)       // which group in carouselGroups is the current step
  const [myExercises,  setMyExercises]  = useState([])

  const [showAddSheet, setShowAddSheet] = useState(false)
  const [addSheetTab,  setAddSheetTab]  = useState('muscle') // 'muscle' | 'search'
  const [librarySearch, setLibrarySearch] = useState('')

  const [showAddForm,     setShowAddForm]     = useState(false)
  const [customName,      setCustomName]      = useState('')
  const [customMGs,       setCustomMGs]       = useState(new Set())
  const [customEquipment, setCustomEquipment] = useState(new Set(['none']))
  const [customImage,     setCustomImage]     = useState(null)
  const [uploading,       setUploading]       = useState(false)
  const [imageCropFile,   setImageCropFile]   = useState(null)
  const fileInputRef = useRef(null)

  const exercisePool = useMemo(() => [...allExercises, ...customExercises], [customExercises])

  const focusedGroupId = carouselGroups[focusedIdx]

  // Exercises for whichever muscle card is currently centered in the carousel
  const filteredExercises = useMemo(() => {
    if (!focusedGroupId) return []
    const muscleTags = GROUP_TO_MUSCLES[focusedGroupId] || []
    return exercisePool.filter(ex => {
      // Match primary OR secondary muscles — a Romanian Deadlift's primary is
      // hamstrings but it should still show up under "Glutes" (secondary there).
      const primaries = (ex.muscles?.primary || []).map(m => m.toLowerCase())
      const secondaries = (ex.muscles?.secondary || []).map(m => m.toLowerCase())
      return muscleTags.some(m => primaries.includes(m) || secondaries.includes(m))
    })
  }, [focusedGroupId, exercisePool])

  // Keyword search across the whole library, independent of muscle group — used by the "+" sheet
  const librarySearchResults = useMemo(() => {
    const query = librarySearch.trim().toLowerCase()
    if (!query) return []
    return exercisePool.filter(ex => ex.name.toLowerCase().includes(query))
  }, [librarySearch, exercisePool])

  const myExIds = useMemo(() => new Set(myExercises.map(e => e.id)), [myExercises])

  // Has the user added at least one exercise matching this muscle group? Gates "Next".
  const canAdvance = useMemo(() => {
    if (!focusedGroupId) return false
    const muscleTags = GROUP_TO_MUSCLES[focusedGroupId] || []
    return myExercises.some(ex => {
      const primaries = (ex.muscles?.primary || []).map(m => m.toLowerCase())
      const secondaries = (ex.muscles?.secondary || []).map(m => m.toLowerCase())
      return muscleTags.some(m => primaries.includes(m) || secondaries.includes(m))
    })
  }, [focusedGroupId, myExercises])

  const remainingGroups = useMemo(
    () => MUSCLE_GROUPS.filter(g => !carouselGroups.includes(g.id)),
    [carouselGroups]
  )

  function toggleMuscle(id) {
    setSelectedMGs(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleContinueToExercises() {
    if (!selectedMGs.size) return
    setCarouselGroups([...selectedMGs])
    setFocusedIdx(0)
    setBuilderStage('exercises')
  }

  function addMuscleToCarousel(id) {
    if (carouselGroups.includes(id)) { setShowAddSheet(false); return }
    setCarouselGroups(prev => [...prev, id])
    setSelectedMGs(prev => new Set(prev).add(id))
    setShowAddSheet(false)
  }

  function goToPrevGroup() {
    if (focusedIdx === 0) { setBuilderStage('muscles'); return }
    setFocusedIdx(i => i - 1)
  }

  function goToNextGroup() {
    if (!canAdvance) return
    if (focusedIdx >= carouselGroups.length - 1) {
      setBuilderStage('review')
    } else {
      setFocusedIdx(i => i + 1)
    }
  }

  function addSet(id) {
    setMyExercises(prev => prev.map(e => {
      if (e.id !== id) return e
      const rows = e.setRows?.length ? e.setRows : [{ weight: '', reps: e.reps ?? 8, duration: e.duration ?? 30 }]
      const last = rows[rows.length - 1]
      return { ...e, setRows: [...rows, { ...last }] }
    }))
  }

  function removeSetRow(id, rowIdx) {
    setMyExercises(prev => prev.map(e => {
      if (e.id !== id) return e
      const rows = e.setRows || []
      if (rows.length <= 1) return e
      return { ...e, setRows: rows.filter((_, i) => i !== rowIdx) }
    }))
  }

  function updateSetRowField(id, rowIdx, field, value) {
    setMyExercises(prev => prev.map(e => {
      if (e.id !== id) return e
      const rows = [...(e.setRows || [])]
      rows[rowIdx] = { ...rows[rowIdx], [field]: value }
      return { ...e, setRows: rows }
    }))
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

  function handleImagePick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setImageCropFile(file)
  }

  async function handleImageCropped(croppedFile) {
    setImageCropFile(null)
    if (!userId) return
    setUploading(true)
    const url = await uploadExerciseImage(userId, croppedFile)
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
      const defaultReps = ex.repsRange?.min || 8
      const defaultRow = { weight: '', reps: defaultReps, duration: 30 }
      setMyExercises(prev => [...prev, { ...ex, setRows: [{ ...defaultRow }, { ...defaultRow }, { ...defaultRow }] }])
    }
  }

  function removeExercise(id) {
    setMyExercises(prev => prev.filter(e => e.id !== id))
  }

  const canSave = myExercises.length > 0 && workoutName.trim().length > 0

  function handleSave() {
    if (!canSave) return
    // Downstream screens (WorkoutDetail/WorkoutPlayer/WorkoutActive) only ever show
    // one summary sets-count/rep-count per exercise — derive that from setRows here
    // so this per-set editor stays a builder-only concern.
    const exercisesToSave = myExercises.map(ex => ({
      ...ex,
      sets: ex.setRows?.length || ex.sets || 3,
      reps: ex.setRows?.[0]?.reps ?? ex.reps,
      duration: ex.setRows?.[0]?.duration ?? ex.duration,
    }))
    onSaveWorkout({ label: workoutName.trim(), exercises: exercisesToSave })
    onNavigate(postSaveScreen)
  }

  const duration = estimateDuration(myExercises.map(ex => ({ ...ex, sets: ex.setRows?.length || ex.sets || 3 })))

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
          disabled={!canSave}
          style={{ padding: '8px 16px', border: `2px solid ${NB.ink}`, borderRadius: 12, boxShadow: canSave ? hardShadow(2) : 'none', background: canSave ? NB.teal : NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', cursor: canSave ? 'pointer' : 'default' }}
        >
          Save
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 20px' }}>

        {/* Muscle group picker */}
        {builderStage !== 'review' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {builderStage === 'muscles' ? 'Pick Target Muscles' : `Muscle ${focusedIdx + 1} of ${carouselGroups.length}`}
              </div>
              {myExercises.length > 0 && (
                <span style={{ fontFamily: NB.fontDisplay, fontSize: 11, fontWeight: 800, color: NB.white, background: NB.magenta, border: `2px solid ${NB.ink}`, borderRadius: 8, padding: '3px 9px', textTransform: 'uppercase' }}>
                  {myExercises.length} added
                </span>
              )}
            </div>

            {builderStage === 'muscles' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                  {MUSCLE_GROUPS.map(g => (
                    <MuscleGroupCard
                      key={g.id}
                      group={g}
                      selected={selectedMGs.has(g.id)}
                      onToggle={toggleMuscle}
                    />
                  ))}
                </div>
                {selectedMGs.size > 0 && (
                  <button
                    onClick={handleContinueToExercises}
                    style={{ width: '100%', padding: '14px', border: NB_BORDER, borderRadius: 14, boxShadow: hardShadow(3), background: NB.teal, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}
                  >
                    Continue ({selectedMGs.size} selected)
                  </button>
                )}
              </>
            ) : (
              <>
                <MuscleCarouselCard group={MUSCLE_GROUPS.find(g => g.id === focusedGroupId)} />
                <button
                  onClick={() => { setAddSheetTab('muscle'); setShowAddSheet(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '10px 0 0', padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: NB.fontDisplay, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: NB.ink }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add another muscle or search library
                </button>
              </>
            )}
          </div>
        )}

        {/* Exercise picker — exercises for whichever muscle card is currently focused */}
        {builderStage === 'exercises' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Exercises — tap + to add
            </div>

            {/* Add your own exercise — first, so it's the most visible option */}
            <button
              onClick={() => setShowAddForm(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 10, ...nbCardStyle(NB_CARD_NEUTRAL, 2, NB_CARD_NEUTRAL_SHADOW), borderRadius: 14, cursor: 'pointer' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 10, border: `2px solid ${NB.ink}`, background: NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <span style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 13, textTransform: 'uppercase', color: NB.ink }}>Add your own exercise</span>
            </button>

            {filteredExercises.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredExercises.map(ex => {
                  const added = myExIds.has(ex.id)
                  return (
                    <div key={ex.id} style={{ border: `3px solid ${NB.white}`, borderRadius: 16, padding: '12px 14px', background: NB.lavenderMist, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <ExerciseThumb src={resolveExerciseImage(ex, equipment)} slot={ex.slot} size={44} radius={12} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: NB.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                        <div style={{ fontSize: 12, color: '#555' }}>{ex.repsRange?.min ?? 8}–{ex.repsRange?.max ?? 12} reps · {ex.slot}</div>
                      </div>
                      <button
                        onClick={() => added ? removeExercise(ex.id) : addExercise(ex)}
                        style={{ width: 36, height: 36, borderRadius: 11, border: `2px solid ${NB.ink}`, background: added ? NB.ink : NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                      >
                        {added
                          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={NB.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        }
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', ...nbCardStyle(NB_CARD_NEUTRAL, 2, NB_CARD_NEUTRAL_SHADOW), borderRadius: 16 }}>
                <span style={{ fontSize: 13, color: '#555' }}>No exercises found for this muscle group yet.</span>
              </div>
            )}
          </div>
        )}

        {/* Stage 3 — Review & Save */}
        {builderStage === 'review' && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
                Name Your Workout
              </div>
              <input
                type="text"
                value={workoutName}
                onChange={e => setWorkoutName(e.target.value)}
                placeholder="Workout name (e.g. Glute Finisher)"
                style={{ width: '100%', padding: '13px 16px', border: NB_BORDER, borderRadius: 14, fontSize: 15, color: NB.ink, fontFamily: NB.fontDisplay, background: NB.white, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: NB.fontMono, fontSize: 12, fontWeight: 800, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
                Your Workout
              </div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>{myExercises.length} exercises · ~{duration} min</div>
              {myExercises.map((ex) => (
                <ReviewExerciseCard
                  key={ex.id}
                  ex={ex}
                  equipment={equipment}
                  units={units}
                  onRemove={() => removeExercise(ex.id)}
                  onAddSet={() => addSet(ex.id)}
                  onRemoveSetRow={(rowIdx) => removeSetRow(ex.id, rowIdx)}
                  onChangeRowField={(rowIdx, field, value) => updateSetRowField(ex.id, rowIdx, field, value)}
                />
              ))}
            </div>
          </>
        )}

      </div>

      {/* Pinned footer — stays on screen while the content above scrolls */}
      {builderStage === 'exercises' && (
        <div style={{ flexShrink: 0, padding: '10px 22px 20px' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={goToPrevGroup}
              style={{ flex: 1, padding: '14px', border: NB_BORDER, borderRadius: 14, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer' }}
            >
              ‹ Back
            </button>
            <button
              onClick={goToNextGroup}
              disabled={!canAdvance}
              style={{ flex: 2, padding: '14px', border: NB_BORDER, borderRadius: 14, boxShadow: canAdvance ? hardShadow(3) : 'none', background: canAdvance ? NB.magenta : NB.white, color: canAdvance ? NB.white : '#999', fontFamily: NB.fontDisplay, fontSize: 14, fontWeight: 800, textTransform: 'uppercase', cursor: canAdvance ? 'pointer' : 'default' }}
            >
              {focusedIdx >= carouselGroups.length - 1 ? 'Review Workout' : 'Next Muscle'}
            </button>
          </div>
          {!canAdvance && (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#555', marginTop: 8 }}>
              Add at least 1 exercise above to continue
            </div>
          )}
        </div>
      )}
      {builderStage === 'review' && (
        <div style={{ flexShrink: 0, padding: '10px 22px 20px' }}>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{ width: '100%', padding: '15px', border: NB_BORDER, borderRadius: 16, boxShadow: canSave ? hardShadow(4) : 'none', background: canSave ? NB.magenta : NB.white, color: canSave ? NB.white : '#999', fontFamily: NB.fontDisplay, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', cursor: canSave ? 'pointer' : 'default' }}
          >
            {workoutName.trim() ? `Save "${workoutName.trim()}"` : 'Enter a workout name to save'}
          </button>
        </div>
      )}

      {/* Add a muscle group / search the library — sheet (opened from the carousel's "+" card) */}
      {showAddSheet && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', zIndex: 20 }} onClick={() => setShowAddSheet(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: '80%', overflowY: 'auto', background: NB.cream, border: `2.5px solid ${NB.ink}`, borderRadius: '20px 20px 0 0', padding: '18px 22px 26px', boxSizing: 'border-box' }}>
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', color: NB.ink, marginBottom: 14 }}>
              Add Exercises
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setAddSheetTab('muscle')}
                style={{ flex: 1, padding: '10px 12px', border: `2px solid ${NB.ink}`, borderRadius: 12, background: addSheetTab === 'muscle' ? NB.teal : NB.white, fontFamily: NB.fontDisplay, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, cursor: 'pointer' }}
              >
                Muscle group
              </button>
              <button
                onClick={() => setAddSheetTab('search')}
                style={{ flex: 1, padding: '10px 12px', border: `2px solid ${NB.ink}`, borderRadius: 12, background: addSheetTab === 'search' ? NB.teal : NB.white, fontFamily: NB.fontDisplay, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: NB.ink, cursor: 'pointer' }}
              >
                Search library
              </button>
            </div>

            {addSheetTab === 'muscle' ? (
              remainingGroups.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {remainingGroups.map(g => (
                    <MuscleGroupCard key={g.id} group={g} selected={false} onToggle={addMuscleToCarousel} />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', fontSize: 13, color: '#555' }}>
                  You've added every muscle group already.
                </div>
              )
            ) : (
              <>
                <div style={{ marginBottom: 14, position: 'relative' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    value={librarySearch}
                    onChange={e => setLibrarySearch(e.target.value)}
                    placeholder="Search all exercises by name"
                    autoFocus
                    style={{ width: '100%', height: 44, border: NB_BORDER, borderRadius: 12, paddingLeft: 38, paddingRight: 14, fontSize: 14, color: NB.ink, fontFamily: NB.fontDisplay, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {librarySearchResults.map(ex => {
                    const added = myExIds.has(ex.id)
                    return (
                      <div key={ex.id} style={{ border: 'none', borderRadius: 14, padding: '10px 12px', background: NB.lavenderMist, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ExerciseThumb src={resolveExerciseImage(ex, equipment)} slot={ex.slot} size={34} radius={10} />
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
                  {librarySearch.trim() && librarySearchResults.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px', fontSize: 13, color: '#555' }}>No exercises match "{librarySearch.trim()}".</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

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

      <ImageCropSheet file={imageCropFile} shape="rect" aspect={1} onCancel={() => setImageCropFile(null)} onCropped={handleImageCropped} />
    </>
  )
}
