// AuditIA — aperçu HTML du rapport (lot 5). Même modèle et mêmes graphiques que le PDF.
// L'aperçu est du HTML (fiable sur iPhone, sans iframe PDF) : feuille blanche lisible, sections empilées sur mobile.
import { escHtml } from '../core/utils.js';
import { chartData, gaugeSvg, barsSvg, lineSvg } from './report-charts.js';
import { toneOf } from './report-model.js';
import { defaultBrand } from '../settings/brand.js';
import { COLORS } from './report-charts.js';

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

function categoryCriteria(cat) {
  const items = cat.items || [];
  const score = cat.score == null ? 'Score non calculable' : cat.score + '/100';
  const tone = cat.score == null ? 'none' : cat.score >= 75 ? 'good' : cat.score >= 50 ? 'warn' : 'bad';
  const statusText = cat.score == null ? 'Données insuffisantes' : cat.fixCount
    ? cat.fixCount + ' point' + (cat.fixCount > 1 ? 's' : '') + ' à améliorer'
    : 'Aucun défaut relevé parmi les critères mesurés';
  return `<details class="rp-det rp-category">
    <summary><span><b>${escHtml(cat.label)}</b><small>${escHtml(cat.description || '')}</small></span><span class="rp-sum">${escHtml(score)} · ${cat.measuredCount}/${cat.totalCount}</span></summary>
    <div class="rp-category__meta">${pill(statusText, tone)}<span>${cat.coverage}% de couverture</span></div>
    <ul class="rp-rows">${items.map(x => `<li><div class="rp-row__top"><b>${escHtml(x.label)}</b>${statusPill(x.status)}</div><p>${escHtml(x.text)}</p>${x.source ? `<span class="rp-src">Source : ${escHtml(x.source)}</span>` : ''}</li>`).join('')}</ul>
  </details>`;
}

function contextCriteria(ctx) {
  if (!ctx || !ctx.items || !ctx.items.length) return '';
  const status = value => value === 'measured' ? srcPill('measured') : value === 'na' ? srcPill('na') : srcPill('unmeasured');
  return `<details class="rp-det rp-category">
    <summary><span><b>${escHtml(ctx.label)}</b><small>${escHtml(ctx.description || '')}</small></span><span class="rp-sum">${ctx.measuredCount}/${ctx.totalCount} disponibles · non noté</span></summary>
    <ul class="rp-rows">${ctx.items.map(x => `<li><div class="rp-row__top"><b>${escHtml(x.label)}</b>${status(x.status)}</div><p>${escHtml(x.detail)}</p><span class="rp-src">Source : ${escHtml(x.source)}</span></li>`).join('')}</ul>
    ${note('Ces éléments donnent du contexte à l’analyse. Ils ne modifient pas le score global.')}</details>`;
}

