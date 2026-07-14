import exercises from '../data/exercises.json';

const EXPERIENCE_CONFIG = {
  starter:      { exerciseCount: 5, sets: 3 },
  some:         { exerciseCount: 6, sets: 3 },
  active:       { exerciseCount: 7, sets: 4 },
};

const REP_STYLE_CONFIG = {
  strength:    { min: 6, max: 8 },
  hypertrophy: { min: 8, max: 12 },
  endurance:   { min: 12, max: 15 },
};

// Days-per-week session templates
const SESSION_TEMPLATES = {
  2: ['full_a', 'full_b'],
  3: ['lower', 'upper', 'full_c'],
  4: ['upper_a', 'lower_a', 'upper_b', 'lower_b'],
  5: ['lower', 'upper', 'lower_b', 'upper_b', 'full_c'],
};

// Real weekday ids, Monday-first (matches Onboarding's trainingDays ids)
export const DAY_IDS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// 0=Mon ... 6=Sun, for a given Date (defaults to now)
export function getWeekdayIndex(date = new Date()) {
  return (date.getDay() + 6) % 7;
}

// YYYY-MM-DD key for a given Date (defaults to now) — used to key My Routine assignments
export function dateKeyFor(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Rough duration estimate (minutes) for a list of exercises, ~2 min/set + 5 min warmup
export function estimateDuration(exercises) {
  if (!exercises?.length) return 0;
  return Math.max(15, exercises.reduce((acc, ex) => acc + (ex.sets || 3) * 2, 0) + 5);
}

// Fallback training-day pattern for legacy profiles with an empty trainingDays array
const DEFAULT_DAY_PATTERN = {
  2: ['monday', 'thursday'],
  3: ['monday', 'wednesday', 'friday'],
  4: ['monday', 'tuesday', 'thursday', 'friday'],
  5: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
};

// Which muscle groups each session type prioritises
const SESSION_FOCUS = {
  full_a:  ['glutes', 'quads', 'chest', 'upper_back'],
  full_b:  ['hamstrings', 'shoulders', 'lats', 'core'],
  full_c:  ['glutes', 'quads', 'shoulders', 'core'],
  lower:   ['glutes', 'quads', 'hamstrings', 'calves'],
  lower_b: ['glutes', 'hamstrings', 'inner_thighs', 'glute_medius'],
  upper_a: ['chest', 'upper_back', 'shoulders', 'biceps'],
  upper_b: ['shoulders', 'lats', 'rear_delts', 'triceps'],
};

// Slots to fill in order for each session
const SLOT_ORDER = ['main', 'main', 'secondary', 'secondary', 'accessory', 'accessory', 'finisher'];

/**
 * Build a weekly workout schedule from a user profile.
 * Returns a fixed 7-entry array, one per real weekday (0=Mon...6=Sun).
 * Training days carry a built workout; rest days carry workout:null.
 */
export function buildWeeklyPlan(userProfile) {
  const { daysPerWeek = 3, trainingDays = [] } = userProfile;
  const effectiveDays = trainingDays.length > 0 ? trainingDays.length : daysPerWeek;
  const templates = SESSION_TEMPLATES[effectiveDays] || SESSION_TEMPLATES[3];

  const orderedDayIds = (trainingDays.length > 0 ? trainingDays : (DEFAULT_DAY_PATTERN[effectiveDays] || DEFAULT_DAY_PATTERN[3]))
    .slice()
    .sort((a, b) => DAY_IDS.indexOf(a) - DAY_IDS.indexOf(b));

  return DAY_IDS.map((dayId, dayIndex) => {
    const trainingIdx = orderedDayIds.indexOf(dayId);
    if (trainingIdx === -1) {
      return { dayIndex, dayId, isTrainingDay: false, sessionType: null, label: 'Rest Day', workout: null };
    }
    const template = templates[trainingIdx] || templates[templates.length - 1];
    return {
      dayIndex,
      dayId,
      isTrainingDay: true,
      sessionType: template,
      label: getSessionLabel(template),
      workout: buildSingleWorkout(userProfile, template),
    };
  });
}

/**
 * Build a weekly plan from a user-assigned custom schedule (Build Your Own mode).
 * customSchedule: { [dayId]: { label, exercises } } — same shape as entries in userWorkouts.
 * Returns the same fixed 7-entry Mon–Sun shape as buildWeeklyPlan, so all existing
 * consumers (Home, WorkoutHub, WorkoutRoutine, todayWorkout) work unmodified.
 */
export function buildCustomWeeklyPlan(customSchedule = {}) {
  return DAY_IDS.map((dayId, dayIndex) => {
    const workout = customSchedule[dayId];
    if (!workout) {
      return { dayIndex, dayId, isTrainingDay: false, sessionType: null, label: 'Rest Day', workout: null };
    }
    return {
      dayIndex,
      dayId,
      isTrainingDay: true,
      sessionType: null,
      label: workout.label || 'Workout',
      workout: {
        name: workout.label || 'Workout',
        exercises: workout.exercises || [],
        estimatedMinutes: estimateDuration(workout.exercises),
      },
    };
  });
}

/**
 * Build one workout session.
 * Returns { name, exercises[], totalSets, estimatedMinutes }
 */
// Which difficulty tags are allowed at each experience tier. 'active' has no
// restriction (the fully-open pool); 'starter'/'some' narrow it so beginners
// aren't handed advanced-only compound lifts by the algorithmic builder.
// (Manual "Build Your Own" workouts are unaffected — there the user is
// consciously picking exercises themselves.)
const DIFFICULTY_GATE = {
  starter: ['starter'],
  some: ['starter', 'intermediate'],
  active: null, // no restriction
};

export function buildSingleWorkout(userProfile, sessionType = 'full_a') {
  const {
    physique = 'lean_toned',
    experience = 'some',
    equipment = ['gym'],
    injuries = [],
    dislikedExercises = [],
    trainingStyle = 'strength',
  } = userProfile;

  const config = EXPERIENCE_CONFIG[experience] || EXPERIENCE_CONFIG.some;
  const repRange = REP_STYLE_CONFIG[trainingStyle] || REP_STYLE_CONFIG.strength;
  const focus = SESSION_FOCUS[sessionType] || SESSION_FOCUS.full_a;
  const slotsNeeded = SLOT_ORDER.slice(0, config.exerciseCount);
  const allowedDifficulty = DIFFICULTY_GATE[experience] !== undefined ? DIFFICULTY_GATE[experience] : DIFFICULTY_GATE.some;

  // Filter to usable exercises
  const pool = exercises.filter(ex => {
    if (dislikedExercises.includes(ex.id)) return false;
    if (!hasEquipment(ex.equipment, equipment)) return false;
    if (hasInjuryConflict(ex.injuries_avoid, injuries)) return false;
    if (allowedDifficulty && !ex.difficulty?.some(d => allowedDifficulty.includes(d))) return false;
    return true;
  });

  // Score each exercise for this session
  const scored = pool.map(ex => ({
    ...ex,
    score: scoreExercise(ex, physique, focus),
  }));

  // Pick exercises slot by slot
  const chosen = [];
  const usedMuscles = new Set();

  for (const slot of slotsNeeded) {
    const candidates = scored
      .filter(ex => ex.slot === slot)
      .filter(ex => !chosen.find(c => c.id === ex.id))
      .sort((a, b) => b.score - a.score);

    // Prefer exercises that don't repeat the exact same primary muscle already chosen
    const fresh = candidates.filter(
      ex => !ex.muscles.primary.some(m => usedMuscles.has(m))
    );

    const pick = fresh[0] || candidates[0];
    if (!pick) continue;

    pick.muscles.primary.forEach(m => usedMuscles.add(m));
    chosen.push(formatExercise(pick, config.sets, repRange, equipment));
  }

  const totalSets = chosen.reduce((sum, ex) => sum + ex.sets, 0);

  return {
    name: getWorkoutName(sessionType, physique),
    sessionType,
    exercises: chosen,
    totalSets,
    estimatedMinutes: Math.round(totalSets * 3.5),
  };
}

/**
 * Find swap alternatives for a given exercise ID.
 * Never returns exercises already in the current workout or in dislikedExercises.
 */
export function getSwapOptions(exerciseId, userProfile, currentWorkoutIds = []) {
  const original = exercises.find(ex => ex.id === exerciseId);
  if (!original) return [];

  const { equipment = ['gym'], injuries = [], dislikedExercises = [] } = userProfile;

  // Try swappable_with list first (same movement pattern)
  const preferred = (original.swappable_with || [])
    .map(id => exercises.find(ex => ex.id === id))
    .filter(Boolean)
    .filter(ex => !currentWorkoutIds.includes(ex.id))
    .filter(ex => !dislikedExercises.includes(ex.id))
    .filter(ex => hasEquipment(ex.equipment, equipment))
    .filter(ex => !hasInjuryConflict(ex.injuries_avoid, injuries));

  if (preferred.length >= 2) return preferred.slice(0, 3);

  // Fall back: same slot + same primary muscle
  const fallback = exercises
    .filter(ex => ex.id !== exerciseId)
    .filter(ex => ex.slot === original.slot)
    .filter(ex => ex.muscles.primary.some(m => original.muscles.primary.includes(m)))
    .filter(ex => !currentWorkoutIds.includes(ex.id))
    .filter(ex => !dislikedExercises.includes(ex.id))
    .filter(ex => hasEquipment(ex.equipment, equipment))
    .filter(ex => !hasInjuryConflict(ex.injuries_avoid, injuries));

  return [...preferred, ...fallback].slice(0, 3);
}

// --- Helpers ---

function scoreExercise(ex, physique, focusMuscles) {
  let score = ex.physique_weight?.[physique] ?? 5;

  // Boost if primary muscle is in session focus
  const primaryBoost = ex.muscles.primary.filter(m => focusMuscles.includes(m)).length;
  score += primaryBoost * 2;

  // Small boost for secondary
  const secondaryBoost = ex.muscles.secondary.filter(m => focusMuscles.includes(m)).length;
  score += secondaryBoost * 0.5;

  return score;
}

// Exported so a swapped-in raw exercises.json entry can be reshaped into the
// same runtime exercise object the workout already uses (WorkoutDetail's swap flow).
// Exercises with multiple equipment-variant photos expose an `images` map
// (e.g. { bands: '...', none: '...' }) instead of a single flat `image`.
// Pick the variant matching the user's owned equipment, falling back to
// 'none' (bodyweight) then whatever variant exists.
export function resolveExerciseImage(ex, equipment = []) {
  if (ex.images) {
    for (const eq of equipment) {
      if (ex.images[eq]) return ex.images[eq];
    }
    return ex.images.none || Object.values(ex.images)[0] || null;
  }
  return ex.image || null;
}

export function formatExercise(ex, sets, repRange, equipment = []) {
  const isTimeBased = ex.timeBased === true;
  return {
    id: ex.id,
    name: ex.name,
    muscles: ex.muscles,
    sets,
    reps: isTimeBased ? null : repRange.max,
    repsMin: isTimeBased ? null : repRange.min,
    repsMax: isTimeBased ? null : repRange.max,
    duration: isTimeBased ? ex.repsRange.max : null,
    timeBased: isTimeBased,
    slot: ex.slot,
    image: resolveExerciseImage(ex, equipment),
    cues: ex.cues || [],
    swappable_with: ex.swappable_with || [],
  };
}

// Returns up to 5 unique primary muscles worked across a list of exercises
export function getPrimaryMuscles(exercises) {
  const seen = new Set()
  const out = []
  ;(exercises || []).forEach(ex => {
    ;(ex.muscles?.primary || []).forEach(m => {
      if (!seen.has(m)) { seen.add(m); out.push(m) }
    })
  })
  return out.slice(0, 5)
}

// Did every completed, weighted set in a historical session's logged exercise
// meet or exceed that session's target rep ceiling? (Ceiling is read from the
// embedded historical exercise, not live exercises.json — target reps depend
// on the training style that was active when the session was logged.)
// Returns null when there are no completed weighted sets to judge.
function hitRepCeiling(matchExercise) {
  const doneSets = (matchExercise?.loggedSets || []).filter(s => s.done && parseFloat(s.weight) > 0)
  if (doneSets.length === 0) return null
  const ceiling = matchExercise.repsMax ?? matchExercise.reps ?? matchExercise.repsRange?.max ?? 8
  return doneSets.every(s => (parseFloat(s.reps) || 0) >= ceiling)
}

function topWeightForExercise(matchExercise) {
  const doneWeights = (matchExercise?.loggedSets || [])
    .filter(s => s.done && parseFloat(s.weight) > 0)
    .map(s => parseFloat(s.weight))
  return doneWeights.length ? Math.max(...doneWeights) : null
}

// Up to the two most recent sessions (newest-first) containing this exercise
// with at least one completed weighted set — [mostRecent, secondMostRecent].
function recentSessionsFor(exerciseId, workoutHistory) {
  const found = []
  for (const session of workoutHistory) {
    const match = (session.exercises || []).find(e => e.id === exerciseId)
    if (match && topWeightForExercise(match) != null) {
      found.push(match)
      if (found.length === 2) break
    }
  }
  return found
}

// Single source of truth for both estimateStartingWeight and
// getSuggestionReason below, so the two never drift out of sync.
//
// True progressive overload: if every completed set hit the top of the rep
// range last time, suggest a small increase (+5kg compound / +2.5kg
// accessory). If reps were missed, repeat the same weight — unless the
// session before that *also* missed, in which case suggest a small deload
// (-10%) instead of repeating a weight that isn't working. No history at all
// falls back to a bodyweight/experience formula.
function computeWeightSuggestion(exerciseId, userProfile, workoutHistory) {
  const meta = exercises.find(ex => ex.id === exerciseId)
  const [recent, prior] = recentSessionsFor(exerciseId, workoutHistory)

  if (recent) {
    const topWeight = topWeightForExercise(recent)
    const isCompound = meta ? meta.slot === 'main' || meta.slot === 'secondary' : true
    const recentHit = hitRepCeiling(recent)

    if (recentHit) {
      const delta = isCompound ? 5 : 2.5
      return { weight: Math.round((topWeight + delta) / 2.5) * 2.5, reason: 'progression', delta }
    }

    const priorHit = prior ? hitRepCeiling(prior) : null
    if (priorHit === false) {
      return { weight: Math.max(2.5, Math.round((topWeight * 0.9) / 2.5) * 2.5), reason: 'deload', delta: -10 }
    }

    return { weight: topWeight, reason: 'repeat', delta: 0 }
  }

  if (meta && meta.equipment?.includes('none')) return { weight: null, reason: 'none', delta: 0 }

  // Tier 2: formula fallback — bodyweight % scaled by experience + compound/isolation tier
  const bodyweight = userProfile.weightKg > 0 ? userProfile.weightKg : 65
  const expMultiplier = { starter: 0.7, some: 1.0, active: 1.3 }[userProfile.experience] || 1.0
  const isCompound = meta ? meta.slot === 'main' || meta.slot === 'secondary' : true
  const baseFraction = isCompound ? 0.4 : 0.15
  const raw = bodyweight * baseFraction * expMultiplier
  return { weight: Math.max(2.5, Math.round(raw / 2.5) * 2.5), reason: 'formula', delta: 0 }
}

// Suggests a starting KG for one set of an exercise. See computeWeightSuggestion
// for the progression/deload rule. Returns null for exercises that are
// performable with no equipment at all (push-ups, planks, bodyweight squats,
// ...) unless the user has actually logged a weight for it themselves.
export function estimateStartingWeight({ exerciseId, userProfile = {}, workoutHistory = [] }) {
  return computeWeightSuggestion(exerciseId, userProfile, workoutHistory).weight
}

// Companion to estimateStartingWeight — explains *why* that number was
// suggested, so the UI can show a "why" hint next to the pre-filled weight.
export function getSuggestionReason({ exerciseId, userProfile = {}, workoutHistory = [] }) {
  const { reason, delta } = computeWeightSuggestion(exerciseId, userProfile, workoutHistory)
  return { reason, delta }
}

function hasEquipment(exEquipment, userEquipment) {
  // 'none' exercises work for everyone
  if (exEquipment.includes('none')) return true;
  // Check if user has any of the required equipment
  return exEquipment.some(e => userEquipment.includes(e));
}

function hasInjuryConflict(injuriesAvoid, userInjuries) {
  if (!injuriesAvoid || injuriesAvoid.length === 0) return false;
  return injuriesAvoid.some(i => userInjuries.includes(i));
}

function getSessionLabel(template) {
  const labels = {
    full_a: 'Full Body A', full_b: 'Full Body B', full_c: 'Full Body',
    lower: 'Lower Body', lower_b: 'Glutes & Legs',
    upper_a: 'Upper Body A', upper_b: 'Upper Body B',
  };
  return labels[template] || 'Workout';
}

function getWorkoutName(sessionType, physique) {
  const names = {
    lower:   { hourglass: 'Curve Builder', slim_thick: 'Glute & Legs Sculpt', lean_toned: 'Lower Body Burn', athletic: 'Lower Power', soft_curvy: 'Lower Body Tone', functional: 'Lower Body Strength' },
    lower_b: { hourglass: 'Hip & Glute Focus', slim_thick: 'Booty Blast', lean_toned: 'Leg Definition', athletic: 'Hamstring & Glute', soft_curvy: 'Gentle Lower Body', functional: 'Hip Hinge Day' },
    upper_a: { hourglass: 'Shoulder & Back Sculpt', slim_thick: 'Light Upper', lean_toned: 'Upper Body Tone', athletic: 'Push Day', soft_curvy: 'Upper Body Shape', functional: 'Push & Pull' },
    upper_b: { hourglass: 'Back & Shoulders', slim_thick: 'Upper Lean Out', lean_toned: 'Back & Arms', athletic: 'Pull Day', soft_curvy: 'Arms & Back Tone', functional: 'Pull Day' },
    full_a:  { hourglass: 'Full Body Curves', slim_thick: 'Full Body Sculpt', lean_toned: 'Total Body Tone', athletic: 'Full Body Strength', soft_curvy: 'Full Body Gentle', functional: 'Full Body Strength' },
    full_b:  { hourglass: 'Full Body Definition', slim_thick: 'Full Body Burn', lean_toned: 'Total Body Lean', athletic: 'Full Body Power', soft_curvy: 'Full Body Flow', functional: 'Functional Full Body' },
    full_c:  { hourglass: 'Hourglass Finisher', slim_thick: 'Thick & Toned', lean_toned: 'Lean Finish', athletic: 'Strength Finisher', soft_curvy: 'Soft Sculpt', functional: 'Functional Finish' },
  };
  return names[sessionType]?.[physique] || 'Today\'s Workout';
}
