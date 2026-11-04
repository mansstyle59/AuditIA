// AuditIA — onglet Audits (liste) et dossier d'audit (résultats), nouvelle interface, lot 4.
// Tout est calculé par le moteur existant (visibilityAudit, actionPlan, improvementPlan…) : aucune valeur ajoutée à la main.
// Un critère non mesuré est affiché « non mesuré », jamais comme un défaut.
import { btn, card, badge, scoreBadge, scoreTone, bar, emptyState, avatar, searchField } from '../components/ui.js';
import { auditList, auditAnalysis, auditDate, clientAuditHistory } from '../../data/audits.js';
import { escHtml, safeHttpUrl } from '../../core/utils.js';
import { liveHtml, bannerSlot } from './audit-live.js';

const fmtDate = d => d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
const fmtDateTime = d => d ? d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export function noticeBlock(n) {
  if (!n) return '';
  const cls = n.kind === 'error' ? 'ds-msg ds-msg--error' : n.kind === 'warn' ? 'ds-msg ds-msg--warn' : 'ds-msg ds-msg--ok';
  return `<div class="${cls}" role="${n.kind === 'error' ? 'alert' : 'status'}">${escHtml(n.text)} <button type="button" class="ds-linkbtn" data-audit-dismiss>Fermer</button></div>`;
}

/* ---------- Liste des audits ---------- */
export function auditsResultsHtml(d, f, runningId) {
  const rows = auditList(d.audits, d.clients, f);
  if (!d.audits.length) return emptyState({ title: 'Aucun audit', text: 'Aucun audit pour le moment. Ouvrez la fiche d’un client pour lancer son premier audit, ou ajoutez un commerce depuis Prospects.' });
  if (!rows.length) return emptyState({ title: 'Aucun résultat', text: 'Aucun audit ne correspond à cette recherche.' });
  const items = rows.map(({ audit: a, client: c, done, score }) => {
    const busy = String(runningId) === String(a.id);
    const date = fmtDate(auditDate(a));
    const right = busy ? badge('En cours', 'warn') : done ? scoreBadge(score) : badge('À analyser');
    const action = busy ? `<button type="button" class="ds-btn ds-btn--primary" data-open-audit="${escHtml(a.id)}">Suivre</button>`
      : done ? `<button type="button" class="ds-btn" data-open-audit="${escHtml(a.id)}">Ouvrir</button><button type="button" class="ds-btn" data-report-pdf="${escHtml(a.id)}" aria-label="Télécharger le rapport PDF de ${escHtml((c && c.name) || 'ce commerce')}">PDF</button>`
        : `<button type="button" class="ds-btn ds-btn--primary" data-audit-run="${escHtml(a.id)}" ${runningId ? 'disabled' : ''}>Analyser</button>`;
    return `<li class="ds-audit-row">
      <button type="button" class="ds-audit-row__main" data-open-audit="${escHtml(a.id)}">${avatar(c && c.name)}
        <span class="ds-row__main"><span class="ds-row__title">${escHtml((c && c.name) || 'Commerce')}</span><span class="ds-row__meta">${escHtml([c && c.city, a.title].filter(Boolean).join(' · '))}</span></span></button>
      <span class="ds-audit-row__date">${escHtml(done ? date : 'Pas encore analysé')}</span>
      <span class="ds-audit-row__score">${right}</span>
      <span class="ds-audit-row__act">${action}</span></li>`;
  }).join('');
  return `<div class="ds-audit-head" aria-hidden="true"><span>Commerce</span><span>Date</span><span>Score</span><span></span></div><ul class="ds-audit-rows">${items}</ul>`;
}

