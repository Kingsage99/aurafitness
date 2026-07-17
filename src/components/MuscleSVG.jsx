import React, { useState, useEffect, useRef } from 'react'
import { NB_INTENSITY_RAMP } from '../styles/neoBrutalism'
import { RANKS } from '../utils/gamification'

export const MUSCLE_SVG_IDS = {
  glutes:     { back: ['glute'],                                          front: [] },
  legs:       { back: ['hamstrings', 'back_adductor', 'abductor'],       front: ['front_quad', 'front_adductor', 'front_abductor'] },
  core:       { back: ['back_oblique', 'erector_spinae'],                front: ['front_core', 'oblique', 'abs'] },
  chest:      { back: [],                                                  front: ['front_Chest'] },
  shoulders:  { back: ['back_shoulder'],                                  front: ['front_shoulder'] },
  arms:       { back: ['back_tricep', 'back_forearm'],                   front: ['front_bicep', 'front_tricep', 'forearm'] },
  calves:     { back: ['back_calf'],                                      front: ['calf_front'] },
  back:       { back: ['trap', 'lat', 'scapular_muscle'],                front: [] },
  // Finer-grained groups (WorkoutBuilder's "Pick Target Muscles" picker) — same
  // underlying SVG ids as above, just exposed as their own top-level entries.
  hamstrings: { back: ['hamstrings'],                                     front: [] },
  quads:      { back: [],                                                  front: ['front_quad'] },
  adductors:  { back: ['back_adductor'],                                  front: ['front_adductor'] },
  abductors:  { back: ['abductor'],                                       front: ['front_abductor'] },
  trap:       { back: ['trap'],                                           front: [] },
  lats:       { back: ['lat'],                                            front: [] },
}

// Broad TARGET_AREA → SVG IDs (for onboarding step 8)
export const TARGET_AREA_SVG = {
  'Full body': {
    back:  ['glute', 'hamstrings', 'back_adductor', 'abductor', 'trap', 'lat', 'back_shoulder',
            'erector_spinae', 'back_oblique', 'back_calf', 'back_tricep', 'scapular_muscle', 'back_forearm'],
    front: ['front_quad', 'calf_front', 'front_core', 'abs', 'oblique', 'front_shoulder',
            'front_Chest', 'front_bicep', 'front_tricep', 'front_adductor', 'front_abductor',
            'forearm', 'neck', 'neck_long'],
  },
  'Legs': {
    back:  ['hamstrings', 'back_calf', 'back_adductor', 'abductor'],
    front: ['front_quad', 'calf_front', 'front_abductor', 'front_adductor'],
  },
  'Glutes': {
    back:  ['glute'],
    front: [],
  },
  'Core': {
    back:  [],
    front: ['front_core'],
  },
  'Arms': {
    back:  ['back_tricep', 'back_forearm'],
    front: ['front_bicep', 'forearm', 'front_tricep'],
  },
  'Back': {
    back:  ['lat', 'trap', 'erector_spinae', 'back_shoulder', 'scapular_muscle'],
    front: ['front_shoulder'],
  },
}

// SVG element ID → target area (for click-to-select in onboarding)
export const SVG_TO_TARGET_AREA = {
  // Legs
  hamstrings: 'Legs', back_calf: 'Legs', back_adductor: 'Legs', abductor: 'Legs',
  front_quad: 'Legs', calf_front: 'Legs', front_abductor: 'Legs', front_adductor: 'Legs',
  // Glutes
  glute: 'Glutes',
  // Core
  front_core: 'Core', abs: 'Core',
  // Arms
  front_bicep: 'Arms', forearm: 'Arms', front_tricep: 'Arms',
  back_tricep: 'Arms', back_forearm: 'Arms',
  // Back
  lat: 'Back', trap: 'Back', erector_spinae: 'Back',
  back_shoulder: 'Back', scapular_muscle: 'Back', front_shoulder: 'Back',
}

const DEFAULT_FILL = NB_INTENSITY_RAMP[0]
const VIEW_BOX = '640 0 640 1080'

