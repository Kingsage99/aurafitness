import React from 'react'
import Model from 'react-body-highlighter'
import { NB } from '../styles/neoBrutalism'

// Maps internal muscle keys to react-body-highlighter names
const MUSCLE_MAP = {
  glutes: 'gluteal', gluteal: 'gluteal',
  legs: 'quadriceps', quads: 'quadriceps', quadriceps: 'quadriceps',
  hamstrings: 'hamstring', hamstring: 'hamstring',
  core: 'abs', abs: 'abs', obliques: 'obliques',
  chest: 'chest',
  back: 'upper-back', upper_back: 'upper-back', lower_back: 'lower-back',
  shoulders: 'front-deltoids', front_deltoids: 'front-deltoids', back_deltoids: 'back-deltoids',
  arms: 'biceps', biceps: 'biceps', triceps: 'triceps', forearm: 'forearm',
  calves: 'calves', adductors: 'adductor', abductors: 'abductors',
}

// Custom female body silhouette SVG
// viewBox 0 0 100 230 → aspect ratio 100:230 ≈ 0.435
export default function AvatarSilhouette({ height = 160, color = NB.ink, style = {} }) {
  const width = Math.round(height * (100 / 230))
  return (
    <svg
      viewBox="0 0 100 230"
      width={width}
      height={height}
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      {/* Head */}
      <ellipse cx="50" cy="14" rx="13" ry="14" />
      {/* Neck */}
      <rect x="44" y="26" width="12" height="12" rx="3" />
      {/* Left shoulder */}
      <ellipse cx="25" cy="40" rx="14" ry="8" />
      {/* Right shoulder */}
      <ellipse cx="75" cy="40" rx="14" ry="8" />
      {/* Upper torso — hourglass top */}
      <path d="M25 36 C17 42 16 54 17 66 L17 77 L83 77 L83 66 C84 54 83 42 75 36 Z" />
      {/* Waist — narrower */}
      <rect x="24" y="75" width="52" height="16" rx="4" />
      {/* Hips — wider than shoulders for female shape */}
      <path d="M24 89 C13 93 11 105 12 115 C12 124 16 131 24 136 L42 139 L58 139 L76 136 C84 131 88 124 88 115 C89 105 87 93 76 89 Z" />
      {/* Left arm */}
      <rect x="8" y="37" width="13" height="58" rx="6" />
      {/* Right arm */}
      <rect x="79" y="37" width="13" height="58" rx="6" />
      {/* Left hand */}
      <ellipse cx="14.5" cy="100" rx="7" ry="5.5" />
      {/* Right hand */}
      <ellipse cx="85.5" cy="100" rx="7" ry="5.5" />
      {/* Left leg */}
      <path d="M24 136 L20 172 L20 206 L33 206 L37 172 L42 139 Z" />
      {/* Right leg */}
      <path d="M76 136 L80 172 L80 206 L67 206 L63 172 L58 139 Z" />
      {/* Left foot */}
      <path d="M20 204 Q13 205 13 209 Q13 214 22 214 L33 214 Q36 213 36 209 Q35 204 33 204 Z" />
      {/* Right foot */}
      <path d="M80 204 Q87 205 87 209 Q87 214 78 214 L67 214 Q64 213 64 209 Q65 204 67 204 Z" />
    </svg>
  )
}

// Muscle map with highlights — uses react-body-highlighter
// Used in WorkoutPlayer and MuscleMap
export function BodyOutline({ muscleColors = {}, data, height = 260, highlightedColors = [NB.magenta], type = 'anterior' }) {
  const modelData = data || (() => {
    const muscles = Object.keys(muscleColors).map(k => MUSCLE_MAP[k]).filter(Boolean)
    return muscles.length > 0 ? [{ name: 'Exercise', muscles }] : []
  })()

  return (
    <Model
      data={modelData}
      type={type}
      bodyColor={NB.ink}
      highlightedColors={highlightedColors}
      style={{ height, width: height / 2 }}
    />
  )
}

export { MUSCLE_MAP }
