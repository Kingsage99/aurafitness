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
 * Returns an array of WorkoutDay objects.
 */
export function buildWeeklyPlan(userProfile) {
  const { daysPerWeek = 3 } = userProfile;
  const templates = SESSION_TEMPLATES[daysPerWeek] || SESSION_TEMPLATES[3];

  return templates.map((template, index) => ({
    dayIndex: index,
    sessionType: template,
    label: getSessionLabel(template),
    workout: buildSingleWorkout(userProfile, template),
  }));
}

/**
 * Build one workout session.
 * Returns { name, exercises[], totalSets, estimatedMinutes }
 */
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

  // Filter to usable exercises
  const pool = exercises.filter(ex => {
    if (dislikedExercises.includes(ex.id)) return false;
    if (!hasEquipment(ex.equipment, equipment)) return false;
    if (hasInjuryConflict(ex.injuries_avoid, injuries)) return false;
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
    chosen.push(formatExercise(pick, config.sets, repRange));
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

function formatExercise(ex, sets, repRange) {
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
    cues: ex.cues || [],
    swappable_with: ex.swappable_with || [],
  };
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
