/* AuditIA — service worker : chargement instantané + coquille hors-ligne.
   Stratégie « réseau d'abord » : quand on est en ligne, la dernière version
   est toujours récupérée et mise en cache ; hors ligne, on sert le cache. */
const CACHE = 'auditia-v16';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './auditia-icon.svg', './favicon-32.png',
  './apple-touch-icon.png', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  // Laisser passer tout ce qui n'est pas notre origine (Supabase, Google, Logo.dev, RDAP…)
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
