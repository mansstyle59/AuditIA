// AuditIA — générateur du rapport PDF premium (lot 5).
// jsPDF natif : texte vectoriel net, graphiques dessinés en vectoriel à partir des mêmes données que l'aperçu.
// Aucune image, aucun réseau, aucune écriture : le PDF est une pure fonction du modèle (report-model.js).
// Mise en page : A4 portrait, marges 18 mm, tableaux sans ligne coupée (en-tête répété), titres jamais isolés en bas de page.
import { COLORS, hexToRgb, toneColor, chartData } from './report-charts.js';
import { REPORT_TITLE, toneOf } from './report-model.js';
import { formatGoogleProfileSummary } from '../core/utils.js';
import { defaultBrand, logoFormat } from '../settings/brand.js';

const PW = 210, PH = 297, M = 18, CW = PW - 2 * M, TOP = 24, BOT = PH - 19, PT = 0.3528;
const BASE_C = Object.fromEntries(Object.entries(COLORS).map(([k, v]) => [k, hexToRgb(v)]));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/* Les polices PDF standard ne couvrent que le latin (WinAnsi) : on remplace ou retire le reste au lieu d'afficher des « ? ». */
const UNSUPPORTED = /[^ -~¡-ÿŒœ‘’“”–—•…€]/g;
export function pdfSafe(s) {
  return String(s == null ? '' : s)
    .replace(/[      ]/g, ' ').replace(/→/g, '->').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/−/g, '-')
    .replace(/[↗✓✔✗✘]/g, '').replace(UNSUPPORTED, '').replace(/ {2,}/g, ' ');
}
const frNum = n => String(n).replace('.', ',');
const plural = (n, a, b) => (n > 1 ? b : a);

