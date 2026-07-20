import React from 'react'
import { PancakesIcon, LunchIcon, DinnerIcon, SnackIcon } from './Icons'
import { NB } from '../styles/neoBrutalism'

// Per-meal-type accent colors, shared by the Meals screen, cookbook tiles, and
// the Macros page's recently-logged list.
export const MEAL_COLORS = {
  breakfast: NB.yellow, lunch: NB.teal, dinner: NB.magenta,
  snack: NB.pink, snack_1: NB.pink, snack_2: NB.orange, snack_3: NB.blue,
  second_lunch: NB.lavender, suggested: NB.lavender, eaten: NB.teal, cookbook: NB.lavender,
}

// Buckets any meal_type string into one of four custom icons: breakfast
// (pancakes), lunch (bento box), dinner (steak), everything else (chocolate).
export function mealIconKind(type) {
  const t = type || ''
  if (t === 'breakfast') return 'breakfast'
  if (t === 'lunch' || t === 'second_lunch') return 'lunch'
  if (t === 'dinner') return 'dinner'
  return 'snack'
}

export function MealTypeIcon({ type, size = 46, opacity = 1 }) {
  const style = { opacity }
  switch (mealIconKind(type)) {
    case 'breakfast': return <PancakesIcon size={size} style={style} />
    case 'lunch':     return <LunchIcon size={size} style={style} />
    case 'dinner':    return <DinnerIcon size={size} style={style} />
    default:          return <SnackIcon size={size} style={style} />
  }
}
