// Neo-Brutalist design tokens — "Fitness UI Kit v2" (Claude Design project 7c77b798-46b5-4f52-8e31-e4e02f677a2e)
// Every screen imports from here instead of hardcoding hex values.

export const NB = {
  bg: '#F3EDF7',
  ink: '#1A1A1A',
  white: '#ffffff',
  cream: '#F7F4E6',

  teal: '#7FE6D0',        // v2 "Mint"
  tealLight: '#C9F3EB',   // pale mint tint
  magenta: '#B48CF2',     // v2 "Purple" — stays the primary hero accent
  purpleDeep: '#9366E6',  // v2 "Purple Deep" — active/hover states, top rank tiers
  yellow: '#F7CF4A',
  gold: '#F7CF4A',        // v2 doesn't distinguish gold from yellow
  green: '#C2E84B',       // v2 "Lime" — hue shift from blue-green to yellow-green
  orange: '#F79AC6',      // v2 drops orange; nearest accent is Pink
  blue: '#B48CF2',        // v2 drops blue too; its own Nutrition mockup colors Protein as Purple
  lavender: '#E7DCFB',
  red: '#E5484D',         // v2 "Error"
  pink: '#F79AC6',
  roseGold: '#E8A87C',    // unchanged — literal metal tone, see gamification RANKS
  silver: '#B8C0CC',      // unchanged — literal metal tone
  bronze: '#CD7F32',      // unchanged — literal metal tone

  fontDisplay: "'Archivo',sans-serif",
  fontMono: "'Space Mono',monospace",
}

// Shared 5-step muscle-intensity scale (rested → fatigued), from the v2 kit's Muscle Map section
export const NB_INTENSITY_RAMP = ['#EDE7F7', '#E7DCFB', '#C9B4F5', '#B48CF2', '#9366E6']

export const NB_BORDER = `3px solid ${NB.ink}`
export const NB_BORDER_THIN = `2.5px solid ${NB.ink}`

// Rounded-corner variant radii — cards/buttons/chips/icon-boxes, in that size order
export const NB_RADIUS = 20
export const NB_RADIUS_SM = 12
export const NB_RADIUS_XS = 6

// Hard offset shadow, no blur — e.g. hardShadow(6) -> "6px 6px 0 #1A1A1A"
export function hardShadow(px = 6, color = NB.ink) {
  return `${px}px ${px}px 0 ${color}`
}

// Flat app background (dot-grid texture removed per user preference)
export const NB_DOT_GRID = {
  backgroundColor: NB.bg,
}

// Reusable style fragments
export const nbLabel = {
  fontFamily: NB.fontMono,
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
}

export const nbCard = {
  border: NB_BORDER,
  boxShadow: hardShadow(6),
  background: NB.white,
}

export function nbButton(bg = NB.teal, size = 4) {
  return {
    cursor: 'pointer',
    fontFamily: NB.fontDisplay,
    fontWeight: 800,
    textTransform: 'uppercase',
    border: NB_BORDER,
    background: bg,
    boxShadow: hardShadow(size),
  }
}
