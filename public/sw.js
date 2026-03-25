// Wildfire App — Service Worker
// Handles background push notifications

self.addEventListener('push', function (event) {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Wildfire Alert', body: event.data.text(), tag: 'wildfire' }
  }

  const title = payload.title || 'Wildfire Alert'
  const options = {
    body: payload.body || 'Check the app for updates.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.tag || 'wildfire-alert',
    renotify: true,
    requireInteraction: payload.urgent === true,
    data: {
      url: payload.url || '/dashboard/caregiver',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard/caregiver'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
