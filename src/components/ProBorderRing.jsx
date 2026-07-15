import React from 'react'

// User-calibrated via the Pro Border Calibrator artifact — hand-tuned at a
// 46px avatar reference, same convention as STORE_BORDERS' frameOffset. Ring
// is intentionally asymmetric (near-flush top, thicker bottom) rather than a
// uniform ring — that's the "cool" look that was dialed in, not a mistake.
const REF = 46
const RING = { top: 0, left: 3, bottom: 4, right: 3 }
const RING_COLORS = { blue: '#6FA8FF', purple: '#9366E6', angle: 157 }
const RING_HIGHLIGHT = 0.11
const CROWN = { sizePct: 0.85, topPct: 0.43 }

// The MissVfit Pro-exclusive avatar border (frame_pro): a light-blue/purple
// gradient ring with a crown sitting on top. Unlike the other STORE_BORDERS
// entries (a transparent PNG ring positioned via frameOffset), this one is
// CSS-rendered — no raster ring asset exists — so callers special-case
// `border.id === 'frame_pro'` and render this instead of the generic
// `<img src={border.image}>` overlay, AND drop the avatar's own border (the
// calibrator confirmed that flat ink/white edge was reading as an unwanted
// black seam between the photo and the gradient ring). Render as a sibling
// inside the same `position:relative` avatar wrapper the image-ring borders
// use — that wrapper needs an explicit `zIndex: 0` so the ring's `zIndex: -1`
// stays local instead of escaping to a distant ancestor's stacking context.
export default function ProBorderRing({ size }) {
  const scale = size / REF
  const top = RING.top * scale
  const left = RING.left * scale
  const bottom = RING.bottom * scale
  const right = RING.right * scale
  const ringGradient = `conic-gradient(from ${RING_COLORS.angle}deg, ${RING_COLORS.blue} 0%, ${RING_COLORS.purple} 50%, ${RING_COLORS.blue} 100%)`

  return (
    <>
      <div
        style={{
          position: 'absolute', top: -top, left: -left,
          width: size + left + right, height: size + top + bottom,
          borderRadius: '50%',
          background: ringGradient,
          boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,${RING_HIGHLIGHT})`,
          zIndex: -1,
        }}
      />
      <img
        src="/icons/crown.png"
        alt=""
        style={{
          position: 'absolute', top: -size * CROWN.topPct, left: '50%', transform: 'translateX(-50%)',
          width: size * CROWN.sizePct, height: 'auto', zIndex: 2, pointerEvents: 'none',
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))',
        }}
      />
    </>
  )
}
