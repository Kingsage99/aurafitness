import React from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { StarIcon } from '../components/Icons'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW, proTextStyle } from '../styles/neoBrutalism'

// Forced decision screen shown once the automatic 7-day gift trial lapses
// (see App.jsx's loadProfile: subscription.status === 'trialing_gift' with
// pro_until in the past). No skip/back option -- the user must actively
// choose real Pro billing or confirm going free.
export default function GiftTrialEnded({ onNavigate }) {
  return (
    <>
      <StatusBar />
      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, border: NB_BORDER, boxShadow: hardShadow(4), background: NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <StarIcon size={30} />
          </div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', lineHeight: 1.15, color: NB.ink }}>
            Your free week is over
          </div>
          <div style={{ fontSize: 14, color: '#555', marginTop: 8 }}>
            Your 7 days of MissVfit <span style={proTextStyle}>Pro</span> just ended. Keep everything you've unlocked, or continue for free.
          </div>
        </div>

        <div style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: NB.ink, lineHeight: 1.6 }}>
            Unlimited AI meals, full analytics history, true rank colors, your Pro name shine, and every Legendary pet — all stay unlocked the moment you subscribe.
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 22px 26px', flexShrink: 0 }}>
        <button
          onClick={() => onNavigate('proUpsell')}
          style={{ width: '100%', height: 56, border: NB_BORDER, borderRadius: 16, boxShadow: hardShadow(5), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Continue with Pro
        </button>
        <button
          onClick={() => onNavigate('giftTrialDowngrade')}
          style={{ width: '100%', height: 48, marginTop: 10, border: `2px solid ${NB.ink}`, borderRadius: 14, background: NB.white, color: NB.ink, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Continue Free
        </button>
      </div>
    </>
  )
}
