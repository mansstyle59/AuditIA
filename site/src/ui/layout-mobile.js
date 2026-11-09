// AuditIA — coquille mobile : en-tête opaque (logo, thème), titre de page, contenu, barre de navigation fixe en bas.
import { NAV_MOBILE, icon } from './components/ui.js';
import { escHtml } from '../core/utils.js';
import { brandMarkHtml, brandNameHtml } from './components/brand.js';

export function mobileShell({ title, subtitle = '', active, body, brand = null }) {
  const tabs = NAV_MOBILE.map(item => {
    const current = item.id === active;
    return `<button type="button" class="ds-m-tab${current ? ' is-active' : ''}" data-nav="${item.id}"${current ? ' aria-current="page"' : ''}>
      ${icon(item.icon)}<span>${escHtml(item.label)}</span>
    </button>`;
  }).join('');

  return `<div class="ds-mobile">
    <header class="ds-m-header">
      <div class="ds-m-header__top">
        <span class="ds-m-brand">
          <span class="ds-m-brand__mark" data-brand-mark aria-hidden="true">${brandMarkHtml(brand)}</span>
          <span class="ds-m-brand__text"><b data-brand-name>${brandNameHtml(brand)}</b><small>Audit &amp; Prospection IA</small></span>
        </span>
        <button type="button" class="ds-btn ds-theme-toggle" data-theme-toggle aria-label="Passer au thème clair">☀️ Thème clair</button>
      </div>
    </header>
    <main class="ds-m-main" id="contenu">
      <div class="ds-m-pagehead">
        <h1 class="ds-m-title">${escHtml(title)}</h1>
        ${subtitle ? `<p class="ds-m-sub">${escHtml(subtitle)}</p>` : ''}
      </div>
      ${body}
    </main>
    <nav class="ds-m-tabbar" aria-label="Navigation principale">${tabs}</nav>
  </div>`;
}
