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

// The Shape Shift Playbook's one-time Price ID, created once in the Stripe
// Dashboard (Products → Shape Shift Playbook). Single product, single price —
// unlike the gem packages there's no map to look up.
export const EBOOK_STRIPE_PRICE = import.meta.env.VITE_STRIPE_PRICE_EBOOK || ''

// Redirects to a one-time-payment Stripe Checkout session for the ebook, via
// its own dedicated edge function (not stripe-create-checkout) — that one
// requires a Supabase JWT and ties every purchase to a logged-in profiles
// row (verify_jwt is a deploy-time gate, enforced before any function code
// runs, so it can't be made to accept anonymous calls for just one branch).
// EbookLanding.jsx is guest checkout with no login at all, so
// stripe-ebook-checkout is deployed with verify_jwt=false instead.
export async function startEbookCheckout(priceId) {
  const { data, error } = await supabase.functions.invoke('stripe-ebook-checkout', {
    body: { priceId },
  })
  if (error || !data?.url) {
    throw new Error(error?.message || 'Could not start checkout')
  }
  window.location.href = data.url
}

// Verifies a completed ebook purchase server-side (against Stripe directly,
// using the session_id Stripe put in the success-redirect URL — that value
// can't exist without a real completed payment) and, if valid, returns a
// short-lived signed Storage URL for the actual PDF. No auth required — the
// session_id itself is the only credential, same trust model as a receipt
// link. Returns null (not a thrown error) on an unverified/invalid session
// so callers can show a plain "couldn't verify" state rather than a crash.
export async function getEbookDownloadUrl(sessionId) {
  if (!sessionId) return null
  const { data, error } = await supabase.functions.invoke('get-ebook-download', {
    body: { sessionId },
  })
  if (error || !data?.url) return null
  return data.url
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
