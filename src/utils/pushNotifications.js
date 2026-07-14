// Real Web Push (OS-level notifications, works even when the app tab is
// closed) — distinct from the in-app toast system (pushNotification in
// App.jsx), which only fires while the app is open.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

export async function registerServiceWorker() {
  if (!isPushSupported()) return null
  await navigator.serviceWorker.register('/sw.js')
  // register() resolves once the registration exists, but the worker may
  // still be installing — pushManager.subscribe() needs an ACTIVE worker.
  return navigator.serviceWorker.ready
}

// PushManager wants the VAPID public key as a Uint8Array, not the raw
// base64url string.
function urlBase64ToUint8Array(base64url) {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

// Requests notification permission and creates a push subscription.
// Returns the PushSubscription on success, or null if unsupported/denied/no key.
export async function subscribeToPush() {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const registration = await registerServiceWorker()
  if (!registration) return null

  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
}

// Returns the endpoint that was unsubscribed (so the caller can delete the
// matching row), or null if there was nothing to unsubscribe.
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!registration) return null
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return null
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  return endpoint
}
