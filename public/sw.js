// Minimal service worker — only handles Web Push. No offline caching/Workbox,
// since push is the only thing this app needs a service worker for today.

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { /* non-JSON payload, ignore */ }

  const title = data.title || 'MissVfit'
  const options = {
    body: data.body || '',
    icon: '/cute_logo.png',
    badge: '/cute_logo.png',
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
