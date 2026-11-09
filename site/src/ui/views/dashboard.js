// AuditIA — Dashboard : affichage seulement. Tous les chiffres viennent des vrais clients, audits et agents.
import { escHtml } from '../../core/utils.js';
import { icon } from '../components/ui.js';
import { statusOf, progress, agentStats, followUpsDue, counts } from '../bureau-store.js';
import { homeStats } from '../../data/portfolio.js';
import { ringSegments } from '../../data/home-metrics.js';
import { funnelOf, weeklyAdds, monthlyScores, scoreBuckets, agentBoard, STAGES } from '../../data/dashboard-metrics.js';

const STAGE_COLOR = { 'À contacter': '#8E83B5', 'Message prêt': '#38BDF8', 'Contacté': '#A855F7', 'Intéressé': '#F59E0B', 'Client': '#22C55E', 'Refusé': '#FB7185' };
const rate = v => (v == null ? '—' : v + ' %');

function kpi(label, value, hint, ic) {
  return `<article class="hm-card db-kpi"><span class="db-kpi__ic" aria-hidden="true">${icon(ic)}</span>
    <div class="db-kpi__txt"><span class="db-kpi__label">${escHtml(label)}</span><strong class="db-kpi__value">${escHtml(String(value))}</strong><small>${escHtml(hint)}</small></div></article>`;
}

function funnelCard(f) {
  const max = Math.max(1, ...Object.values(f.counts));
  const rows = STAGES.map(s => {
    const n = f.counts[s];
    return `<li class="db-fun"><span class="db-fun__label">${escHtml(s)}</span>
      <span class="db-fun__bar" aria-hidden="true"><i style="width:${Math.max(n ? 4 : 0, Math.round(n / max * 100))}%;background:${STAGE_COLOR[s]}"></i></span>
      <b class="db-fun__n">${n}</b></li>`;
  }).join('');
  return `<section class="hm-card hm-panel" aria-labelledby="db-h-fun">
    <h2 class="hm-panel__title" id="db-h-fun">Entonnoir de prospection</h2>
    ${f.total ? `<ul class="db-funs">${rows}</ul>
    <dl class="hm-perf"><div><dd>${rate(f.contactRate)}</dd><dt>contactés</dt></div><div><dd>${rate(f.interestRate)}</dd><dt>intéressés</dt></div><div><dd>${rate(f.closeRate)}</dd><dt>devenus clients</dt></div></dl>`
      : '<p class="hm-empty">Aucun prospect pour le moment. Les étapes apparaissent dès que vos agents travaillent.</p>'}
  </section>`;
}

function barsCard(weeks) {
  const max = Math.max(1, ...weeks);
  const total = weeks.reduce((a, b) => a + b, 0);
  const bars = weeks.map((v, i) => `<div class="db-bar" title="${v} nouveau(x) commerce(s)"><i style="height:${Math.max(v ? 8 : 3, Math.round(v / max * 100))}%"></i><span>${i === weeks.length - 1 ? 'Cette sem.' : 'S-' + (weeks.length - 1 - i)}</span></div>`).join('');
  return `<section class="hm-card hm-panel" aria-labelledby="db-h-add">
    <h2 class="hm-panel__title" id="db-h-add">Nouveaux commerces par semaine</h2>
    ${total ? `<div class="db-bars" role="img" aria-label="${total} nouveaux commerces sur ${weeks.length} semaines">${bars}</div>`
      : '<p class="hm-empty">Aucun commerce ajouté sur les dernières semaines.</p>'}
  </section>`;
}

