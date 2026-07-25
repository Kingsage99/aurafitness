import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { FEATURES } from './ProUpsell'
import { StarIcon, renderIcon } from '../components/Icons'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW, proTextStyle } from '../styles/neoBrutalism'

// Shown once, right after WhyAura's "Let's go" button silently grants the
// automatic 7-day gift trial (see App.jsx's handleClaimGiftTrial) -- until
// this screen existed, a new user got Pro access with zero announcement of
// it. Mirrors GiftTrialEnded.jsx's visual pattern (same icon badge, same
// info-card + FEATURES-list shape) so the two ends of the trial read as one
// consistent flow.
export default function GiftTrialWelcome({ onContinue }) {
  return (
    <>
      <StatusBar />
      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 0' }}>
        <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, border: NB_BORDER, boxShadow: hardShadow(4), background: NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <StarIcon size={30} />
          </div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', lineHeight: 1.15, color: NB.ink }}>
            You got 7 days of <span style={proTextStyle}>Pro</span>, free
          </div>
          <div style={{ fontSize: 14, color: '#555', marginTop: 8 }}>
            A gift, on us — every feature below is unlocked for the next week, no card required.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {FEATURES.map(f => (
            <div key={f.label} style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: NB.white, border: `1.5px solid ${NB.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{renderIcon(f.icon, 20)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: NB.ink }}>{f.label}</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 1 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...nbCardStyle(NB.cream, 3), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: NB.ink, lineHeight: 1.6 }}>
            After your 7 days, you'll choose to keep Pro or continue on the free plan — nothing is charged automatically.
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 22px 26px', flexShrink: 0 }}>
        <button
          onClick={onContinue}
          style={{ width: '100%', height: 56, border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(5), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Start exploring
        </button>
      </div>
    </>
  )
}
