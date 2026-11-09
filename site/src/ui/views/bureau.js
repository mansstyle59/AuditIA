// AuditIA — Bureau : affichage seulement (HTML). Les règles sont dans bureau-store.js.
import { escHtml } from '../../core/utils.js';
import {
  BU_STATUSES, BU_CATS, BU_ALL, BU_STATUS_LABEL, LOOKS,
  statusOf, progress, counts, taskLabel, messageFor, statusLine,
} from '../bureau-store.js';

// Places des agents dans la pièce (en %), coin café pour la pause
export const SEATS = [
  { x: 18, y: 50 }, { x: 34, y: 50 }, { x: 50, y: 50 }, { x: 66, y: 50 }, { x: 82, y: 50 },
  { x: 26, y: 72 }, { x: 42, y: 72 }, { x: 58, y: 72 }, { x: 74, y: 72 },
];
export const COFFEE = { x: 90, y: 34 };

// Coiffure : chaque style garde la même tête, seule la chevelure change
function hairSvg(look, c) {
  const cap = `<path d="M16.5 25 C15 9 45 8 43.5 25 C41 18 36 15.5 30 15.5 C24 15.5 19 18 16.5 25 Z" fill="${c}"/>`;
  if (look === 'bun') return `${cap}<circle cx="30" cy="7.5" r="4.6" fill="${c}"/>`;
  if (look === 'side') return `<path d="M16.5 26 C15 9 45 8 43.5 22 C37 15 27 15 22 22 C20.5 24 18.5 25.5 16.5 26 Z" fill="${c}"/>`;
  if (look === 'long') return `${cap}
    <path d="M16.5 25 C13.5 36 13 46 17 51 L19.8 48 C18 41 18.6 33 19.6 26 Z" fill="${c}"/>
    <path d="M43.5 25 C46.5 36 47 46 43 51 L40.2 48 C42 41 41.4 33 40.4 26 Z" fill="${c}"/>`;
  return cap;
}

// Un personnage de bureau : tête, coiffure, col, veste, badge et bras ; casque pour un SDR, lunettes pour un chercheur
function figure(a) {
  const look = LOOKS.includes(a.look) ? a.look : LOOKS[0];
  const skin = escHtml(a.skin || '#f1c27d');
  const hair = escHtml(a.hair || '#3b2a1f');
  const color = escHtml(a.color || '#8b5cf6');
  const isSdr = a.role !== 'Chercheur IA';
  return `
  <svg class="bu-figure" viewBox="0 0 60 80" aria-hidden="true" focusable="false">
    <ellipse cx="30" cy="78.5" rx="17" ry="2.4" fill="rgba(0,0,0,.28)"/>
    <path d="M13 80 L13 63 Q13 45 30 44.5 Q47 45 47 63 L47 80 Z" fill="${color}"/>
    <path d="M24.5 45 L30 55 L35.5 45 Z" fill="#f8f5ff"/>
    <path d="M24.5 45 L30 55 L26.6 66 L18.5 53 Z" fill="rgba(0,0,0,.16)"/>
    <path d="M35.5 45 L30 55 L33.4 66 L41.5 53 Z" fill="rgba(0,0,0,.16)"/>
    <rect x="36" y="59" width="6" height="4" rx="1" fill="#fff" opacity=".92"/>
    <rect x="26" y="35.5" width="8" height="10" rx="2" fill="${skin}"/>
    <ellipse cx="17.6" cy="27" rx="2.4" ry="3.1" fill="${skin}"/>
    <ellipse cx="42.4" cy="27" rx="2.4" ry="3.1" fill="${skin}"/>
    <ellipse cx="30" cy="26" rx="12.5" ry="13" fill="${skin}"/>
    ${hairSvg(look, hair)}
    <path d="M22.5 22.6 Q25 21.2 27.6 22.4 M32.4 22.4 Q35 21.2 37.5 22.6" fill="none" stroke="${hair}" stroke-width="1.1" stroke-linecap="round"/>
    <circle cx="25" cy="27" r="1.7" fill="#1b1440"/>
    <circle cx="35" cy="27" r="1.7" fill="#1b1440"/>
    <path d="M26 33 Q30 36 34 33" fill="none" stroke="#7a3b2e" stroke-width="1.4" stroke-linecap="round"/>
    ${isSdr
      ? `<path d="M17.2 27 Q17.2 11.5 30 11.5 Q42.8 11.5 42.8 27" fill="none" stroke="#1b1440" stroke-width="1.7"/>
         <rect x="15" y="24" width="4.4" height="7" rx="2" fill="#1b1440"/>
         <rect x="40.6" y="24" width="4.4" height="7" rx="2" fill="#1b1440"/>
         <path d="M41.2 31 Q41.2 37.5 35 37.5" fill="none" stroke="#1b1440" stroke-width="1.2" stroke-linecap="round"/>
         <rect x="32.8" y="36.4" width="3.6" height="2.6" rx="1.2" fill="#1b1440"/>`
      : `<circle cx="25" cy="27" r="3.7" fill="rgba(255,255,255,.08)" stroke="#1b1440" stroke-width="1"/>
         <circle cx="35" cy="27" r="3.7" fill="rgba(255,255,255,.08)" stroke="#1b1440" stroke-width="1"/>
         <path d="M28.7 27 H31.3" stroke="#1b1440" stroke-width="1"/>`}
    <rect class="bu-arm bu-arm-l" x="10" y="52" width="9" height="20" rx="4.5" fill="${color}"/>
    <rect class="bu-arm bu-arm-r" x="41" y="52" width="9" height="20" rx="4.5" fill="${color}"/>
    <circle cx="14.5" cy="73.5" r="3.2" fill="${skin}"/>
    <circle cx="45.5" cy="73.5" r="3.2" fill="${skin}"/>
    <g class="bu-cup">
      <rect x="49" y="66" width="8" height="9" rx="2" fill="#fff" stroke="#c9bfe8"/>
      <path d="M57 68 q2.5 2 0 4.5" fill="none" stroke="#c9bfe8" stroke-width="1.4"/>
    </g>
  </svg>`;
}

