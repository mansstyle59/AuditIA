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
export function avatar(name) {
  const letter = String(name || '?').trim().charAt(0).toUpperCase() || '?';
  return `<span class="ds-avatar" aria-hidden="true">${escHtml(letter)}</span>`;
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
