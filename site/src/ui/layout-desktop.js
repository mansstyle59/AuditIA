// AuditIA — coquille ordinateur : barre latérale fixe, en-tête de page, contenu en colonnes.
import { NAV, icon } from './components/ui.js';
import { escHtml } from '../core/utils.js';

export function desktopShell({ title, active, body, account = null }) {
  const items = NAV.map(item => {
    const current = item.id === active;
    return `<button type="button" class="ds-d-nav__item${current ? ' is-active' : ''}" data-nav="${item.id}"${current ? ' aria-current="page"' : ''}>
      ${icon(item.icon)}<span>${escHtml(item.label)}</span>
    </button>`;
  }).join('');

  return `<div class="ds-desktop">
    <aside class="ds-d-sidebar">
      <div class="ds-d-brand"><span class="ds-d-brand__mark" aria-hidden="true">AI</span><span>AuditIA</span></div>
      <nav class="ds-d-nav" aria-label="Navigation principale">${items}</nav>
      ${account ? `<div class="ds-d-account"><span class="ds-d-account__mail">${escHtml(account.email)}</span><button type="button" class="ds-btn ds-btn--block" data-logout>Se déconnecter</button></div>` : ''}
    </aside>
    <main class="ds-d-main" id="contenu">
      <div class="ds-d-inner">
        <header class="ds-d-header"><h1 class="ds-d-title">${escHtml(title)}</h1></header>
        ${body}
      </div>
    </main>
  </div>`;
}
