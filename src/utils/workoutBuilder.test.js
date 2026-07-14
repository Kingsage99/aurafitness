import { describe, it, expect } from 'vitest'
import {
  DAY_IDS, buildWeeklyPlan, buildCustomWeeklyPlan, buildSingleWorkout,
  getSwapOptions, getPrimaryMuscles, estimateDuration, estimateStartingWeight,
  getSuggestionReason,
} from './workoutBuilder'
import exercises from '../data/exercises.json'

const baseProfile = {
  physique: 'lean_toned',
  experience: 'some',
  daysPerWeek: 3,
  equipment: ['gym'],
  injuries: [],
  dislikedExercises: [],
  trainingStyle: 'strength',
  trainingDays: [],
}

describe('buildWeeklyPlan', () => {
  it('returns a fixed 7-day Mon–Sun array', () => {
    const plan = buildWeeklyPlan(baseProfile)
    expect(plan).toHaveLength(7)
    expect(plan.map(d => d.dayId)).toEqual(DAY_IDS)
  })

  it('schedules exactly daysPerWeek training days', () => {
    for (const days of [2, 3, 4, 5]) {
      const plan = buildWeeklyPlan({ ...baseProfile, daysPerWeek: days })
      expect(plan.filter(d => d.isTrainingDay)).toHaveLength(days)
    }
  })

  it('respects an explicit trainingDays selection', () => {
    const plan = buildWeeklyPlan({ ...baseProfile, trainingDays: ['tuesday', 'saturday'] })
    const trainingIds = plan.filter(d => d.isTrainingDay).map(d => d.dayId)
    expect(trainingIds).toEqual(['tuesday', 'saturday'])
  })

  it('training days carry a built workout, rest days carry null', () => {
    const plan = buildWeeklyPlan(baseProfile)
    plan.forEach(d => {
      if (d.isTrainingDay) expect(d.workout.exercises.length).toBeGreaterThan(0)
      else expect(d.workout).toBeNull()
    })
  })
})

describe('buildSingleWorkout', () => {
  it('sizes the session by experience level', () => {
    expect(buildSingleWorkout({ ...baseProfile, experience: 'starter' }).exercises).toHaveLength(5)
    expect(buildSingleWorkout({ ...baseProfile, experience: 'active' }).exercises.length).toBeGreaterThanOrEqual(6)
  })

  it('never includes disliked exercises', () => {
    const control = buildSingleWorkout(baseProfile, 'lower')
    const dislikedId = control.exercises[0].id
    const rebuilt = buildSingleWorkout({ ...baseProfile, dislikedExercises: [dislikedId] }, 'lower')
    expect(rebuilt.exercises.map(e => e.id)).not.toContain(dislikedId)
  })

  it('only picks bodyweight exercises when the user has no equipment', () => {
    const workout = buildSingleWorkout({ ...baseProfile, equipment: ['none'] })
    workout.exercises.forEach(ex => {
      const source = exercises.find(e => e.id === ex.id)
      expect(source.equipment).toContain('none')
    })
  })

  it('avoids exercises conflicting with reported injuries', () => {
    const workout = buildSingleWorkout({ ...baseProfile, injuries: ['knees'] }, 'lower')
    workout.exercises.forEach(ex => {
      const source = exercises.find(e => e.id === ex.id)
      expect(source.injuries_avoid || []).not.toContain('knees')
    })
  })

  it('applies the training-style rep range to non-timed exercises', () => {
    const workout = buildSingleWorkout({ ...baseProfile, trainingStyle: 'hypertrophy' })
    workout.exercises.filter(e => e.reps !== null).forEach(ex => {
      expect(ex.repsMin).toBe(8)
      expect(ex.repsMax).toBe(12)
    })
  })
})

describe('buildCustomWeeklyPlan', () => {
  it('maps assigned days and rests the others', () => {
    const plan = buildCustomWeeklyPlan({
      monday: { label: 'Push Day', exercises: [{ id: 'x', sets: 3 }] },
    })
    expect(plan).toHaveLength(7)
    expect(plan[0].isTrainingDay).toBe(true)
    expect(plan[0].label).toBe('Push Day')
    expect(plan.slice(1).every(d => !d.isTrainingDay)).toBe(true)
  })
})

