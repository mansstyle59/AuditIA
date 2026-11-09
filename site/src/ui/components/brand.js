// AuditIA — LOT 7 : éléments de marque partagés par les deux coquilles (nom, repère, logo).
import { escHtml, } from '../../core/utils.js';
import { brandInitials } from '../../settings/brand.js';

export const brandMarkHtml = b => (b && b.logo
  ? `<img class="ds-brand-logo" src="${escHtml(b.logo)}" alt="">`
  : b && b.custom
    ? escHtml(brandInitials(b))
    : '<img class="ds-brand-logo ds-brand-logo--mark" src="./auditia-mark.svg" alt="" width="40" height="40">');
export const brandNameHtml = b => escHtml((b && b.appName) || 'AuditIA');

// Applique la marque aux éléments déjà affichés (sans recomposer l'écran : pas de perte de saisie) et aux variables CSS.
export function paintBrand(b, root = document) {
  const docEl = document.documentElement;
  if (b && b.custom && b.primary) { docEl.style.setProperty('--ds-brand', b.primary); docEl.style.setProperty('--ds-brand-deep', b.deep); docEl.style.setProperty('--ds-brand-grad', `linear-gradient(135deg, ${b.primary} 0%, ${b.deep} 100%)`); }
  else { docEl.style.removeProperty('--ds-brand'); docEl.style.removeProperty('--ds-brand-deep'); docEl.style.removeProperty('--ds-brand-grad'); }
  root.querySelectorAll('[data-brand-name]').forEach(el => { el.textContent = (b && b.appName) || 'AuditIA'; });
  root.querySelectorAll('[data-brand-mark]').forEach(el => { el.innerHTML = brandMarkHtml(b); });
}
