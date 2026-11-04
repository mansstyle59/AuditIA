// AuditIA — aperçu HTML du rapport (lot 5). Même modèle et mêmes graphiques que le PDF.
// L'aperçu est du HTML (fiable sur iPhone, sans iframe PDF) : feuille blanche lisible, sections empilées sur mobile.
import { escHtml } from '../core/utils.js';
import { chartData, gaugeSvg, barsSvg, lineSvg } from './report-charts.js';
import { toneOf } from './report-model.js';

const plural = (n, a, b) => (n > 1 ? b : a);
const frNum = n => String(n).replace('.', ',');
const pill = (text, tone = 'none') => `<span class="rp-pill rp-pill--${tone}">${escHtml(text)}</span>`;
const sec = (n, title, body, id) => `<section class="rp-sec"${id ? ` data-rp-sec="${id}"` : ''}><h3 class="rp-h"><span class="rp-n">${n}</span>${escHtml(title)}</h3>${body}</section>`;
const note = t => `<p class="rp-note">${escHtml(t)}</p>`;
const prioTone = p => (p === 'Haute' ? 'bad' : p === 'Moyenne' ? 'warn' : 'none');

function tiles(m) {
  const lab = v => v == null ? 'Non mesuré' : toneOf(v) === 'good' ? 'Solide' : toneOf(v) === 'warn' ? 'À consolider' : 'À renforcer';
  const t = (label, value, sub, tone) => `<div class="rp-tile rp-tile--${tone}"><span class="rp-tile__l">${escHtml(label)}</span><b>${escHtml(value)}</b><span class="rp-tile__s">${escHtml(sub)}</span></div>`;
  const p = m.pillars, cov = m.score.coverage;
  return `<div class="rp-tiles">${t('Score global', m.score.value != null ? m.score.value + '/100' : '—', m.score.value != null ? m.score.label : 'Données insuffisantes', m.score.tone)}
    ${t('SEO · Google', p.seo.value != null ? p.seo.value + '/100' : '—', lab(p.seo.value), toneOf(p.seo.value))}
    ${t('GEO · IA', p.geo.value != null ? p.geo.value + '/100' : '—', lab(p.geo.value), toneOf(p.geo.value))}
    ${t('Couverture', cov + ' %', `${m.score.measured}/${m.score.total} critères`, cov >= 75 ? 'good' : cov >= 50 ? 'warn' : 'bad')}</div>`;
}

const statusPill = s => s === 'ok' ? pill('Conforme', 'good') : s === 'fix' ? pill('À améliorer', 'bad') : pill('Non mesuré');
const srcPill = s => s === 'measured' ? pill('Mesuré', 'good') : s === 'na' ? pill('Sans objet') : pill('Non mesuré', 'warn');

function criteria(title, list, p) {
  if (!list.length) return '';
  const meas = list.filter(x => x.status !== 'unmeasured').length;
  return `<details class="rp-det"><summary><span>${escHtml(title)}</span><span class="rp-sum">${meas} mesuré${meas > 1 ? 's' : ''} / ${list.length}${p.value != null ? ' · ' + p.value + '/100' : ''}</span></summary>
    <ul class="rp-rows">${list.map(x => `<li><div class="rp-row__top"><b>${escHtml(x.label)}</b>${statusPill(x.status)}</div><p>${escHtml(x.text)}</p>${x.status !== 'unmeasured' && x.source ? `<span class="rp-src">Source : ${escHtml(x.source)}</span>` : ''}</li>`).join('')}</ul></details>`;
}