export function auditsView(d, f, notice, snap) {
  const done = d.audits.filter(a => auditList([a], d.clients).some(r => r.done)).length;
  const mk = (v, label) => `<button type="button" class="ds-chip${f.state === v ? ' is-on' : ''}" data-audit-state="${v}" aria-pressed="${f.state === v}">${label}</button>`;
  return `${bannerSlot(snap)}${noticeBlock(notice)}
    <section class="ds-card ds-audit-intro"><h2 class="ds-card__title">Vos audits</h2>
      <p class="ds-row__meta">${d.audits.length} audit${d.audits.length > 1 ? 's' : ''} · ${done} analysé${done > 1 ? 's' : ''}. Le score n’apparaît qu’après une analyse réelle.</p>
      ${searchField({ value: f.q, placeholder: 'Rechercher un commerce, une ville…', label: 'Rechercher un audit', attrs: 'data-audit-filter' })}
      <div class="ds-chips" role="group" aria-label="Filtrer par état">${mk('done', 'Analysés')}${mk('todo', 'À analyser')}</div>
    </section>
    <div id="auditsResults">${auditsResultsHtml(d, f, snap && snap.status === 'running' ? snap.auditId : null)}</div>`;
}

/* ---------- Dossier d'audit ---------- */
function ring(score) {
  const n = Math.max(0, Math.min(100, Math.round(score)));
  const r = 52, circ = 2 * Math.PI * r;
  return `<svg class="ds-ring ds-ring--${scoreTone(n)}" viewBox="0 0 120 120" role="img" aria-label="Score ${n} sur 100"><circle class="ds-ring__bg" cx="60" cy="60" r="${r}"/><circle class="ds-ring__fg" cx="60" cy="60" r="${r}" stroke-dasharray="${(circ * n / 100).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 60 60)"/><text x="60" y="62" text-anchor="middle" dominant-baseline="middle" class="ds-ring__num">${n}</text><text x="60" y="84" text-anchor="middle" class="ds-ring__sub">/100</text></svg>`;
}

function scoreCard(an) {
  const diag = an.diag;
  const pill = (label, p) => p && p.score != null ? bar({ label, pct: p.score }) : `<p class="ds-row__meta">${escHtml(label)} : non mesurable (données insuffisantes).</p>`;
  const range = diag.scoreRange && diag.coverage < 100 && diag.scoreRange.low != null
    ? `<p class="ds-row__meta">Fourchette selon les contrôles non mesurés : ${escHtml(diag.scoreRange.low)} à ${escHtml(diag.scoreRange.high)} /100.</p>` : '';
  const head = an.hasScore
    ? `<div class="ds-scorebox">${ring(an.score)}<div class="ds-scorebox__txt">${an.label ? badge(an.label.t, an.label.c === 'ok' ? 'good' : an.label.c === 'mid' ? 'warn' : 'danger') : ''}<p>${escHtml(an.verdict)}</p></div></div>`
    : `<p class="ds-msg ds-msg--warn">${escHtml(an.verdict)}</p>`;
  return card({
    title: 'Score de visibilité',
    body: `${head}${pill('SEO · être trouvé sur Google', diag.seo)}${pill('GEO · être compris par les IA', diag.geo)}
      <p class="ds-row__meta">${escHtml(diag.measuredCount)} contrôle${diag.measuredCount > 1 ? 's' : ''} mesuré${diag.measuredCount > 1 ? 's' : ''} sur ${escHtml(diag.totalCount)} (${escHtml(diag.coverage)} %). Un contrôle non mesuré est exclu du calcul.</p>${range}`,
  });
}