const sceneKey = agents => agents.map(a => a.id).join(',');

function sceneInner(store) {
  return `
    <div class="bu-wall" aria-hidden="true"></div>
    <div class="bu-board" aria-hidden="true">
      <span class="bu-board__label">Prospects traités par agent</span>
      <strong class="bu-board__total" data-bu-total></strong>
      <div class="bu-bars">${store.agents.map(a => `<i data-bu-bar="${escHtml(a.id)}"></i>`).join('')}</div>
    </div>
    <div class="bu-floor" aria-hidden="true"></div>
    <div class="bu-table" aria-hidden="true"></div>
    <div class="bu-coffee" aria-hidden="true"></div>
    <span class="bu-chip" data-bu-chip></span>
    ${store.agents.map((a, i) => `<span class="bu-desk" style="left:${SEATS[i].x}%;top:${SEATS[i].y + 8}%" aria-hidden="true"></span>`).join('')}
    ${store.agents.map(a => `
      <button type="button" class="bu-pin" data-bu-agent="${escHtml(a.id)}">
        <span class="bu-tag"><b>${escHtml(a.name)}</b><span class="bu-tag__amt" data-bu-amt></span></span>
        ${figure(a)}
        <span class="bu-st" data-bu-st></span>
      </button>`).join('')}`;
}

// Met la scène à jour sans la recréer (les animations et transitions restent fluides)
export function updateScene(room, store, clients, sel) {
  if (!room) return;
  if (room.dataset.key !== sceneKey(store.agents)) {
    room.innerHTML = sceneInner(store);
    room.dataset.key = sceneKey(store.agents);
  }
  const c = counts(store, clients);
  store.agents.forEach((a, i) => {
    const pin = room.querySelector(`[data-bu-agent="${CSS.escape(a.id)}"]`);
    if (!pin) return;
    const pos = a.status === 'break' ? COFFEE : SEATS[i];
    const pr = progress(store, a, clients);
    pin.className = 'bu-pin ' + a.status;
    pin.style.left = pos.x + '%';
    pin.style.top = pos.y + '%';
    pin.setAttribute('aria-pressed', String(sel === a.id));
    pin.setAttribute('aria-label', `${a.name}, ${BU_STATUS_LABEL[a.status]}, ${pr.done} sur ${pr.total} prospects traités`);
    pin.querySelector('[data-bu-amt]').textContent = `${pr.done}/${pr.total}`;
    pin.querySelector('[data-bu-st]').className = 'bu-st ' + a.status;
    const bar = room.querySelector(`[data-bu-bar="${CSS.escape(a.id)}"]`);
    if (bar) { bar.style.setProperty('--h', Math.max(6, pr.pct) + '%'); bar.title = `${a.name} : ${pr.pct} %`; }
  });
  const total = room.querySelector('[data-bu-total]');
  if (total) total.textContent = `${c.contacted} contactés · ${c.hot} intéressés ou clients`;
  const chip = room.querySelector('[data-bu-chip]');
  if (chip) chip.textContent = `${c.working} agent(s) au poste`;
}

