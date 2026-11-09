/* AuditIA — service worker : démarrage instantané + coquille hors-ligne.
   Stratégie « cache d'abord, mise à jour en arrière-plan » (stale-while-revalidate) :
   l'app s'affiche tout de suite depuis le cache, et la dernière version est
   récupérée en arrière-plan pour la prochaine ouverture. */
const CACHE = 'auditia-v147';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './theme-clair.css', './mobile.css',
  './auditia-icon.svg', './favicon-32.png',
  './apple-touch-icon.png', './icon-192.png', './icon-512.png',
  './auditia-refonte-v2.css', './frost-experience.css', './home-compact.css', './app-polish.css',
  './vendor/html2canvas.min.js', './vendor/jspdf.umd.min.js',
  './vendor/supabase.js',
  './src/api/bodacc.js',
  './src/api/claude.js',
  './src/api/places-model.js',
  './src/api/web-read.js',
  './src/audit/scoring.js',
  './src/audit/site-analysis.js',
  './src/core/auth-helpers.js',
  './src/core/config.js',
  './src/core/utils.js',
  './src/report/pdf-helpers.js',
  './src/report/report-model.js',
  './src/report/report-charts.js',
  './src/report/report-pdf.js',
  './src/report/report-view.js',
  './src/ui/report-controller.js',
  './src/ui/settings-controller.js',
  './src/settings/settings-model.js',
  './src/settings/brand.js',
  './src/ui/components/brand.js',
  './src/data/settings.js',
  './src/ui/views/settings.js',
  './src/auth/client.js',
  './src/auth/service.js',
  './src/ui/app.js',
  './src/ui/screens/auth.js',
  './src/ui/views/account.js',
  './src/data/portfolio.js',
  './src/data/places-search.js',
  './src/data/queries.js',
  './src/ui/views/client-detail.js',
  './src/ui/views/clients.js',
  './src/ui/views/prospects.js',
  './src/ui/search-controller.js',
  './src/ui/audit-controller.js',
  './src/ui/views/audit-live.js',
  './src/ui/views/audits.js',
  './src/audit/engine.js',
  './src/api/audit-sources.js',
  './src/data/audits.js',
  './src/api/places.js',
  './src/api/secure-api.js',
  './src/ui/layout-desktop.js',
  './src/ui/layout-mobile.js',
  './src/ui/components/ui.js',
  './src/ui/views/home.js',
  './src/ui/bureau-controller.js',
  './src/ui/views/bureau.js',
  './src/ui/bureau-store.js',
  './src/styles/bureau.css',
  './src/styles/harmonisation.css',
  './src/styles/bureau-home.css',
  './src/data/home-metrics.js',
  './src/data/dashboard-metrics.js',
  './src/ui/views/dashboard.js',
  './src/ui/views/bureau-home.js',
  './auditia-mark.svg',
  './src/styles/tokens.css',
  './src/styles/base.css',
  './src/styles/components.css',
  './src/styles/mobile.css',
  './src/styles/desktop.css',
  './src/styles/auth.css',
  './src/styles/report.css',
  './src/styles/settings.css',
  './src/styles/landing.css',
  './src/ui/screens/landing.js',
  './src/ui/illustrations.js',
  './src/ui/views/hero.js',
  './assets/shop-card.webp',
  './assets/shop-wide.webp',
  './nouvelle-interface.html'
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
