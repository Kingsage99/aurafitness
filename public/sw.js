// Minimal service worker — only handles Web Push. No offline caching/Workbox,
// since push is the only thing this app needs a service worker for today.

// No-op fetch handler: doesn't intercept/cache anything (browser handles the
// request normally), but a registered service worker with a fetch listener is
// what makes Chrome treat this site as a real installable PWA instead of
// falling back to a plain bookmark-style shortcut.
self.addEventListener('fetch', () => {})

// Take over immediately on update instead of waiting for every open tab to
// close first — this worker has no offline cache to worry about breaking
// mid-session, so there's no downside to activating right away.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { /* non-JSON payload, ignore */ }

  const title = data.title || 'MissVfit'
  const options = {
    body: data.body || '',
    icon: '/notification_icon.png',
    badge: '/notification_icon.png',
    data: { url: data.url || '/app' },
    requireInteraction: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/app'
  event.waitUntil((async () => {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    // Prefer an already-open app tab and focus it (navigating to the target
    // first if needed). Focusing the FIRST client blindly used to surface a
    // stray marketing landing-page tab (any non-/app path) instead of the app.
    const appClient = windowClients.find(c => c.url.includes('/app'))
    if (appClient) {
      if (!appClient.url.includes(url) && 'navigate' in appClient) {
        try { await appClient.navigate(url) } catch { /* cross-origin/unsupported — just focus */ }
      }
      return appClient.focus()
    }
    // No app tab open (or only a landing tab) — open the target fresh.
    if (clients.openWindow) return clients.openWindow(url)
  })())
})
