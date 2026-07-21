import React, { useState } from 'react'
import { StatusBar } from '../components/PhoneFrame'
import { startCheckout, isTrialEligible, STRIPE_PRICES } from '../lib/stripe'
import { StarIcon, renderIcon } from '../components/Icons'
import { NB, NB_BORDER, hardShadow, nbCardStyle, NB_CARD_NEUTRAL, NB_CARD_NEUTRAL_SHADOW, proTextStyle } from '../styles/neoBrutalism'

export const FEATURES = [
  { icon: '🍽️', label: 'Unlimited AI meal generation', desc: 'No daily limit on meal suggestions, food lookup, or "already ate" scans' },
  { icon: '🪄', label: 'AI meal adjustments', desc: 'Request changes to any recipe — more protein, no dairy — a Pro-only feature' },
  { icon: '📅', label: 'Build my full day', desc: 'Auto-plan every meal and snack for the whole day in one tap' },
  { icon: '✨', label: 'Shiny Pro name & muscle map', desc: 'Your name and workout stats shine blue-purple everywhere' },
  { icon: '🏆', label: 'True rank colors on your muscle map', desc: "Real bronze-to-goddess muscle coloring once you've logged 5 workouts" },
  { icon: '📈', label: 'Full analytics history', desc: '90-day and all-time trends across workouts and nutrition, not just the last 30 days' },
  { icon: '👑', label: 'Exclusive Pro avatar border', desc: 'A crowned gradient ring only Pro members can equip' },
  { icon: '🐾', label: 'Every Legendary pet, free', desc: 'All Legendary pets in the Store are automatically unlocked for you' },
]

// One-time paywall shown right after WhyAura, only during first-time
// onboarding. isTrialEligible(subscription) is always true here in practice
// (a brand-new account has never touched Stripe), but the same eligibility
// check used everywhere else runs regardless, so this screen degrades
// correctly if it's ever reached a second time.
export default function ProUpsell({ subscription = {}, onContinue }) {
  const [plan, setPlan] = useState('monthly')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
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

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
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
          <div style={{ marginTop: 10, padding: '10px 14px', ...nbCardStyle(NB.red, 3), border: `3px solid ${NB.white}`, borderRadius: 12 }}>
            <span style={{ fontFamily: NB.fontMono, fontSize: 13, color: NB.white, fontWeight: 700 }}>{error}</span>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 22px 26px', flexShrink: 0 }}>
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
