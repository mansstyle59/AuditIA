// AuditIA — données d'audit pour la nouvelle interface (logique pure, sans affichage ni réseau).
// Réutilise le moteur de score existant : visibilityAudit, actionPlan, improvementPlan, auditUnmeasured…
import { auditHasAnalysis, visibilityAudit, visibilityVerdict, visibilityLabel, actionPlan, auditActions, improvementPlan, unifiedRecommendations, auditUnmeasured } from '../audit/scoring.js';
import { checklistTemplate } from '../core/config.js';

export const AUDIT_TITLE = 'Audit de visibilité numérique';
const stamp = a => String(a.updated_at || a.created_at || '');

/* Même règle que l'ancienne interface (startAuditFor) : on reprend le dossier non analysé du client
   au lieu d'en créer un doublon. */
export function reusableAudit(audits, clientId) {
  return audits.find(a => String(a.client_id) === String(clientId) && !auditHasAnalysis(a)) || null;
}

// Ligne insérée dans `audits` : identique à l'ancienne interface.
export function newAuditRow(userId, clientId, title) {
  return {
    user_id: userId, client_id: clientId,
    title: String(title || AUDIT_TITLE).trim() || AUDIT_TITLE,
    status: 'À démarrer', score: 0,
    checklist: checklistTemplate.map(([label, detail]) => ({ label, detail, done: false })),
  };
}

// Liste des audits (onglet Audits) : du plus récent au plus ancien, avec filtre par état et recherche.
export function auditList(audits, clients, { q = '', state = '' } = {}) {
  const byId = new Map(clients.map(c => [String(c.id), c]));
  const needle = String(q || '').trim().toLowerCase();
  const rows = audits.map(a => {
    const c = byId.get(String(a.client_id)) || null;
    return { audit: a, client: c, done: auditHasAnalysis(a), score: Math.max(0, Math.min(100, Math.round(Number(a.score) || 0))) };
  }).filter(r => {
    if (state === 'done' && !r.done) return false;
    if (state === 'todo' && r.done) return false;
    if (!needle) return true;
    return [r.client && r.client.name, r.client && r.client.city, r.audit.title].filter(Boolean).join(' ').toLowerCase().includes(needle);
  });
  rows.sort((x, y) => stamp(y.audit).localeCompare(stamp(x.audit)));
  return rows;
}

// Date de l'analyse : celle réellement enregistrée par le moteur, sinon la dernière mise à jour.
export function auditDate(a) {
  const iso = (a.site && a.site.analyzedAt) || (a.scan && a.scan.analyzedAt) || a.updated_at || a.created_at || '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* Tout ce que le dossier affiche, calculé avec les fonctions du moteur existant — aucune valeur ajoutée à la main. */
export function auditAnalysis(a, c) {
  const done = auditHasAnalysis(a);
  if (!done) return { done: false };
  const diag = visibilityAudit(a, c);
  const lighthouse = a.scan && a.scan.scores ? a.scan.scores : null;
  return {
    done: true, diag,
    score: diag.index, hasScore: diag.hasScore,
    verdict: visibilityVerdict(diag.index, diag),
    label: diag.hasScore ? visibilityLabel(diag.index) : null,
    plan: actionPlan(a, c, diag),
    actions: auditActions(a, c, diag),
    recommendations: unifiedRecommendations(improvementPlan(a, c), actionPlan(a, c, diag)),
    unmeasured: auditUnmeasured(a, c),
    lighthouse,
    scan: a.scan || null,
    site: a.site || null,
  };
}

// Historique : les audits du même client, du plus récent au plus ancien.
export function clientAuditHistory(audits, clientId) {
  return audits.filter(a => String(a.client_id) === String(clientId)).slice().sort((x, y) => stamp(y).localeCompare(stamp(x)));
}

/* Résultat d'un audit à appliquer localement dès l'enregistrement confirmé (comme l'ancienne interface),
   sans attendre le rechargement réseau. */
export function applyAuditResult(data, { auditId, clientId, payload, newDetails }) {
  return {
    ...data,
    audits: data.audits.map(x => String(x.id) === String(auditId) ? { ...x, ...payload } : x),
    clients: newDetails ? data.clients.map(x => String(x.id) === String(clientId) ? { ...x, details: newDetails } : x) : data.clients,
  };
}