export function shellHtml(store) {
  return `
    <div class="bu" id="bu-root">
      <div class="bu-chips" id="bu-chips"></div>
      <div class="bu-grid">
        <section class="ds-card bu-stage" aria-label="Bureau des agents">
          <div class="bu-room" id="bu-room" role="group" aria-label="Agents au bureau"></div>
        </section>
        <aside class="bu-cardwrap" id="bu-card" aria-live="polite"></aside>
      </div>
      <div class="bu-cols">
        <section class="ds-card bu-panel" aria-labelledby="bu-h-team">
          <h2 class="ds-card__title" id="bu-h-team">Équipe et tâches</h2>
          <div class="bu-list" id="bu-agents"></div>
        </section>
        <section class="ds-card bu-panel" aria-labelledby="bu-h-create">
          <h2 class="ds-card__title" id="bu-h-create">Créer un agent</h2>
          <div class="bu-form">
            <label class="ds-field"><span class="ds-field__label">Prénom</span>
              <input id="bu-name" class="ds-input" type="text" maxlength="24" autocomplete="off" placeholder="Ex. Inès"></label>
            <label class="ds-field"><span class="ds-field__label">Métier suivi</span>
              <input id="bu-cat" class="ds-input" type="text" list="bu-cats" value="${BU_ALL}" autocomplete="off"></label>
            <label class="ds-field"><span class="ds-field__label">Rôle</span>
              <select id="bu-role" class="ds-input"><option>SDR IA</option><option>Chercheur IA</option></select></label>
            <button class="ds-btn ds-btn--primary ds-btn--block" type="button" data-bu-act="create">Créer l’agent</button>
          </div>
          <hr class="bu-hr">
          <h2 class="ds-card__title">Donner une tâche</h2>
          ${store.agents.length ? `
          <div class="bu-form">
            <label class="ds-field"><span class="ds-field__label">Agent</span>
              <select id="bu-agent" class="ds-input">${store.agents.map(a => `<option value="${escHtml(a.id)}">${escHtml(a.name)}</option>`).join('')}</select></label>
            <label class="ds-field"><span class="ds-field__label">Type de tâche</span>
              <select id="bu-type" class="ds-input">
                <option value="recherche">Rechercher des commerces</option>
                <option value="message">Préparer les messages d’accroche</option>
              </select></label>
            <label class="ds-field"><span class="ds-field__label">Métier</span>
              <input id="bu-tcat" class="ds-input" type="text" list="bu-cats" value="${BU_CATS[0]}" autocomplete="off"></label>
            <label class="ds-field"><span class="ds-field__label">Zone de recherche (code postal ou département)</span>
              <input id="bu-zone" class="ds-input" type="text" placeholder="Code postal ou département, ex. 11700 ou 11" autocomplete="off"></label>
            <button class="ds-btn ds-btn--primary ds-btn--block" type="button" data-bu-act="addtask">Ajouter la tâche</button>
          </div>` : '<p class="bu-why">Créez un agent pour lui donner une tâche.</p>'}
          <datalist id="bu-cats">${[...BU_CATS, BU_ALL].map(c => `<option value="${escHtml(c)}"></option>`).join('')}</datalist>
        </section>
      </div>
      <section class="ds-card bu-panel" aria-labelledby="bu-h-ready">
        <h2 class="ds-card__title" id="bu-h-ready">Messages prêts à relire</h2>
        <div class="bu-list" id="bu-ready"></div>
      </section>
      <section class="ds-card bu-panel" aria-labelledby="bu-h-found">
        <h2 class="ds-card__title" id="bu-h-found">Entreprises trouvées à valider</h2>
        <p class="bu-why">Trouvées dans le registre officiel (SIRENE). Rien n’est ajouté à vos prospects sans votre clic.</p>
        <div class="bu-list" id="bu-found"></div>
      </section>
      <section class="ds-card bu-panel" aria-labelledby="bu-h-pipe">
        <h2 class="ds-card__title" id="bu-h-pipe">Pipeline</h2>
        <div class="bu-pipe" id="bu-pipe"></div>
      </section>
      <p class="bu-msg" id="bu-msg" role="status" aria-live="polite"></p>
    </div>`;
}

