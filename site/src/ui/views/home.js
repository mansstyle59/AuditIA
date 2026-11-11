// AuditIA — accueil alimenté par les données réelles (aucune donnée de démonstration).
// Mêmes composants pour mobile et ordinateur, compositions différentes.
import { btn, stat, card, badge, scoreBadge, bar, sectionTitle, emptyState, linkBtn, linkRow, avatar } from '../components/ui.js';
import { auditHasAnalysis } from '../../audit/scoring.js';
import { homeStats, portfolio, priorityClients, ageLabel } from '../../data/portfolio.js';
import { heroBand } from './hero.js';

function auditRows(audits, clients, empty) {
  if (!audits.length) return `<p class="ds-row__meta">${empty}</p>`;
  const byId = new Map(clients.map(c => [String(c.id), c]));
  return `<ul class="ds-list">${audits.map(a => {
    const c = byId.get(String(a.client_id));
    const name = (c && c.name) || a.title || 'Commerce';
    const done = auditHasAnalysis(a);
    const score = Math.max(0, Math.min(100, Math.round(Number(a.score) || 0)));
    const when = ageLabel(a.updated_at || a.created_at);
    return linkRow({
      title: name,
      meta: [c && c.city, done ? 'Audit terminé' : 'À analyser', when].filter(Boolean).join(' · '),
      right: done ? scoreBadge(score) : badge('À analyser'),
      lead: avatar(name),
      attrs: c ? `data-open-client="${String(c.id).replace(/"/g, '&quot;')}"` : 'disabled',
    });
  }).join('')}</ul>`;
}

// Commerces à améliorer en priorité (vide s'il n'y en a pas)
function priorityRows(data) {
  const list = priorityClients(data.clients, data.audits, 3);
  if (!list.length) return '';
  return `<ul class="ds-list">${list.map(({ client: c, stat }) => {
    const name = c.name || 'Commerce';
    return linkRow({
      title: name,
      meta: [c.city, 'Dernier score ' + Math.round(stat.sc) + '/100'].filter(Boolean).join(' · '),
      right: scoreBadge(Math.round(stat.sc)),
      lead: avatar(name),
      attrs: `data-open-client="${String(c.id).replace(/"/g, '&quot;')}"`,
    });
  }).join('')}</ul>`;
}

function levels(data) {
  const p = portfolio(data.clients, data.audits);
  if (!p.total) return '';
  return p.tiers.map(([, label, n]) => bar({ label: `${label} (${n})`, pct: Math.round((n / p.total) * 100) })).join('');
}

function kpis(s) {
  return [
    stat({ label: s.clientCount > 1 ? 'Commerces suivis' : 'Commerce suivi', value: String(s.clientCount) }),
    stat({ label: s.doneCount > 1 ? 'Audits analysés' : 'Audit analysé', value: String(s.doneCount) }),
    stat({ label: 'Score moyen', value: s.avg == null ? '—' : s.avg + '/100' }),
    stat({ label: 'À analyser', value: String(s.waitingCount) }),
  ].join('');
}

function welcome() {
  return heroBand() + emptyState({
    title: 'Bienvenue sur AuditIA',
    text: "Aucun commerce n'est encore enregistré. Recherchez un commerce pour l'ajouter à votre portefeuille.",
  }) + `<div class="ds-d-actions">${btn({ label: 'Trouver des commerces', variant: 'primary', attrs: 'data-nav="prospects"' })}</div>`;
}

export function homeMobile(data) {
  const s = homeStats(data.clients, data.audits);
  if (!s.clientCount && !s.auditCount) return welcome();
  const prio = priorityRows(data);
  return `${heroBand()}
    <div class="ds-grid">${kpis(s)}</div>
    ${prio ? sectionTitle('À améliorer en priorité') + card({ body: prio }) : ''}
    ${sectionTitle('Derniers audits', btn({ label: 'Voir les commerces', attrs: 'data-nav="clients"' }))}
    ${card({ body: auditRows(s.latest.slice(0, 3), data.clients, 'Aucun audit pour le moment.') })}
    ${s.clientCount ? sectionTitle('Niveau des commerces') + card({ body: `<div class="ds-d-stack">${levels(data)}</div>` }) : ''}
    ${s.waitingCount ? sectionTitle('À analyser') + card({ body: auditRows(s.waiting.slice(0, 3), data.clients, '') }) : ''}
  `;
}

export function homeDesktop(data) {
  const s = homeStats(data.clients, data.audits);
  if (!s.clientCount && !s.auditCount) return welcome();
  const prio = priorityRows(data);
  return `${heroBand()}
    <div class="ds-d-toolbar">
      <p class="ds-row__meta">Vue d'ensemble de votre activité</p>
      <div class="ds-d-actions">${btn({ label: 'Actualiser', attrs: 'data-reload' })}${btn({ label: 'Voir les commerces', variant: 'primary', attrs: 'data-nav="clients"' })}</div>
    </div>
    <div class="ds-grid ds-d-kpis">${kpis(s)}</div>
    <div class="ds-d-split">
      <div class="ds-d-stack">
        ${card({ title: 'Derniers audits', body: auditRows(s.latest, data.clients, 'Aucun audit pour le moment.') })}
      </div>
      <div class="ds-d-stack">
        ${prio ? card({ title: 'À améliorer en priorité', body: prio }) : ''}
        ${s.clientCount ? card({ title: 'Niveau des commerces', body: `<div class="ds-d-stack">${levels(data)}</div>` }) : ''}
        ${s.waitingCount ? card({ title: 'À analyser', body: auditRows(s.waiting, data.clients, '') }) : ''}
      </div>
    </div>
  `;
}
