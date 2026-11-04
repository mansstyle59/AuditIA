// AuditIA — point d'entrée de la NOUVELLE interface (page de démonstration).
// Ne remplace pas index.html : cette page vit à côté, avec des données fictives.
import { NAV, emptyState } from './components/ui.js';
import { mobileShell } from './layout-mobile.js';
import { desktopShell } from './layout-desktop.js';
import { homeMobile, homeDesktop } from './views/home.js';
import { DEMO } from './demo-data.js';

const root = document.getElementById('app');
const wide = window.matchMedia('(min-width: 900px)');
let active = 'home';

const TITLES = Object.fromEntries(NAV.map(n => [n.id, n.label]));

function placeholder() {
  return emptyState({
    title: 'Section non branchée',
    text: "Cette section sera branchée à l'étape suivante. Pour l'instant, utilisez l'interface actuelle.",
  });
}

function bodyFor(isWide) {
  if (active !== 'home') return placeholder();
  return isWide ? homeDesktop(DEMO) : homeMobile(DEMO);
}

function render() {
  const isWide = wide.matches;
  const html = isWide
    ? desktopShell({ title: TITLES[active], active, body: bodyFor(true) })
    : mobileShell({ title: TITLES[active], active, body: bodyFor(false) });
  root.innerHTML = html;
  document.documentElement.dataset.layout = isWide ? 'desktop' : 'mobile';
}

// Navigation : délégation d'événements, une seule écoute sur la racine
root.addEventListener('click', event => {
  const target = event.target.closest('[data-nav]');
  if (!target) return;
  active = target.dataset.nav;
  render();
  window.scrollTo(0, 0);
});

// Changement de largeur (rotation, fenêtre redimensionnée) : on recompose la coquille
wide.addEventListener('change', render);

render();
