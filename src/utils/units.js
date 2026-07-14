// Canonical storage for every weight value in this app (Supabase rows, in-memory
// exercise data, progression math) is always kilograms. These helpers convert at
// the display/input edges only, based on userProfile.units ('metric' | 'imperial').

const KG_PER_LB = 0.45359237
const LB_PER_KG = 1 / KG_PER_LB

export function kgToLbs(kg) {
  return kg * LB_PER_KG
}

export function lbsToKg(lbs) {
  return lbs * KG_PER_LB
}

export function weightUnitLabel(units) {
  return units === 'imperial' ? 'lbs' : 'kg'
}

// lbs are usually tracked in whole numbers, kg in halves (2.5kg plates).
function roundForDisplay(value, units) {
  return units === 'imperial' ? Math.round(value) : Math.round(value * 10) / 10
}

// kgValue is the canonical stored value. Returns a number in the active display
// unit, or '' if there's nothing to show.
export function toDisplayWeight(kgValue, units) {
  if (kgValue === '' || kgValue === null || kgValue === undefined) return ''
  const kg = Number(kgValue)
  if (Number.isNaN(kg)) return ''
  return roundForDisplay(units === 'imperial' ? kgToLbs(kg) : kg, units)
}

// displayValue is whatever the user typed, in their active display unit. Returns
// the canonical kg value to store, or '' if blank.
export function fromDisplayWeight(displayValue, units) {
  if (displayValue === '' || displayValue === null || displayValue === undefined) return ''
  const value = Number(displayValue)
  if (Number.isNaN(value)) return ''
  const kg = units === 'imperial' ? lbsToKg(value) : value
  return Math.round(kg * 10) / 10
}