describe('getSwapOptions', () => {
  it('returns alternatives that share the slot and never repeats current workout exercises', () => {
    const workout = buildSingleWorkout(baseProfile, 'lower')
    const target = workout.exercises[0]
    const currentIds = workout.exercises.map(e => e.id)
    const options = getSwapOptions(target.id, baseProfile, currentIds)
    expect(options.length).toBeGreaterThan(0)
    options.forEach(o => expect(currentIds).not.toContain(o.id))
  })
})

describe('helpers', () => {
  it('getPrimaryMuscles dedupes across exercises', () => {
    const muscles = getPrimaryMuscles([
      { muscles: { primary: ['glutes'] } },
      { muscles: { primary: ['glutes', 'quads'] } },
    ])
    expect(muscles.filter(m => m === 'glutes')).toHaveLength(1)
  })

  it('estimateDuration returns 0 for empty and ≥15 otherwise', () => {
    expect(estimateDuration([])).toBe(0)
    expect(estimateDuration([{ sets: 3 }])).toBeGreaterThanOrEqual(15)
  })
})

describe('estimateStartingWeight', () => {
  const profile = { weightKg: 65, experience: 'some' }

  it('returns null for a bodyweight-only exercise', () => {
    expect(estimateStartingWeight({ exerciseId: 'hollow-hold', userProfile: profile })).toBeNull()
  })

  it('returns null for a bodyweight-friendly exercise too, e.g. push-ups', () => {
    // push-up lists dumbbells/bands/gym alongside 'none' (a weighted variant exists),
    // but with no logged history it should still default to no suggested load.
    expect(estimateStartingWeight({ exerciseId: 'push-up', userProfile: profile })).toBeNull()
  })

  it('still surfaces a logged weight for a bodyweight-friendly exercise if the user has one', () => {
    // e.g. the user has actually been doing weighted push-ups. Hitting the (default)
    // 8-rep ceiling now suggests progression rather than a flat echo — see the
    // 'progressive overload' describe block below for the exact rule.
    const history = [{ exercises: [{ id: 'push-up', loggedSets: [{ weight: '10', reps: 8, done: true }] }] }]
    const result = estimateStartingWeight({ exerciseId: 'push-up', userProfile: profile, workoutHistory: history })
    expect(result).not.toBeNull()
    expect(result).toBeGreaterThanOrEqual(10)
  })

  it('prefers the most recent logged weight over the formula', () => {
    const history = [
      {
        completed_at: '2026-07-01',
        exercises: [{ id: 'barbell-squat', loggedSets: [{ weight: '40', reps: 8, done: true }, { weight: '42.5', reps: 6, done: true }] }],
      },
      {
        completed_at: '2026-06-20',
        exercises: [{ id: 'barbell-squat', loggedSets: [{ weight: '30', reps: 8, done: true }] }],
      },
    ]
    const result = estimateStartingWeight({ exerciseId: 'barbell-squat', userProfile: profile, workoutHistory: history })
    expect(result).toBe(42.5)
  })

  it('ignores sets that were never completed', () => {
    const history = [{ exercises: [{ id: 'barbell-squat', loggedSets: [{ weight: '40', reps: 8, done: false }] }] }]
    const result = estimateStartingWeight({ exerciseId: 'barbell-squat', userProfile: profile, workoutHistory: history })
    expect(result).not.toBe(40)
  })

  it('falls back to a bodyweight/experience formula with no history', () => {
    const result = estimateStartingWeight({ exerciseId: 'barbell-squat', userProfile: profile, workoutHistory: [] })
    expect(result).toBeGreaterThan(0)
    expect(result % 2.5).toBe(0)
  })

  it('scales up with experience level', () => {
    const starter = estimateStartingWeight({ exerciseId: 'barbell-squat', userProfile: { ...profile, experience: 'starter' } })
    const active = estimateStartingWeight({ exerciseId: 'barbell-squat', userProfile: { ...profile, experience: 'active' } })
    expect(active).toBeGreaterThan(starter)
  })

  it('suggests less weight for an isolation accessory move than a main compound lift', () => {
    const compound = estimateStartingWeight({ exerciseId: 'barbell-squat', userProfile: profile })
    const isolation = estimateStartingWeight({ exerciseId: 'cable-kickback', userProfile: profile })
    expect(isolation).toBeLessThan(compound)
  })
})