function planCard(an) {
  if (!an.plan.length) return card({ title: 'Plan d’action', body: '<p class="ds-row__meta">Aucune action prioritaire : tous les contrôles mesurés sont conformes.</p>' });
  const extra = new Map(an.actions.map(x => [x.label, x]));
  const tone = p => p === 'Haute' ? 'danger' : p === 'Moyenne' ? 'warn' : 'neutral';
  const items = an.plan.map((x, i) => {
    const e = extra.get(x.t) || {};
    const href = e.where && safeHttpUrl(e.where.href);
    const meta = [x.axis, e.effort ? 'Effort : ' + e.effort : '', e.gain != null ? 'Gain estimé : +' + e.gain + ' pts' : ''].filter(Boolean).join(' · ');
    return `<li class="ds-plan"><span class="ds-plan__n">${i + 1}</span><div class="ds-plan__body"><div class="ds-plan__top"><b>${escHtml(x.t)}</b>${badge('Priorité ' + x.p.toLowerCase(), tone(x.p))}</div>
      <p>${escHtml(x.d)}</p><span class="ds-row__meta">${escHtml(meta)}</span>${href ? `<a class="ds-linkbtn" href="${escHtml(href)}" target="_blank" rel="noopener noreferrer">${escHtml(e.where.t)} ↗</a>` : ''}</div></li>`;
  }).join('');
  return card({ title: 'Plan d’action', body: `<ol class="ds-plans">${items}</ol><p class="ds-row__meta">Actions issues des seuls contrôles mesurés et non conformes.</p>` });
}

function recoCard(an) {
  const list = an.recommendations.slice(0, 10);
  if (!list.length) return '';
  const tone = p => p === 'Haute' ? 'danger' : p === 'Moyenne' ? 'warn' : 'neutral';
  const items = list.map(r => `<details class="ds-reco"><summary><span>${escHtml(r.title)}</span>${badge(r.priority, tone(r.priority))}</summary>
    <div class="ds-reco__body"><span class="ds-row__meta">${escHtml(r.axis)}${r.impact ? ' · Impact ' + escHtml(String(r.impact).toLowerCase()) : ''}</span><p>${escHtml(r.why)}</p>
    ${Array.isArray(r.how) && r.how.length ? `<ul>${r.how.map(h => `<li>${escHtml(h)}</li>`).join('')}</ul>` : ''}</div></details>`).join('');
  return card({ title: 'Recommandations', body: `<div class="ds-recos">${items}</div>` });
}

