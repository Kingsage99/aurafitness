import EXERCISES from '../data/exercises.json'

export const MUSCLE_LABELS = {
  quads: 'Quads', glutes: 'Glutes', glute_medius: 'Glute Medius', hamstrings: 'Hamstrings',
  inner_thighs: 'Inner Thighs', calves: 'Calves', chest: 'Chest', shoulders: 'Shoulders',
  side_delts: 'Side Delts', upper_back: 'Upper Back', lats: 'Lats', biceps: 'Biceps',
  triceps: 'Triceps', core: 'Core', rear_delts: 'Rear Delts',
}

export const MUSCLE_GROUPS = Array.from(new Set(EXERCISES.flatMap(ex => ex.muscles?.primary || [])))
  .sort((a, b) => (MUSCLE_LABELS[a] || a).localeCompare(MUSCLE_LABELS[b] || b))
  .map(id => ({ id, label: MUSCLE_LABELS[id] || id }))
