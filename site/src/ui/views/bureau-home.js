// AuditIA — Bureau (accueil) : affichage seulement, deux compositions distinctes (mobile et ordinateur).
// Les chiffres viennent des vrais clients, audits et agents (voir data/home-metrics.js et bureau-store.js).
import { escHtml } from '../../core/utils.js';
import { icon } from '../components/ui.js';
import { counts, statusOf, BU_STATUS_LABEL } from '../bureau-store.js';
import { homeStats } from '../../data/portfolio.js';
import {
  PERIODS, periodOf, periodBadges, prospectSplit, auditPerformance, recentActivity, agoLabel, ringSegments,
} from '../../data/home-metrics.js';

const IMG = './assets/bureau/';
const PORTRAITS = ['denis', 'sophie', 'karim', 'laura'];
const ROLE_LABEL = { 'SDR IA': 'Prospection IA', 'Chercheur IA': 'Recherche IA' };
const OWNER_NAME = 'Denis';

const portraitOf = i => IMG + 'avatar-' + PORTRAITS[i % PORTRAITS.length] + '.webp';

/* ---------- Pièces communes ---------- */
function kpiCard({ img, w, h, label, value, badge = '' }) {
  return `<article class="hm-card hm-kpi">
    <img class="hm-kpi__img" src="${IMG}${img}.webp" alt="" width="${w}" height="${h}" decoding="async">
    <div class="hm-kpi__body">
      <span class="hm-kpi__label">${escHtml(label)}</span>
      <div class="hm-kpi__row"><strong class="hm-kpi__value">${escHtml(String(value))}</strong>${badge}</div>
    </div>
  </article>`;
}

function kpis(ctx) {
  const { store, data, period } = ctx;
  const c = counts(store, data.clients);
  const b = periodBadges({ agents: store.agents, clients: data.clients, statusOf: cl => statusOf(store, cl), periodId: period });
  const p = periodOf(period).label.toLowerCase();
  const upBadge = b.newAgents
    ? `<span class="hm-pill hm-pill--up" title="${b.newAgents} nouvel(s) agent(s) · ${escHtml(p)}">${icon('up')}+${b.newAgents}</span>` : '';
  const todoBadge = b.newTodo
    ? `<span class="hm-pill hm-pill--flat" title="${b.newTodo} nouveau(x) prospect(s) à contacter · ${escHtml(p)}">${icon('arrow')}${b.newTodo}</span>` : '';
  return `<div class="hm-kpis">
    ${kpiCard({ img: 'icon-agents', w: 224, h: 220, label: 'Agents', value: c.agents, badge: upBadge })}
    ${kpiCard({ img: 'icon-poste', w: 192, h: 240, label: 'Au poste', value: c.working })}
    ${kpiCard({ img: 'icon-contact', w: 203, h: 192, label: 'À contacter', value: c.todo, badge: todoBadge })}
    ${kpiCard({ img: 'icon-messages', w: 198, h: 200, label: 'Messages prêts', value: c.ready })}
  </div>`;
}

function board(ctx) {
  const c = counts(ctx.store, ctx.data.clients);
  return `<div class="hm-board">
    <div class="hm-board__text">
      <p class="hm-board__label">Prospects traités par agent</p>
      <p class="hm-board__total"><strong>${c.contacted} contactés</strong> · <strong>${c.hot} intéressés ou clients</strong></p>
    </div>
    <span class="hm-board__bars" aria-hidden="true">${icon('bars')}</span>
  </div>`;
}

function scene(ctx, file) {
  const agent = ctx.store.agents.find(a => a.id === ctx.sel);
  const name = agent ? agent.name : OWNER_NAME;
  return `<div class="hm-scene">
    <img class="hm-scene__img" src="${IMG}${file}.webp" alt="Bureau AuditIA : un agent travaille devant son ordinateur, avec un graphique de progression" width="${file.endsWith('mobile') ? 1560 : 1228}" height="${file.endsWith('mobile') ? 866 : 760}" decoding="async">
    <span class="hm-bubble"><i class="hm-bubble__dot" aria-hidden="true"></i><span>${escHtml(name)}</span></span>
  </div>`;
}

