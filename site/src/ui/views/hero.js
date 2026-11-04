// AuditIA — bandeau d'accueil illustré de l'espace connecté (laptop sur ordinateur, smartphone sur mobile).
// Illustrations : exemples fictifs de démonstration ; les chiffres réels sont dans les cartes juste en dessous.
import { btn } from '../components/ui.js';
import { laptopSvg, phoneSvg } from '../illustrations.js';

export function heroBand() {
  return `<section class="ds-hero" aria-label="Présentation">
    <div class="ds-hero__text">
      <p class="ds-l-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c.6 5.2 3.2 7.8 8.4 8.4-5.2.6-7.8 3.2-8.4 8.4-.6-5.2-3.2-7.8-8.4-8.4C8.8 10.8 11.4 8.2 12 3z" fill="currentColor"/></svg>Votre espace AuditIA</p>
      <h2 class="ds-hero__title">Suivez la visibilité de vos <span class="ds-l-grad">commerces</span></h2>
      <p class="ds-hero__lead">Retrouvez vos clients, lancez un audit complet et remettez un rapport PDF professionnel.</p>
      <div class="ds-hero__actions">${btn({ label: 'Trouver des commerces', variant: 'primary', attrs: 'data-nav="prospects"' })}${btn({ label: 'Voir les audits', attrs: 'data-nav="audits"' })}</div>
    </div>
    <div class="ds-hero__visual" aria-hidden="false">${laptopSvg()}${phoneSvg()}<p class="ds-l-caption">Illustration de démonstration — exemple fictif</p></div>
  </section>`;
}
