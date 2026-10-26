/* AuditIA — service worker : démarrage instantané + coquille hors-ligne.
   Stratégie « cache d'abord, mise à jour en arrière-plan » (stale-while-revalidate) :
   l'app s'affiche tout de suite depuis le cache, et la dernière version est
   récupérée en arrière-plan pour la prochaine ouverture. */
const CACHE = 'auditia-v145';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './auditia-icon.svg', './audit-chat-robot.svg', './favicon-32.png',
  './apple-touch-icon.png', './icon-192.png', './icon-512.png',
  './vendor/html2canvas.min.js', './vendor/jspdf.umd.min.js',
  './vendor/supabase.js', './home-robot.png', './page-clients.png', './page-studio.png', './chat-robot.png'
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
  if (url.origin !== location.origin) return;
  const allowed = ASSETS.some(asset => {
    const name = asset.replace(/^\.\//, '');
    if (!name) return url.pathname.endsWith('/') || url.pathname.endsWith('/AuditIA');
    return url.pathname.endsWith('/' + name);
  });
  if (!allowed || url.search) return;
  e.respondWith((async () => {
    // Toujours vérifier la dernière version réseau pour les pages HTML.
    // L'ancien comportement servait d'abord le HTML en cache, ce qui pouvait
    // laisser l'iPhone exécuter une ancienne version après un correctif.
    if (req.mode === 'navigate' || /\\.html$/i.test(url.pathname)) {
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
    // Récupération réseau en arrière-plan : met le cache à jour pour la prochaine fois.
    const network = fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => null);
    // Si on a une copie en cache : on la sert IMMÉDIATEMENT (démarrage instantané).
    if (cached) return cached;
    // Sinon on attend le réseau, avec repli sur la coquille.
    const net = await network;
    return net || caches.match('./index.html');
  })());
});