function agentTile(a, i, ctx, withRole) {
  const on = a.id === ctx.sel;
  const status = ['working', 'break'].includes(a.status) ? a.status : 'idle';
  return `<button type="button" class="hm-agent${on ? ' is-on' : ''}" data-home-agent="${escHtml(a.id)}" aria-pressed="${on}" aria-label="${escHtml(a.name)}, ${escHtml(BU_STATUS_LABEL[a.status] || '')}">
    <span class="hm-agent__pic"><img src="${portraitOf(i)}" alt="" width="120" height="120" loading="lazy" decoding="async"></span>
    <span class="hm-agent__line"><i class="hm-agent__dot hm-agent__dot--${status}" aria-hidden="true"></i><span class="hm-agent__name">${escHtml(a.name)}</span></span>
    ${withRole ? `<small class="hm-agent__role">${escHtml(ROLE_LABEL[a.role] || a.role)}</small>` : ''}
    ${on ? `<span class="hm-agent__check" aria-hidden="true">${icon('check')}</span>` : ''}
  </button>`;
}

function team(ctx, withRole) {
  const tiles = ctx.store.agents.map((a, i) => agentTile(a, i, ctx, withRole)).join('');
  const add = `<button type="button" class="hm-agent hm-agent--add" data-nav="bureau" data-nav-anchor="bu-h-create">
    <span class="hm-agent__plus" aria-hidden="true">${icon('plus')}</span>
    <span class="hm-agent__name">Ajouter<br>un agent</span>
  </button>`;
  const hint = ctx.store.agents.length ? '' : '<p class="hm-team__hint">Aucun agent pour le moment : ajoutez-en un pour le voir à son poste.</p>';
  return `<div class="hm-team" role="group" aria-label="Agents du bureau">${tiles}${add}</div>${hint}`;
}

function periodSelect(period, extraClass = '') {
  return `<label class="hm-period ${extraClass}">
    <span class="hm-period__icon" aria-hidden="true">${icon('calendar')}</span>
    <span class="ds-sr-only">Période</span>
    <select class="hm-period__select" data-home-period aria-label="Période affichée">
      ${PERIODS.map(p => `<option value="${p.id}"${p.id === period ? ' selected' : ''}>${escHtml(p.label)}</option>`).join('')}
    </select>
    <span class="hm-period__chev" aria-hidden="true">${icon('chevron')}</span>
  </label>`;
}

/* ---------- Anneau, activité, performance, actions ---------- */
function donut(ctx) {
  const split = prospectSplit(ctx.data.clients.map(cl => statusOf(ctx.store, cl)));
  const segs = ringSegments([split.todo, split.running, split.clients], 52);
  const colors = ['var(--hm-ring-1)', 'var(--hm-ring-2)', 'var(--hm-ring-3)'];
  const rings = segs.map((s, i) => `<circle cx="70" cy="70" r="52" fill="none" stroke="${colors[i]}" stroke-width="16" stroke-dasharray="${s.len} ${s.gap}" stroke-dashoffset="${s.offset}" ${s.len < 0.01 ? 'opacity="0"' : ''}/>`).join('');
  const legend = [
    ['À contacter', split.todo, colors[0]], ['En cours', split.running, colors[1]], ['Clients', split.clients, colors[2]],
  ].map(([l, n, col]) => `<li><i style="background:${col}" aria-hidden="true"></i><span>${l}</span><b>${n}</b></li>`).join('');
  return `<div class="hm-donut-wrap">
    <div class="hm-donut" role="img" aria-label="${split.total} prospects : ${split.todo} à contacter, ${split.running} en cours, ${split.clients} clients">
      <svg viewBox="0 0 140 140" aria-hidden="true" focusable="false">
        <circle cx="70" cy="70" r="52" fill="none" stroke="var(--hm-ring-track)" stroke-width="16"/>
        <g transform="rotate(-90 70 70)" stroke-linecap="butt">${rings}</g>
      </svg>
      <div class="hm-donut__center"><strong>${split.total}</strong><span>Prospects</span></div>
    </div>
    <ul class="hm-legend">${legend}</ul>
  </div>`;
}

