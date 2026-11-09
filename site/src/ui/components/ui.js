// AuditIA — composants visuels de base (HTML généré, classes .ds-*).
// Aucun appel réseau, aucune logique métier : uniquement de l'affichage.
import { escHtml } from '../../core/utils.js';

// Entrées de navigation partagées par les deux coquilles (mobile et ordinateur)
export const NAV = [
  { id: 'home', label: 'Accueil', icon: 'home' },
  { id: 'clients', label: 'Clients', icon: 'users' },
  { id: 'audits', label: 'Audits', icon: 'file' },
  { id: 'prospects', label: 'Prospects', icon: 'target' },
  { id: 'settings', label: 'Réglages', icon: 'settings' },
];

const ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/><path d="M22 21a7 7 0 0 0-5-6.7"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  agents: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M19.5 20a6.5 6.5 0 0 0-2.5-5.1"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
};

export function icon(name) {
  return `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
}

export function btn({ label, variant = 'default', block = false, type = 'button', attrs = '' }) {
  const cls = ['ds-btn', variant === 'primary' ? 'ds-btn--primary' : '', block ? 'ds-btn--block' : ''].filter(Boolean).join(' ');
  return `<button type="${type}" class="${cls}" ${attrs}>${escHtml(label)}</button>`;
}

export function card({ title = '', body = '', actions = '', extraClass = '' }) {
  const head = title || actions
    ? `<div class="ds-card__head">${title ? `<h2 class="ds-card__title">${escHtml(title)}</h2>` : '<span></span>'}${actions}</div>`
    : '';
  return `<section class="ds-card ${extraClass}">${head}${body}</section>`;
}

export function stat({ label, value, hint = '' }) {
  return `<div class="ds-card ds-stat">
    <span class="ds-stat__label">${escHtml(label)}</span>
    <span class="ds-stat__value">${escHtml(value)}</span>
    ${hint ? `<span class="ds-stat__hint">${escHtml(hint)}</span>` : ''}
  </div>`;
}

// Tonalité selon le score : vert ≥ 75, ambre ≥ 50, rouge sinon
export function scoreTone(score) {
  const n = Number(score);
  if (n >= 75) return 'good';
  if (n >= 50) return 'warn';
  return 'danger';
}

export function badge(text, tone = 'neutral') {
  const cls = tone === 'neutral' ? 'ds-badge' : `ds-badge ds-badge--${tone}`;
  return `<span class="${cls}">${escHtml(text)}</span>`;
}

export function scoreBadge(score) {
  return badge(`${score}/100`, scoreTone(score));
}

export function bar({ label, pct }) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  return `<div class="ds-bar">
    <div class="ds-bar__top"><span>${escHtml(label)}</span><span>${p} %</span></div>
    <div class="ds-bar__track" role="presentation"><span class="ds-bar__fill" style="--pct:${p}%"></span></div>
  </div>`;
}

export function sectionTitle(text, action = '') {
  return `<h2 class="ds-section-title"><span>${escHtml(text)}</span>${action}</h2>`;
}

export function listItem({ title, meta = '', right = '' }) {
  return `<li class="ds-row">
    <div class="ds-row__main"><span class="ds-row__title">${escHtml(title)}</span>${meta ? `<span class="ds-row__meta">${escHtml(meta)}</span>` : ''}</div>
    ${right}
  </li>`;
}

export function emptyState({ title, text }) {
  return `<div class="ds-card ds-empty">
    <h2 class="ds-card__title">${escHtml(title)}</h2>
    <p class="ds-empty__text">${escHtml(text)}</p>
  </div>`;
}

/* ---------- Lot 2 : composants pour les listes et les fiches ---------- */

// Pastille avec l'initiale du commerce (remplace l'icône par métier de l'ancienne interface)
export function avatar(name, category = '') {
  // Icône métier plutôt qu'une initiale : le nom et la catégorie déterminent le pictogramme.
  const context = `${category} ${name || ''}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let paths = '<path d="M3 10.5V20h18v-9.5"/><path d="M2 10.5 4 4h16l2 6.5"/><path d="M2 10.5c0 1.3 1 2.3 2.3 2.3s2.3-1 2.3-2.3c0 1.3 1 2.3 2.3 2.3s2.3-1 2.3-2.3c0 1.3 1 2.3 2.3 2.3s2.3-1 2.3-2.3c0 1.3 1 2.3 2.3 2.3s2.3-1 2.3-2.3"/><path d="M9 20v-5h6v5"/>';
  if (/bijou|joaill|bijouter|montre|horlog/.test(context)) {
    paths = '<path d="m6 3-4 6 10 12L22 9l-4-6H6Z"/><path d="M2 9h20M6 3l3 6 3 12 3-12 3-6"/>';
  } else if (/beaut|bien-etre|coiff|hair|estheti|ongler|barbier|salon/.test(context)) {
    paths = '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="m8 8 12 12M8 16 20 4"/>';
  } else if (/habitat|immobilier|maison|logement/.test(context)) {
    paths = '<path d="m3 10 9-7 9 7v10h-6v-6H9v6H3V10Z"/>';
  } else if (/restaurant|cafe|bar |brasserie|boulanger|patisserie|traiteur|aliment/.test(context)) {
    paths = '<path d="M7 3v7M4 3v4a3 3 0 0 0 6 0V3M7 10v11M16 3v18M16 3c3 2 4 5 4 8h-4"/>';
  } else if (/vetement|mode|textile|chauss|boutique/.test(context)) {
    paths = '<path d="m8 4 4 2 4-2 5 4-3 4-2-2v11H8V10l-2 2-3-4 5-4Z"/>';
  } else if (/auto|voiture|garage|mecanique|moto/.test(context)) {
    paths = '<path d="m5 11 1.5-5h11L19 11l2 2v6h-3v-2H6v2H3v-6l2-2Z"/><path d="M6.5 14h.01M17.5 14h.01M6 11h12"/>';
  } else if (/artisan|travaux|renov|plomb|electric|menuis|jardin|outil|construction/.test(context)) {
    paths = '<path d="m14 7 3-3a4 4 0 0 1-5 5L6 15a2.1 2.1 0 1 0 3 3l6-6a4 4 0 0 1 5-5l-3 3"/>';
  }
  return `<span class="ds-avatar ds-avatar--icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">${paths}</svg></span>`;
}

