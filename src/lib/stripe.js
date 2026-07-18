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

// Store's Gems tab price IDs, created once in the Stripe Dashboard as
// one-time Prices (Products → MissVfit Gems). Swap in the real IDs after
// creating them — the gem amount each one credits is fixed server-side in
// stripe-create-checkout's GEM_PRICE_MAP, not read from here.
export const GEM_STRIPE_PRICES = {
  gems_100: import.meta.env.VITE_STRIPE_PRICE_GEMS_100 || '',
  gems_500: import.meta.env.VITE_STRIPE_PRICE_GEMS_500 || '',
  gems_1200: import.meta.env.VITE_STRIPE_PRICE_GEMS_1200 || '',
  gems_2500: import.meta.env.VITE_STRIPE_PRICE_GEMS_2500 || '',
}

// Redirects to a one-time-payment Stripe Checkout session for a gem package.
// Gems are credited by stripe-webhook once payment completes — this call
// only starts the redirect.
export async function startGemCheckout(priceId) {
  const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
    body: { priceId, type: 'gems' },
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
