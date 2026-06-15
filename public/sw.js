// Service worker NYSA — cache hors-ligne (app shell + statiques).
// Stratégies :
//  - navigations : network-first, repli cache puis page d'accueil
//  - statiques (_next/static, polices, images, css/js) : cache-first
//  - cross-origin (Supabase, OpenFoodFacts, TheMealDB) et /api : réseau direct
// Les données nutritionnelles (CIQUAL) étant dans le bundle JS, elles sont
// mises en cache avec les statiques → nutrition consultable hors-ligne.

const CACHE = 'nysa-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // données externes : réseau direct
  if (url.pathname.startsWith('/api/')) return     // données serveur : pas de cache

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req)
        const cache = await caches.open(CACHE)
        cache.put(req, fresh.clone())
        return fresh
      } catch {
        return (await caches.match(req)) || (await caches.match('/')) || Response.error()
      }
    })())
    return
  }

  const isStatic = url.pathname.startsWith('/_next/static') ||
    /\.(?:svg|png|jpe?g|webp|gif|ico|woff2?|ttf|css|js|json)$/.test(url.pathname)
  if (isStatic) {
    event.respondWith((async () => {
      const cached = await caches.match(req)
      if (cached) return cached
      try {
        const fresh = await fetch(req)
        const cache = await caches.open(CACHE)
        cache.put(req, fresh.clone())
        return fresh
      } catch {
        return cached || Response.error()
      }
    })())
  }
})
