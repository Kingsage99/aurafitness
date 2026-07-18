import React from 'react'
import { NB } from '../styles/neoBrutalism'

// Conic-gradient macro-composition donut (Protein/Carbs/Fat proportional segments,
// total calories in the center) — matches the Fitness UI Kit v2 Nutrition section.
export default function MacroRing({ protein = 0, carbs = 0, fat = 0, calories = 0, size = 130 }) {
  const total = Math.max(1, protein + carbs + fat)
  const pPct = (protein / total) * 100
  const cPct = (carbs / total) * 100
  const gradient = `conic-gradient(${NB.magenta} 0 ${pPct}%, ${NB.yellow} 0 ${pPct + cPct}%, ${NB.pink} 0 100%)`
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', border: `2.5px solid ${NB.ink}`, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: size * 0.54, height: size * 0.54, borderRadius: '50%', border: `2.5px solid ${NB.ink}`, background: NB.white, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: size * 0.14, color: NB.ink, lineHeight: 1 }}>{Math.round(calories).toLocaleString()}</span>
        <span style={{ fontFamily: NB.fontMono, fontSize: size * 0.07, fontWeight: 700, color: '#555' }}>kcal</span>
      </div>
    </div>
  )
}