function criteriaCard(an) {
  const categories = Array.isArray(an.diag.categories) ? an.diag.categories : [];
  const scored = categories.filter(x => x.scored);
  const tone = score => score == null ? 'neutral' : score >= 75 ? 'good' : score >= 50 ? 'warn' : 'danger';
  const categoryRows = scored.map((cat, i) => {
    const items = Array.isArray(cat.items) ? cat.items : [];
    const measured = items.filter(x => x.measured).length;
    const scoreText = cat.score == null ? 'Non mesuré' : cat.score + '/100';
    const stateText = cat.score == null ? 'Données insuffisantes' : cat.fixCount
      ? cat.fixCount + ' point' + (cat.fixCount > 1 ? 's' : '') + ' à corriger'
      : 'Aucun défaut relevé parmi les contrôles mesurés';
    const meter = cat.score == null ? '' : `<div class="ds-cat-meter" role="img" aria-label="Score de catégorie : ${cat.score} sur 100"><span class="ds-cat-meter__fill ds-cat-meter__fill--${tone(cat.score)}" style="width:${Math.max(0,Math.min(100,cat.score))}%"></span></div>`;
    const rows = items.length ? items.map(x => {
      const st = !x.measured ? badge('Non mesuré') : x.ok ? badge('Conforme', 'good') : badge('À corriger', 'danger');
      const txt = !x.measured ? 'Donnée non disponible : exclue du score.' : x.ok ? x.advice : (x.gap || x.advice);
      return `<li class="ds-crit"><div class="ds-crit__top"><span class="ds-crit__name">${escHtml(x.label)}</span>${st}</div><p class="ds-row__meta">${escHtml(txt)}</p><span class="ds-row__meta ds-crit__src">Source : ${escHtml(x.source)}</span></li>`;
    }).join('') : '<li class="ds-crit"><p class="ds-row__meta">Aucun contrôle exploitable pour cette catégorie lors de cet audit.</p></li>';
    return `<details class="ds-crit-group ds-cat-group"${i === 0 ? ' open' : ''}>
      <summary class="ds-cat-summary"><span class="ds-cat-summary__main"><b>${escHtml(cat.label)}</b><small>${escHtml(cat.description || '')}</small><span class="ds-cat-summary__state">${escHtml(stateText)}</span></span>
        <span class="ds-cat-summary__score">${badge(scoreText, tone(cat.score))}<small>${measured}/${items.length} mesurés</small></span>
      </summary>
      ${meter}<ul class="ds-crits">${rows}</ul>
      <p class="ds-cat-foot">${cat.coverage}% de couverture de cette catégorie · les contrôles non mesurés ne sont pas considérés comme des défauts.</p>
    </details>`;
  }).join('');

  const context = categories.find(x => x.id === 'context');
  const contextRows = context && Array.isArray(context.items) ? context.items.map(x => {
    const st = x.status === 'measured' ? badge('Donnée disponible', 'good') : x.status === 'na' ? badge('Sans objet') : badge('Non mesuré');
    return `<li class="ds-crit"><div class="ds-crit__top"><span class="ds-crit__name">${escHtml(x.label)}</span>${st}</div><p class="ds-row__meta">${escHtml(x.detail)}</p><span class="ds-row__meta ds-crit__src">Source : ${escHtml(x.source)}</span></li>`;
  }).join('') : '';
  const contextBlock = contextRows ? `<details class="ds-crit-group ds-cat-group"><summary class="ds-cat-summary"><span class="ds-cat-summary__main"><b>${escHtml(context.label)}</b><small>${escHtml(context.description)}</small><span class="ds-cat-summary__state">Informations de contexte · non notées</span></span><span class="ds-cat-summary__score">${badge((context.measuredCount || 0) + '/' + (context.totalCount || 0) + ' disponibles')}</span></summary><ul class="ds-crits">${contextRows}</ul><p class="ds-cat-foot">Ces éléments apportent du contexte. Ils n’augmentent ni ne diminuent le score global.</p></details>` : '';
  const measured = an.diag.measuredCount, total = an.diag.totalCount;
  return card({
    title: 'Diagnostic détaillé par catégorie',
    body: `<p class="ds-row__meta ds-cat-intro">Chaque domaine possède son propre score et son taux de couverture. Seuls les contrôles réellement mesurés entrent dans les scores ; une donnée manquante reste neutre.</p>
      <div class="ds-cat-overview"><strong>${measured}/${total} contrôles mesurés</strong><span>${an.diag.coverage}% de couverture globale</span></div>
      ${categoryRows}${contextBlock}`,
  });
}

function strengthsCard(an) {
  const s = an.diag.strengths.slice(0, 8), w = an.diag.weaknesses.slice(0, 8);
  const li = (x, cls) => `<li class="${cls}"><b>${escHtml(x.label)}</b><span class="ds-row__meta">${escHtml(x.ok ? x.advice : x.gap)}</span></li>`;
  return card({
    title: 'Points forts et points faibles', extraClass: 'ds-sw-card',
    body: `<div class="ds-sw"><div><h3 class="ds-sub ds-sub--good">Points forts</h3>${s.length ? `<ul class="ds-sw__list">${s.map(x => li(x, 'is-good')).join('')}</ul>` : '<p class="ds-row__meta">Aucun point fort mesuré pour l’instant.</p>'}</div>
      <div><h3 class="ds-sub ds-sub--bad">Points faibles</h3>${w.length ? `<ul class="ds-sw__list">${w.map(x => li(x, 'is-bad')).join('')}</ul>` : '<p class="ds-row__meta">Aucun point faible mesuré.</p>'}</div></div>`,
  });
}