function activityCard(ctx) {
  const items = recentActivity({ clients: ctx.data.clients, audits: ctx.data.audits, periodId: ctx.period });
  const rows = items.map(it => {
    const ago = agoLabel(it.at);
    const label = it.kind === 'prospect' ? 'Nouveau prospect ajouté' : it.kind === 'audit-done' ? 'Audit terminé' : 'Audit créé';
    const ic = it.kind === 'prospect' ? 'target' : 'file';
    const meta = [it.name, it.score != null ? `Score ${it.score}/100` : '', ago].filter(Boolean).join(' · ');
    const attr = it.kind === 'prospect' && it.clientId != null ? `data-open-client="${escHtml(String(it.clientId))}"`
      : it.auditId != null ? `data-open-audit="${escHtml(String(it.auditId))}"` : 'disabled';
    return `<li><button type="button" class="hm-act" ${attr}>
      <span class="hm-act__ic" aria-hidden="true">${icon(ic)}</span>
      <span class="hm-act__txt"><b>${label}</b><small>${escHtml(meta)}</small></span>
    </button></li>`;
  }).join('');
  return `<section class="hm-card hm-panel" aria-labelledby="hm-h-act">
    <h2 class="hm-panel__title" id="hm-h-act">Activité récente</h2>
    ${rows ? `<ul class="hm-acts">${rows}</ul>` : `<p class="hm-empty">Aucune activité sur cette période.</p>`}
    <button type="button" class="hm-link" data-nav="audits">Voir toute l’activité ${icon('arrow')}</button>
  </section>`;
}