// All known muscle SVG IDs (used for reset before re-coloring)
const ALL_MUSCLE_IDS = new Set([
  ...Object.values(MUSCLE_SVG_IDS).flatMap(s => [...(s.back || []), ...(s.front || [])]),
  ...Object.values(TARGET_AREA_SVG).flatMap(s => [...(s.back || []), ...(s.front || [])]),
  'neck', 'neck_long', 'front_Chest', 'back_oblique', 'oblique', 'abs',
])

const svgCache = {}

// MissVfit Pro's shiny blue→purple muscle-map fill. A plain CSS gradient
// string doesn't work as an SVG `fill` — it has to be a real `<linearGradient>`
// def referenced via `url(#id)`, so one is injected into each mounted SVG's
// `<defs>` (cheap and harmless whether or not anything actually uses it).
const PRO_GRADIENT_ID = 'missvfit-pro-fill'
export const MUSCLE_PRO_FILL = `url(#${PRO_GRADIENT_ID})`

function ensureProGradient(svgEl) {
  if (svgEl.querySelector(`#${PRO_GRADIENT_ID}`)) return
  const svgNS = 'http://www.w3.org/2000/svg'
  let defs = svgEl.querySelector('defs')
  if (!defs) {
    defs = document.createElementNS(svgNS, 'defs')
    svgEl.insertBefore(defs, svgEl.firstChild)
  }
  const grad = document.createElementNS(svgNS, 'linearGradient')
  grad.setAttribute('id', PRO_GRADIENT_ID)
  grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%')
  grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%')
  const stop1 = document.createElementNS(svgNS, 'stop')
  stop1.setAttribute('offset', '0%'); stop1.setAttribute('stop-color', '#6FA8FF')
  const stop2 = document.createElementNS(svgNS, 'stop')
  stop2.setAttribute('offset', '100%'); stop2.setAttribute('stop-color', '#9366E6')
  grad.appendChild(stop1)
  grad.appendChild(stop2)
  defs.appendChild(grad)
}

// MissVfit Pro's "rank map" perk — each body part is filled with its own
// rank tier's color (bronze glutes, platinum core, etc.), given a metallic
// shine rather than a flat fill. `level` (1-4) is how hard that muscle's
// been trained — 4 is the tier's full/strong color, 1 is a light tint of
// the same hue — so "bronze glutes" reads as pale bronze when barely
// touched and rich bronze at max volume, never a flat single tone.
function lightenHex(hex, amount) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const num = parseInt(full, 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0xff) + amount)
  const b = Math.min(255, (num & 0xff) + amount)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

