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

// Daily protein/carbs/fat targets. Prefers the personalized TDEE-based
// dailyCalorieTarget set at onboarding (split by fitnessGoal); falls back to
// a flat per-physique table only if that value is missing.
export function getDailyTargets({ dailyCalorieTarget, fitnessGoal, physique } = {}) {
  if (dailyCalorieTarget && dailyCalorieTarget > 0) {
    const kcal = dailyCalorieTarget
    const highProtein = ['lose_weight', 'tone_recomp'].includes(fitnessGoal)
    const building = ['build_muscle', 'athletic_performance'].includes(fitnessGoal)
    const [pp, cp, fp] = highProtein ? [0.35, 0.35, 0.30] : building ? [0.30, 0.45, 0.25] : [0.30, 0.40, 0.30]
    return {
      calories: kcal,
      protein: Math.round((kcal * pp) / 4),
      carbs: Math.round((kcal * cp) / 4),
      fat: Math.round((kcal * fp) / 9),
    }
  }
  return DAILY_TARGETS[physique] || DAILY_TARGETS.lean_toned
}