// Bulle d'accès au bureau, affichée sur les autres pages
export function bureauFabHtml() {
  return `<button type="button" class="bu-fab" data-nav="bureau" aria-label="Ouvrir le bureau des agents" title="Bureau des agents">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="8" cy="7" r="2.6"/>
      <path d="M3.5 15.5v-1.2a3.2 3.2 0 0 1 3.2-3.2h.6a3.2 3.2 0 0 1 3.2 3.2v1.2"/>
      <path d="M2.5 15.5h19M5 15.5V21M19 15.5V21"/>
      <rect x="14" y="5" width="7" height="6" rx="1"/>
      <path d="M17.5 11v4.5"/>
    </svg>
  </button>`;
}

export function chipsHtml(store, clients) {
  const c = counts(store, clients);
  return [
    ['Agents', c.agents],
    ['Au poste', c.working],
    ['À contacter', c.todo],
    ['Messages prêts', c.ready],
  ].map(([l, v]) => `<div class="ds-card bu-chip-stat"><span>${escHtml(l)}</span><strong>${v}</strong></div>`).join('');
}

function taskBadge(t) {
  if (t.status === 'done') {
    if (t.failed) return `<span class="ds-badge ds-badge--warn">Non terminée</span>`;
    if (t.type === 'message') return `<span class="ds-badge ds-badge--good">Terminée · ${t.processed || 0} message(s) préparé(s)</span>`;
    return `<span class="ds-badge ds-badge--good">Terminée · ${t.processed || 0} entreprise(s) trouvée(s)</span>`;
  }
  if (t.type === 'message' && t.processed) return `<span class="ds-badge">En cours · ${t.processed} préparé(s)</span>`;
  return t.type === 'recherche'
    ? '<span class="ds-badge ds-badge--warn">Recherche en attente</span>'
    : '<span class="ds-badge">À faire</span>';
}

// Entreprises trouvées par les recherches, à valider une par une
export function foundHtml(store) {
  const items = (store.found || []).filter(f => f.status === 'new');
  if (!items.length) return '<p class="bu-why">Aucune entreprise à valider pour le moment.</p>';
  return items.map(f => `<div class="bu-task">
    <span class="bu-task__label"><strong>${escHtml(f.name)}</strong>
      <span>${escHtml([f.address, f.category].filter(Boolean).join(' · '))}</span></span>
    <div class="bu-task__actions">
      <button class="ds-btn ds-btn--primary ds-btn--sm" type="button" data-bu-act="addfound" data-bu-id="${escHtml(f.siret)}">Ajouter aux prospects</button>
      <button class="ds-btn ds-btn--sm" type="button" data-bu-act="dropfound" data-bu-id="${escHtml(f.siret)}">Écarter</button>
    </div>
  </div>`).join('');
}

function taskRowHtml(a, t) {
  const actions = t.status !== 'done'
    ? `<button class="ds-btn ds-btn--sm" type="button" data-bu-act="taskdone" data-bu-id="${escHtml(a.id)}" data-bu-task="${escHtml(t.id)}">Marquer terminée</button>`
    : '';
  return `<div class="bu-task">
    <span class="bu-task__label">${escHtml(taskLabel(t))}</span>
    ${taskBadge(t)}
    ${t.reason ? `<span class="bu-task__reason">${escHtml(t.reason)}</span>` : ''}
    <div class="bu-task__actions">${actions}
      <button class="ds-btn ds-btn--sm" type="button" data-bu-act="deltask" data-bu-id="${escHtml(a.id)}" data-bu-task="${escHtml(t.id)}">Retirer</button>
    </div>
  </div>`;
}

function controlsHtml(a) {
  const main = a.status === 'working'
    ? `<button class="ds-btn ds-btn--sm" type="button" data-bu-act="stop" data-bu-id="${escHtml(a.id)}">Arrêter</button>`
    : `<button class="ds-btn ds-btn--primary ds-btn--sm" type="button" data-bu-act="work" data-bu-id="${escHtml(a.id)}">Faire travailler</button>`;
  const cafe = a.status === 'break'
    ? `<button class="ds-btn ds-btn--sm" type="button" data-bu-act="back" data-bu-id="${escHtml(a.id)}">Retour au poste</button>`
    : `<button class="ds-btn ds-btn--sm" type="button" data-bu-act="cafe" data-bu-id="${escHtml(a.id)}">Pause café</button>`;
  return main + cafe;
}

