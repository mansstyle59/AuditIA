// AuditIA — Bureau (accueil) : calculs purs à partir des vrais clients, audits et agents.
// Aucun affichage, aucun réseau. Les chiffres viennent des données du compte ; rien n'est inventé.
import { auditHasAnalysis } from '../audit/scoring.js';

export const PERIODS = [
  { id: 'week', label: 'Cette semaine', days: 7 },
  { id: 'month', label: 'Ce mois-ci', days: 30 },
  { id: 'quarter', label: '3 derniers mois', days: 90 },
];
export const DEFAULT_PERIOD = 'week';
const DAY = 864e5;

export function periodOf(id) {
  return PERIODS.find(p => p.id === id) || PERIODS[0];
}

const timeOf = row => {
  const t = new Date(row && (row.created_at || row.updated_at)).getTime();
  return Number.isNaN(t) ? null : t;
};

// Fenêtre courante et fenêtre précédente de même durée
export function windowsOf(periodId, now = Date.now()) {
  const days = periodOf(periodId).days;
  return { from: now - days * DAY, prevFrom: now - 2 * days * DAY, to: now };
}

const inRange = (row, from, to) => {
  const t = timeOf(row);
  return t != null && t >= from && t <= to;
};

// Répartition des prospects pour l'anneau : À contacter / En cours / Clients (les refusés sont écartés)
export function prospectSplit(statusList) {
  const out = { todo: 0, running: 0, clients: 0, refused: 0 };
  for (const s of statusList) {
    if (s === 'À contacter') out.todo++;
    else if (s === 'Client') out.clients++;
    else if (s === 'Refusé') out.refused++;
    else out.running++; // Message prêt, Contacté, Intéressé
  }
  out.total = out.todo + out.running + out.clients;
  return out;
}

// Pastilles sous les cartes « Agents » et « À contacter » : seulement ce qui est réellement arrivé sur la période
export function periodBadges({ agents, clients, statusOf, periodId, now = Date.now() }) {
  const { from, to } = windowsOf(periodId, now);
  const newAgents = agents.filter(a => Number(a.created) >= from && Number(a.created) <= to).length;
  const newTodo = clients.filter(c => inRange(c, from, to) && statusOf(c) === 'À contacter').length;
  return { newAgents, newTodo };
}

// Performance des audits analysés : nombre, score moyen, progression par rapport à la période précédente
export function auditPerformance(audits, periodId, now = Date.now()) {
  const { from, prevFrom, to } = windowsOf(periodId, now);
  const done = audits.filter(a => auditHasAnalysis(a) && Number.isFinite(Number(a.score)) && Number(a.score) > 0);
  const mean = list => (list.length ? Math.round(list.reduce((n, a) => n + Number(a.score), 0) / list.length) : null);
  const cur = done.filter(a => inRange(a, from, to));
  const prev = done.filter(a => inRange(a, prevFrom, from - 1));
  const avg = mean(cur);
  const prevAvg = mean(prev);
  const progression = avg != null && prevAvg ? Math.round(((avg - prevAvg) / prevAvg) * 100) : null;
  const series = cur.slice().sort((a, b) => timeOf(a) - timeOf(b)).slice(-8).map(a => Number(a.score));
  return { count: cur.length, avg, progression, series };
}

// Texte « il y a 12 min », « il y a 3 h », « il y a 2 j »
export function agoLabel(date, now = Date.now()) {
  const t = new Date(date).getTime();
  if (!date || Number.isNaN(t)) return '';
  const min = Math.max(0, Math.floor((now - t) / 6e4));
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

// Activité récente : nouveaux prospects et audits, du plus récent au plus ancien
export function recentActivity({ clients, audits, periodId, now = Date.now(), limit = 3 }) {
  const { from, to } = windowsOf(periodId, now);
  const byId = new Map(clients.map(c => [String(c.id), c]));
  const items = [];
  for (const c of clients) {
    if (inRange(c, from, to)) items.push({ kind: 'prospect', t: timeOf(c), at: c.created_at, clientId: c.id, name: c.name || 'Commerce' });
  }
  for (const a of audits) {
    if (!inRange(a, from, to)) continue;
    const c = byId.get(String(a.client_id));
    const done = auditHasAnalysis(a);
    items.push({
      kind: done ? 'audit-done' : 'audit-new', t: timeOf(a), at: a.created_at, auditId: a.id,
      clientId: c ? c.id : null, name: (c && c.name) || a.title || 'Commerce',
      score: done ? Math.round(Number(a.score) || 0) : null,
    });
  }
  return items.sort((x, y) => y.t - x.t).slice(0, limit);
}

// Anneau : segments (longueurs) pour un cercle de rayon r ; renvoie dasharray/dashoffset par segment
export function ringSegments(values, r = 52) {
  const total = values.reduce((n, v) => n + v, 0);
  const circ = 2 * Math.PI * r;
  if (!total) return [];
  let offset = 0;
  return values.map(v => {
    const len = (v / total) * circ;
    const seg = { len: +len.toFixed(2), gap: +(circ - len).toFixed(2), offset: +(-offset).toFixed(2) };
    offset += len;
    return seg;
  });
}
