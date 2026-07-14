// Canonical muscle-id → display-group mapping, covering every id used in
// exercises.json. The per-screen copies of this map were lossy (upper_back,
// traps, rear_delts etc. were unmapped, hiding rows/pulls from analytics) —
// import from here instead of redefining.

export const GROUP_LABELS = {
  glutes: 'Glutes', legs: 'Legs', back: 'Back', core: 'Core',
  arms: 'Arms', shoulders: 'Shoulders', chest: 'Chest', calves: 'Calves',
}

export const MUSCLE_TO_GROUP = {
  glutes: 'glutes', glute: 'glutes', glute_medius: 'glutes',
  quads: 'legs', hamstrings: 'legs', legs: 'legs',
  inner_thighs: 'legs', hip_abductors: 'legs', hip_flexors: 'legs', tibialis: 'legs',
  calves: 'calves',
  back: 'back', upper_back: 'back', lower_back: 'back', lats: 'back', lat: 'back', traps: 'back',
  shoulders: 'shoulders', delts: 'shoulders', side_delts: 'shoulders',
  front_deltoids: 'shoulders', rear_delts: 'shoulders', rotator_cuff: 'shoulders',
  chest: 'chest', pecs: 'chest',
  core: 'core', abs: 'core', obliques: 'core',
  arms: 'arms', biceps: 'arms', triceps: 'arms', forearm: 'arms', forearms: 'arms', grip: 'arms',
}

export const groupOf = (muscleId) => MUSCLE_TO_GROUP[String(muscleId || '').toLowerCase()] || null

// Done-set counts per display group across a workout_history array.
// Primary muscles get full credit, secondary half credit.
export function setsByGroup(history) {
  const counts = {}
  ;(history || []).forEach(session => {
    ;(session.exercises || []).forEach(ex => {
      const doneSets = (ex.loggedSets || []).filter(s => s.done).length
      if (!doneSets) return
      ;(ex.muscles?.primary || []).forEach(m => {
        const g = groupOf(m)
        if (g) counts[g] = (counts[g] || 0) + doneSets
      })
      ;(ex.muscles?.secondary || []).forEach(m => {
        const g = groupOf(m)
        if (g) counts[g] = (counts[g] || 0) + doneSets * 0.5
      })
    })
  })
  Object.keys(counts).forEach(g => { counts[g] = Math.round(counts[g]) })
  return counts
}

// Simpler exercise-occurrence counts (primary muscles only) — the shape
// MuscleMap's heat coloring was built around.
export function exerciseCountsByGroup(history) {
  const counts = {}
  ;(history || []).forEach(session => {
    ;(session.exercises || []).forEach(ex => {
      ;(ex.muscles?.primary || []).forEach(m => {
        const g = groupOf(m)
        if (g) counts[g] = (counts[g] || 0) + 1
      })
    })
  })
  return counts
}