function lineCard(months) {
  const pts = months.map((m, i) => ({ ...m, i })).filter(m => m.avg != null);
  const W = 320, H = 130, px = 14, py = 14;
  const x = i => px + (i / Math.max(1, months.length - 1)) * (W - 2 * px);
  const y = v => H - py - (v / 100) * (H - 2 * py);
  const path = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)} ${y(p.avg).toFixed(1)}`).join(' ');
  const dots = pts.map(p => `<circle cx="${x(p.i).toFixed(1)}" cy="${y(p.avg).toFixed(1)}" r="4" fill="var(--hm-dot)"><title>${p.label} : ${p.avg}/100 (${p.n} audit${p.n > 1 ? 's' : ''})</title></circle>`).join('');
  const labels = months.map((m, i) => `<text x="${x(i).toFixed(1)}" y="${H - 1}" text-anchor="middle" font-size="9" fill="var(--hm-muted)">${escHtml(m.label)}</text>`).join('');
  return `<section class="hm-card hm-panel" aria-labelledby="db-h-line">
    <h2 class="hm-panel__title" id="db-h-line">Score moyen des audits par mois</h2>
    ${pts.length ? `<div class="hm-chartbox"><svg class="db-line" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Évolution du score moyen sur ${months.length} mois" focusable="false">
      <line x1="${px}" x2="${W - px}" y1="${y(50)}" y2="${y(50)}" stroke="var(--hm-line)" stroke-dasharray="3 5"/>
      ${pts.length > 1 ? `<path d="${path}" fill="none" stroke="var(--hm-line-hi)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` : ''}${dots}${labels}</svg></div>`
      : '<p class="hm-empty">Aucun audit analysé sur les derniers mois.</p>'}
  </section>`;
}

function scoreCard(b) {
  const segs = ringSegments([b.low, b.mid, b.high], 42);
  const colors = ['#FB7185', '#F59E0B', '#22C55E'];
  const rings = segs.map((s, i) => `<circle cx="60" cy="60" r="42" fill="none" stroke="${colors[i]}" stroke-width="14" stroke-dasharray="${s.len} ${s.gap}" stroke-dashoffset="${s.offset}"${s.len < .01 ? ' opacity="0"' : ''}/>`).join('');
  const legend = [['À améliorer (< 50)', b.low], ['Correct (50–74)', b.mid], ['Solide (≥ 75)', b.high]].map(([l, n], i) => `<li><i style="background:${colors[i]}" aria-hidden="true"></i><span>${l}</span><b>${n}</b></li>`).join('');
  return `<section class="hm-card hm-panel" aria-labelledby="db-h-sc">
    <h2 class="hm-panel__title" id="db-h-sc">Qualité des audits</h2>
    ${b.total ? `<div class="hm-donut-wrap"><div class="hm-donut db-donut" role="img" aria-label="${b.total} audits : ${b.low} à améliorer, ${b.mid} corrects, ${b.high} solides">
      <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="60" cy="60" r="42" fill="none" stroke="var(--hm-ring-track)" stroke-width="14"/><g transform="rotate(-90 60 60)">${rings}</g></svg>
      <div class="hm-donut__center"><strong>${b.total}</strong><span>audits</span></div></div><ul class="hm-legend">${legend}</ul></div>`
      : '<p class="hm-empty">Aucun audit analysé pour le moment.</p>'}
  </section>`;
}

function agentsCard(rows) {
  const list = rows.map(r => `<li class="db-ag"><span class="db-ag__name"><b>${escHtml(r.name)}</b><small>${escHtml(r.role)}</small></span>
    <span class="db-ag__bar" role="img" aria-label="${r.pct} % traités"><i style="width:${r.pct}%"></i></span>
    <span class="db-ag__n"><b>${r.done}/${r.total}</b><small>${r.messages} msg · ${r.found} trouvées</small></span></li>`).join('');
  return `<section class="hm-card hm-panel" aria-labelledby="db-h-ag">
    <div class="hm-panel__head"><h2 class="hm-panel__title" id="db-h-ag">Performance des agents</h2><button type="button" class="hm-link hm-link--inline" data-nav="bureau">Gérer ${icon('arrow')}</button></div>
    ${rows.length ? `<ul class="db-ags">${list}</ul>` : '<p class="hm-empty">Aucun agent. Créez-en un dans « Agents IA ».</p>'}
  </section>`;
}

function todoCard({ ready, due }) {
  const row = (ic, label, n, nav, anchor) => `<li><button type="button" class="hm-quick" data-nav="${nav}"${anchor ? ` data-nav-anchor="${anchor}"` : ''}>
    <span class="hm-quick__ic" aria-hidden="true">${icon(ic)}</span><span>${label}</span><b class="db-todo__n">${n}</b></button></li>`;
  return `<section class="hm-card hm-panel" aria-labelledby="db-h-todo">
    <h2 class="hm-panel__title" id="db-h-todo">À faire maintenant</h2>
    <ul class="hm-quicks">${row('mail', 'Messages à relire et envoyer', ready, 'messages')}${row('bell', 'Prospects à relancer', due, 'messages', 'bu-h-follow')}</ul>
  </section>`;
}

export function dashboardView(ctx) {
  const { data, store } = ctx;
  const statuses = data.clients.map(c => statusOf(store, c));
  const f = funnelOf(statuses);
  const hs = homeStats(data.clients, data.audits);
  const c = counts(store, data.clients);
  const due = followUpsDue(store, data.clients).length;
  const board = agentBoard(store.agents, a => progress(store, a, data.clients), agentStats);
  const clientsWon = f.counts['Client'];
  return `<div class="hm db">
    <div class="db-kpis">
      ${kpi('Commerces suivis', hs.clientCount, hs.clientCount ? `${c.todo} à contacter` : 'Aucun pour le moment', 'users')}
      ${kpi('Contactés', f.total ? rate(f.contactRate) : '—', `${f.counts['Contacté'] + f.counts['Intéressé'] + f.counts['Client'] + f.counts['Refusé']} sur ${f.total}`, 'mail')}
      ${kpi('Clients gagnés', clientsWon, f.closeRate == null ? 'Aucun intéressé pour le moment' : `${f.closeRate} % des intéressés`, 'crown')}
      ${kpi('Score moyen', hs.avg == null ? '—' : hs.avg + '/100', `${hs.doneCount} audit${hs.doneCount > 1 ? 's' : ''} analysé${hs.doneCount > 1 ? 's' : ''}`, 'chart')}
    </div>
    <div class="db-grid">
      ${funnelCard(f)}
      ${todoCard({ ready: c.ready, due })}
      ${lineCard(monthlyScores(data.audits))}
      ${scoreCard(scoreBuckets(data.audits))}
      ${barsCard(weeklyAdds(data.clients))}
      ${agentsCard(board)}
    </div>
  </div>`;
}
