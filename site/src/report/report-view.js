// AuditIA — aperçu HTML du rapport. Même modèle, même structure et mêmes données que le PDF (report-pdf.js).
// L'aperçu est du HTML (fiable sur iPhone, sans iframe PDF) : feuille blanche lisible, sections empilées sur mobile.
import { escHtml } from '../core/utils.js';
import { chartData, gaugeSvg, lineSvg, COLORS } from './report-charts.js';
import { toneOf } from './report-model.js';
import { defaultBrand } from '../settings/brand.js';
import { OFFER, offerCards } from '../settings/offer.js';

const plural = (n, a, b) => (n > 1 ? b : a);
const frNum = n => String(n).replace('.', ',');
const pad2 = n => String(n).padStart(2, '0');
const e = escHtml;
const pill = (text, tone = 'none') => `<span class="rp-pill rp-pill--${tone}">${e(text)}</span>`;
const note = t => `<p class="rp-note">${e(t)}</p>`;
const prioTone = p => (p === 'Haute' ? 'bad' : p === 'Moyenne' ? 'warn' : 'none');
const levelOf = v => v == null ? 'Non mesuré' : toneOf(v) === 'good' ? 'Solide' : toneOf(v) === 'warn' ? 'À consolider' : 'À renforcer';
const meter = (v, tone, max = 100) => `<span class="rp-meter"><span class="rp-meter__fill rp-meter__fill--${tone}" style="width:${v == null ? 0 : Math.max(0, Math.min(100, (v / max) * 100)).toFixed(1)}%"></span></span>`;
const statusPill = s => s === 'ok' ? pill('Conforme', 'good') : s === 'fix' ? pill('À corriger', 'bad') : s === 'measured' ? pill('Disponible', 'good') : s === 'na' ? pill('Sans objet') : pill('Non mesuré');
const srcPill = s => s === 'measured' ? pill('Mesuré', 'good') : s === 'na' ? pill('Sans objet') : pill('Non mesuré', 'warn');

function kpi(label, v, sub, tone, suffix = '/100') {
  return `<div class="rp-kpi"><span class="rp-kicker">${e(label)}</span><b>${v == null ? '—' : e(v)}${v != null && suffix ? `<small>${e(suffix)}</small>` : ''}</b><span class="rp-kpi__s rp-tone--${tone}">${e(sub)}</span>${meter(v, tone)}</div>`;
}

function actions(plan) {
  return `<ol class="rp-plan">${plan.map(p => `<li><span class="rp-plan__n">${p.n}</span><div class="rp-plan__body"><div class="rp-row__top"><b>${e(p.title)}</b>${pill('Priorité ' + p.priority.toLowerCase(), prioTone(p.priority))}</div><p>${e(p.detail)}</p><span class="rp-src">${e([p.axis, p.effort ? 'Effort : ' + p.effort : '', p.gain != null ? 'Gain estimé : +' + frNum(p.gain) + ' pts' : ''].filter(Boolean).join(' · '))}</span></div></li>`).join('')}</ol>`;
}

