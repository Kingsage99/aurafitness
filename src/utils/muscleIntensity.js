import { MUSCLE_SVG_IDS } from '../components/MuscleSVG'
import { NB_INTENSITY_RAMP } from '../styles/neoBrutalism'

// Shared "which display muscle group does this exercise-data muscle name map
// to" lookup — was duplicated verbatim across WorkoutDetail, WorkoutComplete,
// WorkoutRoutine, and WorkoutPost.
export const MUSCLE_TO_GROUP = {
  glutes: 'glutes', glute: 'glutes',
  hamstrings: 'legs', quads: 'legs', legs: 'legs',
  chest: 'chest', pecs: 'chest',
  shoulders: 'shoulders', delts: 'shoulders',
  back: 'back', lats: 'back', lat: 'back',
  core: 'core', abs: 'core',
  arms: 'arms', biceps: 'arms', triceps: 'arms',
  calves: 'calves',
}

// Counts how often each muscle SVG part is hit by a list of exercises'
// primary muscles, then buckets into the 3-tier NB_INTENSITY_RAMP (Light/
// Moderate/High) — was reimplemented with drifting thresholds/palettes across
// WorkoutComplete, WorkoutRoutine, and (as a cruder 2-tone version) WorkoutPost.
export function buildMuscleIntensityColors(exercises, side) {
  const counts = {}
  ;(exercises || []).forEach(ex => {
    ;(ex.muscles?.primary || []).forEach(m => {
      const group = MUSCLE_TO_GROUP[m?.toLowerCase()]
      if (!group) return
      MUSCLE_SVG_IDS[group]?.[side]?.forEach(id => { counts[id] = (counts[id] || 0) + 1 })
    })
  })
  const colors = {}
  Object.entries(counts).forEach(([id, n]) => {
    colors[id] = n >= 3 ? NB_INTENSITY_RAMP[4] : n >= 2 ? NB_INTENSITY_RAMP[3] : NB_INTENSITY_RAMP[1]
  })
  return colors
}
