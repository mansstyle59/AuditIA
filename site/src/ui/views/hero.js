// AuditIA — bandeau d'accueil de l'espace connecté : sobre, aux couleurs de la marque, sans illustration fictive.
import { btn } from '../components/ui.js';

export function heroBand({ withReload = false } = {}) {
  const h = new Date().getHours();
  const hello = h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour';
  return `<section class="ds-hero" aria-label="Présentation">
    <div class="ds-hero__text">
      <p class="ds-hero__kicker">Espace de travail</p>
      <h2 class="ds-hero__title">${hello}, prêt à auditer&nbsp;?</h2>
      <p class="ds-hero__lead">Trouvez un commerce, lancez un audit complet et remettez un rapport PDF professionnel.</p>
    </div>
    <div class="ds-hero__actions">${btn({ label: 'Trouver des commerces', variant: 'primary', attrs: 'data-nav="prospects"' })}${btn({ label: 'Voir les audits', attrs: 'data-nav="audits"' })}${withReload ? btn({ label: 'Actualiser', attrs: 'data-reload' }) : ''}</div>
  </section>`;
}