// Blends `hex` toward `toHex` by `ratio` (0 = pure hex, 1 = pure toHex) —
// used to make a tier's color paler at lower intensity levels.
function mixHex(hex, toHex, ratio) {
  const parse = (h) => {
    const full = h.replace('#', '')
    const n = parseInt(full.length === 3 ? full.split('').map(c => c + c).join('') : full, 16)
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
  }
  const [ar, ag, ab] = parse(hex)
  const [br, bg, bb] = parse(toHex)
  const mix = (a, b) => Math.round(a + (b - a) * ratio)
  const r = mix(ar, br), g = mix(ag, bg), b = mix(ab, bb)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

const LEVELS = [1, 2, 3, 4]
const RANK_GRADIENT_ID = (tierId, level) => `missvfit-rank-${tierId}-${level}`
// level defaults to 4 (full-strength) for callers that just want "this tier's
// color" with no intensity concept (e.g. the Pro per-body-part rank view).
export const RANK_FILL = (tierId, level = 4) => `url(#${RANK_GRADIENT_ID(tierId, Math.min(4, Math.max(1, level)))})`

function ensureRankGradients(svgEl) {
  const svgNS = 'http://www.w3.org/2000/svg'
  let defs = svgEl.querySelector('defs')
  if (!defs) {
    defs = document.createElementNS(svgNS, 'defs')
    svgEl.insertBefore(defs, svgEl.firstChild)
  }
  RANKS.forEach(tier => {
    LEVELS.forEach(level => {
      const id = RANK_GRADIENT_ID(tier.id, level)
      if (svgEl.querySelector(`#${id}`)) return

      if (tier.id === 'goddess') {
        // Goddess always shows its full iridescent sweep regardless of level —
        // "light iridescent" isn't a meaningful idea, and it's the top tier.
        const grad = document.createElementNS(svgNS, 'linearGradient')
        grad.setAttribute('id', id)
        grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%')
        grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%')
        ;[[0, '#0B0B10'], [22, '#C9A9FF'], [42, '#FFD1EC'], [58, '#BFE3FF'], [72, '#EAFBEF'], [100, '#0B0B10']]
          .forEach(([offset, color]) => {
            const stop = document.createElementNS(svgNS, 'stop')
            stop.setAttribute('offset', `${offset}%`); stop.setAttribute('stop-color', color)
            grad.appendChild(stop)
          })
        defs.appendChild(grad)
        return
      }

      // Every other tier: a soft radial glow (a light source, not a hard
      // diagonal shine band) fading from a bright center into the tier's own
      // base tone, so it reads as a gentle sheen rather than a sharp streak.
      const fade = (4 - level) * 0.22 // level 4 = 0% (pure tier color), level 1 = 66% toward white
      const base = fade > 0 ? mixHex(tier.bg, '#FFFFFF', fade) : tier.bg
      const glow = lightenHex(base, 90)
      const grad = document.createElementNS(svgNS, 'radialGradient')
      grad.setAttribute('id', id)
      grad.setAttribute('cx', '35%'); grad.setAttribute('cy', '28%'); grad.setAttribute('r', '85%')
      ;[[0, glow], [55, base], [100, base]].forEach(([offset, color]) => {
        const stop = document.createElementNS(svgNS, 'stop')
        stop.setAttribute('offset', `${offset}%`); stop.setAttribute('stop-color', color)
        grad.appendChild(stop)
      })
      defs.appendChild(grad)
    })
  })
}

function colorGroup(el, color) {
  // Set on the group itself — covers paths that inherit fill from parent
  el.style.fill = color
  // Also override any child paths with explicit fill attributes (except fill="none")
  el.querySelectorAll('path, circle, ellipse, rect, polygon').forEach(shape => {
    if (shape.getAttribute('fill') !== 'none') {
      shape.style.fill = color
    }
  })
}

function applyColors(container, muscleColors) {
  // Reset all known muscles to default
  ALL_MUSCLE_IDS.forEach(svgId => {
    const el = container.querySelector(`#${svgId}`)
    if (el) colorGroup(el, DEFAULT_FILL)
  })
  // Apply provided colors
  Object.entries(muscleColors).forEach(([svgId, color]) => {
    const el = container.querySelector(`#${svgId}`)
    if (el) colorGroup(el, color)
  })
}

export default function MuscleSVG({ url, muscleColors = {}, onMuscleClick, focusViewBox }) {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)
  const colorsKey = JSON.stringify(muscleColors)

  useEffect(() => {
    let cancelled = false
    setReady(false)

    const mount = (html) => {
      if (cancelled || !ref.current) return
      ref.current.innerHTML = html
      const svgEl = ref.current.querySelector('svg')
      if (svgEl) {
        svgEl.setAttribute('viewBox', focusViewBox || VIEW_BOX)
        svgEl.setAttribute('preserveAspectRatio', focusViewBox ? 'xMidYMid slice' : 'xMidYMid meet')
        svgEl.removeAttribute('width')
        svgEl.removeAttribute('height')
        svgEl.style.width = '100%'
        svgEl.style.height = '100%'
        ensureProGradient(svgEl)
        ensureRankGradients(svgEl)
      }
      setReady(true)
    }

    if (svgCache[url]) {
      mount(svgCache[url])
    } else {
      fetch(url)
        .then(r => r.text())
        .then(html => { svgCache[url] = html; mount(html) })
    }

    return () => { cancelled = true }
  }, [url, focusViewBox])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready && ref.current) applyColors(ref.current, muscleColors) }, [ready, colorsKey])

  const handleClick = (e) => {
    if (!onMuscleClick) return
    let el = e.target
    while (el && el !== ref.current) {
      const id = el.getAttribute('id')
      if (id && SVG_TO_TARGET_AREA[id]) { onMuscleClick(SVG_TO_TARGET_AREA[id]); return }
      el = el.parentElement
    }
  }

  return (
    <div
      ref={ref}
      onClick={handleClick}
      style={{ width: '100%', height: '100%', cursor: onMuscleClick ? 'pointer' : 'default' }}
    />
  )
}