/* Sources non mesurées : celles du dossier enregistré (auditUnmeasured) + les limites vues pendant la dernière analyse. */
function unavailableCard(an, run) {
  const um = an.unmeasured.filter(x => x.n > 0);
  const info = an.unmeasured.filter(x => x.n === 0);
  const lim = run && run.issues && run.issues.length ? run.issues : [];
  if (!um.length && !lim.length && !info.length) return '';
  const rows = um.map(x => `<li><b>${escHtml(x.label)}</b><span class="ds-row__meta">Non mesuré : ${escHtml(x.why)}.</span></li>`).join('');
  const li = lim.length ? `<h3 class="ds-sub">Limites rencontrées lors de la dernière analyse</h3><ul class="ds-sw__list">${lim.map(x => `<li class="is-bad"><span class="ds-row__meta">${escHtml(x[0].toUpperCase() + x.slice(1))}</span></li>`).join('')}</ul>` : '';
  return card({
    title: 'Sources indisponibles',
    body: `${um.length ? `<ul class="ds-sw__list">${rows}</ul>` : '<p class="ds-row__meta">Toutes les sources attendues ont répondu.</p>'}${li}${info.map(x => `<p class="ds-row__meta">${escHtml(x.label)} : ${escHtml(x.why)}.</p>`).join('')}`,
  });
}

function lighthouseCard(an) {
  const sc = an.lighthouse;
  if (!sc) return '';
  const g = (label, v) => `<div class="ds-gauge ds-gauge--${v == null ? 'none' : scoreTone(v)}"><b>${v == null ? '—' : escHtml(v)}</b><span>${escHtml(label)}</span></div>`;
  const metrics = Object.entries((an.scan && an.scan.metrics) || {}).filter(([, v]) => v);
  return card({
    title: 'Performance du site (mobile)',
    body: `<div class="ds-gauges">${g('Performance', sc.performance)}${g('Accessibilité', sc.accessibility)}${g('Bonnes pratiques', sc.bestPractices)}${g('SEO technique', sc.seo)}</div>
      ${metrics.length ? `<dl class="ds-info">${metrics.map(([k, v]) => `<div><dt>${escHtml(k)}</dt><dd>${escHtml(v)}</dd></div>`).join('')}</dl>` : ''}
      <p class="ds-row__meta">Mesuré par Google PageSpeed Insights (Lighthouse mobile).</p>`,
  });
}

function competitorsCard(an) {
  const cp = an.site && an.site.competitors;
  if (!cp || !Array.isArray(cp.list) || !cp.list.length) return '';
  const rows = cp.list.map(x => `<li class="ds-cp${x.isSelf ? ' is-self' : ''}"><span class="ds-cp__rank">${escHtml(x.rank)}</span><span class="ds-cp__name">${escHtml(x.name)}${x.isSelf ? ' (ce commerce)' : ''}</span><span class="ds-row__meta">${x.rating != null ? '★ ' + escHtml(x.rating) + ' · ' : ''}${escHtml(x.reviews)} avis</span></li>`).join('');
  return card({
    title: 'Concurrents proches',
    body: `<ul class="ds-cps">${rows}</ul><p class="ds-row__meta">${cp.selfRank ? 'Rang par nombre d’avis : n°' + escHtml(cp.selfRank) + ' sur ' + escHtml(cp.total) + '. ' : ''}Ce n’est pas le classement de Google Maps.</p>`,
  });
}

function rankingsCard(an) {
  const rk = an.site && an.site.rankings;
  if (!Array.isArray(rk) || !rk.length) return '';
  const rows = rk.map(r => `<li class="ds-rk"><span>${escHtml(r.kw)}</span>${r.error ? badge('Recherche indisponible') : r.found ? badge('Position ' + r.pos, r.pos <= 3 ? 'good' : r.pos <= 10 ? 'warn' : 'neutral') : badge('Non trouvé (20 premiers)', 'danger')}</li>`).join('');
  return card({ title: 'Mots-clés explorés', body: `<ul class="ds-rks">${rows}</ul><p class="ds-row__meta">Échantillon d’une recherche web : pas un classement Google Maps.</p>` });
}

