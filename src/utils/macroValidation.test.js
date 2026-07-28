import { describe, it, expect } from 'vitest'
import { sanitizeMacros, reconcileMacros, scaleMacros, normalizeMacros } from './macroValidation'
import { MACRO_KEYS } from './nutrition'

// A set where calories already equal 4P + 4C + 9F (40*4 + 30*4 + 10*9 = 370).
const consistent = () => ({
  calories: 370, protein: 40, carbs: 30, fat: 10,
  fiber: 5, sugar: 8, saturatedFat: 3,
  sodium: 400, cholesterol: 90, potassium: 600,
})

describe('sanitizeMacros', () => {
  it('fills every tracked macro so nothing renders as undefined', () => {
    const out = sanitizeMacros({ calories: 200 })
    MACRO_KEYS.forEach(k => expect(typeof out[k]).toBe('number'))
  })

  it('floors negatives and non-numbers to zero', () => {
    const out = sanitizeMacros({ protein: -12, carbs: 'abc', fat: NaN, calories: null })
    expect(out.protein).toBe(0)
    expect(out.carbs).toBe(0)
    expect(out.fat).toBe(0)
    expect(out.calories).toBe(0)
  })

  it('clamps implausible values to the per-serving ceiling', () => {
    const out = sanitizeMacros({ calories: 99999, protein: 5000, sodium: 900000 })
    expect(out.calories).toBe(3000)
    expect(out.protein).toBe(300)
    expect(out.sodium).toBe(20000)
  })

  it('caps saturated fat at total fat', () => {
    const out = sanitizeMacros({ ...consistent(), fat: 10, saturatedFat: 25 })
    expect(out.saturatedFat).toBe(10)
  })

  it('caps sugar and fiber at total carbs', () => {
    const out = sanitizeMacros({ ...consistent(), carbs: 20, sugar: 55, fiber: 33 })
    expect(out.sugar).toBe(20)
    expect(out.fiber).toBe(20)
  })

  it('preserves non-macro keys', () => {
    const out = sanitizeMacros({ name: 'Oats', servingSize: '1 cup', protein: 5 })
    expect(out.name).toBe('Oats')
    expect(out.servingSize).toBe('1 cup')
  })

  it('leaves an already-valid set untouched', () => {
    expect(sanitizeMacros(consistent())).toEqual(consistent())
  })

  // Guards the "9 × 2 = 17" display bug: fractional storage behind a rounded
  // display makes the app's own arithmetic look wrong.
  it('rounds to integers so display and stored value agree', () => {
    const out = sanitizeMacros({ ...consistent(), fat: 8.7, protein: 40.4 })
    expect(out.fat).toBe(9)
    expect(out.protein).toBe(40)
  })

  it('keeps doubling consistent with what the grid renders', () => {
    const base = sanitizeMacros({ ...consistent(), fat: 8.7 })
    expect(scaleMacros(base, 2).fat).toBe(18)
  })
})

describe('reconcileMacros', () => {
  it('leaves a consistent set alone', () => {
    const { macros, reconciled } = reconcileMacros(consistent())
    expect(reconciled).toBe(false)
    expect(macros.calories).toBe(370)
  })

  it('tolerates small rounding drift without rewriting', () => {
    // ~5% off — within the 8% tolerance.
    const { macros, reconciled } = reconcileMacros({ ...consistent(), calories: 389 })
    expect(reconciled).toBe(false)
    expect(macros.calories).toBe(389)
  })

  it('rewrites a calorie total that contradicts the grams', () => {
    const { macros, reconciled } = reconcileMacros({ ...consistent(), calories: 900 })
    expect(reconciled).toBe(true)
    expect(macros.calories).toBe(370)
  })

  it('derives calories when the model omitted them', () => {
    const { macros, reconciled } = reconcileMacros({ protein: 40, carbs: 30, fat: 10 })
    expect(reconciled).toBe(true)
    expect(macros.calories).toBe(370)
  })

  it('does not invent calories when there are no macros to derive from', () => {
    const { macros, reconciled } = reconcileMacros({ calories: 250, protein: 0, carbs: 0, fat: 0 })
    expect(reconciled).toBe(false)
    expect(macros.calories).toBe(250)
  })
})

describe('scaleMacros', () => {
  it('scales every tracked macro', () => {
    const out = scaleMacros(consistent(), 2)
    MACRO_KEYS.forEach(k => expect(out[k]).toBe(consistent()[k] * 2))
  })

  it('handles a half portion', () => {
    const out = scaleMacros(consistent(), 0.5)
    expect(out.calories).toBe(185)
    expect(out.protein).toBe(20)
  })

  it('round-trips through the inverse multiplier', () => {
    const doubled = scaleMacros(consistent(), 2)
    const back = scaleMacros(doubled, 0.5)
    MACRO_KEYS.forEach(k => expect(back[k]).toBe(consistent()[k]))
  })

  it('zeroes out on a zero multiplier', () => {
    const out = scaleMacros(consistent(), 0)
    MACRO_KEYS.forEach(k => expect(out[k]).toBe(0))
  })

  it('ignores an invalid multiplier rather than producing NaN', () => {
    const out = scaleMacros(consistent(), 'abc')
    expect(out.calories).toBe(370)
    MACRO_KEYS.forEach(k => expect(Number.isFinite(out[k])).toBe(true))
  })

  it('preserves non-macro keys', () => {
    const out = scaleMacros({ ...consistent(), name: 'Oats' }, 2)
    expect(out.name).toBe('Oats')
  })
})

describe('normalizeMacros', () => {
  it('sanitizes and reconciles in one pass', () => {
    // saturatedFat > fat AND calories contradict the grams.
    const out = normalizeMacros({
      calories: 1200, protein: 40, carbs: 30, fat: 10, saturatedFat: 99,
    })
    expect(out.saturatedFat).toBe(10)
    expect(out.calories).toBe(370)
  })

  it('clamps before deriving, so a clamped macro drives the calorie total', () => {
    const out = normalizeMacros({ protein: 5000, carbs: 0, fat: 0 })
    expect(out.protein).toBe(300)
    expect(out.calories).toBe(1200)
  })

  it('passes through non-objects untouched', () => {
    expect(normalizeMacros(null)).toBe(null)
    expect(normalizeMacros(undefined)).toBe(undefined)
  })
})
