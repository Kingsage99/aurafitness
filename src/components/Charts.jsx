import React, { useState } from 'react'
import { NB, NB_INTENSITY_RAMP } from '../styles/neoBrutalism'

// Shared hand-rolled SVG chart primitives for Analytics. All single-series
// (no legends — the section title names the series); values/labels always in
// ink/#555 mono, never in the series color; recessive grids.

const GRID = '#EEE7F5'

// ─── TrendChart — line/area with optional dashed target line ─────────────────
// points: [{ label, value, logged? }] — tap a band to inspect a point.
export function TrendChart({ points = [], target = null, height = 150, color = NB.purpleDeep, unit = '', baseline = 'zero' }) {
  const [active, setActive] = useState(null)
  const W = 340, H = height
  const padL = 8, padR = 8, padT = 22, padB = 20

  if (!points.length) return null
  const values = points.map(p => p.value)
  const maxV = Math.max(1, ...values, target || 0)
  // baseline 'auto' zooms the y-domain to the data (body-weight style trends
  // where the change matters more than distance from zero)
  const minV = baseline === 'auto' ? Math.min(...values) * 0.98 : 0
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const x = (i) => padL + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = (v) => padT + innerH - ((v - minV) / (maxV - minV)) * innerH

  const yBase = padT + innerH
  const linePts = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')
  const areaPts = `${padL},${yBase} ${linePts} ${x(points.length - 1)},${yBase}`
  const last = points[points.length - 1]
  const bandW = innerW / points.length

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {/* recessive grid */}
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={padL} x2={W - padR} y1={padT + innerH * f} y2={padT + innerH * f} stroke={GRID} strokeWidth="1" />
      ))}
      <line x1={padL} x2={W - padR} y1={yBase} y2={yBase} stroke={NB.ink} strokeWidth="1.5" />

      {/* dashed target reference */}
      {target > 0 && (
        <>
          <line x1={padL} x2={W - padR} y1={y(target)} y2={y(target)} stroke={NB.ink} strokeWidth="1.2" strokeDasharray="5 4" opacity="0.55" />
          <text x={W - padR} y={y(target) - 4} textAnchor="end" fontSize="8.5" fontFamily={NB.fontMono} fontWeight="700" fill="#555">target {Math.round(target).toLocaleString()}</text>
        </>
      )}

      <polygon points={areaPts} fill={NB_INTENSITY_RAMP[1]} opacity="0.65" />
      <polyline points={linePts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* last point: marker + direct label */}
      <circle cx={x(points.length - 1)} cy={y(last.value)} r="4" fill={color} stroke={NB.ink} strokeWidth="1.5" />
      {active === null && (
        <text x={Math.min(x(points.length - 1), W - padR - 2)} y={y(last.value) - 8} textAnchor="end" fontSize="10" fontFamily={NB.fontMono} fontWeight="800" fill={NB.ink}>
          {Math.round(last.value).toLocaleString()}{unit}
        </text>
      )}

      {/* min/max y + first/last x labels */}
      <text x={padL} y={padT - 8} fontSize="8.5" fontFamily={NB.fontMono} fontWeight="700" fill="#555">{Math.round(maxV).toLocaleString()}{unit}</text>
      <text x={padL} y={H - 6} fontSize="8.5" fontFamily={NB.fontMono} fontWeight="700" fill="#555">{points[0].label}</text>
      <text x={W - padR} y={H - 6} textAnchor="end" fontSize="8.5" fontFamily={NB.fontMono} fontWeight="700" fill="#555">{last.label}</text>

      {/* active point inspection */}
      {active !== null && points[active] && (
        <>
          <line x1={x(active)} x2={x(active)} y1={padT - 2} y2={yBase} stroke={NB.ink} strokeWidth="1" />
          <circle cx={x(active)} cy={y(points[active].value)} r="4.5" fill={color} stroke={NB.ink} strokeWidth="1.5" />
          <g transform={`translate(${Math.max(padL + 34, Math.min(x(active), W - padR - 34))}, ${padT - 5})`}>
            <rect x="-34" y="-14" width="68" height="17" rx="4" fill={NB.white} stroke={NB.ink} strokeWidth="1.5" />
            <text x="0" y="-2" textAnchor="middle" fontSize="8.5" fontFamily={NB.fontMono} fontWeight="800" fill={NB.ink}>
              {points[active].label} · {Math.round(points[active].value).toLocaleString()}{unit}
            </text>
          </g>
        </>
      )}

      {/* full-height tap bands (hit target far larger than the mark) */}
      {points.map((p, i) => (
        <rect key={i} x={padL + i * bandW} y={0} width={bandW} height={H} fill="transparent"
          onClick={() => setActive(active === i ? null : i)} style={{ cursor: 'pointer' }} />
      ))}
    </svg>
  )
}

