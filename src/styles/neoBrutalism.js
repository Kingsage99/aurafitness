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
  lavenderMist: '#F3ECFC', // pale lavender tint — individual list-row cards (e.g. quest rows)
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

// Darken (negative percent) or lighten (positive) a hex color by a flat
// percentage per channel — used to derive a card's border/shadow tone from
// its own fill color, so a yellow card gets a darker-yellow border and an
// even-darker-yellow shadow instead of a flat black outline.
export function shade(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const clamp = v => Math.max(0, Math.min(255, v))
  const r = clamp((num >> 16) + amt)
  const g = clamp((num >> 8 & 0x00ff) + amt)
  const b = clamp((num & 0x0000ff) + amt)
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)
}

// Replaces flat "white card" backgrounds — same lavender used elsewhere in
// the palette, so cards read as distinct panels without being stark white.
export const NB_CARD_NEUTRAL = NB.lavender
// NB.lavender's own next-darker step on the intensity ramp — used as its
// paired shadow color instead of a generically-derived shade.
export const NB_CARD_NEUTRAL_SHADOW = NB_INTENSITY_RAMP[2] // '#C9B4F5'

// Shadow shade amount for cards with no explicit paired shadow color.
const NB_CARD_SHADOW_SHADE = -38

// Card style fragment — no border, just a hard offset shadow. Pass an
// explicit shadowColor for fills that have a designed darker sibling (e.g.
// NB.tealLight -> NB.teal); otherwise one is auto-derived from the fill.
export function nbCardStyle(bg = NB_CARD_NEUTRAL, shadowPx = 6, shadowColor) {
  return {
    background: bg,
    border: 'none',
    boxShadow: hardShadow(shadowPx, shadowColor || shade(bg, NB_CARD_SHADOW_SHADE)),
  }
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

export const nbCard = nbCardStyle(NB_CARD_NEUTRAL, 6, NB_CARD_NEUTRAL_SHADOW)

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

// MissVfit Pro's light-blue→purple "shiny" gradient — the one visual
// signature reused across the Pro-only name treatment, muscle-map highlight,
// and avatar border ring, so all three read as the same perk.
export const NB_PRO_BLUE = '#6FA8FF'
export const NB_PRO_GRADIENT = `linear-gradient(120deg, ${NB_PRO_BLUE}, ${NB.purpleDeep})`

// Spread onto a name/text element to render it as gradient-filled instead of
// a flat color — the element's own `color` is overridden to `transparent`,
// so don't also set `color` alongside this.
export const proTextStyle = {
  backgroundImage: NB_PRO_GRADIENT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
}
