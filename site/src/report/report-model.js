// AuditIA — modèle du rapport d'audit (lot 5). Logique PURE : lit un dossier d'audit, n'écrit rien, n'appelle aucun réseau.
// Le même modèle alimente l'aperçu à l'écran et le PDF : les deux ne peuvent donc pas se contredire.
// Règle absolue : on n'invente aucune valeur. Une donnée absente est « non mesurée » (jamais un défaut), un site
// inexistant est « sans objet », et l'historique n'existe qu'avec au moins deux audits réellement analysés.
import { auditAnalysis, auditDate } from '../data/audits.js';
import { auditHasAnalysis } from '../audit/scoring.js';

export const REPORT_TITLE = 'Rapport de visibilité numérique';
const MAX_COMPETITORS = 10;   // lignes affichées (le commerce audité est toujours conservé)
const MAX_PLAN = 10;
const MAX_RECO = 10;
const MAX_POINTS = 8;

const num = v => (v == null || v === '' ? null : (Number.isFinite(Number(v)) ? Number(v) : null));
const clean = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
const plural = (n, one, many) => (n > 1 ? many : one);

/* Même seuils que l'écran : vert ≥ 75, ambre ≥ 50, rouge sinon. */
export function toneOf(v) {
  const n = num(v);
  if (n == null) return 'none';
  return n >= 75 ? 'good' : n >= 50 ? 'warn' : 'bad';
}

const pad = n => String(n).padStart(2, '0');
const fmtLong = d => d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const fmtShort = d => d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '';
const isoDay = d => d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '';

export function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'commerce';
}

/* Sources de données : statut déduit UNIQUEMENT de ce qui est enregistré dans le dossier. */
function buildSources(a, c) {
  const d = (c && c.details) || {};
  const si = a && a.site, sc = a && a.scan;
  const hasSite = !!String((c && c.website) || d.website || '').trim();
  const out = [];
  const add = (name, status, detail) => out.push({ name, status, detail });

  const rating = num(d.rating), reviews = num(d.reviews);
  if (rating != null || reviews != null) {
    add('Fiche Google (Google Places)', 'measured', [rating != null ? 'Note ' + String(rating).replace('.', ',') + '/5' : '', reviews != null ? reviews + ' avis' : ''].filter(Boolean).join(' · '));
  } else add('Fiche Google (Google Places)', 'unmeasured', 'Note et avis non fournis pour ce commerce.');

  const photos = num(d.photoCount);
  if (photos != null) add('Photos de la fiche Google', 'measured', photos + (photos >= 10 ? '+' : '') + ' ' + plural(photos, 'photo', 'photos'));
  else add('Photos de la fiche Google', 'unmeasured', 'Nombre non fourni par Google.');

  if (!hasSite) add('Lecture du site web', 'na', 'Aucun site web renseigné.');
  else if (si && si.pageRead) add('Lecture du site web', 'measured', 'Page d’accueil lue et analysée.');
  else add('Lecture du site web', 'unmeasured', si ? 'La page n’a pas pu être lue (site inaccessible ou lecture refusée).' : 'Analyse complète non lancée.');

  if (!hasSite) add('Fichiers lus par les IA (robots.txt, llms.txt)', 'na', 'Aucun site web renseigné.');
  else if (si && si.geo && si.geo.robots) add('Fichiers lus par les IA (robots.txt, llms.txt)', 'measured', 'Fichiers consultés.');
  else add('Fichiers lus par les IA (robots.txt, llms.txt)', 'unmeasured', si && si.pageRead ? 'Les fichiers n’ont pas pu être lus.' : 'Dépend de la lecture du site.');

  if (!hasSite) add('Performance du site (Google PageSpeed)', 'na', 'Aucun site web renseigné.');
  else if (sc && sc.scores && sc.scores.performance != null) add('Performance du site (Google PageSpeed)', 'measured', 'Lighthouse mobile.');
  else add('Performance du site (Google PageSpeed)', 'unmeasured', 'Google PageSpeed n’a pas répondu.');

  if (si) {
    const nS = (si.socials || []).length, nD = (si.directories || []).length;
    add('Présence web (réseaux, annuaires)', 'measured', nS + ' ' + plural(nS, 'réseau', 'réseaux') + ' · ' + nD + ' ' + plural(nD, 'annuaire', 'annuaires') + ' détecté' + (nS + nD > 1 ? 's' : ''));
  } else add('Présence web (réseaux, annuaires)', 'unmeasured', 'Analyse complète non lancée.');

  const cp = si && si.competitors;
  if (cp && Array.isArray(cp.list) && cp.list.length) add('Concurrents locaux', 'measured', cp.list.length + ' ' + plural(cp.list.length, 'commerce comparé', 'commerces comparés') + '.');
  else add('Concurrents locaux', 'unmeasured', si ? 'Aucun concurrent exploitable n’a été retourné.' : 'Analyse complète non lancée.');

  const rk = si && Array.isArray(si.rankings) ? si.rankings : null;
  if (rk && rk.some(r => !r.error)) {
    const ok = rk.filter(r => !r.error);
    add('Mots-clés explorés', 'measured', ok.filter(r => r.found).length + ' trouvé' + (ok.filter(r => r.found).length > 1 ? 's' : '') + ' sur ' + ok.length + ' recherche' + (ok.length > 1 ? 's' : '') + '.');
  } else add('Mots-clés explorés', 'unmeasured', si ? 'La recherche web n’a pas répondu.' : 'Analyse complète non lancée.');

  if (d.sirene && d.sirene.matched) add('Registre officiel (SIRENE)', 'measured', 'Entreprise retrouvée dans le registre.');
  else add('Registre officiel (SIRENE)', 'unmeasured', 'Entreprise non retrouvée ou registre indisponible : jamais compté comme un défaut.');

  if (!hasSite) add('Ancienneté du nom de domaine', 'na', 'Aucun site web renseigné.');
  else if (d.domainCreated) add('Ancienneté du nom de domaine', 'measured', 'Créé en ' + (/^\d{4}/.test(String(d.domainCreated)) ? String(d.domainCreated).slice(0, 4) : clean(d.domainCreated)) + '.');
  else add('Ancienneté du nom de domaine', 'unmeasured', 'Date de création non disponible.');
  return out;
}