export function cardHtml(store, clients, sel) {
  const a = store.agents.find(x => x.id === sel) || store.agents[0];
  if (!a) return '<div class="ds-card bu-card"><p class="bu-why">Aucun agent au bureau. Créez-en un pour commencer.</p></div>';
  const pr = progress(store, a, clients);
  return `<div class="ds-card bu-card">
    <div class="bu-card__head">
      <span class="bu-avatar" style="background:${escHtml(a.color)}" aria-hidden="true">${escHtml(a.name[0] || '?')}</span>
      <div class="bu-card__id"><strong>${escHtml(a.name)}</strong><span class="bu-why">${escHtml(a.role)} · ${escHtml(a.cat)}</span></div>
      <span class="bu-status ${a.status}">${escHtml(BU_STATUS_LABEL[a.status])}</span>
    </div>
    <p class="bu-line" data-state="${escHtml(a.status)}">${escHtml(statusLine(store, a))}</p>
    <p class="bu-why">${pr.done} sur ${pr.total} prospects de son métier traités (${pr.pct} %)</p>
    <div class="bu-progress" role="img" aria-label="${pr.pct} % traités"><i style="width:${pr.pct}%"></i></div>
    <div class="bu-card__actions">${controlsHtml(a)}</div>
    <div class="bu-tasks">
      <p class="bu-label">Tâches</p>
      ${a.tasks.length ? a.tasks.map(t => taskRowHtml(a, t)).join('') : '<p class="bu-why">Aucune tâche pour le moment.</p>'}
    </div>
  </div>`;
}

export function agentsHtml(store, clients) {
  if (!store.agents.length) return '<p class="bu-why">Aucun agent. Créez-en un dans le formulaire ci-dessous.</p>';
  return store.agents.map(a => {
    const pr = progress(store, a, clients);
    return `<article class="bu-row">
      <span class="bu-avatar" style="background:${escHtml(a.color)}" aria-hidden="true">${escHtml(a.name[0] || '?')}</span>
      <div class="bu-row__info">
        <strong>${escHtml(a.name)}</strong>
        <span class="bu-why">${escHtml(a.role)} · ${escHtml(a.cat)} · ${escHtml(BU_STATUS_LABEL[a.status])} · ${pr.done} sur ${pr.total} traités</span>
        <p class="bu-line" data-state="${escHtml(a.status)}">${escHtml(statusLine(store, a))}</p>
        <div class="bu-progress" role="img" aria-label="${pr.pct} % traités"><i style="width:${pr.pct}%"></i></div>
        ${a.tasks.map(t => taskRowHtml(a, t)).join('') || '<p class="bu-why">Aucune tâche.</p>'}
        <div class="bu-card__actions">${controlsHtml(a)}</div>
      </div>
    </article>`;
  }).join('');
}

export function readyHtml(store, clients) {
  const ready = clients.filter(c => statusOf(store, c) === 'Message prêt');
  if (!ready.length) return '<p class="bu-why">Aucun message prêt. Faites travailler un agent qui a une tâche « Messages ».</p>';
  return ready.slice(0, 30).map(c => {
    const e = store.statuses[String(c.id)] || {};
    return `<div class="bu-task">
      <div class="bu-task__label"><strong>${escHtml(c.name)}</strong><span class="bu-why">${escHtml(c.city || '')}${e.by ? ' · préparé par ' + escHtml(e.by) : ''}</span></div>
      <p class="bu-msgtext">${escHtml(messageFor(c))}</p>
      <div class="bu-task__actions"><button class="ds-btn ds-btn--sm" type="button" data-bu-act="copy" data-bu-id="${escHtml(c.id)}">Copier le message</button></div>
    </div>`;
  }).join('') + (ready.length > 30 ? `<p class="bu-why">+ ${ready.length - 30} autres messages prêts</p>` : '');
}

export function pipeHtml(store, clients) {
  return BU_STATUSES.map(s => {
    const items = clients.filter(c => statusOf(store, c) === s);
    const names = items.slice(0, 6).map(c => `<li>${escHtml(c.name)}</li>`).join('');
    return `<div class="bu-col">
      <h3>${escHtml(s)} <span>${items.length}</span></h3>
      ${items.length ? `<ul class="bu-names">${names}</ul>${items.length > 6 ? `<p class="bu-why">+ ${items.length - 6}</p>` : ''}` : '<p class="bu-why">Aucun</p>'}
    </div>`;
  }).join('');
}