function table(head, rows, cls = '') {
  return `<div class="rp-tablewrap"><table class="rp-table ${cls}"><thead><tr>${head.map(h => `<th${h.num ? ' class="num"' : ''}>${e(h.t || h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

export function reportPreviewHtml(m) {
  if (!m || !m.ok) return `<p class="rp-note" role="alert">${e((m && m.reason) || 'Rapport indisponible.')}</p>`;
  const cd = chartData(m);
  const B = m.brand || defaultBrand();
  let n = 0;
  const sec = (title, over, body, id) => { n++; return `<section class="rp-sec"${id ? ` data-rp-sec="${id}"` : ''}><p class="rp-kicker rp-kicker--accent">${pad2(n)}${over ? ' · ' + e(over) : ''}</p><h3 class="rp-h">${e(title)}</h3>${body}</section>`; };
  const out = [];

  /* Couverture */
  const author = (B.signature && B.signature.name) || B.company || B.appName;
  out.push(`<header class="rp-cover">
    <div class="rp-cover__top">${B.logo ? `<img class="rp-logo" src="${e(B.logo)}" alt="">` : `<span class="rp-mark">${e(String(B.appName || 'AI').slice(0, 2).toUpperCase())}</span>`}<span class="rp-brand">${e(B.appName)}${B.company ? `<small class="rp-co">${e(B.company)}</small>` : ''}</span><span class="rp-conf">Document confidentiel</span></div>
    <p class="rp-kicker rp-kicker--cover">${e(m.meta.title)}</p>
    <h2 class="rp-biz">${e(m.meta.business)}</h2>
    ${[m.meta.sector, m.meta.city].filter(Boolean).length ? `<p class="rp-sub">${e([m.meta.sector, m.meta.city].filter(Boolean).join(' · '))}</p>` : ''}
    <dl class="rp-cover__meta"><div><dt>Date de l’audit</dt><dd>${e(m.meta.auditDateLabel || '—')}</dd></div><div><dt>Préparé par</dt><dd>${e(author)}</dd></div><div><dt>Généré le</dt><dd>${e(m.meta.generatedLabel)}</dd></div></dl>
  </header>
  <div class="rp-scorecard">${gaugeSvg(cd.score)}<div class="rp-scoretxt">${m.score.value != null ? pill(m.score.label, m.score.tone) : pill('Score indisponible')}<p class="rp-verdict">${e(m.score.verdict)}</p>
    <p class="rp-note">${e(`${m.score.measured} ${plural(m.score.measured, 'critère mesuré', 'critères mesurés')} sur ${m.score.total} (${m.score.coverage} % de couverture). Un critère non mesuré est exclu du calcul, jamais compté comme un défaut.`)}</p>
    <div class="rp-minis">${[['SEO · Google', m.pillars.seo.value, '/100'], ['GEO · IA', m.pillars.geo.value, '/100'], ['Couverture', m.score.coverage, ' %']].map(([l, v, s]) => `<div><span class="rp-kicker">${e(l)}</span><b>${v == null ? '—' : e(v)}<small>${v == null ? '' : e(s)}</small></b>${meter(v, l === 'Couverture' ? (v >= 75 ? 'good' : v >= 50 ? 'warn' : 'bad') : toneOf(v))}</div>`).join('')}</div></div></div>`);

  /* Synthèse */
  const cats = m.criteria.categories || [];
  const catScore = id => { const c = cats.find(x => x.id === id); return c && c.score != null ? Math.round(c.score) : null; };
  const lists = (title, items, cls, empty) => `<div class="rp-col rp-col--${cls}"><h4>${e(title)}</h4>${items.length ? `<ul>${items.map(x => `<li><b>${e(x.label)}</b>${x.text ? `<span>${e(x.text)}</span>` : ''}</li>`).join('')}</ul>` : note(empty)}</div>`;
  out.push(sec('Synthèse', 'L’essentiel en une page', `
    <p class="rp-lead">${e(m.score.value != null ? `${m.meta.business} obtient ${m.score.value}/100 : ${m.score.label.toLowerCase()}.` : 'Les données mesurées sont insuffisantes pour établir un score.')}</p>
    <p class="rp-muted">${e(m.summary.slice(1, 3).join(' '))}</p>
    ${cats.length ? `<div class="rp-kpis">${[['google', 'Fiche Google'], ['reputation', 'Avis clients'], ['website', 'Site & mobile'], ['geo', 'Assistants IA']].map(([id, l]) => { const v = catScore(id); return kpi(l, v, levelOf(v), toneOf(v)); }).join('')}</div>` : ''}
    <div class="rp-cols">${lists('Ce qui fonctionne', m.strengths.items.slice(0, 4), 'good', 'Aucun point fort n’a pu être établi sur les critères mesurés.')}${lists('Ce qui vous freine', m.weaknesses.items.slice(0, 4), 'bad', 'Aucun point faible relevé sur les critères mesurés.')}</div>
    <h4 class="rp-h4">Vos 3 priorités</h4>${m.plan.length ? actions(m.plan.slice(0, 3)) : note('Aucune action prioritaire : tous les contrôles mesurés sont conformes.')}
    ${note('Estimations fondées sur des données publiques : elles ne garantissent aucun résultat.')}`, 'summary'));

  /* Diagnostic */
  const catRows = cats.map(c => `<tr><td><b>${e(c.label)}</b></td><td class="rp-td-meter">${c.score != null ? `${meter(c.score, toneOf(c.score))}<b>${Math.round(c.score)}</b>` : '<span class="rp-muted">non calculable</span>'}</td><td class="num">${c.measuredCount}/${c.totalCount}</td><td>${pill(levelOf(c.score), toneOf(c.score))}</td></tr>`);
  const critTable = items => table(['Critère', 'État', 'Constat'], items.map(x => `<tr><td><b>${e(x.label)}</b></td><td>${statusPill(x.status)}</td><td${x.status === 'unmeasured' ? ' class="rp-muted"' : ''}>${e(x.text || x.detail || '')}${x.status !== 'unmeasured' && x.source ? ` <span class="rp-src-inline">(${e(x.source)})</span>` : ''}</td></tr>`), 'rp-table--crit');
  out.push(sec('Diagnostic détaillé', 'Score par catégorie', `
    ${note('Chaque catégorie ne tient compte que des contrôles réellement mesurés : une donnée manquante est exclue du calcul et ne pénalise jamais le score.')}
    <div class="rp-kpis rp-kpis--2">${kpi('SEO · être trouvé sur Google', m.pillars.seo.value, levelOf(m.pillars.seo.value) + ' · ' + m.pillars.seo.measured + ' contrôles', toneOf(m.pillars.seo.value))}${kpi('GEO · être cité par les assistants IA', m.pillars.geo.value, levelOf(m.pillars.geo.value) + ' · ' + m.pillars.geo.measured + ' contrôles', toneOf(m.pillars.geo.value))}</div>
    ${m.score.range ? note(`Fourchette possible selon les contrôles non mesurés : ${m.score.range.low} à ${m.score.range.high} /100.`) : ''}
    ${cats.length ? table(['Catégorie', 'Score', { t: 'Mesurés', num: 1 }, 'Niveau'], catRows, 'rp-table--cats') : ''}
    ${cats.filter(c => c.items.length).map(c => `<details class="rp-det"><summary><span><b>${e(c.label)}</b><small>${e(c.description || '')}</small></span>${pill(c.score == null ? 'Non calculable' : c.score + '/100', toneOf(c.score))}</summary>${critTable(c.items)}</details>`).join('')}
    ${m.criteria.context && m.criteria.context.items.length ? `<details class="rp-det"><summary><span><b>Contexte : domaine, registre et concurrence</b><small>Éléments de contexte, non notés.</small></span>${pill('Non noté')}</summary>${critTable(m.criteria.context.items)}</details>` : ''}`, 'criteria'));

  /* Marché local */
  let market = '';
  if (m.competitors) {
    const cp = m.competitors, maxRev = Math.max(1, ...cp.list.map(x => x.reviews || 0));
    market += note(`${cp.count} ${plural(cp.count, 'commerce comparé', 'commerces comparés')} dans la zone` + (cp.selfRank ? `. ${m.meta.business} se classe n°${cp.selfRank} par nombre d’avis.` : '.') + ' Ce classement n’est pas celui de Google Maps.');
    market += table([{ t: 'N°', num: 1 }, 'Commerce', { t: 'Note', num: 1 }, 'Nombre d’avis'], cp.list.map(x => `<tr${x.isSelf ? ' class="is-self"' : ''}><td class="num">${x.rank != null ? x.rank : '–'}</td><td><b>${e(x.name)}</b>${x.isSelf ? ' <span class="rp-you">vous</span>' : ''}</td><td class="num">${x.rating != null ? e(frNum(x.rating)) + ' / 5' : '–'}</td><td class="rp-td-meter">${x.reviews != null ? `${meter(x.reviews, x.isSelf ? 'primary' : 'soft', maxRev)}<b>${e(x.reviews)}</b>` : '–'}</td></tr>`), 'rp-table--cp');
    if (cp.hidden > 0) market += note(`${cp.hidden} ${plural(cp.hidden, 'autre commerce n’est pas affiché', 'autres commerces ne sont pas affichés')}.`);
  } else market += `<p class="rp-callout">Non mesuré : aucun concurrent exploitable n’a été retourné pour ce commerce.</p>`;
  market += `<div class="rp-h4row"><h4 class="rp-h4">Recherches testées</h4>${m.rankings ? pill(`Trouvé sur ${m.rankings.found} / ${m.rankings.valid}`, m.rankings.found === m.rankings.valid ? 'good' : m.rankings.found ? 'warn' : 'bad') : ''}</div>`;
  market += m.rankings
    ? table(['Recherche', { t: 'Résultat', num: 1 }], m.rankings.rows.map(r => `<tr><td>${e(r.kw)}</td><td class="num">${r.status === 'found' ? pill('Position ' + r.pos, r.pos <= 3 ? 'good' : r.pos <= 10 ? 'warn' : 'none') : r.status === 'error' ? pill('Non mesuré') : pill('Absent des 20 premiers', 'bad')}</td></tr>`)) + note('Échantillon de recherches web : ce n’est pas un classement Google Maps.')
    : note('Non mesuré : la recherche web n’a pas répondu ou l’analyse complète n’a pas été lancée.');
  market += '<h4 class="rp-h4">Présence en ligne détectée</h4>' + (m.presence
    ? `<dl class="rp-dl"><div><dt>Site web</dt><dd>${e(m.presence.hasWebsite ? (m.presence.pageRead ? 'Page d’accueil lue et analysée.' : 'Page non lue : critères de contenu non notés.') : 'Aucun site web renseigné.')}</dd></div><div><dt>Réseaux sociaux</dt><dd>${e(m.presence.socials.length ? m.presence.socials.join(', ') : 'Aucun profil détecté')}</dd></div><div><dt>Annuaires</dt><dd>${e(m.presence.directories.length ? m.presence.directories.join(', ') : 'Aucun annuaire détecté')}</dd></div></dl>`
    : note('Non mesuré : l’analyse complète n’a pas été lancée.'));
  out.push(sec('Votre marché local', 'Concurrents, recherches et présence', market, 'competitors'));

  /* Performance */
  const sp = m.sources.find(x => x.name.startsWith('Performance'));
  out.push(sec('Performance du site', 'Mesure Google PageSpeed (mobile)', m.lighthouse
    ? `${note('Mesuré par Google PageSpeed Insights (Lighthouse, simulation mobile) sur la page d’accueil. Au-delà de 90, le résultat est excellent ; en dessous de 50, il pénalise l’expérience des visiteurs.')}
      <div class="rp-gauges">${m.lighthouse.scores.map(x => `<div class="rp-g rp-g--${toneOf(x.value)}" style="--v:${x.value == null ? 0 : x.value}"><span class="rp-g__ring"><b>${x.value == null ? '—' : e(x.value)}</b></span><span class="rp-g__l">${e(x.label)}</span><small>${e(levelOf(x.value))}</small></div>`).join('')}</div>
      ${m.lighthouse.metrics.length ? table(['Indicateur', { t: 'Valeur mesurée', num: 1 }], m.lighthouse.metrics.map(x => `<tr><td>${e(x.label)}</td><td class="num"><b>${e(x.value)}</b></td></tr>`)) : ''}`
    : `<p class="rp-callout">${e(sp && sp.status === 'na' ? 'Sans objet : aucun site web n’est renseigné pour ce commerce.' : 'Non mesuré : Google PageSpeed n’a pas répondu. Aucune valeur n’est estimée à sa place.')}</p>`, 'perf'));

  /* Plan d'action et recommandations */
  out.push(sec('Plan d’action', 'Classé par priorité', m.plan.length
    ? note('Actions issues des seuls contrôles mesurés et non conformes. Les gains de score sont des estimations à confirmer par un nouvel audit après correction.') + actions(m.plan)
    : '<p class="rp-callout">Aucune action prioritaire : tous les contrôles mesurés sont conformes.</p>', 'plan'));
  out.push(sec('Recommandations détaillées', 'Comment faire', m.recommendations.length
    ? m.recommendations.map(r => `<article class="rp-reco rp-reco--${prioTone(r.priority)}"><div class="rp-row__top"><b>${e(r.title)}</b>${pill('Priorité ' + r.priority.toLowerCase(), prioTone(r.priority))}</div><p class="rp-kicker rp-kicker--accent">${e([r.axis, r.impact ? 'Impact ' + r.impact.toLowerCase() : ''].filter(Boolean).join(' · '))}</p>${r.why ? `<p>${e(r.why)}</p>` : ''}${r.how.length ? `<ul class="rp-list">${r.how.map(h => `<li>${e(h)}</li>`).join('')}</ul>` : ''}</article>`).join('')
    : '<p class="rp-callout">Aucune recommandation détaillée : les contrôles mesurés ne font apparaître aucun point à corriger.</p>', 'reco'));

  if (cd.history) {
    const f = cd.history[0].value, l = cd.history[cd.history.length - 1].value, dv = l - f;
    out.push(sec('Évolution du score', cd.history.length + ' audits réalisés', `<div class="rp-chartbox">${lineSvg(cd.history)}</div><p class="rp-lead rp-lead--sm">${e(dv === 0 ? 'Score stable depuis le premier audit.' : `${dv > 0 ? 'Progression' : 'Recul'} de ${Math.abs(dv)} ${plural(Math.abs(dv), 'point', 'points')} depuis le premier audit (${f} → ${l}/100).`)}</p>`, 'history'));
  }

  /* Proposition et contact */
  const cards = offerCards(m.plan);
  if (cards.length) {
    const featured = cards.findIndex(cd2 => cd2.price && !/mois/i.test(cd2.price));
    out.push(sec(OFFER.title, 'Proposition d’accompagnement', `${note(OFFER.intro)}<div class="rp-offers">${cards.map((cd2, i) => `<div class="rp-offer${i === featured ? ' is-featured' : ''}">${i === featured ? '<span class="rp-offer__tag">Recommandé</span>' : ''}<h4>${e(cd2.name)}</h4><b class="rp-offer__price${cd2.price ? '' : ' is-free'}">${e(cd2.price || 'Inclus')}</b>${cd2.sub ? `<small>${e(cd2.sub)}</small>` : ''}<ul>${cd2.items.map((t, k) => `<li class="${cd2.nested && k === 0 ? 'is-lead' : cd2.nested ? 'is-sub' : ''}">${e(t)}</li>`).join('')}</ul></div>`).join('')}</div>`, 'offer'));
  }
  const ct = B.contact || {}, sg = B.signature || {};
  const lines = [ct.address, ct.email, ct.phone, ct.website].filter(Boolean);
  if (sg.name || sg.role || B.company || lines.length || sg.text) {
    out.push(`<aside class="rp-contact" data-rp-sec="contact"><p class="rp-kicker">Votre contact</p>${sg.name ? `<p class="rp-contact__name">${e(sg.name)}</p>` : ''}${sg.role ? `<p>${e(sg.role)}</p>` : ''}${B.company ? `<p><strong>${e(B.company)}</strong></p>` : ''}${lines.map(l => `<p>${e(l)}</p>`).join('')}${sg.text ? `<p class="rp-contact__txt">${e(sg.text)}</p>` : ''}</aside>`);
  }

  /* Annexes */
  const bp = m.businessProfile || {};
  const fact = (label, value) => value != null && String(value).trim() !== '' ? `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>` : '';
  const facts = [
    fact('Nom commercial', m.meta.business), fact('Raison sociale', bp.legalName), fact('Adresse', bp.address || m.meta.address), fact('Téléphone', bp.phone || m.meta.phone),
    fact('Site internet', bp.website || m.meta.website), fact('Statut Google', bp.googleStatus),
    fact('Note Google', bp.rating == null ? '' : frNum(bp.rating) + '/5 · ' + (bp.reviews || 0) + ' avis'),
    fact('SIREN', bp.siren), fact('SIRET du siège', bp.siret), fact('Forme juridique', bp.legalForm), fact('Activité (APE)', bp.naf),
    fact('Création', bp.creationDate ? bp.creationDate + (bp.ageLabel ? ' (' + bp.ageLabel + ')' : '') : ''), fact('Établissements', bp.establishments),
  ].join('');
  const nMeas = m.sources.filter(s => s.status === 'measured').length, nUn = m.sources.filter(s => s.status === 'unmeasured').length, nNa = m.sources.filter(s => s.status === 'na').length;
  out.push(sec('Annexes', 'Fiche, sources et méthode', `
    <h4 class="rp-h4">A. Fiche d’identité du commerce</h4>${facts ? `<dl class="rp-dl rp-dl--grid">${facts}</dl>` : note('Informations détaillées indisponibles dans le dossier.')}
    ${(bp.hours || []).length ? `<p class="rp-kicker">Horaires déclarés sur Google</p><ul class="rp-hours">${bp.hours.map(h => `<li>${e(h)}</li>`).join('')}</ul>` : ''}
    ${bp.legalStatus === 'matched'
      ? note('Rapprochement avec le registre public (SIRENE) : confiance ' + (bp.confidence || 'à vérifier') + '. Vérifiez le SIRET et l’adresse avant tout usage administratif.') + (bp.officialUrl ? `<p><a class="rp-link" href="${e(bp.officialUrl)}" target="_blank" rel="noopener noreferrer">Consulter la fiche officielle de l’entreprise ↗</a></p>` : '')
      : note('Identité légale non confirmée : aucun SIREN ou SIRET n’est présenté comme certain.')}
    <h4 class="rp-h4">B. Sources et fiabilité des mesures</h4>
    ${note(`${nMeas} ${plural(nMeas, 'source mesurée', 'sources mesurées')}, ${nUn} non ${plural(nUn, 'mesurée', 'mesurées')}${nNa ? `, ${nNa} sans objet` : ''}. Une source qui n’a pas répondu n’est jamais remplacée par une estimation.`)}
    ${table(['Source', 'État', 'Détail'], m.sources.map(s => `<tr data-source-status="${s.status}"><td><b>${e(s.name)}</b></td><td>${srcPill(s.status)}</td><td>${e(s.detail)}</td></tr>`), 'rp-table--crit')}
    ${m.unmeasuredNotes.length ? `<h4 class="rp-h4">C. Contrôles exclus du score</h4><ul class="rp-list">${m.unmeasuredNotes.map(x => `<li><b>${e(x.label)}</b> — non mesuré : ${e(x.why)}.</li>`).join('')}</ul>` : ''}
    <h4 class="rp-h4">${m.unmeasuredNotes.length ? 'D' : 'C'}. Méthode et limites</h4><ul class="rp-list">
      <li>Le score reflète uniquement les critères réellement mesurés. Un critère non mesuré est exclu du calcul et n’est jamais compté comme un défaut.</li>
      <li>Les sources interrogées fournissent des échantillons (page d’accueil, quelques recherches, concurrents proches) et non des recensements exhaustifs.</li>
      ${m.competitors ? '<li>Le rang parmi les concurrents est établi sur le nombre d’avis publics ; ce n’est pas le classement de Google Maps.</li>' : ''}
      <li>Les gains de score indiqués sont des estimations. Relancer un audit comparable après correction permet de mesurer l’évolution réelle.</li>
      ${m.infoNotes.map(x => `<li>${e(x.label)} : ${e(x.why)}.</li>`).join('')}
      <li>Rapport généré le ${e(m.meta.generatedLabel)} par ${e(B.appName)} à partir du dossier d’audit${m.meta.auditDateLabel ? ' du ' + e(m.meta.auditDateLabel) : ''}.</li></ul>`, 'notes'));

  const html = out.join('');
  const style = B.custom ? ` style="--rp-primary:${B.primary};--rp-deep:${B.deep}"` : '';
  // Les graphiques SVG ont leur couleur écrite en dur : on y reporte la couleur de marque.
  return `<article class="rp-paper" aria-label="Aperçu du rapport"${style}>${B.custom ? html.split(COLORS.primary).join(B.primary) : html}</article>`;
}
