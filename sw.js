/* Service Worker: офлайн-кэш игры (Фаза 3, PWA).
 * Стратегии: навигации — network-first с фолбэком на кэш;
 * ассеты (/_next/static, /game) — cache-first; остальное — мимо. */
const CACHE = 'fr-arena-v2';
const BASE = self.registration.scope;

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll([
    new URL('./', BASE).href,
    new URL('manifest.webmanifest', BASE).href,
  ]).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // навигация: сеть, при офлайне — кэш/корень
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() =>
        caches.match(new URL('./', BASE).href).then(r => r || Response.error())
      )
    );
    return;
  }

  // статика и игровые ассеты: cache-first
  const cacheable = url.pathname.includes('/_next/static/') || url.pathname.includes('/game/');
  if (cacheable) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }))
    );
  }
});
