// AuditIA — liste des clients : recherche, niveaux, catégories, tri (règles de l'ancienne interface).
import { badge, card, chips, emptyState, linkRow, avatar, searchField, linkBtn } from '../components/ui.js';
import { portfolio, ageLabel, clientCategory } from '../../data/portfolio.js';
import { escHtml } from '../../core/utils.js';

const SORTS = [['urgence', 'Plus urgent d’abord'], ['recent', 'Dernier audit'], ['nom', 'Nom A → Z']];

function tone(sc) { return sc >= 75 ? 'good' : sc >= 50 ? 'warn' : 'danger'; }

function clientMeta(c, stat) {
  const d = c.details || {};
  const rating = d.rating != null ? ' · ★ ' + d.rating : '';
  const head = [c.city, clientCategory(c) || 'Commerce'].filter(Boolean).join(' · ') + rating;
  const n = stat.auditCount;
  const tail = n + ' audit' + (n > 1 ? 's' : '') + (stat.sc == null ? ' · à analyser' : '');
  return head + ' — ' + tail;
}

function clientRight(stat) {
  if (stat.sc == null) return badge('À analyser');
  const delta = stat.delta ? `<span class="ds-delta ds-delta--${stat.delta > 0 ? 'up' : 'down'}">${stat.delta > 0 ? '▲ +' : '▼ '}${stat.delta}</span>` : '';
  const age = ageLabel(stat.date);
  return `<span class="ds-row__side">${badge(stat.sc + '/100', tone(stat.sc))}${delta}${age ? `<span class="ds-row__meta">${escHtml(age)}</span>` : ''}</span>`;
}

// Barre de recherche et de tri : reste en place quand les résultats changent
export function clientsToolbarHtml(ui) {
  const sort = `<label class="ds-field ds-sort"><span class="ds-field__label">Trier</span><select class="ds-input" data-client-sort>${SORTS.map(([v, l]) => `<option value="${v}"${ui.sort === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
  return `<div class="ds-toolbar">${searchField({ value: ui.q, placeholder: 'Commerce, ville, catégorie…', label: 'Rechercher un commerce', attrs: 'data-client-filter' })}${sort}</div>`;
}

// Résultats : synthèse, niveaux, catégories, liste. Remplacés à chaque filtre sans toucher au champ de recherche.
export function clientsResultsHtml(data, ui) {
  const p = portfolio(data.clients, data.audits, ui);
  if (!p.total) return emptyState({ title: 'Aucun client pour le moment', text: "L'ajout de commerces sera disponible dans la nouvelle interface au prochain lot. En attendant, utilisez l'interface actuelle." }) + `<div class="ds-d-actions">${linkBtn({ label: "Ouvrir l'interface actuelle", href: './', primary: true })}</div>`;
  const summary = `<div class="ds-tiers">
    <div class="ds-tier ds-tier--avg"><b>${p.avg == null ? '—' : p.avg}</b><span>score moyen${ui.q || ui.tier ? ' (filtré)' : ''}</span></div>
    ${p.tiers.map(([key, label, n]) => `<button type="button" class="ds-tier ds-tier--${key}${ui.tier === key ? ' is-on' : ''}" data-client-tier="${key}" aria-pressed="${ui.tier === key}"><b>${n}</b><span>${label}</span></button>`).join('')}
  </div>`;
  const cats = p.categories.length ? chips({ items: p.categories, current: ui.q, attr: 'data-client-chip', ariaLabel: 'Filtrer par catégorie' }) : '';
  const list = p.rows.length
    ? `<ul class="ds-list ds-clients">${p.rows.map(({ client: c, stat }) => linkRow({
        title: c.name || 'Commerce', meta: clientMeta(c, stat), right: clientRight(stat), lead: avatar(c.name),
        attrs: `data-open-client="${escHtml(c.id)}"`,
      })).join('')}</ul>`
    : emptyState({ title: 'Aucun résultat', text: ui.q ? `Aucun commerce pour « ${ui.q} ».` : 'Aucun commerce dans ce niveau.' });
  return summary + cats + `<p class="ds-row__meta" aria-live="polite">${p.shown} commerce${p.shown > 1 ? 's' : ''} affiché${p.shown > 1 ? 's' : ''} sur ${p.total}</p>` + list;
}

export function clientsView(data, ui) {
  return `${card({ body: `<div class="ds-d-stack">${clientsToolbarHtml(ui)}</div>` })}
    <div class="ds-d-stack" id="clientsResults">${clientsResultsHtml(data, ui)}</div>`;
}
