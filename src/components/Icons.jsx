import React from 'react'

// Custom icons replacing the emoji versions (💎 🔥 ❤️) app-wide. Plain <img>
// against the compressed SVGs in public/icons/ — width set, height left auto
// so each icon's own aspect ratio (none of the three are square) is preserved
// instead of getting squashed.
function IconImg({ src, size = 16, style, alt = '', ...props }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{ width: size, height: 'auto', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      {...props}
    />
  )
}

export function GemIcon({ size = 16, style, ...props }) {
  return <IconImg src="/icons/gems.svg" size={size} style={style} {...props} />
}

export function FireIcon({ size = 16, style, ...props }) {
  return <IconImg src="/icons/fire.svg" size={size} style={style} {...props} />
}

// filled=false renders the same artwork desaturated/faded — matches the
// existing "lost life" treatment used elsewhere (e.g. the pet grayscale at
// lives===0) rather than needing a second flat-color asset.
export function HeartIcon({ size = 16, filled = true, style, ...props }) {
  return (
    <IconImg
      src="/icons/heart.svg"
      size={size}
      style={{ filter: filled ? 'none' : 'grayscale(1) opacity(.35)', ...style }}
      {...props}
    />
  )
}

// These 8 PNGs (unlike the hand-cropped heart/fire/gems SVGs) were generated
// with a lot of transparent padding baked around the artwork, so at a given
// declared size they read visually smaller than an emoji does. Crop that
// padding away at render time: a fixed-size clipping box with the image
// itself scaled up and centered inside it, so the actual artwork — not the
// padding — fills the declared size.
function CroppedIconImg({ src, size = 16, zoom = 1.6, style, alt = '', ...props }) {
  return (
    <span style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', verticalAlign: 'middle', flexShrink: 0, ...style }}>
      <img src={src} alt={alt} style={{ width: size * zoom, height: size * zoom, objectFit: 'contain' }} {...props} />
    </span>
  )
}

export function LightningBoltIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/bolt.png" size={size} style={style} {...props} />
}

export function SaladIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/bowl.png" size={size} style={style} {...props} />
}

export function CrownIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/crown.png" size={size} style={style} {...props} />
}

export function GlobeIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/globe.png" size={size} style={style} {...props} />
}

export function LockIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/lock.png" size={size} style={style} {...props} />
}

export function QuestIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/quest.png" size={size} style={style} {...props} />
}

export function StarIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/star.png" size={size} style={style} {...props} />
}

export function TrophyIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/trophy.png" size={size} style={style} {...props} />
}

// 💪 replacement — glutes, not a bicep, per the user's own art direction.
export function StrengthArmIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/glute.png" size={size} style={style} {...props} />
}

// 🏋️ replacement — a peach with a handprint (same glutes joke, second icon).
export function WeightlifterIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/hand-print-peach.png" size={size} style={style} {...props} />
}

export function TrendingChartIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/analytics.png" size={size} style={style} {...props} />
}

export function CalendarIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/calendar.png" size={size} style={style} {...props} />
}

export function CameraIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/camera.png" size={size} style={style} {...props} />
}

export function BackpackIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/inventory.png" size={size} style={style} {...props} />
}

export function MedalIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/medal.png" size={size} style={style} {...props} />
}

export function MealPlateIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/meal-plate-new.png" size={size} style={style} {...props} />
}

export function ShoppingBagsIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/shopping-bag.png" size={size} style={style} {...props} />
}

export function SpaIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/spa.png" size={size} style={style} {...props} />
}

export function StopwatchIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/stopwatch.png" size={size} style={style} {...props} />
}

export function ToolsIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/tools.png" size={size} style={style} {...props} />
}

// Meal-type icons — used by Meals.jsx's MealTypeIcon, not through the emoji
// ICON_MAP below (meal type is a `type` string like 'breakfast', not an emoji).
export function PancakesIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/pancakes.png" size={size} style={style} {...props} />
}

export function LunchIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/lunch.png" size={size} style={style} {...props} />
}

export function DinnerIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/dinner.png" size={size} style={style} {...props} />
}

export function SnackIcon({ size = 16, style, ...props }) {
  return <CroppedIconImg src="/icons/snack.png" size={size} style={style} {...props} />
}

// For data-driven `icon: '💎'`-style fields (badges, quests, store items):
// swaps in the real icon only for an exact match on these emoji, and leaves
// every other icon value (🌸 ✨ 🧊 etc.) untouched until custom art exists.
const ICON_MAP = {
  '💎': GemIcon, '🔥': FireIcon, '❤️': HeartIcon,
  '⚡': LightningBoltIcon, '🥗': SaladIcon, '👑': CrownIcon,
  '🌍': GlobeIcon, '🔒': LockIcon, '🎯': QuestIcon, '⭐': StarIcon, '🏆': TrophyIcon,
  '💪': StrengthArmIcon, '🏋️': WeightlifterIcon, '📈': TrendingChartIcon,
  '📅': CalendarIcon, '📸': CameraIcon, '🎒': BackpackIcon, '🏅': MedalIcon,
  '🍽️': MealPlateIcon, '🛍️': ShoppingBagsIcon, '💆': SpaIcon,
  '⏱️': StopwatchIcon, '🛠️': ToolsIcon,
}
export function renderIcon(char, size = 24) {
  const Comp = ICON_MAP[char]
  return Comp ? <Comp size={size} /> : char
}
