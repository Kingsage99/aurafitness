import React from 'react'
import { NB } from '../styles/neoBrutalism'

// Shared loading placeholder — a gentle opacity pulse (`skeletonPulse`,
// defined once in styles/tokens.css) rather than a moving shimmer sweep, to
// match the restrained/subtle register the rest of the app's animations use.
export function SkeletonBox({ width = '100%', height = 14, borderRadius = 4, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius,
      background: NB.cream, border: `1px solid ${NB.ink}`,
      animation: 'skeletonPulse 1.4s ease-in-out infinite',
      ...style,
    }} />
  )
}