/* Critères du diagnostic, regroupés par axe. */
function buildCriteria(diag) {
  const mk = x => ({
    label: clean(x.label), source: clean(x.source),
    status: !x.measured ? 'unmeasured' : x.ok ? 'ok' : 'fix',
    text: clean(!x.measured ? 'Donnée non disponible : exclu du score.' : x.ok ? x.advice : (x.gap || x.advice)),
  });
  const categories = (diag.categories || []).filter(x => x.scored).map(cat => ({
    id: clean(cat.id), label: clean(cat.label), description: clean(cat.description),
    score: num(cat.score), measuredCount: num(cat.measuredCount) || 0,
    totalCount: num(cat.totalCount) || 0, coverage: num(cat.coverage) || 0,
    fixCount: num(cat.fixCount) || 0, items: (cat.items || []).map(mk),
  }));
  const contextCategory = (diag.categories || []).find(x => x.id === 'context');
  const context = contextCategory ? {
    label: clean(contextCategory.label), description: clean(contextCategory.description),
    measuredCount: num(contextCategory.measuredCount) || 0, totalCount: num(contextCategory.totalCount) || 0,
    items: (contextCategory.items || []).map(x => ({
      label: clean(x.label), source: clean(x.source), detail: clean(x.detail),
      status: x.status === 'measured' ? 'measured' : x.status === 'na' ? 'na' : 'unmeasured',
    })),
  } : null;
  return {
    seo: diag.items.filter(x => x.pillar === 'seo').map(mk),
    geo: diag.items.filter(x => x.pillar === 'geo').map(mk),
    categories, context,
  };
}


function buildCompetitors(si) {
  const cp = si && si.competitors;
  if (!cp || !Array.isArray(cp.list) || !cp.list.length) return null;
  const all = cp.list.map(x => ({ rank: num(x.rank), name: clean(x.name) || 'Commerce', rating: num(x.rating), reviews: num(x.reviews), isSelf: !!x.isSelf }));
  let shown = all.slice(0, MAX_COMPETITORS);
  const self = all.find(x => x.isSelf);
  if (self && !shown.includes(self)) shown = shown.slice(0, MAX_COMPETITORS - 1).concat(self);   // le commerce audité reste toujours visible
  const rankedCount = num(cp.rankedTotal);
  return { list: shown, total: all.length, hidden: all.length - shown.length, selfRank: num(cp.selfRank), count: rankedCount == null ? (num(cp.total) ?? all.length) : rankedCount };
}

