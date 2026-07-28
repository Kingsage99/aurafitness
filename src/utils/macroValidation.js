import { MACRO_KEYS } from './nutrition'

// Every macro number the app displays or stores passes through here first.
//
// Claude estimates macros well but is unreliable at two specific things: the
// arithmetic (the calorie total often doesn't match the gram breakdown it just
// listed) and physical consistency (saturated fat exceeding total fat, sugar
// exceeding carbs). Neither is fixable by prompting alone — the RECONCILE block
// in claudeApi.js asks for both and they still drift — so we correct them
// client-side, which costs nothing and is deterministic.

// Atwater factors: the kcal each gram of a macronutrient contributes.
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 }

// How far the stated calorie total may drift from the gram breakdown before we
// overwrite it. Rounding across ~8 ingredients accounts for a few percent, so
// anything past 8% is a real arithmetic error rather than noise.
const RECONCILE_TOLERANCE = 0.08

// Upper bounds for a SINGLE meal/serving. These aren't nutritional advice —
// they're "the model returned something impossible" guards. A real meal never
// approaches these, so clamping can only ever fix a broken response.
const MACRO_CEILINGS = {
  calories: 3000,
  protein: 300, carbs: 300, fat: 300,
  fiber: 300, sugar: 300, saturatedFat: 300,
  sodium: 20000, cholesterol: 20000, potassium: 20000,
}

// Macros that are physically a subset of another macro. A response violating
// one of these is definitionally wrong, so the child is capped at its parent.
const SUBSET_OF = { saturatedFat: 'fat', sugar: 'carbs', fiber: 'carbs' }

const toFiniteNonNegative = v => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// Coerce every tracked macro to a sane number: finite, non-negative, present,
// whole, within its ceiling, and not exceeding the macro it's a subset of.
//
// Values are rounded to integers because that's what the UI displays and what
// gets summed into the daily total. Storing 8.7 while showing "9" makes the
// app's own arithmetic look broken — doubling a portion rendered 9 → 17
// (8.7 × 2 = 17.4) rather than 18. Rounding here keeps what the user sees and
// what the app stores identical; sub-gram precision is well inside the error
// bars of any macro estimate anyway.
export function sanitizeMacros(macros) {
  const out = { ...(macros && typeof macros === 'object' ? macros : {}) }

  for (const k of MACRO_KEYS) {
    out[k] = Math.round(Math.min(toFiniteNonNegative(out[k]), MACRO_CEILINGS[k] ?? Infinity))
  }
  for (const [child, parent] of Object.entries(SUBSET_OF)) {
    if (out[child] > out[parent]) out[child] = out[parent]
  }
  return out
}

// Force the calorie total to agree with the gram breakdown.
//
// When the two disagree we keep the grams and rewrite calories, not the other
// way round: the prompt has Claude list each ingredient with a quantity and sum
// them, so the grams are built up from parts, while the calorie figure is more
// often a single lump estimate. Deriving calories from macros is also what
// nutrition labels do, so the corrected number stays internally consistent with
// the per-macro bars the UI already draws.
export function reconcileMacros(macros) {
  const m = { ...(macros && typeof macros === 'object' ? macros : {}) }
  const derived = Math.round(
    toFiniteNonNegative(m.protein) * KCAL_PER_G.protein +
    toFiniteNonNegative(m.carbs) * KCAL_PER_G.carbs +
    toFiniteNonNegative(m.fat) * KCAL_PER_G.fat
  )
  const stated = toFiniteNonNegative(m.calories)

  // No macros to derive from — nothing to check the stated total against.
  if (derived <= 0) return { macros: m, reconciled: false }

  if (stated <= 0) return { macros: { ...m, calories: derived }, reconciled: true }

  const drift = Math.abs(stated - derived) / derived
  if (drift <= RECONCILE_TOLERANCE) return { macros: m, reconciled: false }

  return { macros: { ...m, calories: derived }, reconciled: true }
}

// Multiply a serving up or down. Pure arithmetic — this is how a user corrects
// a portion-size misjudgement without spending an AI call.
export function scaleMacros(macros, multiplier) {
  const factor = Number(multiplier)
  if (!Number.isFinite(factor) || factor < 0) return sanitizeMacros(macros)

  const out = { ...(macros && typeof macros === 'object' ? macros : {}) }
  for (const k of MACRO_KEYS) {
    out[k] = Math.round(toFiniteNonNegative(out[k]) * factor)
  }
  return out
}

// The full pipeline applied to anything Claude returns. Non-macro keys (name,
// servingSize, …) pass through untouched.
export function normalizeMacros(raw) {
  if (!raw || typeof raw !== 'object') return raw
  return reconcileMacros(sanitizeMacros(raw)).macros
}