function presenceCard(an) {
  const si = an.site;
  if (!si) return '';
  const socials = (si.socials || []).filter(x => safeHttpUrl(x.url));
  const dirs = (si.directories || []).filter(x => safeHttpUrl(x.url));
  const rows = [
    ...socials.map(x => [x.net, x.url]), ...dirs.map(x => [x.name, x.url]),
  ].map(([n, u]) => `<li><a class="ds-linkbtn" href="${escHtml(safeHttpUrl(u))}" target="_blank" rel="noopener noreferrer">${escHtml(n)} ↗</a></li>`).join('');
  const pageLine = si.hasWebsite ? (si.pageRead ? 'Page du site lue' + (typeof si.title === 'string' && si.title ? ' : « ' + si.title + ' »' : '.') : 'La page du site n’a pas pu être lue : les critères de contenu ne sont pas notés.') : 'Pas de site web renseigné.';
  return card({ title: 'Présence en ligne', body: `<p class="ds-row__meta">${escHtml(pageLine)}</p>${rows ? `<ul class="ds-linklist">${rows}</ul>` : '<p class="ds-row__meta">Aucun réseau ni annuaire détecté.</p>'}` });
}

function historyCard(history, currentId) {
  if (history.length < 2) return '';
  const rows = history.map(a => {
    const done = a.status === 'Analysé' || a.site || a.scan;
    return `<li><button type="button" class="ds-row ds-row--btn" data-open-audit="${escHtml(a.id)}"><span class="ds-row__main"><span class="ds-row__title">${escHtml(a.title || 'Audit')}${String(a.id) === String(currentId) ? ' (affiché)' : ''}</span><span class="ds-row__meta">${escHtml(fmtDate(auditDate(a)) || '—')}</span></span>${done ? scoreBadge(Math.round(Number(a.score) || 0)) : badge('À analyser')}<span class="ds-row__chev" aria-hidden="true">›</span></button></li>`;
  }).join('');
  return card({ title: 'Historique des audits', body: `<ul class="ds-list">${rows}</ul>` });
}

function clientCard(c) {
  if (!c) return '';
  const d = c.details || {};
  const s = d.sirene && d.sirene.matched ? d.sirene : {};
  const rows = [
    ['Adresse', d.address || [s.adresse, s.codePostal, s.ville].filter(Boolean).join(' ')],
    ['Téléphone', c.phone || d.phone],
    ['E-mail', d.email],
    ['Site web', c.website || d.website],
    ['SIREN', s.siren],
    ['SIRET du siège', s.siret],
    ['Raison sociale', s.denomination],
    ['Date de création', s.dateCreation],
    ['Forme juridique', s.formeJuridique],
    ['Activité / code APE', [s.naf, s.nafSection].filter(Boolean).join(' · ')],
    ['Établissements déclarés', s.etablissements],
    ['État administratif', s.etatAdministratif === 'A' ? 'Actif' : s.etatAdministratif === 'F' ? 'Fermé' : s.etatAdministratif],
    ['Note Google', d.rating != null ? '★ ' + d.rating + ' (' + (d.reviews || 0) + ' avis)' : ''],
    ['Horaires Google', Array.isArray(d.hours) ? d.hours.join(' · ') : '']
  ].filter(r => r[1] != null && String(r[1]).trim() !== '');
  const legal = s.siren ? '<p class="ds-row__meta">Source : <a href="https://annuaire-entreprises.data.gouv.fr/entreprise/' + encodeURIComponent(s.siren) + '" target="_blank" rel="noopener noreferrer">Annuaire des Entreprises ↗</a> · Correspondance ' + escHtml(s.matchConfidence || 'à vérifier') + '</p>' : '<p class="ds-row__meta">Informations légales non confirmées : lancez une analyse complète pour interroger le registre public. Aucune donnée n’est déduite.</p>';
  return card({ title: 'Fiche complète du commerce', body: '<dl class="ds-info">' + rows.map(([k, v]) => '<div><dt>' + escHtml(k) + '</dt><dd>' + escHtml(Array.isArray(v) ? v.join(' · ') : v) + '</dd></div>').join('') + '</dl>' + legal + btn({ label: 'Ouvrir la fiche client', attrs: 'data-open-client="' + escHtml(c.id) + '"' }) });
}