function buildRankings(si) {
  const rk = si && Array.isArray(si.rankings) ? si.rankings : null;
  if (!rk || !rk.length) return null;
  const rows = rk.map(r => ({ kw: clean(r.kw), status: r.error ? 'error' : r.found ? 'found' : 'notfound', pos: num(r.pos) }));
  const valid = rows.filter(r => r.status !== 'error');
  if (!valid.length) return null;
  return { rows, found: valid.filter(r => r.status === 'found').length, valid: valid.length };
}

/* Historique : uniquement les audits réellement analysés du même client, et seulement s'il y en a au moins deux. */
function buildHistory(audit, allAudits, currentScore) {
  const rows = (allAudits || []).filter(x => String(x.client_id) === String(audit.client_id) && auditHasAnalysis(x))
    .map(x => {
      const same = String(x.id) === String(audit.id);
      const d = auditDate(x);
      const v = same && currentScore != null ? currentScore : num(x.score);
      return { id: x.id, current: same, date: d, value: v };
    }).filter(r => r.date && r.value != null);
  if (rows.length < 2) return null;
  rows.sort((p, q) => p.date - q.date);
  return rows.map(r => ({ id: r.id, current: r.current, label: fmtShort(r.date), value: Math.max(0, Math.min(100, Math.round(r.value))) }));
}

function summaryText(m) {
  const out = [];
  const s = m.score;
  if (s.value != null) {
    out.push(`${m.meta.business} obtient un score de visibilité de ${s.value}/100 (${s.label.toLowerCase()}), calculé sur ${s.measured} ${plural(s.measured, 'critère mesuré', 'critères mesurés')} sur ${s.total} (${s.coverage} % de couverture).`);
  } else {
    out.push(`Les données mesurées pour ${m.meta.business} sont insuffisantes pour établir un score : ${s.measured} ${plural(s.measured, 'critère mesuré', 'critères mesurés')} sur ${s.total}.`);
  }
  out.push(s.verdict);
  const { seo, geo } = m.pillars;
  if (seo.value != null && geo.value != null) {
    const gap = Math.abs(seo.value - geo.value);
    out.push(`Le volet SEO (être trouvé sur Google) ressort à ${seo.value}/100 et le volet GEO (être compris par les assistants IA) à ${geo.value}/100` + (gap >= 5 ? `. Le volet le plus à renforcer est le ${seo.value < geo.value ? 'SEO' : 'GEO'}.` : '. Les deux volets sont au même niveau.'));
  } else if (seo.value != null) out.push(`Seul le volet SEO a pu être chiffré (${seo.value}/100) ; le volet GEO manque de données mesurées.`);
  else if (geo.value != null) out.push(`Seul le volet GEO a pu être chiffré (${geo.value}/100) ; le volet SEO manque de données mesurées.`);
  out.push(`${m.strengths.total} ${plural(m.strengths.total, 'point fort relevé', 'points forts relevés')} et ${m.weaknesses.total} ${plural(m.weaknesses.total, 'point à améliorer', 'points à améliorer')} sur les critères mesurés.`);
  if (m.plan.length) out.push(`Action prioritaire recommandée : ${m.plan[0].title}.`);
  const un = m.sources.filter(x => x.status === 'unmeasured').length;
  if (un) out.push(`${un} ${plural(un, 'source n’a pas pu être mesurée', 'sources n’ont pas pu être mesurées')} : ${plural(un, 'elle est exclue', 'elles sont exclues')} du score et ${plural(un, 'est signalée', 'sont signalées')} dans la section « Sources et fiabilité ».`);
  return out;
}

