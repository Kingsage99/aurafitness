import React, { useRef } from 'react'
import { NB } from '../styles/neoBrutalism'

// Curved arc dial — ticks laid along a shallow arc that rotates under a fixed
// top-center marker as you drag. Matches the reference "weight" picker.
export default function ArcDial({
  min, max, value, onChange,
  width = 340, height = 92, radius = 300, degPerUnit = 2.0,
  majorEvery = 5, pxPerUnit = 9, accent = NB.magenta,
}) {
  const drag = useRef(null)
  const clamp = v => Math.min(max, Math.max(min, v))

  const down = e => { e.currentTarget.setPointerCapture?.(e.pointerId); drag.current = { last: e.clientX, acc: 0 } }
  const move = e => {
    if (!drag.current) return
    drag.current.acc += e.clientX - drag.current.last
    drag.current.last = e.clientX
    const units = Math.trunc(drag.current.acc / pxPerUnit)
    if (units) { drag.current.acc -= units * pxPerUnit; onChange(clamp(value - units)) } // drag left → increase
  }
  const up = e => { drag.current = null; e.currentTarget.releasePointerCapture?.(e.pointerId) }

  const cx = width / 2
  const cy = radius + 6
  const windowUnits = Math.ceil(24 / degPerUnit)
  const ticks = []
  for (let d = -windowUnits; d <= windowUnits; d++) {
    const v = value + d
    if (v < min || v > max) continue
    const ang = d * degPerUnit * Math.PI / 180
    const major = v % majorEvery === 0
    const L = major ? 17 : 9
    ticks.push({
      v, major,
      ox: cx + radius * Math.sin(ang), oy: cy - radius * Math.cos(ang),
      ix: cx + (radius - L) * Math.sin(ang), iy: cy - (radius - L) * Math.cos(ang),
    })
  }

  return (
    <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
      style={{ width, height, touchAction: 'none', userSelect: 'none', cursor: 'ew-resize' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }}>
        {ticks.map(t => (
          <line key={t.v} x1={t.ox} y1={t.oy} x2={t.ix} y2={t.iy}
            stroke={t.major ? NB.ink : '#9a8fb0'} strokeWidth={t.major ? 2.5 : 1.5} strokeLinecap="round" />
        ))}
        {/* fixed top-center indicator */}
        <line x1={cx} y1={3} x2={cx} y2={34} stroke={accent} strokeWidth="3.5" strokeLinecap="round" />
        <polygon points={`${cx - 7},1 ${cx + 7},1 ${cx},13`} fill={NB.ink} />
      </svg>
    </div>
  )
}
