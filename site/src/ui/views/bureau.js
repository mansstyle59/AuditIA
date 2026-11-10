// AuditIA — Bureau : affichage seulement (HTML). Les règles sont dans bureau-store.js.
import { escHtml } from '../../core/utils.js';
import { icon } from '../components/ui.js';
import {
  BU_STATUSES, BU_CATS, BU_ALL, BU_STATUS_LABEL, LOOKS,
  statusOf, progress, counts, taskLabel, messageFor, statusLine,
  teamOf, TONES, DEFAULT_TONE, followUpsDue, agentStats, FOLLOWUP_DAYS, LEVELS, levelOf,
} from '../bureau-store.js';

// Places des agents dans la pièce (en %) selon la mise en page ; la machine à café sert à la pause
const SEAT_SETS = {
  desktop: [
    { x: 12, y: 56 }, { x: 26, y: 56 }, { x: 40, y: 56 }, { x: 54, y: 56 }, { x: 68, y: 56 },
    { x: 19, y: 80 }, { x: 33, y: 80 }, { x: 47, y: 80 }, { x: 61, y: 80 },
  ],
  mobile: [
    { x: 15, y: 50 }, { x: 40, y: 50 }, { x: 65, y: 50 },
    { x: 15, y: 69 }, { x: 40, y: 69 }, { x: 65, y: 69 },
    { x: 15, y: 88 }, { x: 40, y: 88 }, { x: 65, y: 88 },
  ],
};
const COFFEE_SPOT = { desktop: { x: 88, y: 62 }, mobile: { x: 88, y: 52 } };
const layoutOf = () => (document.documentElement.dataset.layout === 'mobile' ? 'mobile' : 'desktop');
export const SEATS = SEAT_SETS.desktop;
export const COFFEE = COFFEE_SPOT.desktop;

