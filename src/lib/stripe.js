import { supabase } from './supabase'

// MissVfit Pro price IDs, created once in the Stripe Dashboard (Products →
// MissVfit Pro). These are public identifiers, not secrets — safe to ship to the
// client. Swap in the real IDs after creating the Prices in Stripe.
export const STRIPE_PRICES = {
  monthly: import.meta.env.VITE_STRIPE_PRICE_MONTHLY || '',
  annual: import.meta.env.VITE_STRIPE_PRICE_ANNUAL || '',
}

// Redirects the browser to a Stripe Checkout session for the given price.
// trialDays defaults to 7 (the standard offer) — pass a different value for
// a special launch/founding flow if one is ever wired up separately.
export async function startCheckout(priceId, trialDays = 7) {
  const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
    body: { priceId, trialDays },
  })
  if (error || !data?.url) {
    throw new Error(error?.message || 'Could not start checkout')
  }
  window.location.href = data.url
}

// Redirects to Stripe's hosted Customer Portal so a subscriber can update
// payment method, switch plan, or cancel — no custom billing UI needed.
export async function openBillingPortal() {
  const { data, error } = await supabase.functions.invoke('stripe-portal', { body: {} })
  if (error || !data?.url) {
    throw new Error(error?.message || 'Could not open billing portal')
  }
  window.location.href = data.url
}

// isPro is a plain timestamp comparison — pro_until is the single source of
// truth the whole app reads, kept in sync by the stripe-webhook function.
export function isPro(profileRow) {
  const proUntil = profileRow?.pro_until
  return !!proUntil && new Date(proUntil).getTime() > Date.now()
}

// A user is trial-eligible only if they've NEVER had any subscription before.
// stripe-webhook sets subscription_status/pro_until once and never clears them
// back to null (even on cancellation), so either being non-null proves prior
// use — a lapsed or canceled subscriber never gets the free trial offered again.
export function isTrialEligible(subscription) {
  return !subscription?.status && !subscription?.proUntil
}
