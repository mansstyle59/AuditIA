// AuditIA — affichage de l'analyse en cours (nouvelle interface, lot 4).
// Tout vient de l'état réel du moteur : une source change de ligne seulement quand elle a répondu, échoué ou dépassé son délai.
// Aucune progression simulée : la barre est la part de sources terminées.
import { escHtml } from '../../core/utils.js';

const STATUS = {
  pending: { text: 'En attente', cls: 'is-pending', icon: '○' },
  active: { text: 'En cours', cls: 'is-active', icon: '↻' },
  done: { text: 'Analysée', cls: 'is-done', icon: '✓' },
  limited: { text: 'Indisponible', cls: 'is-limited', icon: '!' },
  skipped: { text: 'Sans objet', cls: 'is-skipped', icon: '–' },
};

export function counts(snap) {
  const c = { done: 0, waiting: 0, limited: 0, skipped: 0, active: 0, total: 0 };
  snap.sources.forEach(s => {
    if (s.status === 'done') c.done++;
    else if (s.status === 'limited') c.limited++;
    else if (s.status === 'skipped') c.skipped++;
    else { c.waiting++; if (s.status === 'active') c.active++; }
    if (s.status !== 'skipped') c.total++;
  });
  return c;
}

function clock(snap) {
  const end = snap.endedAt || Date.now();
  const sec = Math.max(0, Math.floor((end - snap.startedAt) / 1000));
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

function sourceRow(s) {
  const st = STATUS[s.status] || STATUS.pending;
  const took = s.endedAt && s.startedAt ? ` · ${Math.max(0, Math.round((s.endedAt - s.startedAt) / 100) / 10)} s` : '';
  const limit = s.status === 'active' || s.status === 'pending' ? `<span class="ds-src__meta">Délai maximum : ${s.maxSeconds} s</span>` : '';
  const note = s.note ? `<span class="ds-src__meta">${escHtml(s.note)}${escHtml(took)}</span>` : (took ? `<span class="ds-src__meta">${escHtml(took.slice(3))}</span>` : '');
  return `<li class="ds-src ${st.cls}"><span class="ds-src__icon" aria-hidden="true">${st.icon}</span>
    <span class="ds-src__main"><span class="ds-src__name">${escHtml(s.label)}</span>${note}${limit}</span>
    <span class="ds-src__state">${st.text}</span></li>`;
}

/* Contenu de la zone #auditLive : progression globale, compteurs, une ligne par source, valeurs réellement reçues. */
export function liveHtml(snap) {
  if (!snap) return '';
  const c = counts(snap);
  const running = snap.status === 'running';
  const pct = Math.max(0, Math.min(100, Math.round(snap.pct)));
  const title = running ? 'Analyse en cours' : snap.status === 'done' ? 'Analyse terminée' : 'Analyse interrompue';
  const tone = running ? 'ds-live--run' : snap.status === 'done' ? 'ds-live--done' : 'ds-live--error';
  const facts = snap.facts.length
    ? `<div class="ds-facts" aria-label="Valeurs reçues">${snap.facts.map(f => `<div class="ds-fact"><span>${escHtml(f.label)}</span><b>${escHtml(f.value)}</b><small>${escHtml(f.detail)}</small></div>`).join('')}</div>`
    : (running ? '<p class="ds-row__meta">Les valeurs apparaissent ici dès qu’une source répond.</p>' : '');
  const err = snap.error ? `<div class="ds-msg ds-msg--error" role="alert">${escHtml(snap.error)}</div>` : '';
  return `<div class="ds-live ${tone}" ${running ? 'aria-live="polite"' : ''}>
    <div class="ds-live__top"><div><span class="ds-live__kicker">${escHtml(title)}</span><h2 class="ds-live__name">${escHtml(snap.clientName)}</h2></div><span class="ds-live__clock" title="Temps écoulé">${clock(snap)}</span></div>
    <div class="ds-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progression de l’audit"><span class="ds-prog__fill" style="--pct:${pct}%"></span></div>
    <div class="ds-prog__row"><b>${pct} %</b><span>${escHtml(snap.phase)}</span></div>
    <div class="ds-live__counts" role="group" aria-label="État des sources">
      <span class="ds-count ds-count--done"><b>${c.done}</b> analysée${c.done > 1 ? 's' : ''}</span>
      <span class="ds-count ds-count--wait"><b>${c.waiting}</b> en attente</span>
      <span class="ds-count ds-count--lim"><b>${c.limited}</b> indisponible${c.limited > 1 ? 's' : ''}</span>
    </div>
    ${err}
    ${snap.hasWeb ? '' : '<p class="ds-row__meta">Ce commerce n’a pas de site web : 5 sources liées au site sont sans objet et ne comptent pas dans la progression.</p>'}
    <ul class="ds-srcs" aria-label="Sources">${snap.sources.map(sourceRow).join('')}</ul>
    ${facts}
    ${running ? '<p class="ds-row__meta">Vous pouvez quitter cet écran : l’analyse continue et le dossier se met à jour à la fin.</p>' : ''}
  </div>`;
}

// Bandeau compact « audit en cours », affiché sur les autres écrans tant qu'une analyse tourne.
export function bannerHtml(snap) {
  if (!snap || snap.status !== 'running') return '';
  const pct = Math.max(0, Math.min(100, Math.round(snap.pct)));
  return `<div class="ds-banner" role="status"><span class="ds-spinner" aria-hidden="true"></span>
    <span class="ds-banner__txt"><b>Audit en cours · ${escHtml(snap.clientName)}</b><small>${pct} % · ${counts(snap).done} / ${counts(snap).total} sources</small></span>
    <button type="button" class="ds-btn ds-btn--primary" data-open-audit="${escHtml(snap.auditId)}">Suivre</button></div>`;
}

// exceptId : sur le dossier de l'audit en cours, le bandeau reste vide (la progression y est déjà affichée)
export const bannerSlot = (snap, exceptId = '') => `<div data-audit-banner data-except="${escHtml(exceptId)}">${bannerHtml(snap)}</div>`;
