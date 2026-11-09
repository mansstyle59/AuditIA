// AuditIA — coquille mobile : en-tête opaque, contenu, barre de navigation fixe en bas.
import { NAV, icon } from './components/ui.js';
import { escHtml } from '../core/utils.js';
import { brandNameHtml } from './components/brand.js';

export function mobileShell({ title, active, body, brand = null }) {
  const tabs = NAV.map(item => {
    const current = item.id === active;
    return `<button type="button" class="ds-m-tab${current ? ' is-active' : ''}" data-nav="${item.id}"${current ? ' aria-current="page"' : ''}>
      ${icon(item.icon)}<span>${escHtml(item.label)}</span>
    </button>`;
  }).join('');

  return `<div class="ds-mobile">
    <header class="ds-m-header">
      <div class="ds-m-header__top">
        <span class="ds-m-brand" data-brand-name>${brandNameHtml(brand)}</span>
        <button type="button" class="ds-btn ds-theme-toggle" data-theme-toggle aria-label="Passer au thème clair">☀️ Thème clair</button>
      </div>
      <h1 class="ds-m-title">${escHtml(title)}</h1>
    </header>
    <main class="ds-m-main" id="contenu">${body}</main>
    <nav class="ds-m-tabbar" aria-label="Navigation principale">${tabs}</nav>
  </div>`;
}