// ─── BarTrend — vertical bars per bucket ──────────────────────────────────────
export function BarTrend({ points = [], target = null, height = 140, unit = '' }) {
  const [active, setActive] = useState(null)
  const W = 340, H = height
  const padL = 8, padR = 8, padT = 20, padB = 20

  if (!points.length) return null
  const maxV = Math.max(1, ...points.map(p => p.value), target || 0)
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const slot = innerW / points.length
  const barW = Math.min(26, slot * 0.6)
  const y = (v) => padT + innerH - (v / maxV) * innerH
  const showAll = points.length <= 8

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {[0.5].map(f => (
        <line key={f} x1={padL} x2={W - padR} y1={padT + innerH * f} y2={padT + innerH * f} stroke={GRID} strokeWidth="1" />
      ))}
      <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} stroke={NB.ink} strokeWidth="1.5" />

      {target > 0 && (
        <>
          <line x1={padL} x2={W - padR} y1={y(target)} y2={y(target)} stroke={NB.ink} strokeWidth="1.2" strokeDasharray="5 4" opacity="0.55" />
          <text x={W - padR} y={y(target) - 4} textAnchor="end" fontSize="8.5" fontFamily={NB.fontMono} fontWeight="700" fill="#555">target {Math.round(target).toLocaleString()}</text>
        </>
      )}

      {points.map((p, i) => {
        const cx = padL + slot * i + slot / 2
        const h = Math.max(p.value > 0 ? 3 : 0, (p.value / maxV) * innerH)
        const isLast = i === points.length - 1
        const showLabel = (showAll && p.value > 0) || active === i || (active === null && isLast && p.value > 0 && !showAll)
        return (
          <g key={i}>
            {p.value > 0 && (
              <rect x={cx - barW / 2} y={padT + innerH - h} width={barW} height={h} rx="3"
                fill={isLast ? NB.purpleDeep : NB_INTENSITY_RAMP[2]}
                stroke={NB.ink} strokeWidth="1.5" />
            )}
            {showLabel && (
              <text x={cx} y={padT + innerH - h - 5} textAnchor="middle" fontSize="9" fontFamily={NB.fontMono} fontWeight="800" fill={NB.ink}>
                {Math.round(p.value).toLocaleString()}{unit}
              </text>
            )}
            {(showAll || i === 0 || isLast) && (
              <text x={cx} y={H - 6} textAnchor="middle" fontSize="8" fontFamily={NB.fontMono} fontWeight="700" fill="#555">{p.label}</text>
            )}
            <rect x={padL + slot * i} y={0} width={slot} height={H} fill="transparent"
              onClick={() => setActive(active === i ? null : i)} style={{ cursor: 'pointer' }} />
          </g>
        )
      })}
    </svg>
  )
}

// ─── HBarList — ranked horizontal bars ────────────────────────────────────────
// items: [{ key, label, value, sublabel? }]; sequential purple ramp by magnitude,
// active row gets the deep purple.
export function HBarList({ items = [], unit = '', activeKey = null, onSelect = null }) {
  const maxV = Math.max(1, ...items.map(i => i.value))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(item => {
        const pct = Math.round((item.value / maxV) * 100)
        const rampIdx = item.value <= 0 ? 0 : Math.min(4, 1 + Math.floor((item.value / maxV) * 3.99))
        const isActive = activeKey === item.key
        const fill = isActive ? NB.purpleDeep : NB_INTENSITY_RAMP[rampIdx]
        return (
          <div key={item.key || item.label} onClick={onSelect ? () => onSelect(item.key) : undefined}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: isActive ? 800 : 700, color: NB.ink }}>
                {item.label}{item.sublabel ? <span style={{ color: '#777', fontWeight: 600 }}> · {item.sublabel}</span> : null}
              </span>
              <span style={{ fontFamily: NB.fontMono, fontSize: 11, fontWeight: 800, color: NB.ink }}>{Math.round(item.value).toLocaleString()}{unit}</span>
            </div>
            <div style={{ height: 14, border: `1.5px solid ${NB.ink}`, borderRadius: 5, background: NB.white, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: fill, borderRadius: '0 4px 4px 0', transition: 'width .3s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── StackedShareBar — single 100% bar (≤5 fixed-order categories) ────────────
// segments: [{ key, label, pct, value }], colors: { [key]: hex }
export function StackedShareBar({ segments = [], colors = {}, unit = '' }) {
  if (!segments.length) return null
  return (
    <div>
      <div style={{ display: 'flex', height: 26, border: `2px solid ${NB.ink}`, borderRadius: 8, overflow: 'hidden', background: NB.white, gap: 2, padding: 2, boxSizing: 'border-box' }}>
        {segments.map(seg => (
          <div key={seg.key} style={{ width: `${seg.pct}%`, minWidth: seg.pct > 0 ? 6 : 0, background: colors[seg.key] || NB.lavender, borderRadius: 4 }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
        {segments.map(seg => (
          <div key={seg.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: colors[seg.key] || NB.lavender, border: `1.5px solid ${NB.ink}` }} />
            <span style={{ fontFamily: NB.fontMono, fontSize: 9.5, fontWeight: 700, color: NB.ink }}>
              {seg.label} {Math.round(seg.pct)}%{seg.value != null ? ` · ${Math.round(seg.value).toLocaleString()}${unit}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
