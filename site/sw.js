/* AuditIA — service worker : démarrage instantané + coquille hors-ligne.
   Stratégie « cache d'abord, mise à jour en arrière-plan » (stale-while-revalidate) :
   l'app s'affiche tout de suite depuis le cache, et la dernière version est
   récupérée en arrière-plan pour la prochaine ouverture. */
const CACHE = 'auditia-v111';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './theme-clair.css', './mobile.css?v=4',
  './auditia-icon.svg', './favicon-32.png',
  './apple-touch-icon.png', './icon-192.png', './icon-512.png',
  './auditia-refonte-v2.css', './frost-experience.css',
  './vendor/html2canvas.min.js', './vendor/jspdf.umd.min.js',
  './vendor/supabase.js'
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
  // Laisser passer tout ce qui n'est pas notre origine (Google, Logo.dev, RDAP…)
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    // Pages HTML : toujours la dernière version réseau, pour qu'un correctif soit pris en compte
    // dès l'ouverture (sinon l'iPhone peut garder une ancienne version).
    if (req.mode === 'navigate' || /\.html$/i.test(url.pathname) || url.pathname.endsWith('/')) {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        if (fresh && fresh.ok) {
          const copy = fresh.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return fresh;
        }
      } catch (_) {}
      return (await caches.match(req)) || (await caches.match('./index.html'));
    }
    const cached = await caches.match(req);
    // CSS/JS critiques : consulter le réseau sans utiliser une réponse fraîche en cache navigateur.
    const isCriticalAsset = /\.(css|js)$/i.test(url.pathname);
    const network = fetch(req, isCriticalAsset ? { cache: 'no-store' } : {}).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => null);
    // Pour CSS/JS, attendre la vérification réseau afin d'éviter une ancienne interface.
    if (isCriticalAsset) {
      const fresh = await network;
      return fresh || cached || caches.match('./index.html');
    }
    // Les autres ressources restent cache-first pour un démarrage rapide.
    if (cached) return cached;
    const net = await network;
    return net || caches.match('./index.html');
  })());
});
