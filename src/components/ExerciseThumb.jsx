import React from 'react'
import { NB } from '../styles/neoBrutalism'

export const SLOT_COLORS = {
  main:      NB.magenta,
  secondary: NB.blue,
  accessory: NB.yellow,
  finisher:  NB.pink,
}

// Shows an exercise's photo when it has one; otherwise a generic placeholder
// in the exercise's slot color. Real photos come later — this is the stand-in.
export default function ExerciseThumb({ src, slot, size = 48, radius }) {
  const bg = SLOT_COLORS[slot] || NB.ink
  const r = radius ?? Math.round(size * 0.25)

  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: size, height: size, borderRadius: r, border: `2px solid ${NB.ink}`, objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }

  return (
    <div style={{ width: size, height: size, borderRadius: r, border: `2px solid ${NB.ink}`, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 6.5l11 11M4 9l-2 2 3 3 2-2M20 15l2-2-3-3-2 2" />
      </svg>
    </div>
  )
}
