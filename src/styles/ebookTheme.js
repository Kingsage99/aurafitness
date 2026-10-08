// Design tokens for the ebook sales page (src/screens/EbookLanding.jsx) only.
// Deliberately NOT merged into NB (src/styles/neoBrutalism.js) — every other
// screen imports NB and shouldn't accidentally inherit a lavender-only,
// app-unrelated palette. Geometry/typography (hardShadow, shade, radii,
// fonts) are still the shared neo-brutalist ones — only the color hues
// differ here, per the user's explicit brief for this one page.
import { NB, hardShadow, shade, NB_RADIUS, NB_RADIUS_SM, NB_RADIUS_XS } from './neoBrutalism'

export const EBOOK = {
  ink: '#1A1A1A',
  white: '#FFFFFF',
  lavender: '#E4D3FF',
  lavenderDeep: shade('#E4D3FF', -12),
  lavenderTint: shade('#E4D3FF', 7), // paler wash for full-width section bands; full lavender stays reserved for cards/badges/CTAs
  textBody: shade('#1A1A1A', 25),
  textMuted: shade('#1A1A1A', 45),

  // Anton/Poppins, not NB's Archivo/Space Mono — this page's own typographic
  // choice, deliberately separate from the gated app's design system. Token
  // names (fontDisplay/fontMono) are kept as-is even though Poppins isn't a
  // mono font: every call site across EbookLanding.jsx/EbookLegal.jsx already
  // keys off these two names, and renaming them would be a page-wide
  // find/replace for no behavioral change.
  fontDisplay: "'Anton',sans-serif",
  fontMono: "'Poppins',sans-serif",
}

export { hardShadow, shade, NB_RADIUS, NB_RADIUS_SM, NB_RADIUS_XS }

export const EBOOK_BORDER = `3px solid ${EBOOK.ink}`

export function ebookButton(bg = EBOOK.ink, color = EBOOK.white, size = 5) {
  return {
    cursor: 'pointer',
    fontFamily: EBOOK.fontDisplay,
    fontWeight: 800,
    textTransform: 'uppercase',
    border: EBOOK_BORDER,
    background: bg,
    color,
    boxShadow: hardShadow(size),
  }
}

export function ebookCardStyle(bg = EBOOK.white, shadowPx = 6) {
  return {
    background: bg,
    border: EBOOK_BORDER,
    boxShadow: hardShadow(shadowPx),
  }
}
