import posthog from 'posthog-js'

// Product analytics (PostHog). The project token is meant to be public/
// client-side — same category as the Supabase anon key, not a secret.
const KEY = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST

let initialized = false

export function initAnalytics() {
  if (initialized || !KEY || !HOST) return
  posthog.init(KEY, {
    api_host: HOST,
    // This app has no real URL router — App.jsx drives navigation entirely
    // through an in-memory `screen` string (see CLAUDE.md), so PostHog's
    // default history-based pageview capture would never fire (the browser
    // URL never changes). We call trackScreen() below on every screen change
    // instead, with a synthetic $current_url — this is what still lets
    // PostHog's built-in session-duration, retention, and Paths insights work
    // without building that from scratch.
    capture_pageview: false,
    capture_pageleave: true,
    session_recording: {
      // Mask every input's value in session replays. Onboarding, Edit
      // Details, and Body Progress all collect real health data (weight,
      // injuries, dietary/allergy info) through plain <input>/<textarea>
      // elements — there's no safe subset of fields to leave unmasked.
      maskAllInputs: true,
    },
  })
  initialized = true
}

// Ties PostHog's anonymous pre-signup activity to the real account once a
// user signs in, so retention/funnels can span the whole journey rather than
// resetting at login. Call from App.jsx's SIGNED_IN handling.
export function identifyUser(userId, traits = {}) {
  if (!initialized) return
  posthog.identify(userId, traits)
}

// Call on SIGNED_OUT — starts a fresh anonymous identity for whoever uses the
// device next, instead of attributing their activity to the previous account.
export function resetAnalytics() {
  if (!initialized) return
  posthog.reset()
}

// Synthetic "pageview" for in-memory screen navigation (see capture_pageview:
// false above). $current_url doesn't need to be a real fetchable URL — it
// only needs to be stable per screen so PostHog's Paths/session/retention
// insights can group by it the same way they would for real page loads.
export function trackScreen(screenName) {
  if (!initialized || !screenName) return
  posthog.capture('$pageview', {
    $current_url: `${window.location.origin}/app/${screenName}`,
    screen: screenName,
  })
}

export function track(eventName, properties = {}) {
  if (!initialized) return
  posthog.capture(eventName, properties)
}