// Ligne de liste entièrement cliquable (bouton) : attrs porte l'action, ex. data-open-client="…"
export function linkRow({ title, meta = '', right = '', attrs = '', lead = '' }) {
  return `<li><button type="button" class="ds-row ds-row--btn" ${attrs}>
    ${lead}<span class="ds-row__main"><span class="ds-row__title">${escHtml(title)}</span>${meta ? `<span class="ds-row__meta">${escHtml(meta)}</span>` : ''}</span>
    ${right}<span class="ds-row__chev" aria-hidden="true">›</span>
  </button></li>`;
}

// Lien d'apparence « bouton » (appeler, site web, interface actuelle…)
export function linkBtn({ label, href, primary = false, external = false }) {
  const cls = primary ? 'ds-btn ds-btn--primary' : 'ds-btn';
  const ext = external ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a class="${cls}" href="${escHtml(href)}"${ext}>${escHtml(label)}</a>`;
}

export function spinnerCard(text) {
  return `<div class="ds-card ds-empty" role="status" aria-live="polite"><span class="ds-spinner" aria-hidden="true"></span><p class="ds-empty__text">${escHtml(text)}</p></div>`;
}

export function errorCard({ title, text, label = 'Réessayer', attrs = 'data-reload' }) {
  return `<div class="ds-card ds-empty ds-empty--error" role="alert">
    <h2 class="ds-card__title">${escHtml(title)}</h2>
    <p class="ds-empty__text">${escHtml(text)}</p>
    ${btn({ label, variant: 'primary', attrs })}
  </div>`;
}

export function searchField({ value = '', placeholder = '', label = 'Rechercher', attrs = '' }) {
  return `<label class="ds-field ds-search"><span class="ds-sr-only">${escHtml(label)}</span>
    <input class="ds-input" type="search" inputmode="search" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${escHtml(placeholder)}" value="${escHtml(value)}" ${attrs}></label>`;
}

export function chips({ items, current = '', attr, allLabel = 'Tous', ariaLabel = '' }) {
  const mk = (value, label) => `<button type="button" class="ds-chip${value === current ? ' is-on' : ''}" ${attr}="${escHtml(value)}" aria-pressed="${value === current}">${escHtml(label)}</button>`;
  return `<div class="ds-chips" role="group" aria-label="${escHtml(ariaLabel)}">${mk('', allLabel)}${items.map(v => mk(v, v)).join('')}</div>`;
}

// Courbe d'évolution (valeurs de 0 à 100, du plus ancien au plus récent)
export function sparkline(values) {
  if (!values || values.length < 2) return '';
  const w = 240, h = 56, step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - 6 - (Math.max(0, Math.min(100, v)) / 100) * (h - 12)]);
  const d = pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return `<svg class="ds-spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="Évolution du score : de ${values[0]} à ${values[values.length - 1]} sur 100"><path d="${d}"/><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4"/></svg>`;
}
