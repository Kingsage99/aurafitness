import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { FEATURES } from './ProUpsell'
import { declineGiftTrial } from '../lib/giftTrial'
import { renderIcon } from '../components/Icons'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW } from '../styles/neoBrutalism'

// Interstitial shown when a user chooses "Continue Free" from GiftTrialEnded
// -- lists everything they're about to lose before finalizing. Confirming
// calls the gift-trial edge function's 'decline' action, which finalizes
// subscription_status as 'gift_trial_declined' -- a distinct terminal status
// so this screen (and the forced redirect in App.jsx's loadProfile) never
// fires again, and isTrialEligible(subscription) stays permanently false
// (it already treats any truthy status as "used their trial").
export default function GiftTrialDowngrade({ onDeclined, onNavigate }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setError('')
    setBusy(true)
    try {
      const next = await declineGiftTrial()
      onDeclined?.(next)
    } catch (err) {
      setError(err.message || 'Could not update your plan')
      setBusy(false)
    }
  }

  return (
    <>
      <StatusBar />
      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', lineHeight: 1.15, color: NB.ink }}>
            You'll lose access to
          </div>
          <div style={{ fontSize: 14, color: '#555', marginTop: 8 }}>
            Everything below goes away the moment you continue free.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
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

        {error && (
          <div style={{ marginTop: 10, padding: '10px 14px', ...nbCardStyle(NB.red, 3), border: `3px solid ${NB.white}`, borderRadius: 12 }}>
            <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.white, fontWeight: 700 }}>{error}</span>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 22px 26px', flexShrink: 0 }}>
        <button
          onClick={() => onNavigate('giftTrialEnded')}
          disabled={busy}
          style={{ width: '100%', height: 56, border: NB_BORDER, borderRadius: 16, boxShadow: busy ? 'none' : hardShadow(5), background: NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', cursor: busy ? 'default' : 'pointer' }}
        >
          Actually, stay Pro
        </button>
        <button
          onClick={handleConfirm}
          disabled={busy}
          style={{ width: '100%', marginTop: 14, background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: '#555', textDecoration: 'underline', cursor: busy ? 'default' : 'pointer' }}
        >
          {busy ? 'Please wait…' : 'Continue Free'}
        </button>
      </div>
    </>
  )
}
