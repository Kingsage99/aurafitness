import React, { useRef } from 'react'
import { NB } from '../styles/neoBrutalism'

// Draggable ruler picker with a fixed center indicator — the ticks slide under
// the marker as you drag. Neo-brutalist: ink ticks, hard-edged marker.
// orientation: 'horizontal' | 'vertical'
export default function RulerSlider({
  orientation = 'horizontal',
  min, max, value, onChange,
  pxPerUnit = 10, majorEvery = 5, labelEvery = 10,
  length = 320, thickness = 60,
  accent = NB.magenta,
  formatLabel = v => v,
}) {
  const vertical = orientation === 'vertical'
  const drag = useRef(null)
  const clamp = v => Math.min(max, Math.max(min, v))

  const down = e => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { last: vertical ? e.clientY : e.clientX, acc: 0 }
  }
  const move = e => {
    if (!drag.current) return
    const cur = vertical ? e.clientY : e.clientX
    drag.current.acc += cur - drag.current.last
    drag.current.last = cur
    const units = Math.trunc(drag.current.acc / pxPerUnit)
    if (units !== 0) {
      drag.current.acc -= units * pxPerUnit
      // vertical: drag down (+) → higher; horizontal: drag left (−) → higher
      onChange(clamp(value + (vertical ? units : -units)))
    }
  }
  const up = e => { drag.current = null; e.currentTarget.releasePointerCapture?.(e.pointerId) }

  const span = Math.ceil(length / pxPerUnit / 2) + 2
  const ticks = []
  for (let v = value - span; v <= value + span; v++) {
    if (v < min || v > max) continue
    // higher values: vertical → above center; horizontal → right of center
    const fromCenter = (v - value) * pxPerUnit
    const pos = length / 2 + (vertical ? -fromCenter : fromCenter)
    ticks.push({ v, pos, major: v % majorEvery === 0, labeled: v % labelEvery === 0 })
  }

  const boxW = vertical ? thickness : length
  const boxH = vertical ? length : thickness

  return (
    <div
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
      style={{ position: 'relative', width: boxW, height: boxH, overflow: 'hidden', cursor: vertical ? 'ns-resize' : 'ew-resize', touchAction: 'none', userSelect: 'none', flexShrink: 0 }}
    >
      {ticks.map(t => {
        const len = t.major ? thickness * 0.5 : thickness * 0.28
        return (
          <React.Fragment key={t.v}>
            <div style={vertical
              ? { position: 'absolute', top: t.pos, left: 0, width: len, height: t.major ? 2.5 : 1.5, background: NB.ink, transform: 'translateY(-50%)' }
              : { position: 'absolute', left: t.pos, top: 0, height: len, width: t.major ? 2.5 : 1.5, background: NB.ink, transform: 'translateX(-50%)' }
            } />
            {t.labeled && (
              <div style={vertical
                ? { position: 'absolute', top: t.pos, left: thickness * 0.5 + 4, transform: 'translateY(-50%)', fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: '#666' }
                : { position: 'absolute', left: t.pos, top: thickness * 0.5 + 4, transform: 'translateX(-50%)', fontFamily: NB.fontMono, fontSize: 10, fontWeight: 700, color: '#666' }
              }>{formatLabel(t.v)}</div>
            )}
          </React.Fragment>
        )
      })}

      {/* Fixed center indicator */}
      <div style={vertical
        ? { position: 'absolute', top: length / 2, left: 0, width: thickness, height: 3, background: accent, transform: 'translateY(-50%)', boxShadow: `0 0 0 1.5px ${NB.ink}` }
        : { position: 'absolute', left: length / 2, top: 0, width: 3, height: thickness, background: accent, transform: 'translateX(-50%)', boxShadow: `0 0 0 1.5px ${NB.ink}` }
      } />
      <div style={vertical
        ? { position: 'absolute', top: length / 2, right: 2, transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: `8px solid ${NB.ink}` }
        : { position: 'absolute', left: length / 2, bottom: 2, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: `8px solid ${NB.ink}` }
      } />
    </div>
  )
}