export function auditDossierView(a, c, d, ctl) {
  const snap = ctl.snapshot();
  const mine = snap && String(snap.auditId) === String(a.id) ? snap : null;
  const busyElsewhere = snap && snap.status === 'running' && !mine;
  const an = auditAnalysis(a, c);
  const run = mine && mine.status === 'done' ? mine : ctl.last(a.id);
  const date = fmtDateTime(auditDate(a));
  const canRun = !(snap && snap.status === 'running');
  const head = `<section class="ds-card ds-dossier-head">
    <div class="ds-client-id">${avatar(c && c.name)}<div class="ds-client-id__txt"><h2>${escHtml((c && c.name) || 'Commerce')}</h2>
      <p class="ds-row__meta">${escHtml([c && c.city, a.title].filter(Boolean).join(' · '))}</p>
      <p class="ds-row__meta">${an.done ? 'Analysé le ' + escHtml(date) : 'Pas encore analysé'}</p></div></div>
    <div class="ds-d-actions">
      ${an.done && canRun ? btn({ label: 'Télécharger le rapport PDF', variant: 'primary', attrs: `data-report-pdf="${escHtml(a.id)}"` }) + btn({ label: 'Prévisualiser le rapport', attrs: `data-report-preview="${escHtml(a.id)}"` }) : ''}
      ${canRun ? btn({ label: an.done ? 'Relancer l’analyse' : 'Lancer l’analyse', variant: an.done ? 'default' : 'primary', attrs: `data-audit-run="${escHtml(a.id)}"` }) : ''}
      ${c ? btn({ label: 'Fiche client', attrs: `data-open-client="${escHtml(c.id)}"` }) : ''}</div></section>`;
  const back = `<div class="ds-backrow">${btn({ label: '← Audits', attrs: 'data-nav="audits"' })}</div>`;
  const common = `${back}${bannerSlot(busyElsewhere ? snap : null, a.id)}${noticeBlock(ctl.notice())}`;

  if (mine && mine.status === 'running') {
    return `${common}${head}<section class="ds-card" id="auditLive">${liveHtml(mine)}</section>`;
  }
  const ended = mine && (mine.status === 'error' || mine.status === 'done')
    ? `<section class="ds-card" id="auditLive">${liveHtml(mine)}<div class="ds-d-actions">${btn({ label: 'Masquer ce résumé', attrs: 'data-audit-ack' })}</div></section>` : '';
  if (!an.done) {
    const site = String((c && c.website) || '').trim();
    const intro = card({
      title: 'Analyse complète',
      body: `<p class="ds-row__meta">${site ? 'Lecture du site, réseaux et annuaires, informations légales, photos Google, âge du domaine, capture, concurrents, PageSpeed, mots-clés et fichiers IA : 10 sources interrogées en parallèle, chacune avec un délai maximum.' : 'Ce commerce n’a pas de site web : l’analyse s’appuie sur la fiche Google, la présence web, les concurrents et les mots-clés. Ajoutez un site pour l’analyse complète.'}</p>
        <p class="ds-row__meta">Une source indisponible n’arrête pas l’audit : elle est signalée comme non mesurée.</p>
        ${canRun ? btn({ label: 'Lancer l’analyse', variant: 'primary', attrs: `data-audit-run="${escHtml(a.id)}"` }) : '<p class="ds-row__meta">Une autre analyse est en cours.</p>'}`,
    });
    return `${common}${head}${ended}${intro}${c ? clientCard(c) : ''}`;
  }
  const main = `${scoreCard(an)}${planCard(an)}${recoCard(an)}${criteriaCard(an)}`;
  const side = `${strengthsCard(an)}${unavailableCard(an, run)}${lighthouseCard(an)}${competitorsCard(an)}${rankingsCard(an)}${presenceCard(an)}${historyCard(clientAuditHistory(d.audits, a.client_id), a.id)}${clientCard(c)}`;
  return `${common}${head}${ended}<div class="ds-detail ds-dossier"><div class="ds-d-stack ds-detail__main">${main}</div><div class="ds-d-stack ds-detail__side">${side}</div></div>`;
}
