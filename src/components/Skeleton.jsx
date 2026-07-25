import React from 'react'

// Shared loading placeholder — a moving grey shimmer sweep (`skeletonShimmer`,
// defined once in styles/tokens.css), no fill/border of its own so it reads
// as a cutout rather than a colored card.
export function SkeletonBox({ width = '100%', height = 14, borderRadius = 4, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius,
      background: 'linear-gradient(120deg, #e5e5e5 30%, #f0f0f0 38%, #f0f0f0 40%, #e5e5e5 48%)',
      backgroundSize: '200% 100%',
      backgroundPosition: '100% 0',
      animation: 'skeletonShimmer 2s infinite',
      ...style,
    }} />
  )
}
