import React from 'react'
import { NB, NB_INTENSITY_RAMP } from '../styles/neoBrutalism'

// Radar/spider chart — pure SVG, no libs. N axes (pentagon when 5), concentric
// polygon gridlines + spokes, lavender-filled ink-outlined data polygon.
// axes: [{ label, value 0..1, raw }]
export default function RadarChart({ axes = [], size = 260, rings = 4, fill = NB_INTENSITY_RAMP[2], stroke = NB.ink }) {
  const N = axes.length
  if (N < 3) return null

  const cx = size / 2, cy = size / 2
  const labelPad = 34
  const r = size / 2 - labelPad
  const angle = (i) => (-90 + (i * 360) / N) * (Math.PI / 180)
  const pt = (i, radius) => [cx + radius * Math.cos(angle(i)), cy + radius * Math.sin(angle(i))]
  const poly = (radius) => axes.map((_, i) => pt(i, radius).map(v => v.toFixed(1)).join(',')).join(' ')

  const hasData = axes.some(a => a.value > 0)
  const dataPoly = axes.map((a, i) => pt(i, r * Math.max(0.02, a.value)).map(v => v.toFixed(1)).join(',')).join(' ')

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', display: 'block' }}>
        {/* concentric gridlines + spokes — recessive */}
        {Array.from({ length: rings }, (_, k) => (
          <polygon key={k} points={poly((r * (k + 1)) / rings)} fill="none" stroke="#D9CFEA" strokeWidth="1" />
        ))}
        {axes.map((_, i) => {
          const [px, py] = pt(i, r)
          return <line key={i} x1={cx} y1={cy} x2={px} y2={py} stroke="#D9CFEA" strokeWidth="1" />
        })}

        {/* data polygon */}
        {hasData && (
          <>
            <polygon points={dataPoly} fill={fill} fillOpacity="0.85" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
            {axes.map((a, i) => {
              const [px, py] = pt(i, r * Math.max(0.02, a.value))
              return <circle key={i} cx={px} cy={py} r="4" fill={NB.purpleDeep} stroke={NB.ink} strokeWidth="1.5" />
            })}
          </>
        )}

        {/* axis labels + raw values (x clamped so side labels never clip) */}
        {axes.map((a, i) => {
          let [px, py] = pt(i, r + 14)
          const cos = Math.cos(angle(i))
          const anchor = cos > 0.35 ? 'start' : cos < -0.35 ? 'end' : 'middle'
          if (anchor === 'end') px = Math.max(px, 58)
          if (anchor === 'start') px = Math.min(px, size - 58)
          return (
            <g key={i}>
              <text x={px} y={py} textAnchor={anchor} fontSize="9.5" fontFamily={NB.fontMono} fontWeight="800" fill={NB.ink} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {a.label.toUpperCase()}
              </text>
              <text x={px} y={py + 11} textAnchor={anchor} fontSize="8.5" fontFamily={NB.fontMono} fontWeight="700" fill="#555">
                {Math.round(a.raw)} sets
              </text>
            </g>
          )
        })}
      </svg>

      {!hasData && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, color: '#555', fontWeight: 600, background: NB.white, padding: '4px 10px' }}>No workouts in this period</span>
        </div>
      )}
    </div>
  )
}
