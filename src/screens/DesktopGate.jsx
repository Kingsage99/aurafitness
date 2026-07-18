import React from 'react'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'

// Shown instead of the real app whenever /app is opened on a desktop-sized
// viewport. Deliberately has no "continue anyway" escape hatch — the app's
// screens are built for a phone-sized canvas only, so letting a desktop
// visitor push through would just land them in a broken layout. Narrowing
// the browser window (or DevTools' device-emulation mode) crosses the same
// 600px breakpoint PhoneFrame already uses, so this isn't a dead end for
// testing — just for a genuine desktop-sized visit.
export default function DesktopGate() {
  return (
    <div style={{
      height: '100vh',
      overflowY: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: NB.bg,
      padding: '24px 20px',
      fontFamily: NB.fontDisplay,
      boxSizing: 'border-box',
    }}>
      <div style={{
        ...nbCardStyle(NB_CARD_NEUTRAL, 6, NB_CARD_NEUTRAL_SHADOW),
        border: NB_BORDER,
        boxShadow: hardShadow(8),
        borderRadius: 24,
        maxWidth: 420,
        width: '100%',
        padding: '40px 32px',
        textAlign: 'center',
      }}>
        <img
          src="/cute_logo.png"
          alt="MissVfit"
          style={{ width: 72, height: 72, borderRadius: 18, border: NB_BORDER, boxShadow: hardShadow(4), objectFit: 'cover', margin: '0 auto 20px' }}
        />
        <div style={{ fontWeight: 900, fontSize: 24, textTransform: 'uppercase', color: NB.ink, lineHeight: 1.15 }}>
          MissVfit is a mobile app
        </div>
        <div style={{ fontFamily: NB.fontMono, fontSize: 14, color: '#555', marginTop: 14, lineHeight: 1.6 }}>
          The workout player, meal tracker, and everything else are built for a phone screen. Open this page on your phone to sign up and get started.
        </div>
        <div style={{ ...nbCardStyle(NB.lavender, 3), border: `2.5px solid ${NB.ink}`, borderRadius: 14, padding: '14px 16px', marginTop: 24, fontFamily: NB.fontMono, fontSize: 13, fontWeight: 700, color: NB.ink, wordBreak: 'break-all' }}>
          {typeof window !== 'undefined' ? window.location.host : ''}
        </div>
        <a
          href="/"
          style={{
            display: 'inline-block',
            marginTop: 22,
            fontFamily: NB.fontMono,
            fontSize: 13,
            fontWeight: 700,
            color: '#555',
            textDecoration: 'underline',
          }}
        >
          Back to the overview
        </a>
      </div>
    </div>
  )
}
