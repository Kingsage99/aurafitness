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
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