export function reportPreviewHtml(m) {
  if (!m || !m.ok) return `<p class="rp-note" role="alert">${escHtml((m && m.reason) || 'Rapport indisponible.')}</p>`;
  const cd = chartData(m);
  let n = 0;
  const B = m.brand || defaultBrand();
  const out = [];

  out.push(`<header class="rp-cover">${B.logo ? `<img class="rp-logo" src="${escHtml(B.logo)}" alt="">` : ''}<span class="rp-brand">${escHtml(B.appName)}${B.company ? `<small class="rp-co"> · ${escHtml(B.company)}</small>` : ''}</span><span class="rp-kicker">${escHtml(m.meta.title)}</span>
    <h2 class="rp-biz">${escHtml(m.meta.business)}</h2>
    ${[m.meta.sector, m.meta.city].filter(Boolean).length ? `<p class="rp-sub">${escHtml([m.meta.sector, m.meta.city].filter(Boolean).join(' · '))}</p>` : ''}
    ${m.meta.auditDateLabel ? `<p class="rp-date">Audit réalisé le ${escHtml(m.meta.auditDateLabel)}</p>` : ''}</header>
    <div class="rp-scorebox">${gaugeSvg(cd.score)}<div class="rp-scoretxt">${m.score.value != null ? pill(m.score.label, m.score.tone) : pill('Score indisponible')}<p>${escHtml(m.score.verdict)}</p>
      <p class="rp-note">${escHtml(`${m.score.measured} ${plural(m.score.measured, 'critère mesuré', 'critères mesurés')} sur ${m.score.total} (${m.score.coverage} % de couverture). Les critères non mesurés sont exclus du score.`)}</p>
      ${m.score.range ? `<p class="rp-note">Fourchette possible : ${m.score.range.low} à ${m.score.range.high} /100.</p>` : ''}</div></div>`);

  const bp = m.businessProfile || {};
  const fact = (label, value) => value != null && String(value).trim() !== '' ? '<div><dt>' + escHtml(label) + '</dt><dd>' + escHtml(value) + '</dd></div>' : '';
  const facts = [
    fact('Raison sociale', bp.legalName), fact('Adresse', bp.address), fact('Téléphone', bp.phone),
    fact('E-mail', bp.email), fact('Site web', bp.website), fact('SIREN', bp.siren), fact('SIRET du siège', bp.siret),
    fact('Forme juridique', bp.legalForm), fact('Activité / code APE', bp.naf),
    fact('Date de création légale', bp.creationDate), fact('Ancienneté', bp.ageLabel),
    fact('Établissements', bp.establishments), fact('Note Google', bp.rating == null ? '' : frNum(bp.rating) + '/5 · ' + (bp.reviews || 0) + ' avis')
  ].filter(Boolean).join('');
  const hoursHtml = (bp.hours || []).length ? '<ul class="rp-list">' + bp.hours.map(h => '<li>' + escHtml(h) + '</li>').join('') + '</ul>' : note('Horaires non disponibles dans la fiche enregistrée.');
  const sourceHtml = bp.legalStatus === 'matched'
    ? note('Registre public rapproché · confiance ' + (bp.confidence || 'à vérifier') + '. Vérifiez la correspondance avant un usage administratif.') + (bp.officialUrl ? '<p><a href="' + escHtml(bp.officialUrl) + '" target="_blank" rel="noopener noreferrer">Consulter l’Annuaire des Entreprises ↗</a></p>' : '')
    : note('Identité légale non confirmée : aucun SIREN/SIRET n’est présenté comme certain.');
  n++; out.push(sec(n, 'Fiche détaillée du commerce', (facts ? '<dl class="rp-dl">' + facts + '</dl>' : note('Informations complémentaires indisponibles.')) + '<h4 class="rp-h4">Horaires d’ouverture</h4>' + hoursHtml + sourceHtml, 'business'));

  n++; out.push(sec(n, 'Synthèse de l’audit', `${m.summary.map((s, i) => `<p class="${i === 0 ? 'rp-lead' : ''}">${escHtml(s)}</p>`).join('')}${tiles(m)}
    <h4 class="rp-h4">Indicateurs disponibles</h4>
    ${cd.indicators.length ? barsSvg(cd.indicators, { title: 'Indicateurs disponibles (sur 100)', id: 'indicators', suffix: '' }) : note('Aucun indicateur chiffré n’est disponible : les données mesurées sont insuffisantes.')}
    ${cd.pillars.some(p => p.value == null) ? note('Un volet sans valeur n’a pas pu être chiffré : ses données ne sont pas disponibles.') : ''}`, 'summary'));

  n++; out.push(sec(n, 'Diagnostic détaillé par catégorie', `${note('Les scores par catégorie sont calculés uniquement sur les contrôles réellement mesurés. Une donnée absente ne vaut ni défaut ni réussite.')}
    ${(m.criteria.categories || []).map(categoryCriteria).join('')}${contextCriteria(m.criteria.context)}`, 'criteria'));

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
    <li>Rapport généré le ${escHtml(m.meta.generatedLabel)} par ${escHtml(B.appName)} à partir du dossier d’audit${m.meta.auditDateLabel ? ' du ' + escHtml(m.meta.auditDateLabel) : ''}.</li></ul>`, 'notes'));

  const ct = B.contact || {}, sg = B.signature || {};
  const lines = [ct.address, ct.email, ct.phone, ct.website].filter(Boolean);
  if (sg.name || sg.role || B.company || lines.length || sg.text) {
    n++; out.push(sec(n, 'Votre contact', `${sg.name ? `<p><strong>${escHtml(sg.name)}</strong></p>` : ''}${sg.role ? `<p>${escHtml(sg.role)}</p>` : ''}${B.company ? `<p><strong>${escHtml(B.company)}</strong></p>` : ''}${lines.map(l => `<p>${escHtml(l)}</p>`).join('')}${sg.text ? `<p class="rp-muted">${escHtml(sg.text)}</p>` : ''}`, 'contact'));
  }
  const html = out.join('');
  const style = B.custom ? ` style="--rp-primary:${B.primary};--rp-deep:${B.deep}"` : '';
  // Les graphiques sont des SVG dont la couleur est écrite en dur : on y reporte la couleur de marque.
  return `<article class="rp-paper" aria-label="Aperçu du rapport"${style}>${B.custom ? html.split(COLORS.primary).join(B.primary) : html}</article>`;
}