function chartSvg(series) {
  const W = 300, H = 110, padX = 8, padY = 10;
  if (series.length < 2) {
    const y = H - padY - ((series[0] || 0) / 100) * (H - 2 * padY);
    return `<svg class="hm-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <line x1="${padX}" y1="${series.length ? y : H - padY}" x2="${W - padX}" y2="${series.length ? y : H - padY}" stroke="var(--hm-line)" stroke-width="2" stroke-dasharray="4 5"/>
      ${series.length ? `<circle cx="${W / 2}" cy="${y}" r="4.5" fill="var(--hm-line-hi)"/>` : ''}
    </svg>`;
  }
  const step = (W - 2 * padX) / (series.length - 1);
  const pts = series.map((v, i) => [padX + i * step, H - padY - (Math.max(0, Math.min(100, v)) / 100) * (H - 2 * padY)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H} L${pts[0][0].toFixed(1)} ${H} Z`;
  return `<svg class="hm-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id="hmArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--hm-line-hi)" stop-opacity=".5"/><stop offset="1" stop-color="var(--hm-line-hi)" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#hmArea)"/>
    <path d="${line}" fill="none" stroke="var(--hm-line-hi)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    ${pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="var(--hm-dot)" vector-effect="non-scaling-stroke"/>`).join('')}
  </svg>`;
}

function performanceCard(ctx) {
  const perf = auditPerformance(ctx.data.audits, ctx.period);
  const prog = perf.progression == null ? '—' : (perf.progression > 0 ? '+' : perf.progression < 0 ? '−' : '') + Math.abs(perf.progression) + ' %';
  const badge = perf.progression == null ? ''
    : `<span class="hm-pill ${perf.progression >= 0 ? 'hm-pill--up' : 'hm-pill--down'}">${perf.progression >= 0 ? '↑' : '↓'} ${prog.replace('+', '')}</span>`;
  return `<section class="hm-card hm-panel" aria-labelledby="hm-h-perf">
    <div class="hm-panel__head"><h2 class="hm-panel__title" id="hm-h-perf"><span class="hm-panel__ic" aria-hidden="true">${icon('chart')}</span>Performance des audits</h2>${badge}</div>
    <div class="hm-chartbox">${chartSvg(perf.series)}${perf.series.length ? '' : '<p class="hm-chartbox__none">Aucun audit analysé sur cette période.</p>'}</div>
    <dl class="hm-perf">
      <div><dt>Audits</dt><dd>${perf.count}</dd></div>
      <div><dt>Score moyen</dt><dd>${perf.avg == null ? '—' : perf.avg + '/100'}</dd></div>
      <div><dt>Progression</dt><dd>${prog}</dd></div>
    </dl>
  </section>`;
}

function actionsCard() {
  const rows = [
    ['search', 'Lancer un audit', 'audits'],
    ['userplus', 'Ajouter un prospect', 'prospects'],
    ['quote', 'Créer un devis', 'devis'],
    ['mail', 'Rédiger un message IA', 'bureau'],
  ].map(([ic, label, nav]) => `<li><button type="button" class="hm-quick" data-nav="${nav}"${nav === 'bureau' ? ' data-nav-anchor="bu-h-ready"' : ''}>
    <span class="hm-quick__ic" aria-hidden="true">${icon(ic)}</span><span>${label}</span><span class="hm-quick__go" aria-hidden="true">${icon('arrow')}</span></button></li>`).join('');
  return `<section class="hm-card hm-panel" aria-labelledby="hm-h-quick">
    <h2 class="hm-panel__title" id="hm-h-quick">Actions rapides</h2>
    <ul class="hm-quicks">${rows}</ul>
  </section>`;
}

// Portefeuille : les repères de l'ancien accueil (commerces suivis, audits analysés, score moyen, à analyser)
function portfolioCard(ctx) {
  const s = homeStats(ctx.data.clients, ctx.data.audits);
  const empty = !s.clientCount && !s.auditCount;
  return `<section class="hm-card hm-panel hm-portfolio" aria-labelledby="hm-h-port">
    <div class="hm-panel__head"><h2 class="hm-panel__title" id="hm-h-port">Portefeuille</h2>
      <button type="button" class="hm-link hm-link--inline" data-nav="clients">Voir les commerces ${icon('arrow')}</button></div>
    ${empty ? '<p class="hm-empty">Aucun commerce enregistré. Recherchez un commerce pour l’ajouter à votre portefeuille.</p>' : ''}
    <dl class="hm-perf hm-perf--4">
      <div><dt>${s.clientCount > 1 ? 'Commerces suivis' : 'Commerce suivi'}</dt><dd>${s.clientCount}</dd></div>
      <div><dt>${s.doneCount > 1 ? 'Audits analysés' : 'Audit analysé'}</dt><dd>${s.doneCount}</dd></div>
      <div><dt>Score moyen</dt><dd>${s.avg == null ? '—' : s.avg + '/100'}</dd></div>
      <div><dt>À analyser</dt><dd>${s.waitingCount}</dd></div>
    </dl>
    ${empty ? '<button type="button" class="ds-btn ds-btn--primary" data-nav="prospects">Trouver des commerces</button>' : ''}
  </section>`;
}

/* ---------- Compositions ---------- */
export function bureauHomeMobile(ctx) {
  return `<div class="hm hm--mobile">
    ${kpis(ctx)}
    <section class="hm-card hm-stage" aria-label="Bureau des agents">
      <div class="hm-stage__inner">
        ${board(ctx)}
        ${scene(ctx, 'scene-mobile')}
        ${team(ctx, false)}
      </div>
    </section>
    <div class="hm-periodrow"><span>Activité et performance</span>${periodSelect(ctx.period)}</div>
    ${activityCard(ctx)}
    ${performanceCard(ctx)}
    ${actionsCard()}
    ${portfolioCard(ctx)}
  </div>`;
}

export function bureauHomeDesktop(ctx) {
  return `<div class="hm hm--desktop">
    ${kpis(ctx)}
    <div class="hm-hero">
      <section class="hm-card hm-stage" aria-label="Bureau des agents">${scene(ctx, 'scene-desktop')}</section>
      <aside class="hm-card hm-side" aria-label="Prospects traités par agent">${board(ctx)}${donut(ctx)}</aside>
    </div>
    <section class="hm-card hm-teampanel" aria-label="Agents">${team(ctx, true)}</section>
    <div class="hm-trio">${activityCard(ctx)}${performanceCard(ctx)}${actionsCard()}</div>
    ${portfolioCard(ctx)}
  </div>`;
}

export const homeHeaderExtra = period => periodSelect(period, 'hm-period--head');
export const HOME_SUBTITLE = { mobile: 'Vue d’ensemble de votre activité', desktop: 'Vue d’ensemble de votre activité commerciale' };
