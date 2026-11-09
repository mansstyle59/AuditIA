// AuditIA — coquille ordinateur : barre latérale, barre du haut (recherche, notifications, thème, compte), contenu en colonnes.
import { NAV_DESKTOP, icon } from './components/ui.js';
import { escHtml } from '../core/utils.js';
import { brandMarkHtml, brandNameHtml } from './components/brand.js';

export function desktopShell({ title, subtitle = '', active, body, account = null, brand = null, badges = {}, headerExtra = '', search = '' }) {
  const SOON = new Set(['rapports', 'devis', 'formations']);
  const GROUPS = [
    { label: 'Principal', ids: ['home', 'dashboard', 'audits', 'clients', 'prospects'] },
    { label: 'Intelligence', ids: ['bureau', 'messages'] },
    { label: 'Développement', ids: ['rapports', 'devis', 'formations'] },
  ];
  const itemHtml = item => {
    const current = item.id === active;
    const n = Number(badges[item.id]) || 0;
    return `<button type="button" class="ds-d-nav__item${current ? ' is-active' : ''}" data-nav="${item.id}"${current ? ' aria-current="page"' : ''}>
      ${icon(item.icon)}<span>${escHtml(item.label)}</span>${n ? `<em class="ds-d-nav__badge" aria-label="${n} en attente">${n > 99 ? '99+' : n}</em>` : (SOON.has(item.id) ? '<small class="ds-d-nav__soon">Bientôt</small>' : '')}
    </button>`;
  };
  const byId = Object.fromEntries(NAV_DESKTOP.map(i => [i.id, i]));
  const items = GROUPS.map(g => `<div class="ds-d-nav__group" role="group" aria-label="${g.label}"><p class="ds-d-nav__label">${g.label}</p>${g.ids.map(id => itemHtml(byId[id])).join('')}</div>`).join('')
    + `<div class="ds-d-nav__group ds-d-nav__group--end">${itemHtml(byId.settings)}</div>`;
  const current = NAV_DESKTOP.find(i => i.id === active);
  const crumb = current ? current.label : title;
  const ready = Number(badges.messages) || 0;

  return `<div class="ds-desktop">
    <aside class="ds-d-sidebar">
      <div class="ds-d-brand">
        <span class="ds-d-brand__mark" aria-hidden="true" data-brand-mark>${brandMarkHtml(brand)}</span>
        <span class="ds-d-brand__text"><b class="ds-d-brand__name" data-brand-name>${brandNameHtml(brand)}</b><small>Audit &amp; Prospection IA</small></span>
      </div>
      <nav class="ds-d-nav" aria-label="Navigation principale">${items}</nav>
      <section class="ds-d-pro" aria-label="Offre AuditIA Pro">
        <span class="ds-d-pro__crown" aria-hidden="true">${icon('crown')}</span>
        <h2 class="ds-d-pro__title">AUDITIA Pro</h2>
        <ul class="ds-d-pro__list">
          <li>${icon('check')}Audits illimités</li>
          <li>${icon('check')}Agents IA</li>
          <li>${icon('check')}Rapports premium</li>
          <li>${icon('check')}Support prioritaire</li>
        </ul>
        <button type="button" class="ds-d-pro__btn" data-nav="settings">Mettre à niveau</button>
      </section>
    </aside>
    <main class="ds-d-main" id="contenu">
      <div class="ds-d-inner">
        <div class="ds-d-topbar">
          <form class="ds-d-search" role="search" data-global-search>
            <span class="ds-d-search__icon" aria-hidden="true">${icon('search')}</span>
            <input class="ds-d-search__input" type="search" name="q" value="${escHtml(search)}" placeholder="Rechercher un client, un prospect, un audit…" aria-label="Rechercher un client, un prospect ou un audit" autocomplete="off" enterkeyhint="search" data-search-input>
            <kbd class="ds-d-search__kbd" aria-hidden="true">/</kbd>
          </form>
          <button type="button" class="ds-d-iconbtn" data-nav="messages" aria-label="${ready ? ready + ' message(s) prêt(s) à relire' : 'Messages'}">${icon('bell')}${ready ? '<i class="ds-d-iconbtn__dot" aria-hidden="true"></i>' : ''}</button>
          <button type="button" class="ds-btn ds-theme-toggle" data-theme-toggle aria-label="Passer au thème clair">☀️ Thème clair</button>
          <details class="ds-d-user">
            <summary aria-label="Menu du compte"><span class="ds-d-user__avatar"><img src="./assets/bureau/avatar-denis.webp" alt="" width="44" height="44"><i aria-hidden="true"></i></span><span class="ds-d-user__who"><b>Denis</b><small>Administrateur</small></span><span class="ds-d-user__chev" aria-hidden="true">${icon('chevron')}</span></summary>
            <div class="ds-d-user__menu">
              ${account ? `<p class="ds-d-user__mail">${escHtml(account.email)}</p>` : ''}
              <button type="button" class="ds-btn ds-btn--block" data-nav="settings">Réglages</button>
              ${account ? '<button type="button" class="ds-btn ds-btn--block" data-logout>Se déconnecter</button>' : ''}
            </div>
          </details>
        </div>
        <header class="ds-d-header">
          <div class="ds-d-headtext"><p class="ds-d-crumb" aria-hidden="true">AuditIA <span>/</span> ${escHtml(crumb)}</p><h1 class="ds-d-title">${escHtml(title)}</h1>${subtitle ? `<p class="ds-d-sub">${escHtml(subtitle)}</p>` : ''}</div>
          ${headerExtra}
        </header>
        ${body}
      </div>
    </main>
  </div>`;
}