/* Construit le rapport. Renvoie { ok:false, reason } si le dossier n'a pas été analysé. Ne modifie JAMAIS ses arguments. */
export function buildReport(audit, client, allAudits = [], now = new Date()) {
  if (!audit) return { ok: false, reason: 'Dossier d’audit introuvable.' };
  const an = auditAnalysis(audit, client);
  if (!an.done) return { ok: false, reason: 'Cet audit n’a pas encore été analysé : il n’y a pas encore de rapport à produire.' };
  const diag = an.diag;
  const d = (client && client.details) || {};
  const when = auditDate(audit);
  const business = clean(client && client.name) || 'Commerce';
  const scoreVal = an.hasScore ? Math.max(0, Math.min(100, Math.round(an.score))) : null;
  const range = diag.scoreRange && diag.coverage < 100 && diag.scoreRange.low != null ? { low: Math.round(diag.scoreRange.low), high: Math.round(diag.scoreRange.high) } : null;
  const pillar = (p) => ({ value: p && p.score != null ? Math.round(p.score) : null, measured: p ? p.measuredCount : 0 });
  const countOf = k => diag.items.filter(x => x.pillar === k).length;

  const extra = new Map((an.actions || []).map(x => [x.label, x]));
  const plan = (an.plan || []).slice(0, MAX_PLAN).map((x, i) => {
    const e = extra.get(x.t) || {};
    return { n: i + 1, title: clean(x.t), detail: clean(x.d), priority: clean(x.p), axis: clean(x.axis), effort: clean(e.effort), gain: num(e.gain) };
  });
  const recommendations = (an.recommendations || []).slice(0, MAX_RECO).map(r => ({
    title: clean(r.title), axis: clean(r.axis), priority: clean(r.priority), impact: clean(r.impact), why: clean(r.why),
    how: (Array.isArray(r.how) ? r.how : []).map(clean).filter(Boolean),
  }));
  const pts = (list, kind) => ({ total: list.length, items: list.slice(0, MAX_POINTS).map(x => ({ label: clean(x.label), text: clean(kind === 'good' ? x.advice : (x.gap || x.advice)), pillar: x.pillar === 'geo' ? 'GEO' : 'SEO' })) });

  const lh = an.lighthouse && an.lighthouse.performance != null ? an.lighthouse : null;
  const metrics = lh ? Object.entries((an.scan && an.scan.metrics) || {}).filter(([, v]) => v).map(([k, v]) => ({ label: clean(k), value: clean(v) })) : [];

  const si = audit.site || null;
  const presence = si ? {
    socials: (si.socials || []).map(x => clean(x.net)).filter(Boolean),
    directories: (si.directories || []).map(x => clean(x.name)).filter(Boolean),
    hasWebsite: !!si.hasWebsite, pageRead: !!si.pageRead,
  } : null;

  const m = {
    ok: true,
    meta: {
      title: REPORT_TITLE, business, sector: clean(client && (client.category || d.category)), city: clean(client && client.city),
      address: clean(d.address), website: clean(client && client.website), phone: clean((client && client.phone) || d.phone),
      auditDate: when, auditDateLabel: fmtLong(when), generatedLabel: fmtLong(now),
      fileName: `Rapport-AuditIA-${slugify(business)}-${isoDay(when || now)}.pdf`,
      auditTitle: clean(audit.title),
    },
    score: {
      value: scoreVal, label: an.label ? an.label.t : '', tone: toneOf(scoreVal), verdict: clean(an.verdict), range,
      coverage: diag.coverage, measured: diag.measuredCount, total: diag.totalCount,
    },
    pillars: { seo: { ...pillar(diag.seo), total: countOf('seo') }, geo: { ...pillar(diag.geo), total: countOf('geo') } },

    sources: buildSources(audit, client),
    unmeasuredNotes: (an.unmeasured || []).filter(x => x.n > 0).map(x => ({ label: clean(x.label), why: clean(x.why), n: x.n })),
    infoNotes: (an.unmeasured || []).filter(x => x.n === 0).map(x => ({ label: clean(x.label), why: clean(x.why) })),
    criteria: buildCriteria(diag),
    strengths: pts(diag.strengths, 'good'),
    weaknesses: pts(diag.weaknesses, 'bad'),
    plan, recommendations,
    lighthouse: lh ? { scores: [['Performance', lh.performance], ['Accessibilité', lh.accessibility], ['Bonnes pratiques', lh.bestPractices], ['SEO technique', lh.seo]].map(([label, value]) => ({ label, value: num(value) })), metrics } : null,
    competitors: buildCompetitors(si),
    rankings: buildRankings(si),
    presence,
    history: null, summary: [],
  };
  m.history = buildHistory(audit, allAudits, scoreVal);
  m.summary = summaryText(m);

  /* Indicateurs comparables (0-100) : uniquement ceux qui ont une vraie valeur. */
  const ind = [];
  if (m.pillars.seo.value != null) ind.push({ id: 'seo', label: 'SEO · Google', value: m.pillars.seo.value, group: 'Visibilité' });
  if (m.pillars.geo.value != null) ind.push({ id: 'geo', label: 'GEO · assistants IA', value: m.pillars.geo.value, group: 'Visibilité' });
  if (m.lighthouse) m.lighthouse.scores.filter(x => x.value != null).forEach(x => ind.push({ id: 'lh-' + slugify(x.label), label: x.label, value: Math.max(0, Math.min(100, Math.round(x.value))), group: 'Performance du site' }));
  m.indicators = ind;
  return m;
}
