/* eslint-disable no-restricted-globals */

// Service Worker for Nutrition PWA

const CACHE_VERSION = 'nutrition-pwa-v1'
const CACHE_NAMES = {
  static: `${CACHE_VERSION}-static`,
  dynamic: `${CACHE_VERSION}-dynamic`,
  api: `${CACHE_VERSION}-api`
}

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
]

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !Object.values(CACHE_NAMES).includes(name))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - Network first for API, Cache first for static
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // API requests - Network first with fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, CACHE_NAMES.api))
  }

  // External API (Open Food Facts) - Network first
  else if (url.origin === 'https://world.openfoodfacts.org') {
    event.respondWith(networkFirstStrategy(request, CACHE_NAMES.dynamic))
  }

  // Static assets - Cache first
  else {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.static))
  }
})

// Network first strategy
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.log('[SW] Fetch failed, using cache:', request.url)
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }
    // Return offline page or error response
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    })
  }
}

// Cache first strategy
async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.log('[SW] Fetch failed:', request.url)
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    })
  }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Push notification (optional)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const options = {
    body: data.body || 'Notification from Nutrition Tracker',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png'
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Nutrition Tracker', options)
  )
})