// Décor : un vrai bureau (baie vitrée sur la ville, étagère, plantes, tapis) et son coin café avec machine
function plant(x, y, k = 1) {
  return `<g transform="translate(${x} ${y}) scale(${k})">
    <path d="M-4 0 L4 0 L3 -7 L-3 -7 Z" fill="#7b5dd6"/><rect x="-4.4" y="-8.2" width="8.8" height="1.8" rx=".8" fill="#9b82ee"/>
    <path d="M0 -8 C-6 -14 -9 -20 -7 -27 C-2 -22 -1 -15 0 -8Z" fill="#1fa86a"/>
    <path d="M0 -8 C6 -15 9 -21 7 -28 C2 -22 1 -15 0 -8Z" fill="#26c27c"/>
    <path d="M0 -8 C-1 -16 0 -23 1 -31 C4 -23 3 -15 0 -8Z" fill="#17935c"/>
  </g>`;
}
function sceneryHtml(layout) {
  const d = layout === 'desktop';
  const W = 100, H = d ? 62.5 : 110;           // espace de dessin en unités ; ratio identique à la pièce
  const wallH = d ? 25 : 33;
  const cx = d ? 76 : 70;                        // début du comptoir café
  const cw = 100 - cx - 1.5;
  const mx = cx + 2;                    // machine centrée sur le comptoir
  const winX = d ? 4 : 4, winW = d ? 21 : 22, winY = 4, winH = wallH - 9;
  const city = Array.from({ length: 9 }, (_, i) => {
    const bw = winW / 9, bh = 3 + ((i * 7) % 5) * 1.6;
    const bx = winX + 1 + i * (winW - 2) / 9;
    const lit = [0, 1, 2].map(k => `<rect x="${(bx + .6 + k * .9).toFixed(2)}" y="${(winY + winH - bh + 1 + (k % 2)).toFixed(2)}" width=".5" height=".6" fill="#ffd98a" opacity="${k === 1 ? .9 : .55}"/>`).join('');
    return `<rect x="${bx.toFixed(2)}" y="${(winY + winH - 1.4 - bh).toFixed(2)}" width="${(bw * .95).toFixed(2)}" height="${(bh + .4).toFixed(2)}" fill="#1c1250"/>${lit}`;
  }).join('');
  return `<svg class="bu-set" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="bs-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2181"/><stop offset="1" stop-color="#22134f"/></linearGradient>
      <linearGradient id="bs-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2680"/><stop offset="1" stop-color="#1b0d40"/></linearGradient>
      <linearGradient id="bs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241a73"/><stop offset=".7" stop-color="#6a3bb8"/><stop offset="1" stop-color="#d98fd0"/></linearGradient>
      <linearGradient id="bs-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8d86a8"/><stop offset=".45" stop-color="#e9e5f6"/><stop offset="1" stop-color="#7d7597"/></linearGradient>
      <linearGradient id="bs-body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a3a8f"/><stop offset="1" stop-color="#1c1347"/></linearGradient>
      <linearGradient id="bs-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5bd0"/><stop offset="1" stop-color="#43297f"/></linearGradient>
    </defs>
    <rect width="${W}" height="${wallH}" fill="url(#bs-wall)"/>
    <rect y="${wallH - 1.6}" width="${W}" height="1.6" fill="#170c3c"/>
    <path d="M0 ${wallH} H${W} V${H} H0Z" fill="url(#bs-floor)"/>
    ${Array.from({ length: 9 }, (_, i) => `<path d="M${(i * 12.5 - 6).toFixed(1)} ${H} L${(i * 12.5 + 12.5 * 0).toFixed(1)} ${wallH}" stroke="rgba(196,181,253,.10)" stroke-width=".25"/>`).join('')}
    ${Array.from({ length: 4 }, (_, i) => `<path d="M0 ${(wallH + (H - wallH) * (i + 1) / 5).toFixed(1)} H${W}" stroke="rgba(196,181,253,.09)" stroke-width=".25"/>`).join('')}
    <rect x="${winX}" y="${winY}" width="${winW}" height="${winH}" rx=".8" fill="url(#bs-sky)" stroke="#8a74d8" stroke-width=".7"/>
    <circle cx="${winX + winW * .78}" cy="${winY + 4}" r="1.6" fill="#fff6d8" opacity=".95"/>
    ${city}
    <path d="M${winX + winW / 2} ${winY} V${winY + winH} M${winX} ${winY + winH / 2} H${winX + winW}" stroke="#8a74d8" stroke-width=".5"/>
    <rect x="${winX - .6}" y="${winY + winH}" width="${winW + 1.2}" height="1.1" rx=".4" fill="#b9a4ff"/>
    <g transform="translate(${cx - 6} 8)"><circle r="2.6" fill="#f4efff" stroke="#b9a4ff" stroke-width=".5"/><path d="M0 0 V-1.7 M0 0 L1.3 .8" stroke="#2a1760" stroke-width=".35" stroke-linecap="round"/></g>

    <!-- coin café : étagère, comptoir, machine -->
    <rect x="${cx}" y="${wallH - 2.6}" width="${cw}" height="1.6" rx=".5" fill="#b9a4ff"/>
    <rect x="${cx + .6}" y="${wallH - 1.1}" width="${cw - 1.2}" height="${d ? 10 : 12}" fill="url(#bs-wood)"/>
    <path d="M${cx + cw / 2} ${wallH - 1.1} V${wallH + (d ? 8.9 : 10.9)}" stroke="rgba(0,0,0,.28)" stroke-width=".3"/>
    <circle cx="${cx + cw / 2 - 1.6}" cy="${wallH + 3}" r=".45" fill="#e9e5f6"/><circle cx="${cx + cw / 2 + 1.6}" cy="${wallH + 3}" r=".45" fill="#e9e5f6"/>
    <g class="bu-machine" transform="translate(${mx} ${wallH - 2.6})">
      <rect x="0" y="-14.6" width="12" height="14.6" rx="1.2" fill="url(#bs-body)" stroke="#8a74d8" stroke-width=".35"/>
      <rect x="1.2" y="-13.6" width="9.6" height="3.1" rx=".6" fill="#0b0626"/>
      <circle class="bu-machine__led" cx="2.8" cy="-12.05" r=".55" fill="#2dd4a0"/>
      <rect x="4.4" y="-12.6" width="5" height="1.1" rx=".3" fill="#7c6bd4"/>
      <circle cx="3.4" cy="-8.8" r="1" fill="url(#bs-metal)"/><circle cx="8.6" cy="-8.8" r="1" fill="url(#bs-metal)"/>
      <rect x="4.2" y="-7.8" width="3.6" height="1.2" rx=".4" fill="url(#bs-metal)"/>
      <rect x="5.4" y="-6.7" width=".9" height="1.5" fill="#cfc8e6"/>
      <rect x="2" y="-1.1" width="8" height=".7" rx=".3" fill="#cfc8e6"/>
      <path d="M4.6 -1.1 L4.9 -3.9 H7.1 L7.4 -1.1Z" fill="#fff" stroke="#c9bfe8" stroke-width=".2"/>
      <path class="bu-steam" d="M5.4 -4.6 q.7 -.9 0 -1.8 M6.6 -4.6 q.7 -.9 0 -1.8" fill="none" stroke="#e9e5f6" stroke-width=".3" stroke-linecap="round"/>
    </g>
    <g transform="translate(${cx + cw - 3} ${wallH - 2.6})"><rect x="-2.6" y="-6" width="5.2" height="6" rx="1" fill="#e9e5f6" opacity=".92"/><rect x="-2.1" y="-6.9" width="4.2" height=".9" rx=".4" fill="#6a3bb8"/><rect x="-2.1" y="-4.4" width="4.2" height="2" fill="#7a5bd0"/></g>
    <g transform="translate(${cx + 17} ${wallH - 2.6})"><path d="M-1.4 0 L-1.2 -2.6 H1.2 L1.4 0Z" fill="#f4efff"/><path d="M1.3 -2 q1 .2 0 1.4" fill="none" stroke="#f4efff" stroke-width=".35"/></g>
    <text x="${cx + 2.4}" y="${wallH - 18.2}" font-size="1.7" font-weight="700" fill="#cdb9ff" letter-spacing=".15">COIN CAFÉ</text>

    <!-- tapis et plantes -->
    <rect x="${d ? 5 : 4}" y="${wallH + (H - wallH) * .22}" width="${d ? 66 : 74}" height="${(H - wallH) * (d ? .72 : .74)}" rx="2.2" fill="rgba(124,90,214,.20)" stroke="rgba(196,181,253,.28)" stroke-width=".35"/>
    ${plant(d ? 3 : 4, wallH + 9, d ? .6 : .7)}
    ${plant(d ? 96.5 : 95, H - 3, d ? .75 : .8)}
  </svg>`;
}

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

