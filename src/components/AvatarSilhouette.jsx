import React from 'react'

// A simple SVG female silhouette
export default function AvatarSilhouette({ height = 80, color = '#C4A8E8', style = {} }) {
  const scale = height / 120
  return (
    <svg
      width={Math.round(50 * scale)}
      height={height}
      viewBox="0 0 50 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      {/* Head */}
      <ellipse cx="25" cy="12" rx="9" ry="10" fill={color}/>
      {/* Neck */}
      <rect x="22" y="21" width="6" height="6" rx="2" fill={color}/>
      {/* Torso */}
      <path d="M14 27 C12 28 10 32 10 38 L10 58 C10 60 12 62 14 62 L36 62 C38 62 40 60 40 58 L40 38 C40 32 38 28 36 27 C32 25 28 24 25 24 C22 24 18 25 14 27Z" fill={color}/>
      {/* Left arm */}
      <path d="M10 30 C6 32 4 38 4 46 C4 50 5 54 7 56 L10 57 L12 44 L12 30Z" fill={color}/>
      {/* Right arm */}
      <path d="M40 30 C44 32 46 38 46 46 C46 50 45 54 43 56 L40 57 L38 44 L38 30Z" fill={color}/>
      {/* Hips */}
      <path d="M10 58 C8 60 7 64 8 70 L12 70 L13 62 Z" fill={color}/>
      <path d="M40 58 C42 60 43 64 42 70 L38 70 L37 62 Z" fill={color}/>
      {/* Left leg */}
      <path d="M12 62 L12 70 C11 74 11 80 12 86 L14 100 C15 106 16 110 17 114 L22 114 L22 86 L23 70 L13 62Z" fill={color}/>
      {/* Right leg */}
      <path d="M38 62 L38 70 C39 74 39 80 38 86 L36 100 C35 106 34 110 33 114 L28 114 L28 86 L27 70 L37 62Z" fill={color}/>
      {/* Left foot */}
      <ellipse cx="17" cy="116" rx="5" ry="4" fill={color}/>
      {/* Right foot */}
      <ellipse cx="33" cy="116" rx="5" ry="4" fill={color}/>
    </svg>
  )
}

// Front-view body outline for muscle map
export function BodyOutline({ muscleColors = {}, height = 260 }) {
  const scale = height / 260
  const w = Math.round(120 * scale)

  const defaultMuscle = '#2A1F3D'
  const getMuscle = (key) => muscleColors[key] || defaultMuscle

  return (
    <svg width={w} height={height} viewBox="0 0 120 260" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <ellipse cx="60" cy="22" rx="18" ry="20" fill="#3D2D55" stroke="#5A3F7A" strokeWidth="1.5"/>
      {/* Neck */}
      <rect x="54" y="40" width="12" height="12" rx="4" fill="#3D2D55"/>

      {/* Shoulders / Deltoids */}
      <ellipse cx="30" cy="56" rx="16" ry="10" fill={getMuscle('shoulders')} stroke="#5A3F7A" strokeWidth="1"/>
      <ellipse cx="90" cy="56" rx="16" ry="10" fill={getMuscle('shoulders')} stroke="#5A3F7A" strokeWidth="1"/>

      {/* Chest / Pecs */}
      <path d="M44 52 C40 54 37 60 38 68 L60 70 L82 68 C83 60 80 54 76 52 C70 50 50 50 44 52Z" fill={getMuscle('chest')} stroke="#5A3F7A" strokeWidth="1"/>

      {/* Abs / Core */}
      <rect x="50" y="70" width="20" height="8" rx="4" fill={getMuscle('core')} stroke="#5A3F7A" strokeWidth="1"/>
      <rect x="50" y="80" width="20" height="8" rx="4" fill={getMuscle('core')} stroke="#5A3F7A" strokeWidth="1"/>
      <rect x="50" y="90" width="20" height="8" rx="4" fill={getMuscle('core')} stroke="#5A3F7A" strokeWidth="1"/>

      {/* Upper arms / Biceps */}
      <path d="M24 58 C18 62 16 72 18 80 L24 80 L30 68 L24 58Z" fill={getMuscle('arms')} stroke="#5A3F7A" strokeWidth="1"/>
      <path d="M96 58 C102 62 104 72 102 80 L96 80 L90 68 L96 58Z" fill={getMuscle('arms')} stroke="#5A3F7A" strokeWidth="1"/>

      {/* Forearms */}
      <path d="M18 80 C15 88 15 98 17 104 L22 104 L25 80 L18 80Z" fill={getMuscle('arms')} stroke="#5A3F7A" strokeWidth="1"/>
      <path d="M102 80 C105 88 105 98 103 104 L98 104 L95 80 L102 80Z" fill={getMuscle('arms')} stroke="#5A3F7A" strokeWidth="1"/>

      {/* Hands */}
      <ellipse cx="19" cy="108" rx="5" ry="7" fill="#3D2D55"/>
      <ellipse cx="101" cy="108" rx="5" ry="7" fill="#3D2D55"/>

      {/* Hip / Glutes area */}
      <path d="M38 100 C34 104 32 110 33 116 L60 118 L87 116 C88 110 86 104 82 100 L60 98 Z" fill={getMuscle('glutes')} stroke="#5A3F7A" strokeWidth="1"/>

      {/* Quads / Upper Legs */}
      <path d="M37 116 C34 124 34 138 36 148 L50 148 L56 118 L38 116Z" fill={getMuscle('legs')} stroke="#5A3F7A" strokeWidth="1"/>
      <path d="M83 116 C86 124 86 138 84 148 L70 148 L64 118 L82 116Z" fill={getMuscle('legs')} stroke="#5A3F7A" strokeWidth="1"/>

      {/* Knees */}
      <ellipse cx="43" cy="152" rx="8" ry="6" fill="#3D2D55"/>
      <ellipse cx="77" cy="152" rx="8" ry="6" fill="#3D2D55"/>

      {/* Calves / Lower Legs */}
      <path d="M36 156 C34 164 35 178 37 186 L50 186 L52 156 L36 156Z" fill={getMuscle('calves')} stroke="#5A3F7A" strokeWidth="1"/>
      <path d="M84 156 C86 164 85 178 83 186 L70 186 L68 156 L84 156Z" fill={getMuscle('calves')} stroke="#5A3F7A" strokeWidth="1"/>

      {/* Ankles + Feet */}
      <rect x="36" y="188" width="14" height="6" rx="3" fill="#3D2D55"/>
      <rect x="70" y="188" width="14" height="6" rx="3" fill="#3D2D55"/>
      <ellipse cx="43" cy="198" rx="9" ry="5" fill="#3D2D55"/>
      <ellipse cx="77" cy="198" rx="9" ry="5" fill="#3D2D55"/>
    </svg>
  )
}