export function buildReportPdf(JsPDF, m) {
  const B = m.brand || defaultBrand();           // marque enregistrée ; marque par défaut si absente (jamais de clé ni de donnée technique)
  const C = { ...BASE_C, primary: hexToRgb(B.primary), deep: hexToRgb(B.deep) };
  const APP = pdfSafe(B.appName) || 'AuditIA';
  const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  pdf.setProperties({ title: pdfSafe(m.meta.business + ' - ' + REPORT_TITLE), subject: REPORT_TITLE, author: pdfSafe(B.company || APP), creator: APP, keywords: 'audit, visibilité, SEO, GEO' });
  const T = pdfSafe;
  const data = chartData(m);
  let y = TOP, secNo = 0;

  /* ---------- primitives ---------- */
  const font = (style = 'normal', size = 9.5, color = C.ink) => { pdf.setFont('helvetica', style); pdf.setFontSize(size); pdf.setTextColor(color[0], color[1], color[2]); };
  const fill = c => pdf.setFillColor(c[0], c[1], c[2]);
  const stroke = (c, w = 0.3) => { pdf.setDrawColor(c[0], c[1], c[2]); pdf.setLineWidth(w); };
  const lh = size => size * PT * 1.45;
  const wrap = (str, w, size, style) => { pdf.setFont('helvetica', style || 'normal'); pdf.setFontSize(size); return pdf.splitTextToSize(T(str), w - 1.3); };   // marge de sécurité : les apostrophes typographiques sont mesurées un peu courtes

  const fit = (str, w, size, style) => {   // texte tronqué avec « … » pour tenir sur une ligne
    pdf.setFont('helvetica', style || 'normal'); pdf.setFontSize(size);
    let s = T(str); if (pdf.getTextWidth(s) <= w) return s;
    while (s.length > 1 && pdf.getTextWidth(s + '…') > w) s = s.slice(0, -1);
    return s.trimEnd() + '…';
  };
  const textW = (str, size, style) => { pdf.setFont('helvetica', style || 'normal'); pdf.setFontSize(size); return pdf.getTextWidth(T(str)); };

  const chrome = () => {
    fill(C.deep); pdf.rect(0, 0, PW, 3.2, 'F');
    font('bold', 8.5, C.primary); pdf.text(fit(APP, 40, 8.5, 'bold'), M, 10.5);
    const hx = M + Math.min(40, textW(APP, 8.5, 'bold')) + 3; font('normal', 8.5, C.muted); pdf.text(fit(REPORT_TITLE, 70, 8.5), hx, 10.5);
    pdf.text(fit(m.meta.business, 60, 8.5), PW - M, 10.5, { align: 'right' });
    stroke(C.line, 0.25); pdf.line(M, 13.5, PW - M, 13.5);
  };
  const newPage = () => { pdf.addPage(); chrome(); y = TOP; };
  const ensure = h => { if (y + Math.min(h, BOT - TOP) > BOT) newPage(); };

  const para = (str, { size = 9.5, color = C.ink, style = 'normal', w = CW, x = M, gap = 1.6 } = {}) => {
    const ls = wrap(str, w, size, style), h = lh(size);
    if (ls.length <= 4) ensure(ls.length * h);
    ls.forEach(l => { ensure(h); font(style, size, color); pdf.text(l, x, y + size * PT * 0.98); y += h; });
    y += gap;
  };
  const section = (title, minAfter = 34) => {
    ensure(15 + minAfter); if (y > TOP + 1) y += 6; secNo++;
    fill(C.primary); pdf.roundedRect(M, y, 7.2, 7.2, 1.7, 1.7, 'F');
    font('bold', 10, C.paper); pdf.text(String(secNo), M + 3.6, y + 5.1, { align: 'center' });
    font('bold', 14.5, C.deep); pdf.text(T(title), M + 10.5, y + 5.5);
    y += 9.6; stroke(C.line, 0.3); pdf.line(M, y, M + CW, y); y += 5;
  };
  const sub = (title, minAfter = 22) => { ensure(8 + minAfter); font('bold', 10.5, C.primary); pdf.text(T(title), M, y + 4); y += 7; };

  const badge = (str, tone, x, yy, size = 8) => {   // pastille : retourne sa largeur
    const s = T(str), w = textW(s, size, 'bold') + 5, h = 5.2;
    if (tone === 'none') { fill(C.tint2); stroke(C.line, 0.25); pdf.roundedRect(x, yy, w, h, 2.6, 2.6, 'FD'); font('bold', size, C.ink); }
    else { fill(C[tone] || C.primary); pdf.roundedRect(x, yy, w, h, 2.6, 2.6, 'F'); font('bold', size, C.paper); }
    pdf.text(s, x + w / 2, yy + 3.65, { align: 'center' });
    return w;
  };

  /* Puce + titre + texte (liste de constats). */
  const item = ({ label, text, color = C.primary, tag }) => {
    const w = CW - 6, ll = wrap(label, w - (tag ? 30 : 0), 9.8, 'bold'), tl = text ? wrap(text, w, 9, 'normal') : [];
    const h = ll.length * lh(9.8) + tl.length * lh(9) + 2.4;
    ensure(Math.min(h, 38));
    fill(color); pdf.circle(M + 1.6, y + 2.1, 1.2, 'F');
    ll.forEach((l, i) => { ensure(lh(9.8)); font('bold', 9.8, C.ink); pdf.text(l, M + 6, y + 9.8 * PT); if (tag && i === 0) badge(tag.text, tag.tone, M + CW - textW(tag.text, 8, 'bold') - 5, y - 0.2); y += lh(9.8); });
    tl.forEach(l => { ensure(lh(9)); font('normal', 9, C.muted); pdf.text(l, M + 6, y + 9 * PT); y += lh(9); });
    y += 2.4;
  };

  const bullet = (str, color = C.primary) => { const ls = wrap(str, CW - 6, 9.2, 'normal'); ensure(Math.min(ls.length * lh(9.2), 16)); fill(color); pdf.circle(M + 1.6, y + 2.2, 1, 'F'); ls.forEach(l => { ensure(lh(9.2)); font('normal', 9.2, C.ink); pdf.text(l, M + 6, y + 3.1); y += lh(9.2); }); y += 1.4; };

  /* Tableau : colonnes [{w, align}], lignes de cellules (texte | {text, bold, color} | {badge, tone}). Une ligne n'est jamais coupée. */
  const table = (cols, head, rows, { zebra = true } = {}) => {
    const size = 9, pad = 2, hh = 7;
    const cellLines = (cell, w) => (cell && cell.badge != null) ? [''] : wrap(typeof cell === 'object' && cell ? cell.text : cell, w - 2 * pad, size, cell && cell.bold ? 'bold' : 'normal');
    const rowH = row => Math.max(7.2, Math.max(...row.map((c, i) => cellLines(c, cols[i].w).length)) * lh(size) + 2 * pad - 0.6);
    const header = () => {
      fill(C.deep); pdf.rect(M, y, CW, hh, 'F'); let x = M;
      head.forEach((h, i) => { font('bold', 8.5, C.paper); pdf.text(T(h), cols[i].align === 'right' ? x + cols[i].w - pad : x + pad, y + 4.8, { align: cols[i].align === 'right' ? 'right' : 'left' }); x += cols[i].w; });
      y += hh;
    };
    ensure(hh + (rows.length ? rowH(rows[0]) : 0)); header();
    rows.forEach((row, ri) => {
      const h = rowH(row);
      if (y + h > BOT) { newPage(); header(); }
      const hi = row.some(c => c && c.hi);
      if (hi) { fill(C.tint2); pdf.rect(M, y, CW, h, 'F'); } else if (zebra && ri % 2) { fill(C.tint); pdf.rect(M, y, CW, h, 'F'); }
      let x = M;
      row.forEach((cell, i) => {
        const w = cols[i].w;
        if (cell && cell.badge != null) badge(cell.badge, cell.tone || 'none', x + pad, y + (h - 5.2) / 2, 7.6);
        else {
          const ls = cellLines(cell, w), bold = !!(cell && cell.bold) || !!hi, col = (cell && cell.color) || C.ink;
          ls.forEach((l, li) => { font(bold ? 'bold' : 'normal', size, col); pdf.text(l, cols[i].align === 'right' ? x + w - pad : x + pad, y + pad + size * PT * 0.95 + li * lh(size) - 0.2, { align: cols[i].align === 'right' ? 'right' : 'left' }); });
        }
        x += w;
      });
      stroke(C.line, 0.2); pdf.line(M, y + h, M + CW, y + h);
      y += h;
    });
    y += 3;
  };

  const tiles = list => {
    const gap = 4, w = (CW - gap * (list.length - 1)) / list.length, h = 25;
    ensure(h + 3);
    list.forEach((t, i) => {
      const x = M + i * (w + gap);
      fill(C.tint); stroke(C.line, 0.25); pdf.roundedRect(x, y, w, h, 2.4, 2.4, 'FD');
      fill(C[t.tone] || C.none); pdf.roundedRect(x, y, 1.8, h, 0.9, 0.9, 'F');
      font('bold', 7.8, C.muted); pdf.text(T(t.label.toUpperCase()), x + 5, y + 6);
      font('bold', 20, t.tone === 'none' ? C.none : C[t.tone]); pdf.text(T(t.value), x + 5, y + 16.4);
      font('normal', 8, C.muted); pdf.text(fit(t.sub || '', w - 8, 8), x + 5, y + 21.6);
    });
    y += h + 4;
  };

  /* ---------- graphiques vectoriels ---------- */
  const gauge = (cx, cy, r, value, tone, lw = 3.4, bigSize = 26) => {
    stroke(C.tint2, lw); pdf.circle(cx, cy, r, 'S');
    if (value != null) {
      const sweep = Math.max(0.5, Math.min(100, value)) * 3.6;
      stroke(C[tone] || C.primary, lw); pdf.setLineCap('round');
      for (let d = 0; d < sweep; d += 2) {
        const a1 = (d - 90) * Math.PI / 180, a2 = (Math.min(d + 2.4, sweep) - 90) * Math.PI / 180;
        pdf.line(cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2));
      }
      pdf.setLineCap('butt');
    }
    font('bold', value == null ? bigSize * 0.8 : bigSize, value == null ? C.none : C.ink);
    pdf.text(value == null ? '-' : String(value), cx, cy + (value == null ? 2.4 : 3.2), { align: 'center' });
    font('normal', 8.5, C.muted); pdf.text(value == null ? 'non calculable' : 'sur 100', cx, cy + (value == null ? 9 : 9.2), { align: 'center' });
  };

  const bars = (rows, { max = 100, suffix = '', tone = true, rh = 11.6 } = {}) => {
    const trackW = CW - 30, peak = Math.max(1, max === 'auto' ? Math.max(...rows.map(r => Number(r.value) || 0)) : max);
    ensure(Math.min(rows.length * rh, 92));
    rows.forEach(r => {
      ensure(rh);
      const has = r.value != null, v = has ? Number(r.value) : 0;
      font(r.isSelf ? 'bold' : 'normal', 9, C.ink); pdf.text(fit(r.label, CW - 4, 9, r.isSelf ? 'bold' : 'normal'), M, y + 3);
      fill(C.tint2); pdf.roundedRect(M, y + 4.4, trackW, 3.4, 1.7, 1.7, 'F');
      if (has && v > 0) { fill(r.isSelf ? C.primary : tone ? C[toneOf(v)] : C.primary); pdf.roundedRect(M, y + 4.4, Math.max(2.4, trackW * Math.min(1, v / peak)), 3.4, 1.7, 1.7, 'F'); }
      font('bold', 9.5, has ? C.ink : C.none); pdf.text(has ? T(v + suffix) : 'non mesuré', M + CW, y + 7.6, { align: 'right' });
      y += rh;
    });
    y += 2;
  };

  const lineChart = points => {
    const h = 58; ensure(h + 4);
    const x0 = M + 12, x1 = M + CW - 12, y0 = y + 6, y1 = y + h - 12, px = i => points.length === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (points.length - 1), py = v => y1 - (y1 - y0) * Math.max(0, Math.min(100, v)) / 100;
    [0, 50, 100].forEach(g => { stroke(C.line, 0.25); pdf.line(x0, py(g), x1, py(g)); font('normal', 8, C.muted); pdf.text(String(g), x0 - 2.5, py(g) + 1, { align: 'right' }); });
    stroke(C.primary, 0.7); for (let i = 1; i < points.length; i++) pdf.line(px(i - 1), py(points[i - 1].value), px(i), py(points[i].value));
    const step = points.length > 6 ? Math.ceil(points.length / 6) : 1;
    points.forEach((p, i) => {
      stroke(C.primary, 0.7); fill(p.current ? C.primary : C.paper); pdf.circle(px(i), py(p.value), p.current ? 1.7 : 1.3, 'FD');
      font('bold', 8.5, C.ink); pdf.text(String(p.value), px(i), py(p.value) - 3, { align: 'center' });
      if (i % step === 0 || i === points.length - 1) { font('normal', 8, C.muted); pdf.text(T(p.label), px(i), y1 + 5.5, { align: 'center' }); }
    });
    y += h;
  };

  /* =============== PAGE 1 : COUVERTURE =============== */
  fill(C.deep); pdf.rect(0, 0, PW, 150, 'F');
  fill(mix(C.deep, [255, 255, 255], 0.14)); pdf.circle(PW - 18, 22, 58, 'F'); fill(mix(C.deep, [255, 255, 255], 0.24)); pdf.circle(PW - 8, 14, 30, 'F');
  let nameX = M;
  if (B.logo) {   // logo enregistré : sur pastille blanche, proportions conservées ; en cas d'échec, simple absence de logo
    try {
      const ip = pdf.getImageProperties(B.logo), k = Math.min(36 / ip.width, 14 / ip.height), lw = ip.width * k, lh2 = ip.height * k;
      fill(C.paper); pdf.roundedRect(M, 12, lw + 5, lh2 + 5, 2, 2, 'F'); pdf.addImage(B.logo, logoFormat(B.logo), M + 2.5, 14.5, lw, lh2);
      nameX = M + lw + 11;
    } catch (e) { nameX = M; }
  }
  font('bold', 22, C.paper); pdf.text(fit(APP, PW - M - nameX, 22, 'bold'), nameX, 30);
  font('normal', 9.5, C.lavender); pdf.text(fit((B.company ? B.company + '  ·  ' : '') + 'Audit de visibilité numérique locale', CW, 9.5), M, 38);
  font('bold', 10, C.lavender); pdf.text(T(REPORT_TITLE.toUpperCase()), M, 86);
  stroke(B.accent ? hexToRgb(B.accent) : C.lavender, 0.6); pdf.line(M, 90, M + 26, 90);
  const nameLines = wrap(m.meta.business, CW - 6, 30, 'bold').slice(0, 3);
  font('bold', 30, C.paper); nameLines.forEach((l, i) => pdf.text(l, M, 106 + i * 12.4));
  let ty = 106 + nameLines.length * 12.4 + 3;
  const subline = [m.meta.sector, m.meta.city].filter(Boolean).join('  ·  ');
  if (subline) { font('normal', 12.5, C.lavender); pdf.text(fit(subline, CW, 12.5), M, Math.min(ty, 141)); }
  font('normal', 10.5, C.lavender); if (m.meta.auditDateLabel) pdf.text(T('Audit réalisé le ' + m.meta.auditDateLabel), M, 146.2);

  gauge(M + 25, 188, 21, m.score.value, m.score.tone, 4, 30);
  const tx = M + 62;
  if (m.score.value != null) badge(m.score.label, m.score.tone, tx, 168);
  else badge('Score indisponible', 'none', tx, 168);
  let cy2 = 179;
  wrap(m.score.verdict, CW - 62, 10, 'normal').slice(0, 5).forEach(l => { font('normal', 10, C.ink); pdf.text(l, tx, cy2); cy2 += lh(10); });
  font('normal', 9, C.muted);
  wrap(`${m.score.measured} ${plural(m.score.measured, 'critère mesuré', 'critères mesurés')} sur ${m.score.total} (${m.score.coverage} % de couverture). Les critères non mesurés sont exclus du score.`, CW - 62, 9, 'normal').slice(0, 3).forEach(l => { pdf.text(l, tx, cy2 + 1); cy2 += lh(9); });

  const facts = [['Date de l’audit', m.meta.auditDateLabel], ['Site web', m.meta.website || 'Aucun site renseigné'], ['Adresse', m.meta.address], ['Téléphone', m.meta.phone]].filter(f => f[1]);
  let fy = 222; stroke(C.line, 0.3); pdf.line(M, fy - 5, M + CW, fy - 5);
  facts.forEach(([k, v]) => { font('bold', 8.5, C.muted); pdf.text(T(k.toUpperCase()), M, fy); font('normal', 9.5, C.ink); pdf.text(fit(v, CW - 38, 9.5), M + 38, fy); fy += 6.6; });
  font('normal', 8.5, C.muted);
  wrap('Rapport établi à partir des seules données réellement mesurées lors de l’audit. Une donnée non mesurée n’est jamais comptée comme un défaut.', CW, 8.5, 'normal').forEach((l, i) => pdf.text(l, M, 262 + i * 4));

  /* La couverture utilise des coordonnées fixes : repartir sur une page dédiée évite
     que la fiche commerce se superpose au bandeau violet de la page 1. */
  newPage();

  /* =============== IDENTITÉ ET INFORMATIONS DU COMMERCE =============== */
  section('Fiche détaillée du commerce', 62);
  const bp = m.businessProfile || {};
  const profileRows = [
    ['Nom commercial', m.meta.business], ['Raison sociale', bp.legalName],
    ['Adresse du commerce', bp.address || m.meta.address], ['Téléphone', bp.phone || m.meta.phone],
    ['E-mail public', bp.email], ['Site internet', bp.website || m.meta.website],
    ['SIREN', bp.siren], ['SIRET du siège', bp.siret], ['Forme juridique', bp.legalForm],
    ['Activité principale / APE', bp.naf], ['Date de création légale', bp.creationDate],
    ['Ancienneté à la date du rapport', bp.ageLabel], ['Nombre d’établissements', bp.establishments],
    ['Code postal / commune', [bp.postalCode,bp.legalCity].filter(Boolean).join(' ')],
    ['Statut de l’établissement', bp.googleStatus],
    ['Note Google / avis', formatGoogleProfileSummary(bp.rating, bp.reviews)]
  ].filter(x => x[1] !== null && x[1] !== undefined && String(x[1]).trim() !== '');
  if (profileRows.length) {
    table([{w:57},{w:117}], ['Information','Donnée vérifiée / enregistrée'], profileRows);
  } else {
    para('Informations détaillées indisponibles dans le dossier. Relancez une analyse avec une fiche Google correctement associée.', {color:C.muted});
  }
  if (bp.hours && bp.hours.length) {
    sub('Horaires déclarés sur la fiche Google', Math.min(14 + bp.hours.length * 6, 66));
    bp.hours.forEach(h => para(h, {size:8.8, gap:1}));
  } else para('Horaires : non renseignés dans les données disponibles.', {size:8.8,color:C.muted});
  if (bp.legalStatus === 'matched') {
    para('Rapprochement registre public : ' + (bp.confidence || 'à vérifier') + '. Vérifiez le SIRET et l’adresse avant usage administratif.', {size:8.2,color:C.muted});
    if (bp.officialUrl) link('Consulter la fiche officielle de l’entreprise', bp.officialUrl);
  } else {
    para('Identité légale non confirmée : aucun SIREN/SIRET n’est présenté comme certain. La recherche n’a pas trouvé de correspondance suffisamment fiable.', {size:8.5,color:C.muted});
  }

  /* =============== SYNTHÈSE =============== */
  newPage();
  section('Synthèse de l’audit', 60);
  m.summary.forEach((s, i) => para(s, { size: i === 0 ? 10.5 : 9.8, style: i === 0 ? 'bold' : 'normal', gap: 2 }));
  y += 2;
  const lab = v => v == null ? 'Non mesuré' : toneOf(v) === 'good' ? 'Solide' : toneOf(v) === 'warn' ? 'À consolider' : 'À renforcer';
  tiles([
    { label: 'Score global', value: m.score.value != null ? m.score.value + '/100' : '-', sub: m.score.value != null ? m.score.label : 'Données insuffisantes', tone: m.score.tone },
    { label: 'SEO · Google', value: m.pillars.seo.value != null ? m.pillars.seo.value + '/100' : '-', sub: lab(m.pillars.seo.value), tone: toneOf(m.pillars.seo.value) },
    { label: 'GEO · IA', value: m.pillars.geo.value != null ? m.pillars.geo.value + '/100' : '-', sub: lab(m.pillars.geo.value), tone: toneOf(m.pillars.geo.value) },
    { label: 'Couverture', value: m.score.coverage + ' %', sub: `${m.score.measured}/${m.score.total} critères`, tone: m.score.coverage >= 75 ? 'good' : m.score.coverage >= 50 ? 'warn' : 'bad' },
  ]);
  if (m.score.range) para(`Fourchette possible selon les contrôles non mesurés : ${m.score.range.low} à ${m.score.range.high} /100.`, { size: 8.8, color: C.muted });
  sub('Indicateurs disponibles', 30);
  if (data.indicators.length) {
    let last = '';
    data.indicators.forEach(x => { if (x.group !== last) { last = x.group; ensure(18); font('bold', 8.5, C.muted); pdf.text(T(x.group.toUpperCase()), M, y + 3); y += 5; } bars([x]); });
    const miss = [m.pillars.seo, m.pillars.geo].some(p => p.value == null);
    if (miss) para('Un volet sans valeur ci-dessus n’a pas pu être chiffré : ses données ne sont pas disponibles.', { size: 8.8, color: C.muted });
  } else para('Aucun indicateur chiffré n’est disponible : les données mesurées sont insuffisantes.', { color: C.muted });

  /* =============== DIAGNOSTIC PAR CATÉGORIE =============== */
  section('Diagnostic détaillé par catégorie', 90);
  para('Chaque catégorie présente les contrôles disponibles, leur source et leur état. Les scores de catégorie ne prennent en compte que les éléments réellement mesurés ; les données manquantes ne sont pas pénalisées.', { size: 9, color: C.muted });
  const statusCell = s => s === 'ok' ? { badge: 'Conforme', tone: 'good' }
    : s === 'fix' ? { badge: 'À améliorer', tone: 'bad' }
    : s === 'measured' ? { badge: 'Disponible', tone: 'good' }
    : s === 'na' ? { badge: 'Sans objet', tone: 'none' }
    : { badge: 'Non mesuré', tone: 'none' };
  const critTable = (title, list, p) => {
    if (!list.length) return;
    sub(`${title} · ${list.filter(x => x.status !== 'unmeasured').length} mesuré${list.filter(x => x.status !== 'unmeasured').length > 1 ? 's' : ''} sur ${list.length}` + (p.value != null ? ` · score ${p.value}/100` : ''), 26);
    table([{ w: 48 }, { w: 28 }, { w: 98 }], ['Critère', 'État', 'Constat'], list.map(x => [{ text: x.label, bold: true }, statusCell(x.status), x.text + (x.status !== 'unmeasured' && x.source ? ' (' + x.source + ')' : '')]));
  };
  const categoryTables = (m.criteria.categories || []);
  if (categoryTables.length) {
    categoryTables.forEach(cat => {
      if (!cat.items.length) { sub(cat.label + ' · aucun contrôle exploitable', 12); return; }
      const measured = cat.measuredCount || 0;
      sub(`${cat.label} · ${measured}/${cat.totalCount} mesurés · ${cat.score == null ? 'score non calculable' : 'score ' + cat.score + '/100'} · couverture ${cat.coverage}%`, 26);
      table([{ w: 48 }, { w: 28 }, { w: 98 }], ['Critère', 'État', 'Constat'], cat.items.map(x => [{ text: x.label, bold: true }, statusCell(x.status), x.text + (x.source ? ' (' + x.source + ')' : '')]));
    });
  } else {
    critTable('SEO · être trouvé sur Google', m.criteria.seo, m.pillars.seo);
    critTable('GEO · être compris par les assistants IA', m.criteria.geo, m.pillars.geo);
  }
  if (m.criteria.context && m.criteria.context.items.length) {
    sub('Données légales, domaine et concurrence · éléments de contexte non notés', 26);
    table([{ w: 48 }, { w: 28 }, { w: 98 }], ['Élément', 'État', 'Information'], m.criteria.context.items.map(x => [{ text: x.label, bold: true }, statusCell(x.status), x.detail + (x.source ? ' (' + x.source + ')' : '')]));
    para('Ces informations enrichissent le diagnostic mais ne modifient pas le score global.', { size: 8.8, color: C.muted });
  }

  /* =============== SOURCES ET FIABILITÉ =============== */
  section('Sources et fiabilité des mesures', 70);
  const nMeas = m.sources.filter(s => s.status === 'measured').length, nUn = m.sources.filter(s => s.status === 'unmeasured').length, nNa = m.sources.filter(s => s.status === 'na').length;
  para(`${nMeas} source${nMeas > 1 ? 's' : ''} mesurée${nMeas > 1 ? 's' : ''}, ${nUn} non mesurée${nUn > 1 ? 's' : ''}${nNa ? `, ${nNa} sans objet` : ''}. Une source non mesurée n’a pas répondu : aucune valeur n’est estimée à sa place.`, { size: 9.2, color: C.muted });
  const srcBadge = s => s === 'measured' ? { badge: 'Mesuré', tone: 'good' } : s === 'na' ? { badge: 'Sans objet', tone: 'none' } : { badge: 'Non mesuré', tone: 'warn' };
  table([{ w: 62 }, { w: 28 }, { w: 84 }], ['Source', 'État', 'Détail'], m.sources.map(s => [{ text: s.name, bold: true }, srcBadge(s.status), s.detail]));
  if (m.unmeasuredNotes.length) { sub('Contrôles exclus du score', 24); m.unmeasuredNotes.forEach(x => item({ label: x.label, text: 'Non mesuré : ' + x.why + '.', color: C.warn })); }
  m.infoNotes.forEach(x => para(`${x.label} : ${x.why}.`, { size: 8.8, color: C.muted }));

  /* =============== PERFORMANCE DU SITE =============== */
  section('Performance du site (mobile)', 36);
  if (m.lighthouse) {
    para('Mesuré par Google PageSpeed Insights (Lighthouse, simulation mobile). Ces scores portent sur la page d’accueil.', { size: 9, color: C.muted });
    bars(m.lighthouse.scores.map(x => ({ label: x.label, value: x.value })));
    if (m.lighthouse.metrics.length) table([{ w: 87 }, { w: 87 }], ['Mesure', 'Valeur'], m.lighthouse.metrics.map(x => [x.label, { text: x.value, bold: true }]));
  } else {
    const s = m.sources.find(x => x.name.startsWith('Performance'));
    para(s && s.status === 'na' ? 'Sans objet : aucun site web n’est renseigné pour ce commerce.' : 'Non mesuré : Google PageSpeed n’a pas répondu. Aucune valeur n’est estimée à sa place.', { color: C.muted });
  }

  /* =============== CONCURRENTS =============== */
  section('Concurrents locaux', 70);
  if (m.competitors) {
    const cp = m.competitors;
    para(`${cp.total} ${plural(cp.total, 'commerce comparé', 'commerces comparés')} dans la zone` + (cp.selfRank ? `. Rang par nombre d’avis : n°${cp.selfRank} sur ${cp.count}.` : '.') + ' Ce n’est pas le classement de Google Maps.', { size: 9.2, color: C.muted });
    table([{ w: 14, align: 'right' }, { w: 92 }, { w: 30, align: 'right' }, { w: 38, align: 'right' }], ['Rang', 'Commerce', 'Note', 'Avis'], cp.list.map(x => {
      const mk = t => x.isSelf ? { text: t, hi: true } : t;
      return [mk(x.rank != null ? String(x.rank) : '-'), mk(x.name + (x.isSelf ? ' (ce commerce)' : '')), mk(x.rating != null ? frNum(x.rating) + '/5' : '-'), mk(x.reviews != null ? String(x.reviews) : '-')];
    }));
    if (cp.hidden > 0) para(`${cp.hidden} ${plural(cp.hidden, 'autre commerce n’est pas affiché', 'autres commerces ne sont pas affichés')} (le commerce audité reste toujours visible).`, { size: 8.8, color: C.muted });
    if (data.competitors && data.competitors.length) { sub('Nombre d’avis comparé', Math.min(data.competitors.length * 9.4, 60)); bars(data.competitors, { max: 'auto', tone: false, rh: 9.4 }); }
  } else para('Non mesuré : aucun concurrent exploitable n’a été retourné pour ce commerce.', { color: C.muted });

  /* =============== MOTS-CLÉS ET PRÉSENCE =============== */
  section('Mots-clés et présence en ligne', 40);
  if (m.rankings) {
    sub(`Mots-clés explorés · trouvé sur ${m.rankings.found} / ${m.rankings.valid}`, 26);
    table([{ w: 110 }, { w: 64 }], ['Recherche', 'Résultat'], m.rankings.rows.map(r => [r.kw, r.status === 'found' ? { badge: 'Position ' + r.pos, tone: r.pos <= 3 ? 'good' : r.pos <= 10 ? 'warn' : 'none' } : r.status === 'error' ? { badge: 'Non mesuré', tone: 'none' } : { badge: 'Non trouvé (20 premiers)', tone: 'bad' }]));
    para('Échantillon d’une recherche web : ce n’est pas un classement Google Maps.', { size: 8.8, color: C.muted });
  } else para('Mots-clés : non mesuré (la recherche web n’a pas répondu ou l’analyse complète n’a pas été lancée).', { color: C.muted });
  sub('Présence en ligne détectée', 20);
  if (m.presence) {
    para(m.presence.hasWebsite ? (m.presence.pageRead ? 'La page d’accueil du site a été lue.' : 'La page du site n’a pas pu être lue : les critères de contenu ne sont pas notés.') : 'Aucun site web n’est renseigné pour ce commerce.', { size: 9.4 });
    para('Réseaux sociaux : ' + (m.presence.socials.length ? m.presence.socials.join(', ') : 'aucun détecté') + '.', { size: 9.4 });
    para('Annuaires : ' + (m.presence.directories.length ? m.presence.directories.join(', ') : 'aucun détecté') + '.', { size: 9.4 });
  } else para('Non mesuré : l’analyse complète n’a pas été lancée.', { color: C.muted });

  /* =============== POINTS FORTS / À AMÉLIORER =============== */
  section('Points forts et points à améliorer', 40);
  sub('Points forts', 18);
  if (m.strengths.items.length) { m.strengths.items.forEach(x => item({ label: x.label, text: x.text, color: C.good, tag: { text: x.pillar, tone: 'none' } })); if (m.strengths.total > m.strengths.items.length) para(`+ ${m.strengths.total - m.strengths.items.length} autres points forts (voir le détail des critères).`, { size: 8.8, color: C.muted }); }
  else para('Aucun point fort n’a pu être établi sur les critères mesurés.', { color: C.muted });
  sub('Points à améliorer', 18);
  if (m.weaknesses.items.length) { m.weaknesses.items.forEach(x => item({ label: x.label, text: x.text, color: C.bad, tag: { text: x.pillar, tone: 'none' } })); if (m.weaknesses.total > m.weaknesses.items.length) para(`+ ${m.weaknesses.total - m.weaknesses.items.length} autres points à améliorer (voir le détail des critères).`, { size: 8.8, color: C.muted }); }
  else para('Aucun point faible n’a été relevé sur les critères mesurés.', { color: C.muted });

  /* =============== PLAN D'ACTION =============== */
  section('Plan d’action priorisé', 44);
  if (m.plan.length) {
    para('Actions classées par priorité, issues des seuls contrôles mesurés et non conformes. Les gains de score sont des estimations à vérifier avant mise en œuvre.', { size: 9, color: C.muted });
    m.plan.forEach(p => {
      const tone = p.priority === 'Haute' ? 'bad' : p.priority === 'Moyenne' ? 'warn' : 'none';
      const dl = wrap(p.detail, CW - 12, 9, 'normal'), tl = wrap(p.title, CW - 12 - 34, 10, 'bold');
      const meta = [p.axis, p.effort ? 'Effort : ' + p.effort : '', p.gain != null ? 'Gain estimé : +' + frNum(p.gain) + ' pts' : ''].filter(Boolean).join('  ·  ');
      const h = tl.length * lh(10) + dl.length * lh(9) + (meta ? 5 : 0) + 4;
      ensure(Math.min(h, 60));
      fill(C.primary); pdf.circle(M + 3.4, y + 3.2, 3.4, 'F'); font('bold', 9.5, C.paper); pdf.text(String(p.n), M + 3.4, y + 4.6, { align: 'center' });
      tl.forEach(l => { ensure(lh(10)); font('bold', 10, C.ink); pdf.text(l, M + 10, y + 3.7); y += lh(10); });
      badge('Priorité ' + p.priority.toLowerCase(), tone, M + CW - textW('Priorité ' + p.priority.toLowerCase(), 8, 'bold') - 5, y - lh(10) * tl.length);
      dl.forEach(l => { ensure(lh(9)); font('normal', 9, C.ink); pdf.text(l, M + 10, y + 3.2); y += lh(9); });
      if (meta) { ensure(5); font('normal', 8.5, C.muted); pdf.text(T(meta), M + 10, y + 3.2); y += 5; }
      y += 2.2; stroke(C.line, 0.2); pdf.line(M + 10, y, M + CW, y); y += 3;
    });
  } else para('Aucune action prioritaire : tous les contrôles mesurés sont conformes.', { color: C.muted });

  /* =============== RECOMMANDATIONS =============== */
  section('Recommandations professionnelles', 44);
  if (m.recommendations.length) {
    para('Pistes détaillées, dans l’ordre de priorité. Après les corrections, relancez un audit comparable pour mesurer l’évolution plutôt que de supposer un résultat.', { size: 9, color: C.muted });
    m.recommendations.forEach((r, i) => {
      const tone = r.priority === 'Haute' ? 'bad' : r.priority === 'Moyenne' ? 'warn' : 'none';
      const tl = wrap(r.title, CW - 38, 10.5, 'bold');
      ensure(Math.min(tl.length * lh(10.5) + 24, 50));
      font('bold', 10.5, C.deep); tl.forEach((l, k) => { ensure(lh(10.5)); font('bold', 10.5, C.deep); pdf.text(l, M, y + 4); if (k === 0) badge('Priorité ' + r.priority.toLowerCase(), tone, M + CW - textW('Priorité ' + r.priority.toLowerCase(), 8, 'bold') - 5, y); y += lh(10.5); });
      font('normal', 8.5, C.muted); pdf.text(T([r.axis, r.impact ? 'Impact ' + r.impact.toLowerCase() : ''].filter(Boolean).join('  ·  ')), M, y + 3); y += 5.4;
      if (r.why) para(r.why, { size: 9.2, gap: 1 });
      r.how.forEach(h => { const ls = wrap(h, CW - 8, 9.2, 'normal'); ensure(Math.min(ls.length * lh(9.2), 20)); fill(C.primary); pdf.circle(M + 2, y + 2.1, 0.9, 'F'); ls.forEach(l => { ensure(lh(9.2)); font('normal', 9.2, C.ink); pdf.text(l, M + 6, y + 3); y += lh(9.2); }); });
      y += 2; if (i < m.recommendations.length - 1) { stroke(C.line, 0.2); pdf.line(M, y, M + CW, y); y += 4; }
    });
  } else para('Aucune recommandation détaillée : les contrôles mesurés ne font apparaître aucun point à corriger.', { color: C.muted });

  /* =============== ÉVOLUTION (seulement avec ≥ 2 audits réels) =============== */
  if (data.history) {
    section('Évolution du score', 74);
    para(`Score des ${data.history.length} audits analysés de ce commerce. Seuls les audits réellement réalisés sont représentés.`, { size: 9, color: C.muted });
    lineChart(data.history);
  }

  /* =============== NOTES =============== */
  section('Notes méthodologiques et limites', 40);
  const notes = [
    'Le score reflète uniquement les critères réellement mesurés. Un critère non mesuré est exclu du calcul et n’est jamais compté comme un défaut.',
    'Les sources interrogées fournissent des échantillons (page d’accueil, quelques recherches, concurrents proches) et non des recensements exhaustifs.',
    m.competitors ? 'Le rang parmi les concurrents est établi sur le nombre d’avis publics ; ce n’est pas le classement de Google Maps.' : '',
    'Les gains de score indiqués sont des estimations. Relancer un audit comparable après correction permet de mesurer l’évolution réelle.',
    ...m.infoNotes.map(x => `${x.label} : ${x.why}.`),
    `Rapport généré le ${m.meta.generatedLabel} par ${APP} à partir du dossier d’audit du ${m.meta.auditDateLabel || 'commerce'}.`,
  ].filter(Boolean);
  notes.forEach(n => bullet(n));

  /* =============== CONTACT (marque enregistrée) =============== */
  const ct = B.contact || {}, sg = B.signature || {};
  const contactLines = [ct.address, ct.email, ct.phone, ct.website].filter(Boolean);
  if (sg.name || sg.role || B.company || contactLines.length || sg.text) {
    section('Votre contact', 40);
    if (sg.name) para(sg.name, { size: 11, style: 'bold', color: C.deep, gap: 0.4 });
    if (sg.role) para(sg.role, { size: 9.5, color: C.muted, gap: 0.8 });
    if (B.company) para(B.company, { size: 9.5, style: 'bold', gap: 0.8 });
    contactLines.forEach(l => para(l, { size: 9.5, gap: 0.2 }));
    if (sg.text) para(sg.text, { size: 9.5, color: C.muted, gap: 0 });
  }

  /* =============== PIED DE PAGE (pagination) =============== */
  const N = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= N; i++) {
    pdf.setPage(i);
    stroke(C.line, 0.25); pdf.line(M, PH - 13.5, PW - M, PH - 13.5);
    font('bold', 8.5, C.primary); pdf.text(fit(APP, 40, 8.5, 'bold'), M, PH - 8.4);
    const fx = M + Math.min(40, textW(APP, 8.5, 'bold')) + 3; font('normal', 8.5, C.muted); pdf.text(fit(REPORT_TITLE + ' · ' + m.meta.business, 125 - (fx - M), 8.5), fx, PH - 8.4);
    pdf.text(`Page ${i} / ${N}`, PW - M, PH - 8.4, { align: 'right' });
  }
  return pdf;
}
