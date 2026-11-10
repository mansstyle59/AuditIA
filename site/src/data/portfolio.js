// AuditIA — calculs sur les clients et les audits (logique pure, sans affichage).
// Règles reprises de l'ancienne interface : accueil (dkHomeHtml, mqStatsHtml, mqLatestHtml),
// liste des clients (cStat, niveaux, filtre, tri) et fiche client (clientDetailHtml).
import { auditHasAnalysis } from '../audit/scoring.js';
import { norm, fmtRating } from '../core/utils.js';

const stamp = a => String(a.updated_at || a.created_at || '');

export const TIERS = [['low', 'À améliorer'], ['good', 'Bon'], ['top', 'Très bon'], ['none', 'Sans audit']];

// ----- Accueil -----
export function homeStats(clients, audits) {
  const done = audits.filter(auditHasAnalysis);
  const scores = done.map(a => Number(a.score)).filter(n => Number.isFinite(n) && n > 0);
  const avg = scores.length ? Math.round(scores.reduce((t, n) => t + n, 0) / scores.length) : null;
  const waiting = audits.filter(a => !auditHasAnalysis(a));
  const byRecent = list => list.slice().sort((a, b) => stamp(b).localeCompare(stamp(a)));
  return {
    clientCount: clients.length,
    auditCount: audits.length,
    doneCount: done.length,
    waitingCount: waiting.length,
    avg,
    latest: byRecent(audits).slice(0, 5),
    waiting: byRecent(waiting).slice(0, 5),
  };
}

// ----- Liste des clients -----
export function clientStat(client, audits) {
  const mine = audits.filter(a => a.client_id === client.id);
  const done = mine.filter(auditHasAnalysis).sort((x, y) => stamp(y).localeCompare(stamp(x)));
  const last = done[0];
  const prev = done[1];
  const sc = last ? Number(last.score) || 0 : null;
  return {
    sc,
    delta: (last && prev) ? sc - (Number(prev.score) || 0) : null,
    date: last ? (last.updated_at || last.created_at) : null,
    tier: sc == null ? 'none' : sc >= 75 ? 'top' : sc >= 50 ? 'good' : 'low',
    auditCount: mine.length,
  };
}

export function clientCategory(c) {
  return c.category || (c.details && c.details.category) || '';
}

export function portfolio(clients, audits, { q = '', tier = '', sort = 'urgence' } = {}) {
  const nq = norm(q);
  const base = clients.filter(c => {
    if (!nq) return true;
    const d = c.details || {};
    return norm([c.name, c.city, c.category, d.category, d.address, c.phone].filter(Boolean).join(' ')).includes(nq);
  });
  const stats = new Map(base.map(c => [c.id, clientStat(c, audits)]));
  const scored = base.map(c => stats.get(c.id)).filter(x => x.sc != null);
  const avg = scored.length ? Math.round(scored.reduce((n, x) => n + x.sc, 0) / scored.length) : null;
  const tiers = TIERS.map(([key, label]) => [key, label, base.filter(c => stats.get(c.id).tier === key).length]);
  const rows = base
    .filter(c => !tier || stats.get(c.id).tier === tier)
    .sort((x, y) => {
      if (sort === 'nom') return String(x.name || '').localeCompare(String(y.name || ''), 'fr');
      const X = stats.get(x.id), Y = stats.get(y.id);
      if (sort === 'recent') return String(Y.date || '').localeCompare(String(X.date || ''));
      return (X.sc == null ? -1 : X.sc) - (Y.sc == null ? -1 : Y.sc);
    })
    .map(c => ({ client: c, stat: stats.get(c.id) }));
  const categories = [...new Set(clients.map(clientCategory).filter(Boolean))].slice(0, 6);
  return { rows, avg, tiers, categories, total: clients.length, shown: rows.length };
}

// ----- Fiche client -----
export function clientDetail(client, audits) {
  const mine = audits.filter(a => a.client_id === client.id);
  const scored = mine.filter(auditHasAnalysis);
  const avg = scored.length ? Math.round(scored.reduce((s, a) => s + (Number(a.score) || 0), 0) / scored.length) : null;
  const last = scored[0] || null;
  const history = [...mine].reverse().map(a => Number(a.score) || 0);
  return { audits: mine, avg, last, history, showEvolution: history.filter(v => v > 0).length >= 2 };
}

const STATUS = { OPERATIONAL: 'En activité', CLOSED_TEMPORARILY: 'Fermé temporairement', CLOSED_PERMANENTLY: 'Fermé définitivement' };

export function clientInfoRows(c) {
  const d = c.details || {};
  const rows = [];
  if (c.category || d.category) rows.push(['Catégorie', c.category || d.category]);
  if (d.address) rows.push(['Adresse', d.address]);
  if (c.phone || d.phone) rows.push(['Téléphone', c.phone || d.phone]);
  if (c.website) rows.push(['Site web', c.website]);
  if (d.rating != null) rows.push(['Note Google', '★ ' + fmtRating(d.rating) + ' (' + (d.reviews || 0) + ' avis)']);
  if (d.photoCount != null) rows.push(['Photos Google', d.photoCount + (d.photoCount >= 10 ? '+' : '') + ' photo' + (d.photoCount > 1 ? 's' : '')]);
  if (d.status) rows.push(['Statut', STATUS[d.status] || d.status]);
  if (d.domainCreated) {
    const when = new Date(d.domainCreated);
    if (!Number.isNaN(when.getTime())) rows.push(['Domaine créé le', when.toLocaleDateString('fr-FR') + ' · indice d’ancienneté']);
  }
  return rows;
}

// Ancienneté lisible d'un audit : « aujourd’hui » ou « il y a N j »
export function ageLabel(date, now = Date.now()) {
  if (!date) return '';
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return '';
  const days = Math.floor((now - t) / 864e5);
  return days < 1 ? 'aujourd’hui' : 'il y a ' + days + ' j';
}
