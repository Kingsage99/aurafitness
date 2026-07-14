import { NB } from '../styles/neoBrutalism'

// Flat per-physique fallback — only used when a user has no onboarding-computed
// dailyCalorieTarget (e.g. incomplete/legacy profile).
export const DAILY_TARGETS = {
  lean_toned:  { calories: 1750, protein: 130, carbs: 180, fat: 55 },
  slim_thick:  { calories: 1900, protein: 150, carbs: 190, fat: 60 },
  hourglass:   { calories: 1800, protein: 135, carbs: 185, fat: 58 },
  athletic:    { calories: 2100, protein: 160, carbs: 220, fat: 65 },
  soft_curvy:  { calories: 1700, protein: 120, carbs: 175, fat: 55 },
  functional:  { calories: 2000, protein: 145, carbs: 210, fat: 62 },
}

// Reference daily values for the macros the app tracks but doesn't personalize
// (label DVs). Fiber gets personalized from calories when possible (14g/1000kcal).
export const MACRO_DAILY_REF = {
  fiber: 28,
  sugar: 50,
  saturatedFat: 20,
  sodium: 2300,
  cholesterol: 300,
  potassium: 4700,
}

// One metadata row per tracked macro — single source for labels, units, and the
// macro's fixed display color (a macro keeps its color everywhere, never remapped).
// 'limit' marks macros where exceeding the target is the bad direction.
export const MACRO_META = [
  { key: 'calories',     label: 'Calories',  unit: 'kcal', color: NB.magenta },
  { key: 'protein',      label: 'Protein',   unit: 'g',    color: NB.blue },
  { key: 'carbs',        label: 'Carbs',     unit: 'g',    color: NB.yellow },
  { key: 'fat',          label: 'Fat',       unit: 'g',    color: NB.pink },
  { key: 'fiber',        label: 'Fiber',     unit: 'g',    color: NB.teal },
  { key: 'sugar',        label: 'Sugar',     unit: 'g',    color: NB.teal, limit: true },
  { key: 'saturatedFat', label: 'Sat Fat',   unit: 'g',    color: NB.teal, limit: true },
  { key: 'sodium',       label: 'Sodium',    unit: 'mg',   color: NB.teal, limit: true },
  { key: 'cholesterol',  label: 'Chol',      unit: 'mg',   color: NB.teal, limit: true },
  { key: 'potassium',    label: 'Potassium', unit: 'mg',   color: NB.teal },
]

export const MACRO_KEYS = MACRO_META.map(m => m.key)

// Full 10-field daily targets. Prefers the personalized TDEE-based
// dailyCalorieTarget set at onboarding (split by fitnessGoal); falls back to
// a flat per-physique table only if that value is missing. The six reference
// macros come from MACRO_DAILY_REF, with fiber scaled to calories (14g/1000kcal).
export function getDailyTargets({ dailyCalorieTarget, fitnessGoal, physique } = {}) {
  let main
  if (dailyCalorieTarget && dailyCalorieTarget > 0) {
    const kcal = dailyCalorieTarget
    const highProtein = ['lose_weight', 'tone_recomp'].includes(fitnessGoal)
    const building = ['build_muscle', 'athletic_performance'].includes(fitnessGoal)
    const [pp, cp, fp] = highProtein ? [0.35, 0.35, 0.30] : building ? [0.30, 0.45, 0.25] : [0.30, 0.40, 0.30]
    main = {
      calories: kcal,
      protein: Math.round((kcal * pp) / 4),
      carbs: Math.round((kcal * cp) / 4),
      fat: Math.round((kcal * fp) / 9),
    }
  } else {
    main = DAILY_TARGETS[physique] || DAILY_TARGETS.lean_toned
  }
  return {
    ...MACRO_DAILY_REF,
    ...main,
    fiber: Math.round((main.calories * 14) / 1000),
  }
}