describe('progressive overload', () => {
  const profile = { weightKg: 65, experience: 'some' }
  // barbell-squat is slot:'main' (compound → +5kg on progression)

  it('suggests a weight increase after hitting the rep ceiling', () => {
    const history = [{
      exercises: [{ id: 'barbell-squat', repsMax: 8, loggedSets: [
        { weight: '40', reps: 8, done: true },
        { weight: '40', reps: 9, done: true },
      ] }],
    }]
    const result = estimateStartingWeight({ exerciseId: 'barbell-squat', userProfile: profile, workoutHistory: history })
    expect(result).toBe(45) // +5kg compound increment
    expect(getSuggestionReason({ exerciseId: 'barbell-squat', userProfile: profile, workoutHistory: history })).toEqual({ reason: 'progression', delta: 5 })
  })

  it('repeats the same weight after missing the ceiling once, when the prior session had hit it', () => {
    const history = [
      { exercises: [{ id: 'barbell-squat', repsMax: 8, loggedSets: [{ weight: '40', reps: 6, done: true }] }] }, // missed
      { exercises: [{ id: 'barbell-squat', repsMax: 8, loggedSets: [{ weight: '40', reps: 8, done: true }] }] }, // hit
    ]
    const result = estimateStartingWeight({ exerciseId: 'barbell-squat', userProfile: profile, workoutHistory: history })
    expect(result).toBe(40)
    expect(getSuggestionReason({ exerciseId: 'barbell-squat', userProfile: profile, workoutHistory: history })).toEqual({ reason: 'repeat', delta: 0 })
  })

  it('suggests a small deload after missing the ceiling twice in a row', () => {
    const history = [
      { exercises: [{ id: 'barbell-squat', repsMax: 8, loggedSets: [{ weight: '40', reps: 6, done: true }] }] }, // missed
      { exercises: [{ id: 'barbell-squat', repsMax: 8, loggedSets: [{ weight: '40', reps: 5, done: true }] }] }, // missed again
    ]
    const result = estimateStartingWeight({ exerciseId: 'barbell-squat', userProfile: profile, workoutHistory: history })
    expect(result).toBe(35) // 40 * 0.9 = 36, rounded to nearest 2.5 → 35
    expect(getSuggestionReason({ exerciseId: 'barbell-squat', userProfile: profile, workoutHistory: history })).toEqual({ reason: 'deload', delta: -10 })
  })

  it('getSuggestionReason reports "formula" with no history at all', () => {
    expect(getSuggestionReason({ exerciseId: 'barbell-squat', userProfile: profile, workoutHistory: [] }))
      .toEqual({ reason: 'formula', delta: 0 })
  })
})

describe('difficulty-based filtering', () => {
  const sessionTypes = ['full_a', 'full_b', 'full_c', 'lower', 'lower_b', 'upper_a', 'upper_b']

  it('excludes non-starter exercises for a starter, across every session type', () => {
    sessionTypes.forEach(st => {
      const workout = buildSingleWorkout({ ...baseProfile, experience: 'starter' }, st)
      workout.exercises.forEach(ex => {
        const source = exercises.find(e => e.id === ex.id)
        expect(source.difficulty).toContain('starter')
      })
    })
  })

  it('does not restrict an active-experience user', () => {
    // Union the picks across every session type — at least one should be an
    // exercise that ISN'T starter-tagged (30/91 exercises lack that tag), proving
    // 'active' draws from the full pool rather than only starter-friendly moves.
    const chosenIds = new Set()
    sessionTypes.forEach(st => {
      buildSingleWorkout({ ...baseProfile, experience: 'active' }, st).exercises.forEach(ex => chosenIds.add(ex.id))
    })
    const hasNonStarterPick = [...chosenIds].some(id => !exercises.find(e => e.id === id).difficulty.includes('starter'))
    expect(hasNonStarterPick).toBe(true)
  })
})

describe('exercise data integrity', () => {
  it('all exercise ids are unique', () => {
    expect(new Set(exercises.map(e => e.id)).size).toBe(exercises.length)
  })

  it('all swappable_with references point to real exercises', () => {
    const ids = new Set(exercises.map(e => e.id))
    exercises.forEach(ex => {
      ;(ex.swappable_with || []).forEach(ref => {
        expect(ids.has(ref), `${ex.id} → dangling swap ref ${ref}`).toBe(true)
      })
    })
  })
})
