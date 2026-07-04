import React, { useState, useEffect, useRef } from 'react'

export const MUSCLE_SVG_IDS = {
  glutes:    { back: ['glute'],                                          front: [] },
  legs:      { back: ['hamstrings', 'back_adductor', 'abductor'],       front: ['front_quad', 'front_adductor', 'front_abductor'] },
  core:      { back: ['back_oblique', 'erector_spinae'],                front: ['front_core', 'oblique', 'abs'] },
  chest:     { back: [],                                                  front: ['front_Chest'] },
  shoulders: { back: ['back_shoulder'],                                  front: ['front_shoulder'] },
  arms:      { back: ['back_tricep', 'back_forearm'],                   front: ['front_bicep', 'front_tricep', 'forearm'] },
  calves:    { back: ['back_calf'],                                      front: ['calf_front'] },
  back:      { back: ['trap', 'lat', 'scapular_muscle'],                front: [] },
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

const DEFAULT_FILL = '#EAE6D2'
const VIEW_BOX = '640 0 640 1080'

// All known muscle SVG IDs (used for reset before re-coloring)
const ALL_MUSCLE_IDS = new Set([
  ...Object.values(MUSCLE_SVG_IDS).flatMap(s => [...(s.back || []), ...(s.front || [])]),
  ...Object.values(TARGET_AREA_SVG).flatMap(s => [...(s.back || []), ...(s.front || [])]),
  'neck', 'neck_long', 'front_Chest', 'back_oblique', 'oblique', 'abs',
])

const svgCache = {}

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

export default function MuscleSVG({ url, muscleColors = {}, onMuscleClick }) {
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
        svgEl.setAttribute('viewBox', VIEW_BOX)
        svgEl.removeAttribute('width')
        svgEl.removeAttribute('height')
        svgEl.style.width = '100%'
        svgEl.style.height = '100%'
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
  }, [url])

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