const sceneKey = agents => layoutOf() + ':' + agents.map(a => a.id).join(',');

function sceneInner(store) {
  return `
    ${sceneryHtml(layoutOf())}
    <div class="bu-board" aria-hidden="true">
      <span class="bu-board__label">Prospects traités par agent</span>
      <strong class="bu-board__total" data-bu-total></strong>
      <div class="bu-bars">${store.agents.map(a => `<i data-bu-bar="${escHtml(a.id)}"></i>`).join('')}</div>
    </div>
    <span class="bu-chip" data-bu-chip></span>
    ${store.agents.map((a, i) => `<span class="bu-desk" style="left:${SEAT_SETS[layoutOf()][i].x}%;top:${SEAT_SETS[layoutOf()][i].y + 8}%" aria-hidden="true"></span>`).join('')}
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
    const lay = layoutOf();
    const pos = a.status === 'break' ? COFFEE_SPOT[lay] : SEAT_SETS[lay][i];
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
  room.dataset.break = store.agents.some(a => a.status === 'break') ? '1' : '0';
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
          <div class="bu-card__actions"><button class="ds-btn ds-btn--primary ds-btn--sm" type="button" data-bu-act="workall">Tout lancer</button><button class="ds-btn ds-btn--sm" type="button" data-bu-act="stopall">Tout arrêter</button></div>
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
            <label class="ds-field"><span class="ds-field__label">Niveau</span>
              <select id="bu-level" class="ds-input">${Object.entries(LEVELS).map(([k, v]) => `<option value="${k}"${k === 'confirme' ? ' selected' : ''}>${v.label} · ${v.hint}</option>`).join('')}</select></label>
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
            <label class="ds-field"><span class="ds-field__label">Zone (seulement pour une recherche : code postal ou département)</span>
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
      <section class="ds-card bu-panel" aria-labelledby="bu-h-follow">
        <h2 class="ds-card__title" id="bu-h-follow">À relancer</h2>
        <p class="bu-why">Prospects contactés sans suite depuis ${FOLLOWUP_DAYS} jours ou plus.</p>
        <div class="bu-list" id="bu-follow"></div>
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

// État lisible d'une tâche : libellé, ton et avancement réels (jamais simulés)
function taskState(a, t, store, clients) {
  const team = teamOf({ cat: t.cat }, clients);
  const left = team.filter(c => statusOf(store, c) === 'À contacter').length;
  const done = t.processed || 0;
  const working = a.status === 'working';
  if (t.status === 'done') {
    if (t.failed) return { tone: 'warn', chip: 'Non terminée', pct: null };
    return { tone: 'good', chip: 'Terminée', pct: 100 };
  }
  if (t.type === 'message') {
    const total = done + left;
    const pct = total ? Math.round(done / total * 100) : 0;
    if (working) return { tone: 'live', chip: 'En cours', pct, info: `${done} préparé(s) · ${left} à traiter` };
    if (a.status === 'break') return { tone: 'idle', chip: 'En pause', pct, info: `${done} préparé(s) · ${left} à traiter` };
    return { tone: 'wait', chip: done ? 'En pause' : 'À lancer', pct, info: `${left} prospect(s) à traiter` };
  }
  if (working) return { tone: 'live', chip: 'En cours', pct: null, info: 'Interrogation du registre officiel…' };
  return { tone: a.status === 'break' ? 'idle' : 'wait', chip: a.status === 'break' ? 'En pause' : 'À lancer', pct: null, info: 'En attente de l’agent' };
}

function taskRowHtml(a, t, store, clients) {
  const st = taskState(a, t, store, clients);
  const isSearch = t.type === 'recherche';
  const title = isSearch ? 'Recherche d’entreprises' : 'Messages d’accroche';
  const meta = isSearch ? `${t.cat} · ${t.zone}` : t.cat;
  const result = t.status === 'done'
    ? (isSearch ? `${t.processed || 0} entreprise(s) trouvée(s)` : `${t.processed || 0} message(s) préparé(s)`)
    : (st.info || '');
  const bar = st.pct == null
    ? (st.tone === 'live' ? '<div class="bu-tk__bar bu-tk__bar--run" aria-hidden="true"><i></i></div>' : '')
    : `<div class="bu-tk__bar" role="img" aria-label="${st.pct} % réalisé"><i style="width:${st.pct}%"></i></div>`;
  const done = t.status !== 'done'
    ? `<button class="ds-btn ds-btn--sm" type="button" data-bu-act="taskdone" data-bu-id="${escHtml(a.id)}" data-bu-task="${escHtml(t.id)}">Terminer</button>`
    : '';
  return `<article class="bu-tk bu-tk--${st.tone}">
    <span class="bu-tk__ic" aria-hidden="true">${icon(isSearch ? 'search' : 'mail')}</span>
    <div class="bu-tk__main">
      <div class="bu-tk__top"><strong class="bu-tk__title">${escHtml(title)}</strong><span class="bu-tk__chip">${escHtml(st.chip)}</span></div>
      <span class="bu-tk__meta">${escHtml(meta)}</span>
      ${bar}
      ${result ? `<span class="bu-tk__info">${escHtml(result)}</span>` : ''}
      ${t.reason ? `<span class="bu-tk__reason">${escHtml(t.reason)}</span>` : ''}
    </div>
    <div class="bu-tk__actions">${done}
      <button class="ds-btn ds-btn--sm" type="button" data-bu-act="deltask" data-bu-id="${escHtml(a.id)}" data-bu-task="${escHtml(t.id)}">Retirer</button>
    </div>
  </article>`;
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

// Suppression en deux temps : le bouton demande confirmation avant de retirer l'agent
function deleteHtml(a, pending) {
  if (pending !== a.id) {
    return `<button class="ds-btn ds-btn--sm bu-danger" type="button" data-bu-act="askdel" data-bu-id="${escHtml(a.id)}">Supprimer l’agent</button>`;
  }
  return `<div class="bu-confirm" role="alert">
    <p class="bu-why">Supprimer ${escHtml(a.name)} et ses tâches ? Les prospects gardent leur statut.</p>
    <div class="bu-card__actions">
      <button class="ds-btn ds-btn--sm bu-danger" type="button" data-bu-act="confirmdel" data-bu-id="${escHtml(a.id)}">Oui, supprimer</button>
      <button class="ds-btn ds-btn--sm" type="button" data-bu-act="canceldel" data-bu-id="${escHtml(a.id)}">Annuler</button>
    </div>
  </div>`;
}

function statsHtml(a) {
  const st = agentStats(a);
  return `<dl class="bu-stats"><div><dd>${st.messages}</dd><dt>messages préparés</dt></div><div><dd>${st.found}</dd><dt>entreprises trouvées</dt></div><div><dd>${st.done}</dd><dt>tâches terminées</dt></div></dl>`;
}

export function cardHtml(store, clients, sel, pendingDel = null) {
  const a = store.agents.find(x => x.id === sel) || store.agents[0];
  if (!a) return '<div class="ds-card bu-card"><p class="bu-why">Aucun agent au bureau. Créez-en un pour commencer.</p></div>';
  const pr = progress(store, a, clients);
  return `<div class="ds-card bu-card">
    <div class="bu-card__head">
      <span class="bu-avatar" style="background:${escHtml(a.color)}" aria-hidden="true">${escHtml(a.name[0] || '?')}</span>
      <div class="bu-card__id"><strong>${escHtml(a.name)}</strong><span class="bu-why">${escHtml(a.role)} ${escHtml(levelOf(a).label)} · ${escHtml(a.cat)}</span></div>
      <span class="bu-status ${a.status}">${escHtml(BU_STATUS_LABEL[a.status])}</span>
    </div>
    <p class="bu-line" data-state="${escHtml(a.status)}">${escHtml(statusLine(store, a))}</p>
    <p class="bu-why">${pr.done} sur ${pr.total} prospects de son métier traités (${pr.pct} %)</p>
    <div class="bu-progress" role="img" aria-label="${pr.pct} % traités"><i style="width:${pr.pct}%"></i></div>
    ${statsHtml(a)}
    <div class="bu-card__actions">${controlsHtml(a)}</div>
    <div class="bu-lv" role="group" aria-label="Niveau de ${escHtml(a.name)}"><span class="bu-label">Niveau</span>${Object.entries(LEVELS).map(([k, v]) => `<button type="button" class="bu-lv__btn${levelOf(a) === v ? ' is-on' : ''}" aria-pressed="${levelOf(a) === v}" title="${escHtml(v.hint)}" data-bu-act="level" data-bu-id="${escHtml(a.id)}" data-bu-to="${k}">${v.label}</button>`).join('')}</div>
    ${deleteHtml(a, pendingDel)}
    <div class="bu-tasks">
      <p class="bu-label">Tâches</p>
      ${a.tasks.length ? a.tasks.map(t => taskRowHtml(a, t, store, clients)).join('') : '<p class="bu-why">Aucune tâche pour le moment.</p>'}
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
        <span class="bu-why">${escHtml(a.role)} ${escHtml(levelOf(a).label)} · ${escHtml(a.cat)} · ${escHtml(BU_STATUS_LABEL[a.status])} · ${pr.done} sur ${pr.total} traités</span>
        <p class="bu-line" data-state="${escHtml(a.status)}">${escHtml(statusLine(store, a))}</p>
        <div class="bu-progress" role="img" aria-label="${pr.pct} % traités"><i style="width:${pr.pct}%"></i></div>
        ${a.tasks.map(t => taskRowHtml(a, t, store, clients)).join('') || '<p class="bu-why">Aucune tâche.</p>'}
        <div class="bu-card__actions">${controlsHtml(a)}</div>
      </div>
    </article>`;
  }).join('');
}

const telOf = c => {
  const raw = String(c.phone || (c.details && c.details.phone) || '').replace(/[^\d+]/g, '');
  if (!raw) return '';
  if (raw.startsWith('+')) return raw.slice(1);
  if (raw.startsWith('00')) return raw.slice(2);
  return raw.startsWith('0') ? '33' + raw.slice(1) : raw;
};

function sendLinks(c, text) {
  const t = telOf(c);
  if (!t) return '<span class="bu-why">Pas de numéro : copiez le message.</span>';
  const q = encodeURIComponent(text);
  return `<a class="ds-btn ds-btn--sm" href="https://wa.me/${t}?text=${q}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
    <a class="ds-btn ds-btn--sm" href="sms:+${t}?&body=${q}">SMS</a>`;
}

export function toneHtml(store) {
  const cur = TONES[store.tone] ? store.tone : DEFAULT_TONE;
  return `<div class="ds-chips" role="group" aria-label="Ton des messages">${Object.entries(TONES).map(([k, l]) =>
    `<button type="button" class="ds-chip${k === cur ? ' is-on' : ''}" data-bu-act="tone" data-bu-id="${k}" aria-pressed="${k === cur}">${escHtml(l)}</button>`).join('')}</div>`;
}

export function readyHtml(store, clients) {
  const ready = clients.filter(c => statusOf(store, c) === 'Message prêt');
  if (!ready.length) return '<p class="bu-why">Aucun message prêt. Faites travailler un agent qui a une tâche « Messages ».</p>';
  const tone = TONES[store.tone] ? store.tone : DEFAULT_TONE;
  return toneHtml(store) + ready.slice(0, 30).map(c => {
    const e = store.statuses[String(c.id)] || {};
    const text = messageFor(c, tone);
    return `<div class="bu-task">
      <div class="bu-task__label"><strong>${escHtml(c.name)}</strong><span class="bu-why">${escHtml(c.city || '')}${e.by ? ' · préparé par ' + escHtml(e.by) : ''}</span></div>
      <p class="bu-msgtext">${escHtml(text)}</p>
      <div class="bu-task__actions"><button class="ds-btn ds-btn--sm" type="button" data-bu-act="copy" data-bu-id="${escHtml(c.id)}">Copier le message</button>
        ${sendLinks(c, text)}
        <button class="ds-btn ds-btn--primary ds-btn--sm" type="button" data-bu-act="setstatus" data-bu-id="${escHtml(c.id)}" data-bu-to="Contacté">Marquer contacté</button></div>
    </div>`;
  }).join('') + (ready.length > 30 ? `<p class="bu-why">+ ${ready.length - 30} autres messages prêts</p>` : '');
}

export function followHtml(store, clients) {
  const due = followUpsDue(store, clients);
  if (!due.length) return '<p class="bu-why">Aucune relance à faire pour le moment.</p>';
  const tone = TONES[store.tone] ? store.tone : DEFAULT_TONE;
  return due.slice(0, 20).map(c => {
    const days = Math.floor((Date.now() - store.statuses[String(c.id)].at) / 86400000);
    const text = messageFor(c, tone, 'relance');
    return `<div class="bu-task">
      <div class="bu-task__label"><strong>${escHtml(c.name)}</strong><span class="bu-why">${escHtml(c.city || '')} · contacté il y a ${days} jours</span></div>
      <p class="bu-msgtext">${escHtml(text)}</p>
      <div class="bu-task__actions"><button class="ds-btn ds-btn--sm" type="button" data-bu-act="copy" data-bu-id="${escHtml(c.id)}" data-bu-kind="relance">Copier la relance</button>
        ${sendLinks(c, text)}
        <button class="ds-btn ds-btn--primary ds-btn--sm" type="button" data-bu-act="setstatus" data-bu-id="${escHtml(c.id)}" data-bu-to="Contacté">Relancé</button>
        <button class="ds-btn ds-btn--sm" type="button" data-bu-act="setstatus" data-bu-id="${escHtml(c.id)}" data-bu-to="Intéressé">Intéressé</button>
        <button class="ds-btn ds-btn--sm" type="button" data-bu-act="setstatus" data-bu-id="${escHtml(c.id)}" data-bu-to="Refusé">Refusé</button></div>
    </div>`;
  }).join('');
}

const NEXT = { 'Message prêt': ['Contacté'], 'Contacté': ['Intéressé', 'Refusé'], 'Intéressé': ['Client', 'Refusé'] };

export function pipeHtml(store, clients) {
  return BU_STATUSES.map(s => {
    const items = clients.filter(c => statusOf(store, c) === s);
    const names = items.slice(0, 6).map(c => `<li>${escHtml(c.name)}${(NEXT[s] || []).map(to => ` <button type="button" class="bu-mini" data-bu-act="setstatus" data-bu-id="${escHtml(c.id)}" data-bu-to="${escHtml(to)}" aria-label="${escHtml(c.name)} : passer à ${escHtml(to)}">→ ${escHtml(to)}</button>`).join('')}</li>`).join('');
    return `<div class="bu-col">
      <h3>${escHtml(s)} <span>${items.length}</span></h3>
      ${items.length ? `<ul class="bu-names">${names}</ul>${items.length > 6 ? `<p class="bu-why">+ ${items.length - 6}</p>` : ''}` : '<p class="bu-why">Aucun</p>'}
    </div>`;
  }).join('');
}
