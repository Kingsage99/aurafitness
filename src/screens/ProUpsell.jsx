import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { startCheckout, isTrialEligible, STRIPE_PRICES } from '../lib/stripe'
import { StarIcon, renderIcon } from '../components/Icons'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW, proTextStyle } from '../styles/neoBrutalism'

export const FEATURES = [
  { icon: '🌯', label: 'Unlimited AI meal generation', desc: 'No daily limit on meal suggestions, food lookup, or "already ate" scans' },
  { icon: '🪄', label: 'AI meal adjustments', desc: 'Request changes to any recipe — more protein, no dairy — a Pro-only feature' },
  { icon: '📅', label: 'Build my full day', desc: 'Auto-plan every meal and snack for the whole day in one tap' },
  { icon: '✨', label: 'Shiny Pro name & muscle map', desc: 'Your name and workout stats shine blue-purple everywhere' },
  { icon: '🏆', label: 'True rank colors on your muscle map', desc: "Real bronze-to-goddess muscle coloring once you've logged 5 workouts" },
  { icon: '📈', label: 'Full analytics history', desc: '90-day and all-time trends across workouts and nutrition, not just the last 30 days' },
  { icon: '👑', label: 'Exclusive Pro avatar border', desc: 'A crowned gradient ring only Pro members can equip' },
  { icon: '🐾', label: 'Every Legendary pet, free', desc: 'All Legendary pets in the Store are automatically unlocked for you' },
]

// Onboarding no longer routes here directly -- every new user gets an
// automatic 7-day gift trial instead (see App.jsx's handleClaimGiftTrial).
// This screen is now reached only from GiftTrialEnded's "Continue with Pro"
// button (once the gift lapses) and the various in-app feature-gate
// redirects (Analytics, Meals, MuscleMap, StoreScreen, Settings). By the
// time anyone gets here, isTrialEligible(subscription) is almost always
// false (they've already had their one free week) -- the trialEligible
// branch below exists for the rare case it's ever reached before that.
// Small circle-i info glyph, matching the stroke-based inline SVG style used
// elsewhere on this screen and in Auth.jsx (no separate icon component exists
// for this yet).
function InfoIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={NB.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16.5" />
      <circle cx="12" cy="7.8" r="0.5" fill={NB.ink} />
    </svg>
  )
}

export default function ProUpsell({ subscription = {}, onContinue }) {
  const [plan, setPlan] = useState('monthly')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Which single feature card has its description expanded, if any — only
  // the tapped one shows detail at a time, so the list stays calm instead of
  // showing every description at once.
  const [expandedFeature, setExpandedFeature] = useState(null)
  const trialEligible = isTrialEligible(subscription)

  const handleSubscribe = async () => {
    const priceId = plan === 'monthly' ? STRIPE_PRICES.monthly : STRIPE_PRICES.annual
    if (!priceId) { setError("MissVfit Pro isn't set up yet — check back soon."); return }
    setError('')
    setBusy(true)
    try {
      await startCheckout(priceId, trialEligible ? 7 : 0)
    } catch (err) {
      setError(err.message || 'Could not start checkout')
      setBusy(false)
    }
  }

  return (
    <>
      <StatusBar />
      <div className="scroll-fade-bottom" style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, border: NB_BORDER, boxShadow: hardShadow(4), background: NB.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <StarIcon size={30} />
          </div>
          <div style={{ fontFamily: NB.fontDisplay, fontWeight: 900, fontSize: 26, textTransform: 'uppercase', lineHeight: 1.1, ...proTextStyle }}>MissVfit Pro</div>
          <div style={{ fontSize: 14, color: '#555', marginTop: 8 }}>
            {trialEligible ? 'Try everything free for 7 days' : 'Unlock the full MissVfit experience'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {FEATURES.map(f => {
            const isOpen = expandedFeature === f.label
            return (
              <div key={f.label} style={{ ...nbCardStyle(NB_CARD_NEUTRAL, 3, NB_CARD_NEUTRAL_SHADOW), border: `3px solid ${NB.white}`, borderRadius: 16, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: NB.white, border: `1.5px solid ${NB.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{renderIcon(f.icon, 20)}</div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 800, color: NB.ink, textAlign: 'center' }}>{f.label}</div>
                  <button
                    onClick={() => setExpandedFeature(isOpen ? null : f.label)}
                    aria-label={isOpen ? 'Hide details' : 'Show details'}
                    style={{ width: 26, height: 26, borderRadius: '50%', border: `1.5px solid ${NB.ink}`, background: isOpen ? NB.yellow : NB.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', padding: 0 }}
                  >
                    <InfoIcon size={14} />
                  </button>
                </div>
                {isOpen && (
                  <div style={{ fontSize: 11, color: '#555', marginTop: 8, paddingTop: 8, borderTop: `1.5px solid ${NB.ink}22` }}>{f.desc}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Price toggle + error live in the pinned footer, not the scrollable
          feature list above — so they're always visible no matter how far
          down the (now full 8-item) feature list the user has scrolled. */}
      <div style={{ padding: '14px 22px 26px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setPlan('monthly')}
            style={{ flex: 1, height: 56, border: `2.5px solid ${NB.ink}`, borderRadius: 14, background: plan === 'monthly' ? NB.teal : NB.white, boxShadow: plan === 'monthly' ? hardShadow(3) : 'none', cursor: 'pointer' }}
          >
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, color: NB.ink }}>$14.99</div>
            <div style={{ fontSize: 10, color: '#555', fontWeight: 700 }}>per month</div>
          </button>
          <button
            onClick={() => setPlan('annual')}
            style={{ flex: 1, height: 56, border: `2.5px solid ${NB.ink}`, borderRadius: 14, background: plan === 'annual' ? NB.teal : NB.white, boxShadow: plan === 'annual' ? hardShadow(3) : 'none', cursor: 'pointer', position: 'relative' }}
          >
            {plan !== 'annual' && <div style={{ position: 'absolute', top: -10, right: 10, background: NB.magenta, color: NB.white, fontSize: 9, fontWeight: 800, borderRadius: 6, padding: '2px 7px', border: `1.5px solid ${NB.ink}` }}>Save 44%</div>}
            <div style={{ fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 15, color: NB.ink }}>$99.99</div>
            <div style={{ fontSize: 10, color: '#555', fontWeight: 700 }}>per year</div>
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: 12, padding: '10px 14px', ...nbCardStyle(NB.red, 3), border: `3px solid ${NB.white}`, borderRadius: 12 }}>
            <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.white, fontWeight: 700 }}>{error}</span>
          </div>
        )}

        <button
          onClick={handleSubscribe}
          disabled={busy}
          style={{ width: '100%', height: 56, border: NB_BORDER, borderRadius: 16, boxShadow: busy ? 'none' : hardShadow(5), background: busy ? '#ccc' : NB.magenta, color: NB.white, fontFamily: NB.fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', cursor: busy ? 'default' : 'pointer' }}
        >
          {busy ? 'Please wait…' : trialEligible ? 'Start Free 7-Day Trial' : 'Subscribe to MissVfit Pro'}
        </button>
        <button
          onClick={onContinue}
          style={{ width: '100%', marginTop: 14, background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: '#555', textDecoration: 'underline', cursor: 'pointer' }}
        >
          Skip for now
        </button>
      </div>
    </>
  )
}
