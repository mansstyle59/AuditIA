// AuditIA — Dashboard : calculs purs à partir des vrais clients, audits et agents. Aucun affichage, aucun réseau.
import { auditHasAnalysis } from '../audit/scoring.js';

const DAY = 864e5;
export const STAGES = ['À contacter', 'Message prêt', 'Contacté', 'Intéressé', 'Client', 'Refusé'];

const timeOf = row => {
  const t = new Date(row && (row.created_at || row.updated_at)).getTime();
  return Number.isNaN(t) ? null : t;
};
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null);

// Entonnoir : nombre de prospects par étape + taux de passage entre étapes
export function funnelOf(statusList) {
  const n = Object.fromEntries(STAGES.map(s => [s, 0]));
  for (const s of statusList) if (s in n) n[s]++;
  const total = statusList.length;
  const reached = n['Contacté'] + n['Intéressé'] + n['Client'] + n['Refusé']; // ont reçu un message
  const interested = n['Intéressé'] + n['Client'];
  return {
    counts: n, total,
    contactRate: pct(reached, total),          // part des prospects effectivement contactés
    interestRate: pct(interested, reached),    // part des contactés qui s'intéressent
    closeRate: pct(n['Client'], interested),   // part des intéressés devenus clients
  };
}

// Nouveaux commerces par semaine (la plus ancienne d'abord)
export function weeklyAdds(clients, weeks = 8, now = Date.now()) {
  const out = Array.from({ length: weeks }, () => 0);
  for (const c of clients) {
    const t = timeOf(c);
    if (t == null || t > now) continue;
    const w = Math.floor((now - t) / (7 * DAY));
    if (w < weeks) out[weeks - 1 - w]++;
  }
  return out;
}

// Audits analysés : score moyen par mois (6 derniers mois, anciens d'abord) ; null si aucun audit ce mois-là
export function monthlyScores(audits, months = 6, now = new Date()) {
  const base = new Date(now);
  const keys = Array.from({ length: months }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth() - (months - 1 - i), 1);
    return { y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''), sum: 0, n: 0 };
  });
  for (const a of audits) {
    if (!auditHasAnalysis(a)) continue;
    const s = Number(a.score);
    if (!Number.isFinite(s) || s <= 0) continue;
    const t = timeOf(a);
    if (t == null) continue;
    const d = new Date(t);
    const k = keys.find(x => x.y === d.getFullYear() && x.m === d.getMonth());
    if (k) { k.sum += s; k.n++; }
  }
  return keys.map(k => ({ label: k.label, avg: k.n ? Math.round(k.sum / k.n) : null, n: k.n }));
}

// Répartition des scores : à améliorer (< 50), correct (50–74), solide (≥ 75)
export function scoreBuckets(audits) {
  const out = { low: 0, mid: 0, high: 0, total: 0 };
  for (const a of audits) {
    if (!auditHasAnalysis(a)) continue;
    const s = Number(a.score);
    if (!Number.isFinite(s) || s <= 0) continue;
    out.total++;
    if (s < 50) out.low++; else if (s < 75) out.mid++; else out.high++;
  }
  return out;
}

// Classement des agents : prospects traités sur leur métier, messages préparés, entreprises trouvées
export function agentBoard(agents, progressOf, statsOf) {
  return agents.map(a => {
    const p = progressOf(a);
    const st = statsOf(a);
    return { id: a.id, name: a.name, role: a.role, done: p.done, total: p.total, pct: p.pct, messages: st.messages, found: st.found, status: a.status };
  }).sort((x, y) => y.done - x.done || y.messages - x.messages);
}