export function reportPreviewHtml(m) {
  if (!m || !m.ok) return `<p class="rp-note" role="alert">${escHtml((m && m.reason) || 'Rapport indisponible.')}</p>`;
  const cd = chartData(m);
  let n = 0;
  const out = [];

  out.push(`<header class="rp-cover"><span class="rp-brand">AuditIA</span><span class="rp-kicker">${escHtml(m.meta.title)}</span>
    <h2 class="rp-biz">${escHtml(m.meta.business)}</h2>
    ${[m.meta.sector, m.meta.city].filter(Boolean).length ? `<p class="rp-sub">${escHtml([m.meta.sector, m.meta.city].filter(Boolean).join(' · '))}</p>` : ''}
    ${m.meta.auditDateLabel ? `<p class="rp-date">Audit réalisé le ${escHtml(m.meta.auditDateLabel)}</p>` : ''}</header>
    <div class="rp-scorebox">${gaugeSvg(cd.score)}<div class="rp-scoretxt">${m.score.value != null ? pill(m.score.label, m.score.tone) : pill('Score indisponible')}<p>${escHtml(m.score.verdict)}</p>
      <p class="rp-note">${escHtml(`${m.score.measured} ${plural(m.score.measured, 'critère mesuré', 'critères mesurés')} sur ${m.score.total} (${m.score.coverage} % de couverture). Les critères non mesurés sont exclus du score.`)}</p>
      ${m.score.range ? `<p class="rp-note">Fourchette possible : ${m.score.range.low} à ${m.score.range.high} /100.</p>` : ''}</div></div>`);

  n++; out.push(sec(n, 'Synthèse de l’audit', `${m.summary.map((s, i) => `<p class="${i === 0 ? 'rp-lead' : ''}">${escHtml(s)}</p>`).join('')}${tiles(m)}
    <h4 class="rp-h4">Indicateurs disponibles</h4>
    ${cd.indicators.length ? barsSvg(cd.indicators, { title: 'Indicateurs disponibles (sur 100)', id: 'indicators', suffix: '' }) : note('Aucun indicateur chiffré n’est disponible : les données mesurées sont insuffisantes.')}
    ${cd.pillars.some(p => p.value == null) ? note('Un volet sans valeur n’a pas pu être chiffré : ses données ne sont pas disponibles.') : ''}`, 'summary'));

  n++; out.push(sec(n, 'Indicateurs SEO et GEO', `${note('Chaque critère est mesuré à partir d’une source identifiée. Un critère « non mesuré » est exclu du score : ce n’est ni un défaut ni une réussite.')}
    ${criteria('SEO · être trouvé sur Google', m.criteria.seo, m.pillars.seo)}${criteria('GEO · être compris par les assistants IA', m.criteria.geo, m.pillars.geo)}`, 'criteria'));

  const nMeas = m.sources.filter(s => s.status === 'measured').length, nUn = m.sources.filter(s => s.status === 'unmeasured').length, nNa = m.sources.filter(s => s.status === 'na').length;
  n++; out.push(sec(n, 'Sources et fiabilité des mesures', `${note(`${nMeas} source${nMeas > 1 ? 's' : ''} mesurée${nMeas > 1 ? 's' : ''}, ${nUn} non mesurée${nUn > 1 ? 's' : ''}${nNa ? `, ${nNa} sans objet` : ''}. Une source non mesurée n’a pas répondu : aucune valeur n’est estimée à sa place.`)}
    <ul class="rp-rows">${m.sources.map(s => `<li data-source-status="${s.status}"><div class="rp-row__top"><b>${escHtml(s.name)}</b>${srcPill(s.status)}</div><p>${escHtml(s.detail)}</p></li>`).join('')}</ul>
    ${m.unmeasuredNotes.length ? `<h4 class="rp-h4">Contrôles exclus du score</h4><ul class="rp-list">${m.unmeasuredNotes.map(x => `<li><b>${escHtml(x.label)}</b> — non mesuré : ${escHtml(x.why)}.</li>`).join('')}</ul>` : ''}
    ${m.infoNotes.map(x => note(`${x.label} : ${x.why}.`)).join('')}`, 'sources'));

  const sp = m.sources.find(x => x.name.startsWith('Performance'));
  n++; out.push(sec(n, 'Performance du site (mobile)', m.lighthouse
    ? `${note('Mesuré par Google PageSpeed Insights (Lighthouse, simulation mobile). Ces scores portent sur la page d’accueil.')}${barsSvg(m.lighthouse.scores.map(x => ({ id: 'lh-' + x.label, label: x.label, value: x.value })), { title: 'Scores Lighthouse mobile (sur 100)', id: 'lighthouse' })}
      ${m.lighthouse.metrics.length ? `<dl class="rp-dl">${m.lighthouse.metrics.map(x => `<div><dt>${escHtml(x.label)}</dt><dd>${escHtml(x.value)}</dd></div>`).join('')}</dl>` : ''}`
    : note(sp && sp.status === 'na' ? 'Sans objet : aucun site web n’est renseigné pour ce commerce.' : 'Non mesuré : Google PageSpeed n’a pas répondu. Aucune valeur n’est estimée à sa place.'), 'perf'));

  let comp;
  if (m.competitors) {
    const cp = m.competitors;
    comp = `${note(`${cp.total} ${plural(cp.total, 'commerce comparé', 'commerces comparés')} dans la zone` + (cp.selfRank ? `. Rang par nombre d’avis : n°${cp.selfRank} sur ${cp.count}.` : '.') + ' Ce n’est pas le classement de Google Maps.')}
      <ul class="rp-rows rp-rows--cp">${cp.list.map(x => `<li class="${x.isSelf ? 'is-self' : ''}"><span class="rp-cp__rank">${x.rank != null ? x.rank : '–'}</span><b>${escHtml(x.name)}${x.isSelf ? ' (ce commerce)' : ''}</b><span class="rp-cp__meta">${x.rating != null ? '★ ' + escHtml(frNum(x.rating)) : '–'} · ${x.reviews != null ? escHtml(x.reviews) + ' avis' : '–'}</span></li>`).join('')}</ul>
      ${cp.hidden > 0 ? note(`${cp.hidden} ${plural(cp.hidden, 'autre commerce n’est pas affiché', 'autres commerces ne sont pas affichés')} (le commerce audité reste toujours visible).`) : ''}
      ${cd.competitors && cd.competitors.length ? `<h4 class="rp-h4">Nombre d’avis comparé</h4>${barsSvg(cd.competitors, { max: 'auto', tone: false, title: 'Nombre d’avis des concurrents', id: 'competitors' })}` : ''}`;
  } else comp = note('Non mesuré : aucun concurrent exploitable n’a été retourné pour ce commerce.');
  n++; out.push(sec(n, 'Concurrents locaux', comp, 'competitors'));

  let kw = m.rankings
    ? `<h4 class="rp-h4">Mots-clés explorés · trouvé sur ${m.rankings.found} / ${m.rankings.valid}</h4><ul class="rp-rows rp-rows--kw">${m.rankings.rows.map(r => `<li><span>${escHtml(r.kw)}</span>${r.status === 'found' ? pill('Position ' + r.pos, r.pos <= 3 ? 'good' : r.pos <= 10 ? 'warn' : 'none') : r.status === 'error' ? pill('Non mesuré') : pill('Non trouvé (20 premiers)', 'bad')}</li>`).join('')}</ul>${note('Échantillon d’une recherche web : ce n’est pas un classement Google Maps.')}`
    : note('Mots-clés : non mesuré (la recherche web n’a pas répondu ou l’analyse complète n’a pas été lancée).');
  const pr = m.presence
    ? `<p>${escHtml(m.presence.hasWebsite ? (m.presence.pageRead ? 'La page d’accueil du site a été lue.' : 'La page du site n’a pas pu être lue : les critères de contenu ne sont pas notés.') : 'Aucun site web n’est renseigné pour ce commerce.')}</p>
       <p>Réseaux sociaux : ${escHtml(m.presence.socials.length ? m.presence.socials.join(', ') : 'aucun détecté')}.</p><p>Annuaires : ${escHtml(m.presence.directories.length ? m.presence.directories.join(', ') : 'aucun détecté')}.</p>`
    : note('Non mesuré : l’analyse complète n’a pas été lancée.');
  n++; out.push(sec(n, 'Mots-clés et présence en ligne', `${kw}<h4 class="rp-h4">Présence en ligne détectée</h4>${pr}`, 'keywords'));

  const pts = (title, p, cls, none) => `<h4 class="rp-h4">${title}</h4>${p.items.length ? `<ul class="rp-rows">${p.items.map(x => `<li class="${cls}"><div class="rp-row__top"><b>${escHtml(x.label)}</b>${pill(x.pillar)}</div><p>${escHtml(x.text)}</p></li>`).join('')}</ul>${p.total > p.items.length ? note(`+ ${p.total - p.items.length} autres (voir le détail des critères).`) : ''}` : note(none)}`;
  n++; out.push(sec(n, 'Points forts et points à améliorer', pts('Points forts', m.strengths, 'is-good', 'Aucun point fort n’a pu être établi sur les critères mesurés.') + pts('Points à améliorer', m.weaknesses, 'is-bad', 'Aucun point faible n’a été relevé sur les critères mesurés.'), 'points'));

  n++; out.push(sec(n, 'Plan d’action priorisé', m.plan.length
    ? `${note('Actions classées par priorité, issues des seuls contrôles mesurés et non conformes. Les gains de score sont des estimations à vérifier avant mise en œuvre.')}<ol class="rp-plan">${m.plan.map(p => `<li><span class="rp-plan__n">${p.n}</span><div><div class="rp-row__top"><b>${escHtml(p.title)}</b>${pill('Priorité ' + p.priority.toLowerCase(), prioTone(p.priority))}</div><p>${escHtml(p.detail)}</p><span class="rp-src">${escHtml([p.axis, p.effort ? 'Effort : ' + p.effort : '', p.gain != null ? 'Gain estimé : +' + frNum(p.gain) + ' pts' : ''].filter(Boolean).join(' · '))}</span></div></li>`).join('')}</ol>`
    : note('Aucune action prioritaire : tous les contrôles mesurés sont conformes.'), 'plan'));

  n++; out.push(sec(n, 'Recommandations professionnelles', m.recommendations.length
    ? `${note('Pistes détaillées, dans l’ordre de priorité. Après les corrections, relancez un audit comparable pour mesurer l’évolution plutôt que de supposer un résultat.')}${m.recommendations.map(r => `<article class="rp-reco"><div class="rp-row__top"><b>${escHtml(r.title)}</b>${pill('Priorité ' + r.priority.toLowerCase(), prioTone(r.priority))}</div><span class="rp-src">${escHtml([r.axis, r.impact ? 'Impact ' + r.impact.toLowerCase() : ''].filter(Boolean).join(' · '))}</span>${r.why ? `<p>${escHtml(r.why)}</p>` : ''}${r.how.length ? `<ul class="rp-list">${r.how.map(h => `<li>${escHtml(h)}</li>`).join('')}</ul>` : ''}</article>`).join('')}`
    : note('Aucune recommandation détaillée : les contrôles mesurés ne font apparaître aucun point à corriger.'), 'reco'));

  if (cd.history) { n++; out.push(sec(n, 'Évolution du score', `${note(`Score des ${cd.history.length} audits analysés de ce commerce. Seuls les audits réellement réalisés sont représentés.`)}${lineSvg(cd.history)}`, 'history')); }

  n++; out.push(sec(n, 'Notes méthodologiques et limites', `<ul class="rp-list">
    <li>Le score reflète uniquement les critères réellement mesurés. Un critère non mesuré est exclu du calcul et n’est jamais compté comme un défaut.</li>
    <li>Les sources interrogées fournissent des échantillons (page d’accueil, quelques recherches, concurrents proches) et non des recensements exhaustifs.</li>
    ${m.competitors ? '<li>Le rang parmi les concurrents est établi sur le nombre d’avis publics ; ce n’est pas le classement de Google Maps.</li>' : ''}
    <li>Les gains de score indiqués sont des estimations. Relancer un audit comparable après correction permet de mesurer l’évolution réelle.</li>
    ${m.infoNotes.map(x => `<li>${escHtml(x.label)} : ${escHtml(x.why)}.</li>`).join('')}
    <li>Rapport généré le ${escHtml(m.meta.generatedLabel)} par AuditIA à partir du dossier d’audit${m.meta.auditDateLabel ? ' du ' + escHtml(m.meta.auditDateLabel) : ''}.</li></ul>`, 'notes'));

  return `<article class="rp-paper" aria-label="Aperçu du rapport">${out.join('')}</article>`;
}
