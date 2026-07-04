// Neo-Brutalist design tokens — "Fitness UI Kit" (Claude Design project 7c77b798-46b5-4f52-8e31-e4e02f677a2e)
// Every screen imports from here instead of hardcoding hex values.

export const NB = {
  bg: '#F5F0DC',
  ink: '#0A0A0A',
  white: '#ffffff',
  cream: '#F7F4E6',

  teal: '#00C2C8',
  tealLight: '#7FE9D6',
  magenta: '#FF00E5',
  yellow: '#FFD400',
  gold: '#FFC93C',
  green: '#46D45A',
  orange: '#FF6A2C',
  blue: '#4AA3FF',
  lavender: '#C9B8F5',
  red: '#E5352B',
  pink: '#FF9ECF',
  roseGold: '#E8A87C',
  silver: '#B8C0CC',
  bronze: '#CD7F32',

  fontDisplay: "'Archivo',sans-serif",
  fontMono: "'Space Mono',monospace",
}

export const NB_BORDER = `3px solid ${NB.ink}`
export const NB_BORDER_THIN = `2.5px solid ${NB.ink}`

// Hard offset shadow, no blur — e.g. hardShadow(6) -> "6px 6px 0 #0A0A0A"
export function hardShadow(px = 6, color = NB.ink) {
  return `${px}px ${px}px 0 ${color}`
}

export const NB_DOT_GRID = {
  backgroundColor: NB.bg,
  backgroundImage: 'radial-gradient(rgba(10,10,10,0.10) 1.5px, transparent 1.5px)',
  backgroundSize: '20px 20px',
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
