import React from 'react'

export const DEFAULT_CHARACTER = '/characters/default-panda.png'

// The user's custom character — every account starts with the default panda.
export default function CharacterAvatar({ src = DEFAULT_CHARACTER, size = 150, style = {} }) {
  return (
    <img
      src={src}
      alt="Your character"
      style={{ width: size, height: size, objectFit: 'cover', display: 'block', ...style }}
    />
  )
}
