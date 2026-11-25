// AuditIA — générateur du rapport PDF (refonte « cabinet de conseil », novembre 2026).
// jsPDF natif : texte vectoriel net, graphiques dessinés en vectoriel à partir des mêmes données que l'aperçu.
// Aucune image (hors logo enregistré), aucun réseau, aucune écriture : le PDF est une pure fonction du modèle (report-model.js).
// Structure : couverture · synthèse · diagnostic · marché local · performance · plan d'action · recommandations ·
// évolution · proposition · annexes (fiche, sources, méthode, contact).
// Mise en page : A4 portrait, marges 16 mm, tableaux sans ligne coupée (en-tête répété), titres jamais isolés en bas de page.
import { COLORS, hexToRgb, chartData } from './report-charts.js';
import { REPORT_TITLE, toneOf } from './report-model.js';
import { defaultBrand, logoFormat } from '../settings/brand.js';
import { OFFER, offerCards } from '../settings/offer.js';

const PW = 210, PH = 297, M = 16, CW = PW - 2 * M, TOP = 24, BOT = PH - 18, PT = 0.3528;
const BASE_C = Object.fromEntries(Object.entries(COLORS).map(([k, v]) => [k, hexToRgb(v)]));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const WHITE = [255, 255, 255];

/* Les polices PDF standard ne couvrent que le latin (WinAnsi) : on remplace ou retire le reste au lieu d'afficher des « ? ». */
const UNSUPPORTED = /[^ -~¡-ÿŒœ‘’“”–—•…€]/g;
export function pdfSafe(s) {
  return String(s == null ? '' : s)
    .replace(/[      ]/g, ' ').replace(/→/g, '->').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/−/g, '-')
    .replace(/[↗✓✔✗✘]/g, '').replace(UNSUPPORTED, '').replace(/ {2,}/g, ' ');
}
const frNum = n => String(n).replace('.', ',');
const plural = (n, a, b) => (n > 1 ? b : a);
const pad2 = n => String(n).padStart(2, '0');
const levelOf = v => v == null ? 'Non mesuré' : toneOf(v) === 'good' ? 'Solide' : toneOf(v) === 'warn' ? 'À consolider' : 'À renforcer';

export function buildReportPdf(JsPDF, m) {
  const B = m.brand || defaultBrand();           // marque enregistrée ; marque par défaut si absente (jamais de clé ni de donnée technique)
  const C = { ...BASE_C, primary: hexToRgb(B.primary), deep: hexToRgb(B.deep), line: [228, 223, 240], rule: [214, 207, 234] };
  C.soft = { good: mix(C.good, WHITE, 0.88), warn: mix(C.warn, WHITE, 0.87), bad: mix(C.bad, WHITE, 0.89), none: [240, 238, 245], primary: mix(C.primary, WHITE, 0.89) };
  C.tint = mix(C.primary, WHITE, 0.955); C.tint2 = mix(C.primary, WHITE, 0.9);
  const ACCENT = B.accent ? hexToRgb(B.accent) : mix(C.primary, WHITE, 0.45);
  const APP = pdfSafe(B.appName) || 'AuditIA';
  const AUTHOR = pdfSafe((B.signature && B.signature.name) || B.company || APP);
  const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  pdf.setProperties({ title: pdfSafe(m.meta.business + ' - ' + REPORT_TITLE), subject: REPORT_TITLE, author: pdfSafe(B.company || APP), creator: APP, keywords: 'audit, visibilité, SEO, GEO' });
  const T = pdfSafe;
  const data = chartData(m);
  let y = TOP, secNo = 0;

  /* ---------- primitives ---------- */
  const font = (style = 'normal', size = 9.5, color = C.ink) => { pdf.setFont('helvetica', style); pdf.setFontSize(size); pdf.setTextColor(color[0], color[1], color[2]); };
  const fill = c => pdf.setFillColor(c[0], c[1], c[2]);
  const stroke = (c, w = 0.3) => { pdf.setDrawColor(c[0], c[1], c[2]); pdf.setLineWidth(w); };
  const lh = (size, k = 1.42) => size * PT * k;
  const base = size => size * PT * 0.78;          // décalage de la ligne de base sous le haut de la ligne
  const wrap = (str, w, size, style) => { pdf.setFont('helvetica', style || 'normal'); pdf.setFontSize(size); return pdf.splitTextToSize(T(str), w - 1.3); };
  const textW = (str, size, style) => { pdf.setFont('helvetica', style || 'normal'); pdf.setFontSize(size); return pdf.getTextWidth(T(str)); };
  const fit = (str, w, size, style) => {   // une ligne, tronquée avec « … »
    pdf.setFont('helvetica', style || 'normal'); pdf.setFontSize(size);
    let s = T(str); if (pdf.getTextWidth(s) <= w) return s;
    while (s.length > 1 && pdf.getTextWidth(s + '…') > w) s = s.slice(0, -1);
    return s.trimEnd() + '…';
  };
  const kicker = (str, x, yy, color, size = 7.6) => { font('bold', size, color); pdf.text(T(str).toUpperCase(), x, yy, { charSpace: 0.35 }); };

  const chrome = () => {   // en-tête courant des pages intérieures
    fill(C.primary); pdf.roundedRect(M, 8.6, 3.4, 3.4, 0.8, 0.8, 'F');
    font('bold', 8, C.deep); pdf.text(fit(APP, 44, 8, 'bold'), M + 5.4, 11.3);
    const hx = M + 5.4 + Math.min(44, textW(APP, 8, 'bold')) + 2.6;
    font('normal', 8, C.muted); pdf.text(fit(REPORT_TITLE, 74, 8), hx, 11.3);
    font('bold', 8, C.ink); pdf.text(fit(m.meta.business, 62, 8, 'bold'), PW - M, 11.3, { align: 'right' });
    stroke(C.line, 0.3); pdf.line(M, 15, PW - M, 15);
  };
  const newPage = () => { pdf.addPage(); chrome(); y = TOP; };
  const ensure = h => { if (y + Math.min(h, BOT - TOP) > BOT) newPage(); };
  const room = () => BOT - y;

  const para = (str, { size = 9.4, color = C.ink, style = 'normal', w = CW, x = M, gap = 1.8, k = 1.45 } = {}) => {
    const ls = wrap(str, w, size, style), h = lh(size, k);
    if (ls.length <= 4) ensure(ls.length * h);
    ls.forEach(l => { ensure(h); font(style, size, color); pdf.text(l, x, y + base(size)); y += h; });
    y += gap;
  };

  /* Titre de chapitre : numéro + surtitre, grand titre, filet d'accent. */
  const section = (title, { over = '', minAfter = 40, fresh = false } = {}) => {
    if (fresh && y > TOP + 1) newPage();
    else { ensure(24 + minAfter); if (y > TOP + 1) y += 7; }
    secNo++;
    kicker(pad2(secNo) + (over ? '  ·  ' + over : ''), M, y + 3, C.primary);
    font('bold', 18, C.deep); pdf.text(T(title), M, y + 11.4);
    fill(C.primary); pdf.rect(M, y + 14.6, 14, 0.9, 'F'); stroke(C.line, 0.3); pdf.line(M + 15.5, y + 15.05, M + CW, y + 15.05);
    y += 21;
  };
  const sub = (title, { minAfter = 22, right = null } = {}) => {
    ensure(9 + minAfter);
    font('bold', 11, C.ink); pdf.text(fit(title, right ? CW - 40 : CW, 11, 'bold'), M, y + base(11));
    if (right) pill(right.text, right.tone, M + CW - pillW(right.text), y - 0.4);
    y += 7.2;
  };

  /* Pastille douce (fond teinté, texte coloré). Retourne sa largeur. */
  const PILL = 7.4;
  const pillW = (str, size = PILL) => textW(str, size, 'bold') + 5.2;
  const pill = (str, tone, x, yy, size = PILL) => {
    const s = T(str), w = pillW(s, size), h = 4.9;
    fill(C.soft[tone] || C.soft.none); pdf.roundedRect(x, yy, w, h, 2.45, 2.45, 'F');
    font('bold', size, tone === 'none' ? C.muted : (C[tone] || C.primary)); pdf.text(s, x + w / 2, yy + 3.45, { align: 'center' });
    return w;
  };
  const solidPill = (str, color, x, yy, size = PILL) => {
    const s = T(str), w = pillW(s, size), h = 4.9;
    fill(color); pdf.roundedRect(x, yy, w, h, 2.45, 2.45, 'F');
    font('bold', size, WHITE); pdf.text(s, x + w / 2, yy + 3.45, { align: 'center' }); return w;
  };

  /* Icônes vectorielles : coche, croix, point. */
  const iconOk = (x, yy, r = 2.1) => { fill(C.soft.good); pdf.circle(x, yy, r, 'F'); stroke(C.good, 0.45); pdf.setLineCap('round'); pdf.line(x - r * 0.45, yy, x - r * 0.1, yy + r * 0.38); pdf.line(x - r * 0.1, yy + r * 0.38, x + r * 0.5, yy - r * 0.36); pdf.setLineCap('butt'); };
  const iconKo = (x, yy, r = 2.1) => { fill(C.soft.bad); pdf.circle(x, yy, r, 'F'); stroke(C.bad, 0.45); pdf.setLineCap('round'); const d = r * 0.36; pdf.line(x - d, yy - d, x + d, yy + d); pdf.line(x - d, yy + d, x + d, yy - d); pdf.setLineCap('butt'); };

  const bar = (x, yy, w, h, v, color, track = C.tint2) => {
    fill(track); pdf.roundedRect(x, yy, w, h, h / 2, h / 2, 'F');
    if (v != null && v > 0) { fill(color); pdf.roundedRect(x, yy, Math.max(h, w * Math.min(1, v / 100)), h, h / 2, h / 2, 'F'); }
  };

  /* Bloc d'appel : fond teinté, filet gauche coloré. */
  const callout = (str, { tone = 'primary', size = 9, style = 'normal', title = '' } = {}) => {
    const col = C[tone] || C.primary, w = CW - 10, ls = wrap(str, w, size, style), tl = title ? wrap(title, w, 9.6, 'bold') : [];
    const h = tl.length * lh(9.6) + ls.length * lh(size) + 6.4 + (title ? 0.8 : 0);
    ensure(h + 2);
    fill(C.soft[tone] || C.tint); pdf.roundedRect(M, y, CW, h, 2, 2, 'F'); fill(col); pdf.rect(M, y, 1.1, h, 'F');
    let yy = y + 3.2;
    tl.forEach(l => { font('bold', 9.6, C.ink); pdf.text(l, M + 6, yy + base(9.6)); yy += lh(9.6); });
    if (title) yy += 0.8;
    ls.forEach(l => { font(style, size, C.ink); pdf.text(l, M + 6, yy + base(size)); yy += lh(size); });
    y += h + 4;
  };

  /* Tableau : colonnes [{w, align}], cellules = texte | {text,bold,color} | {pill,tone} | {bar,value,max,label}. Une ligne n'est jamais coupée. */
  const table = (cols, head, rows, { size = 8.8, hiRow = null } = {}) => {
    const padX = 2.4, padY = 2.3, hh = 7;
    const lines = (cell, w) => {
      if (cell && (cell.pill != null || cell.bar != null)) return [''];
      const txt = cell && typeof cell === 'object' ? cell.text : cell;
      return wrap(txt, w - 2 * padX, size, cell && cell.bold ? 'bold' : 'normal');
    };
    const rowH = row => Math.max(8, Math.max(...row.map((c, i) => lines(c, cols[i].w).length)) * lh(size, 1.38) + 2 * padY);
    const header = () => {
      fill(C.tint); pdf.rect(M, y, CW, hh, 'F'); stroke(C.rule, 0.35); pdf.line(M, y + hh, M + CW, y + hh);
      let x = M;
      head.forEach((h, i) => { const al = cols[i].align === 'right'; font('bold', 6.9, C.deep); pdf.text(T(h).toUpperCase(), al ? x + cols[i].w - padX : x + padX, y + 4.6, al ? { align: 'right' } : { charSpace: 0.35 }); x += cols[i].w; });
      y += hh;
    };
    const total = hh + rows.reduce((a, r) => a + rowH(r), 0);
    ensure(total <= 80 ? total + 2 : hh + (rows.length ? rowH(rows[0]) : 0) + 2); header();   // un petit tableau n'est jamais coupé
    rows.forEach((row, ri) => {
      const h = rowH(row);
      if (y + h > BOT) { newPage(); header(); }
      const hi = hiRow ? hiRow(ri) : false;
      if (hi) { fill(C.soft.primary); pdf.rect(M, y, CW, h, 'F'); fill(C.primary); pdf.rect(M, y, 0.9, h, 'F'); }
      let x = M;
      row.forEach((cell, i) => {
        const w = cols[i].w;
        if (cell && cell.pill != null) {
          const pw = pillW(cell.pill);
          pill(cell.pill, cell.tone || 'none', cols[i].align === 'right' ? x + w - padX - pw : x + padX, y + (h - 4.9) / 2);
        } else if (cell && cell.bar != null) {
          const lab = cell.label != null ? String(cell.label) : '', lw = 12;
          bar(x + padX, y + h / 2 - 1.1, w - 2 * padX - lw - 1.5, 2.2, cell.max ? (cell.value / cell.max) * 100 : cell.value, cell.color || C.primary);
          font('bold', size, C.ink); pdf.text(T(lab), x + w - padX, y + h / 2 + 1.2, { align: 'right' });
        } else {
          const ls = lines(cell, w), bold = !!(cell && cell.bold) || hi, col = (cell && cell.color) || C.ink;
          const top = y + (h - ls.length * lh(size, 1.38)) / 2;
          ls.forEach((l, li) => { font(bold ? 'bold' : 'normal', size, col); pdf.text(l, cols[i].align === 'right' ? x + w - padX : x + padX, top + base(size) + li * lh(size, 1.38) + 0.3, { align: cols[i].align === 'right' ? 'right' : 'left' }); });
        }
        x += w;
      });
      stroke(C.line, 0.25); pdf.line(M, y + h, M + CW, y + h);
      y += h;
    });
    y += 4;
  };

  /* Grille clé / valeur sur deux colonnes (fiche d'identité). */
  const kvGrid = rows => {
    const colW = (CW - 8) / 2, kw = 30;
    for (let i = 0; i < rows.length; i += 2) {
      const pair = rows.slice(i, i + 2);
      const hs = pair.map(([, v]) => wrap(v, colW - kw, 8.8, 'bold').length * lh(8.8, 1.35));
      const h = Math.max(...hs) + 5;
      ensure(h);
      pair.forEach(([k, v], j) => {
        const x = M + j * (colW + 8);
        font('normal', 7.8, C.muted); wrap(k, kw - 2, 7.8, 'normal').slice(0, 2).forEach((l, li) => pdf.text(l, x, y + 3.4 + li * 3.2));
        wrap(v, colW - kw, 8.8, 'bold').forEach((l, li) => { font('bold', 8.8, C.ink); pdf.text(l, x + kw, y + 3.4 + li * lh(8.8, 1.35)); });
        stroke(C.line, 0.25); pdf.line(x, y + h - 0.6, x + colW, y + h - 0.6);
      });
      y += h + 0.4;
    }
    y += 3;
  };

  /* Jauge circulaire. */
  const ring = (cx, cy, r, value, tone, lw, numSize, subLabel = 'sur 100', track = C.tint2) => {
    stroke(track, lw); pdf.circle(cx, cy, r, 'S');
    if (value != null) {
      const sweep = Math.max(1, Math.min(100, value)) * 3.6;
      stroke(C[tone] || C.primary, lw); pdf.setLineCap('round');
      for (let d = 0; d < sweep; d += 2) {
        const a1 = (d - 90) * Math.PI / 180, a2 = (Math.min(d + 2.2, sweep) - 90) * Math.PI / 180;
        pdf.line(cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2));
      }
      pdf.setLineCap('butt');
    }
    font('bold', value == null ? numSize * 0.75 : numSize, value == null ? C.none : C.ink);
    pdf.text(value == null ? '-' : String(value), cx, cy + numSize * PT * 0.34, { align: 'center' });
    if (subLabel) { font('normal', Math.max(6.5, numSize * 0.27), C.muted); pdf.text(value == null ? 'non mesuré' : subLabel, cx, cy + numSize * PT * 0.34 + Math.max(3.4, numSize * 0.16), { align: 'center' }); }
  };

  /* Carte indicateur : surtitre, valeur, niveau, barre. */
  const kpiRow = (list, h = 27) => {
    const gap = 4, w = (CW - gap * (list.length - 1)) / list.length;
    ensure(h + 3);
    list.forEach((t, i) => {
      const x = M + i * (w + gap), col = t.tone === 'none' ? C.none : (C[t.tone] || C.primary);
      fill(WHITE); stroke(C.line, 0.3); pdf.roundedRect(x, y, w, h, 2, 2, 'FD');
      kicker(fit(t.label, w - 8, 6.9, 'bold'), x + 4, y + 6, C.muted, 6.9);
      font('bold', 17, t.tone === 'none' ? C.none : C.ink); pdf.text(T(t.value), x + 4, y + 15);
      if (t.suffix) { const vw = textW(t.value, 17, 'bold'); font('normal', 8, C.muted); pdf.text(T(t.suffix), x + 4 + vw + 1, y + 15); }
      font('bold', 7.6, col); pdf.text(fit(t.sub || '', w - 8, 7.6, 'bold'), x + 4, y + 20.2);
      bar(x + 4, y + h - 4.4, w - 8, 1.5, t.bar, col);
    });
    y += h + 5;
  };

  /* Deux colonnes de constats (forces / freins), hauteur égale. */
  const twoLists = (left, right) => {
    const gap = 6, w = (CW - gap) / 2, innerW = w - 15;
    const measure = list => list.reduce((a, it) => a + wrap(it.label, innerW, 9, 'bold').length * lh(9, 1.35) + (it.text ? wrap(it.text, innerW, 8.2).length * lh(8.2, 1.35) : 0) + 3.4, 0);
    const h = Math.max(measure(left.items), measure(right.items), 10) + 15;
    ensure(h + 2);
    [left, right].forEach((col, j) => {
      const x = M + j * (w + gap);
      fill(WHITE); stroke(C.line, 0.3); pdf.roundedRect(x, y, w, h, 2, 2, 'FD');
      fill(C[col.tone]); pdf.roundedRect(x, y, w, 1.2, 0.6, 0.6, 'F');
      font('bold', 10, C.ink); pdf.text(T(col.title), x + 5, y + 8.4);
      let yy = y + 13.6;
      if (!col.items.length) { font('normal', 8.4, C.muted); wrap(col.empty, w - 10, 8.4).forEach(l => { pdf.text(l, x + 5, yy + base(8.4)); yy += lh(8.4); }); }
      col.items.forEach(it => {
        (col.tone === 'good' ? iconOk : iconKo)(x + 7, yy + 1.7, 1.9);
        wrap(it.label, innerW, 9, 'bold').forEach(l => { font('bold', 9, C.ink); pdf.text(l, x + 11.5, yy + base(9)); yy += lh(9, 1.35); });
        if (it.text) wrap(it.text, innerW, 8.2).forEach(l => { font('normal', 8.2, C.muted); pdf.text(l, x + 11.5, yy + base(8.2)); yy += lh(8.2, 1.35); });
        yy += 3.4;
      });
    });
    y += h + 5;
  };

  /* Ligne d'action numérotée (plan d'action) : rail vertical, pastille de priorité, méta. */
  const prioTone = p => p === 'Haute' ? 'bad' : p === 'Moyenne' ? 'warn' : 'none';
  const actionItem = (p, last) => {
    const tw = CW - 14 - 34, tl = wrap(p.title, tw, 10, 'bold'), dl = wrap(p.detail, CW - 14, 8.9);
    const meta = [p.axis, p.effort ? 'Effort : ' + p.effort : '', p.gain != null ? 'Gain estimé : +' + frNum(p.gain) + ' pts' : ''].filter(Boolean).join('   ·   ');
    const h = tl.length * lh(10, 1.35) + dl.length * lh(8.9) + (meta ? 5.2 : 0) + 5;
    ensure(Math.min(h, 60));
    const y0 = y;
    fill(C.primary); pdf.circle(M + 3.6, y + 3.4, 3.6, 'F'); font('bold', 9, WHITE); pdf.text(String(p.n), M + 3.6, y + 4.6, { align: 'center' });
    if (!last) { stroke(C.tint2, 0.6); pdf.line(M + 3.6, y + 7.8, M + 3.6, y + h - 0.6); }
    const label = 'Priorité ' + p.priority.toLowerCase();
    pill(label, prioTone(p.priority), M + CW - pillW(label), y0 + 0.9);
    tl.forEach(l => { font('bold', 10, C.ink); pdf.text(l, M + 12, y + base(10) + 1); y += lh(10, 1.35); });
    y += 0.8;
    dl.forEach(l => { ensure(lh(8.9)); font('normal', 8.9, C.ink); pdf.text(l, M + 12, y + base(8.9)); y += lh(8.9); });
    if (meta) { ensure(5); font('normal', 7.9, C.muted); pdf.text(T(meta), M + 12, y + base(7.9) + 0.8); y += 5.2; }
    y = Math.max(y, y0 + 9) + 4;
  };

  /* =============== PAGE 1 : COUVERTURE =============== */
  const BAND = 166;
  fill(C.deep); pdf.rect(0, 0, PW, BAND, 'F');
  // motif discret : anneaux concentriques en haut à droite
  [78, 62, 46, 30].forEach((r, i) => { stroke(mix(C.deep, WHITE, 0.07 + i * 0.03), 0.35); pdf.circle(PW + 4, 18, r, 'S'); });
  fill(mix(C.deep, C.primary, 0.55)); pdf.circle(PW - 26, 52, 2.2, 'F');
  let nameX = M;
  if (B.logo) {   // logo enregistré : sur pastille blanche, proportions conservées ; en cas d'échec, simple absence de logo
    try {
      const ip = pdf.getImageProperties(B.logo), k = Math.min(34 / ip.width, 12 / ip.height), lw = ip.width * k, lh2 = ip.height * k;
      fill(WHITE); pdf.roundedRect(M, 15, lw + 5, lh2 + 5, 1.6, 1.6, 'F'); pdf.addImage(B.logo, logoFormat(B.logo), M + 2.5, 17.5, lw, lh2);
      nameX = M + lw + 10;
    } catch (e) { nameX = M; }
  } else { fill(C.primary); pdf.roundedRect(M, 16.4, 8, 8, 1.8, 1.8, 'F'); font('bold', 8, WHITE); pdf.text(T(APP.slice(0, 2)).toUpperCase(), M + 4, 21.6, { align: 'center' }); nameX = M + 11.5; }
  font('bold', 13, WHITE); pdf.text(fit(APP, 90, 13, 'bold'), nameX, 22.4);
  if (B.company) { font('normal', 8.5, mix(C.deep, WHITE, 0.7)); pdf.text(fit(B.company, 90, 8.5), nameX, 27); }
  font('bold', 7, mix(C.deep, WHITE, 0.62)); pdf.text('DOCUMENT CONFIDENTIEL', PW - M, 22.4, { align: 'right' });

  kicker(REPORT_TITLE, M, 74, ACCENT, 8.4);
  fill(ACCENT); pdf.rect(M, 77.6, 20, 0.8, 'F');
  const nameLines = wrap(m.meta.business, CW - 10, 31, 'bold').slice(0, 3);
  nameLines.forEach((l, i) => { font('bold', 31, WHITE); pdf.text(l, M, 93 + i * 12.6); });
  let ty = 93 + (nameLines.length - 1) * 12.6 + 10;
  const subline = [m.meta.sector, m.meta.city].filter(Boolean).join('   ·   ');
  if (subline) { font('normal', 12, mix(C.deep, WHITE, 0.78)); pdf.text(fit(subline, CW, 12), M, ty); ty += 8; }
  // pied du bandeau : date et auteur
  const metaCols = [['Date de l’audit', m.meta.auditDateLabel || '-'], ['Préparé par', AUTHOR], ['Généré le', m.meta.generatedLabel]];
  metaCols.forEach(([k, v], i) => { const x = M + i * 60; kicker(k, x, 136, mix(C.deep, WHITE, 0.55), 6.8); font('bold', 9.6, WHITE); pdf.text(fit(v, 56, 9.6, 'bold'), x, 142); });

  // carte du score, à cheval sur le bandeau
  const cardY = 152, cardH = 76;
  fill(mix(C.deep, WHITE, 0.82)); pdf.roundedRect(M + 0.6, cardY + 0.9, CW - 1.2, cardH, 3, 3, 'F');
  fill(WHITE); stroke(C.line, 0.3); pdf.roundedRect(M, cardY, CW, cardH, 3, 3, 'FD');
  kicker('Score de visibilité', M + 8, cardY + 10, C.muted, 7);
  ring(M + 31, cardY + 42, 19, m.score.value, m.score.tone, 4.2, 30, 'sur 100');
  const tx = M + 62, tw = CW - 70;
  let cy = cardY + 8;
  if (m.score.value != null) solidPill(m.score.label, C[m.score.tone] || C.primary, tx, cy, 8);
  else pill('Score indisponible', 'none', tx, cy, 8);
  cy += 11;
  wrap(m.score.verdict, tw, 10.4, 'bold').slice(0, 3).forEach(l => { font('bold', 10.4, C.ink); pdf.text(l, tx, cy); cy += lh(10.4, 1.35); });
  cy += 1.5;
  wrap(`${m.score.measured} ${plural(m.score.measured, 'critère mesuré', 'critères mesurés')} sur ${m.score.total} (${m.score.coverage} % de couverture). Un critère non mesuré est exclu du calcul, jamais compté comme un défaut.`, tw, 8.2, 'normal').slice(0, 3).forEach(l => { font('normal', 8.2, C.muted); pdf.text(l, tx, cy); cy += lh(8.2, 1.35); });
  // mini-indicateurs SEO / GEO / couverture
  const mini = [
    ['SEO · Google', m.pillars.seo.value, toneOf(m.pillars.seo.value)],
    ['GEO · IA', m.pillars.geo.value, toneOf(m.pillars.geo.value)],
    ['Couverture', m.score.coverage, m.score.coverage >= 75 ? 'good' : m.score.coverage >= 50 ? 'warn' : 'bad'],
  ];
  const mw = (tw - 8) / 3, my = cardY + cardH - 17;
  stroke(C.line, 0.3); pdf.line(tx, my - 4, tx + tw, my - 4);
  mini.forEach(([lab, v, tone], i) => {
    const x = tx + i * (mw + 4);
    kicker(lab, x, my + 1, C.muted, 6.6);
    font('bold', 13, v == null ? C.none : C.ink); pdf.text(v == null ? '-' : String(v) + (lab === 'Couverture' ? ' %' : ''), x, my + 7.6);
    if (v != null && lab !== 'Couverture') { const vw = textW(String(v), 13, 'bold'); font('normal', 7.4, C.muted); pdf.text('/100', x + vw + 0.8, my + 7.6); }
    bar(x, my + 10, mw, 1.4, v, tone === 'none' ? C.none : C[tone]);
  });

  // coordonnées du commerce
  const facts = [['Site web', m.meta.website || 'Aucun site renseigné'], ['Téléphone', m.meta.phone], ['Adresse', m.meta.address]].filter(f => f[1]);
  let fy = 242;
  const fw = CW / Math.max(1, facts.length);
  facts.forEach(([k, v], i) => { const x = M + i * fw; kicker(k, x, fy, C.muted, 6.8); wrap(v, fw - 6, 9, 'bold').slice(0, 2).forEach((l, li) => { font('bold', 9, C.ink); pdf.text(l, x, fy + 5.4 + li * 4.2); }); });
  stroke(C.line, 0.3); pdf.line(M, 262, M + CW, 262);
  wrap('Ce rapport est établi uniquement à partir des données réellement mesurées lors de l’audit (sources publiques). Une donnée non mesurée n’est jamais estimée ni comptée comme un défaut. Les gains indiqués sont des estimations et ne constituent pas une garantie de résultat.', CW, 7.6, 'normal').forEach((l, i) => { font('normal', 7.6, C.muted); pdf.text(l, M, 267 + i * 3.6); });

  /* =============== SYNTHÈSE =============== */
  newPage();
  section('Synthèse', { over: 'L’essentiel en une page', minAfter: 120 });
  if (m.score.value != null) para(`${m.meta.business} obtient ${m.score.value}/100 : ${m.score.label.toLowerCase()}.`, { size: 13, style: 'bold', color: C.deep, gap: 1.6, k: 1.3 });
  else para('Les données mesurées sont insuffisantes pour établir un score.', { size: 13, style: 'bold', color: C.deep, gap: 1.6 });
  para(m.summary.slice(1, 3).join(' '), { size: 9.4, color: C.muted, gap: 5 });

  const cats = m.criteria.categories || [];
  const catScore = id => { const c = cats.find(x => x.id === id); return c && c.score != null ? Math.round(c.score) : null; };
  if (cats.length) {
    kpiRow([['google', 'Fiche Google'], ['reputation', 'Avis clients'], ['website', 'Site & mobile'], ['geo', 'Assistants IA']].map(([id, label]) => {
      const v = catScore(id);
      return { label, value: v != null ? String(v) : '-', suffix: v != null ? '/100' : '', sub: levelOf(v), tone: toneOf(v), bar: v };
    }));
  }
  twoLists(
    { title: 'Ce qui fonctionne', tone: 'good', items: m.strengths.items.slice(0, 4), empty: 'Aucun point fort n’a pu être établi sur les critères mesurés.' },
    { title: 'Ce qui vous freine', tone: 'bad', items: m.weaknesses.items.slice(0, 4), empty: 'Aucun point faible relevé sur les critères mesurés.' },
  );
  sub('Vos 3 priorités', { minAfter: 30 });
  if (m.plan.length) m.plan.slice(0, 3).forEach((p, i, a) => actionItem(p, i === a.length - 1));
  else para('Aucune action prioritaire : tous les contrôles mesurés sont conformes.', { color: C.muted });
  para('Estimations fondées sur des données publiques : elles ne garantissent aucun résultat.', { size: 7.8, color: C.muted });

  /* =============== DIAGNOSTIC =============== */
  section('Diagnostic détaillé', { over: 'Score par catégorie', fresh: true });
  para('Chaque catégorie ne tient compte que des contrôles réellement mesurés : une donnée manquante est exclue du calcul et ne pénalise jamais le score.', { size: 8.8, color: C.muted, gap: 4 });
  // deux piliers
  kpiRow([
    { label: 'SEO · être trouvé sur Google', value: m.pillars.seo.value != null ? String(m.pillars.seo.value) : '-', suffix: m.pillars.seo.value != null ? '/100' : '', sub: levelOf(m.pillars.seo.value) + ' · ' + m.pillars.seo.measured + ' contrôles', tone: toneOf(m.pillars.seo.value), bar: m.pillars.seo.value },
    { label: 'GEO · être cité par les assistants IA', value: m.pillars.geo.value != null ? String(m.pillars.geo.value) : '-', suffix: m.pillars.geo.value != null ? '/100' : '', sub: levelOf(m.pillars.geo.value) + ' · ' + m.pillars.geo.measured + ' contrôles', tone: toneOf(m.pillars.geo.value), bar: m.pillars.geo.value },
  ]);
  if (m.score.range) para(`Fourchette possible selon les contrôles non mesurés : ${m.score.range.low} à ${m.score.range.high} /100.`, { size: 8.4, color: C.muted });
  if (cats.length) {
    table([{ w: 70 }, { w: 58 }, { w: 22, align: 'right' }, { w: 28 }], ['Catégorie', 'Score', 'Mesurés', 'Niveau'],
      cats.map(c => [{ text: c.label, bold: true }, c.score != null ? { bar: true, value: Math.round(c.score), label: Math.round(c.score), color: C[toneOf(c.score)] } : { text: 'non calculable', color: C.muted }, { text: `${c.measuredCount}/${c.totalCount}` }, { pill: levelOf(c.score), tone: toneOf(c.score) }]));
  }
  const statusCell = s => s === 'ok' ? { pill: 'Conforme', tone: 'good' }
    : s === 'fix' ? { pill: 'À corriger', tone: 'bad' }
    : s === 'measured' ? { pill: 'Disponible', tone: 'good' }
    : s === 'na' ? { pill: 'Sans objet', tone: 'none' }
    : { pill: 'Non mesuré', tone: 'none' };
  const COLS3 = [{ w: 50 }, { w: 27 }, { w: 101 }];
  if (cats.length) {
    cats.forEach(cat => {
      if (!cat.items.length) return;
      const tone = toneOf(cat.score);
      sub(cat.label, { minAfter: 24, right: { text: cat.score == null ? 'Non calculable' : cat.score + '/100', tone } });
      table(COLS3, ['Critère', 'État', 'Constat'], cat.items.map(x => [{ text: x.label, bold: true }, statusCell(x.status), { text: x.text + (x.status !== 'unmeasured' && x.source ? ' (' + x.source + ')' : ''), color: x.status === 'unmeasured' ? C.muted : C.ink }]));
    });
  } else {
    [['SEO · être trouvé sur Google', m.criteria.seo, m.pillars.seo], ['GEO · être compris par les assistants IA', m.criteria.geo, m.pillars.geo]].forEach(([t, list, p]) => {
      if (!list.length) return;
      sub(t, { minAfter: 24, right: p.value != null ? { text: p.value + '/100', tone: toneOf(p.value) } : null });
      table(COLS3, ['Critère', 'État', 'Constat'], list.map(x => [{ text: x.label, bold: true }, statusCell(x.status), x.text + (x.status !== 'unmeasured' && x.source ? ' (' + x.source + ')' : '')]));
    });
  }
  if (m.criteria.context && m.criteria.context.items.length) {
    sub('Contexte : domaine, registre et concurrence', { minAfter: 24, right: { text: 'Non noté', tone: 'none' } });
    table(COLS3, ['Élément', 'État', 'Information'], m.criteria.context.items.map(x => [{ text: x.label, bold: true }, statusCell(x.status), x.detail + (x.source ? ' (' + x.source + ')' : '')]));
  }

  /* =============== MARCHÉ LOCAL =============== */
  section('Votre marché local', { over: 'Concurrents, recherches et présence', minAfter: m.competitors ? Math.min(140, 30 + m.competitors.list.length * 8.4) : 40 });
  if (m.competitors) {
    const cp = m.competitors, maxRev = Math.max(1, ...cp.list.map(x => x.reviews || 0));
    para(`${cp.count} ${plural(cp.count, 'commerce comparé', 'commerces comparés')} dans la zone` + (cp.selfRank ? `. ${m.meta.business} se classe n°${cp.selfRank} par nombre d’avis.` : '.') + ' Ce classement n’est pas celui de Google Maps.', { size: 9, color: C.muted, gap: 3 });
    table([{ w: 12, align: 'right' }, { w: 76 }, { w: 22, align: 'right' }, { w: 68 }], ['N°', 'Commerce', 'Note', 'Nombre d’avis'], cp.list.map(x => [
      { text: x.rank != null ? String(x.rank) : '-', bold: true, color: x.isSelf ? C.primary : C.muted },
      { text: x.name + (x.isSelf ? '  (vous)' : ''), bold: x.isSelf },
      { text: x.rating != null ? frNum(x.rating) + ' / 5' : '-' },
      x.reviews != null ? { bar: true, value: x.reviews, max: maxRev, label: x.reviews, color: x.isSelf ? C.primary : mix(C.primary, WHITE, 0.55) } : { text: '-' },
    ]), { hiRow: i => cp.list[i].isSelf });
    if (cp.hidden > 0) para(`${cp.hidden} ${plural(cp.hidden, 'autre commerce n’est pas affiché', 'autres commerces ne sont pas affichés')}.`, { size: 8.2, color: C.muted });
  } else callout('Non mesuré : aucun concurrent exploitable n’a été retourné pour ce commerce.', { tone: 'none', size: 8.8 });

  sub('Recherches testées', { minAfter: 22, right: m.rankings ? { text: `Trouvé sur ${m.rankings.found} / ${m.rankings.valid}`, tone: m.rankings.found === m.rankings.valid ? 'good' : m.rankings.found ? 'warn' : 'bad' } : null });
  if (m.rankings) {
    table([{ w: 118 }, { w: 60, align: 'right' }], ['Recherche', 'Résultat'], m.rankings.rows.map(r => [r.kw, r.status === 'found' ? { pill: 'Position ' + r.pos, tone: r.pos <= 3 ? 'good' : r.pos <= 10 ? 'warn' : 'none' } : r.status === 'error' ? { pill: 'Non mesuré', tone: 'none' } : { pill: 'Absent des 20 premiers', tone: 'bad' }]));
    para('Échantillon de recherches web : ce n’est pas un classement Google Maps.', { size: 8, color: C.muted });
  } else para('Non mesuré : la recherche web n’a pas répondu ou l’analyse complète n’a pas été lancée.', { size: 8.8, color: C.muted });

  sub('Présence en ligne détectée', { minAfter: 22 });
  if (m.presence) {
    table([{ w: 40 }, { w: 138 }], ['Canal', 'Constat'], [
      [{ text: 'Site web', bold: true }, m.presence.hasWebsite ? (m.presence.pageRead ? 'Page d’accueil lue et analysée.' : 'Page non lue : les critères de contenu ne sont pas notés.') : 'Aucun site web renseigné.'],
      [{ text: 'Réseaux sociaux', bold: true }, m.presence.socials.length ? m.presence.socials.join(', ') : { text: 'Aucun profil détecté (une absence de résultat ne prouve pas l’absence de compte).', color: C.muted }],
      [{ text: 'Annuaires', bold: true }, m.presence.directories.length ? m.presence.directories.join(', ') : { text: 'Aucun annuaire détecté.', color: C.muted }],
    ]);
  } else para('Non mesuré : l’analyse complète n’a pas été lancée.', { size: 8.8, color: C.muted });

  /* =============== PERFORMANCE =============== */
  section('Performance du site', { over: 'Mesure Google PageSpeed (mobile)', minAfter: 50 });
  if (m.lighthouse) {
    para('Mesuré par Google PageSpeed Insights (Lighthouse, simulation mobile) sur la page d’accueil. Au-delà de 90, le résultat est excellent ; en dessous de 50, il pénalise l’expérience des visiteurs.', { size: 8.8, color: C.muted, gap: 3 });
    const sc = m.lighthouse.scores, gw = (CW - 3 * 4) / 4, gh = 40;
    ensure(gh + 4);
    sc.forEach((x, i) => {
      const gx = M + i * (gw + 4);
      fill(WHITE); stroke(C.line, 0.3); pdf.roundedRect(gx, y, gw, gh, 2, 2, 'FD');
      ring(gx + gw / 2, y + 16, 9.5, x.value, toneOf(x.value), 2.4, 15, '');
      font('bold', 8.4, C.ink); pdf.text(T(x.label), gx + gw / 2, y + 33, { align: 'center' });
      font('normal', 7.2, x.value == null ? C.none : C[toneOf(x.value)]); pdf.text(T(levelOf(x.value)), gx + gw / 2, y + 37, { align: 'center' });
    });
    y += gh + 5;
    if (m.lighthouse.metrics.length) table([{ w: 118 }, { w: 60, align: 'right' }], ['Indicateur', 'Valeur mesurée'], m.lighthouse.metrics.map(x => [x.label, { text: x.value, bold: true }]));
  } else {
    const s = m.sources.find(x => x.name.startsWith('Performance'));
    callout(s && s.status === 'na' ? 'Sans objet : aucun site web n’est renseigné pour ce commerce.' : 'Non mesuré : Google PageSpeed n’a pas répondu. Aucune valeur n’est estimée à sa place.', { tone: 'none', size: 8.8 });
  }

  /* =============== PLAN D'ACTION =============== */
  section('Plan d’action', { over: 'Classé par priorité', fresh: true });
  if (m.plan.length) {
    para('Actions issues des seuls contrôles mesurés et non conformes. Les gains de score sont des estimations à confirmer par un nouvel audit après correction.', { size: 8.8, color: C.muted, gap: 4 });
    m.plan.forEach((p, i) => actionItem(p, i === m.plan.length - 1));
  } else callout('Aucune action prioritaire : tous les contrôles mesurés sont conformes.', { tone: 'good' });

  /* =============== RECOMMANDATIONS =============== */
  section('Recommandations détaillées', { over: 'Comment faire', minAfter: 50 });
  if (m.recommendations.length) {
    m.recommendations.forEach(r => {
      const tone = prioTone(r.priority), label = 'Priorité ' + r.priority.toLowerCase();
      const tl = wrap(r.title, CW - 8 - pillW(label) - 4, 10.4, 'bold');
      ensure(Math.min(tl.length * lh(10.4) + 30, 56));
      const railCol = tone === 'none' ? C.rule : C[tone];
      const rail = h => { fill(railCol); pdf.rect(M, y, 0.9, h, 'F'); };
      pill(label, tone, M + CW - pillW(label), y + 0.2);
      tl.forEach(l => { rail(lh(10.4)); font('bold', 10.4, C.deep); pdf.text(l, M + 5, y + base(10.4) + 0.6); y += lh(10.4); });
      const meta = [r.axis, r.impact ? 'Impact ' + r.impact.toLowerCase() : ''].filter(Boolean).join('   ·   ');
      if (meta) { rail(5); kicker(meta, M + 5, y + 3.6, C.primary, 6.8); y += 5.4; }
      if (r.why) wrap(r.why, CW - 6, 8.9).forEach(l => { ensure(lh(8.9)); rail(lh(8.9)); font('normal', 8.9, C.ink); pdf.text(l, M + 5, y + base(8.9)); y += lh(8.9); });
      if (r.how.length) { rail(1.6); y += 1.6; }
      r.how.forEach(hw => {
        const ls = wrap(hw, CW - 12, 8.9);
        ensure(Math.min(ls.length * lh(8.9), 16));
        stroke(C.primary, 0.4); pdf.setLineCap('round'); pdf.line(M + 6, y + 2.1, M + 8, y + 2.1); pdf.setLineCap('butt');
        ls.forEach(l => { ensure(lh(8.9)); rail(lh(8.9)); font('normal', 8.9, C.ink); pdf.text(l, M + 10, y + base(8.9)); y += lh(8.9); });
      });
      y += 6;
    });
  } else callout('Aucune recommandation détaillée : les contrôles mesurés ne font apparaître aucun point à corriger.', { tone: 'good' });

  /* =============== ÉVOLUTION (seulement avec ≥ 2 audits réels) =============== */
  if (data.history) {
    section('Évolution du score', { over: data.history.length + ' audits réalisés', minAfter: 66 });
    const pts = data.history, h = 62;
    ensure(h + 4);
    fill(WHITE); stroke(C.line, 0.3); pdf.roundedRect(M, y, CW, h, 2, 2, 'FD');
    const x0 = M + 14, x1 = M + CW - 10, y0 = y + 9, y1 = y + h - 13;
    const px = i => pts.length === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (pts.length - 1);
    const py = v => y1 - (y1 - y0) * Math.max(0, Math.min(100, v)) / 100;
    [0, 25, 50, 75, 100].forEach(g => { stroke(g === 0 ? C.rule : C.line, g === 0 ? 0.35 : 0.2); pdf.line(x0, py(g), x1, py(g)); font('normal', 7, C.muted); pdf.text(String(g), x0 - 3, py(g) + 1, { align: 'right' }); });
    stroke(C.primary, 0.8); for (let i = 1; i < pts.length; i++) pdf.line(px(i - 1), py(pts[i - 1].value), px(i), py(pts[i].value));
    const step = pts.length > 6 ? Math.ceil(pts.length / 6) : 1;
    pts.forEach((p, i) => {
      stroke(C.primary, 0.7); fill(p.current ? C.primary : WHITE); pdf.circle(px(i), py(p.value), p.current ? 1.8 : 1.4, 'FD');
      font('bold', 8.4, C.ink); pdf.text(String(p.value), px(i), py(p.value) - 3.2, { align: 'center' });
      if (i % step === 0 || i === pts.length - 1) { font('normal', 7.4, C.muted); pdf.text(T(p.label), px(i), y1 + 6, { align: 'center' }); }
    });
    y += h + 4;
    const first = pts[0].value, lastV = pts[pts.length - 1].value, dv = lastV - first;
    para(dv === 0 ? 'Score stable depuis le premier audit.' : `${dv > 0 ? 'Progression' : 'Recul'} de ${Math.abs(dv)} ${plural(Math.abs(dv), 'point', 'points')} depuis le premier audit (${first} → ${lastV}/100).`, { size: 9.2, style: 'bold' });
  }

  /* =============== PROPOSITION (offre commerciale, modifiable dans settings/offer.js) =============== */
  const cards = offerCards(m.plan);
  const ct = B.contact || {}, sg = B.signature || {};
  const contactLines = [ct.address, ct.email, ct.phone, ct.website].filter(Boolean);
  const hasContact = !!(sg.name || sg.role || B.company || contactLines.length || sg.text);
  if (cards.length) {
    section(OFFER.title, { over: 'Proposition d’accompagnement', fresh: true });
    para(OFFER.intro, { size: 9.2, color: C.muted, gap: 5 });
    const gap = 4, w = (CW - gap * (cards.length - 1)) / cards.length, iw = w - 12;
    const itemLines = cd => cd.items.map((t, i) => wrap(t, cd.nested && i >= 1 ? iw - 3 : iw, 8.4, cd.nested && i === 0 ? 'bold' : 'normal'));
    const hOf = cd => 36 + itemLines(cd).reduce((a, l) => a + l.length * lh(8.4, 1.38) + 1.6, 0) + 4;
    const h = Math.max(...cards.map(hOf), 70);
    ensure(h + 4);
    const featured = cards.findIndex(cd => cd.price && !/mois/i.test(cd.price));
    cards.forEach((cd, i) => {
      const x = M + i * (w + gap), feat = i === featured;
      fill(feat ? C.tint : WHITE); stroke(feat ? C.primary : C.line, feat ? 0.6 : 0.3); pdf.roundedRect(x, y, w, h, 2.4, 2.4, 'FD');
      if (feat) solidPill('Recommandé', C.primary, x + w - pillW('Recommandé', 6.8) - 4, y + 4, 6.8);
      font('bold', 10.4, C.deep); wrap(cd.name, w - (feat ? 30 : 10), 10.4, 'bold').slice(0, 2).forEach((l, li) => pdf.text(l, x + 5, y + 10 + li * 4.6));
      font('bold', 17, cd.price ? C.primary : C.good); pdf.text(T(cd.price || 'Inclus'), x + 5, y + 24);
      if (cd.sub) { font('normal', 7.8, C.muted); pdf.text(fit(cd.sub, w - 10, 7.8), x + 5, y + 29.4); }
      stroke(C.line, 0.3); pdf.line(x + 5, y + 32.4, x + w - 5, y + 32.4);
      let cy2 = y + 36;
      itemLines(cd).forEach((ls, k) => {
        const nested = cd.nested && k >= 1, lead = cd.nested && k === 0, bx = x + (nested ? 8 : 5);
        if (!lead) { if (nested) { fill(C.primary); pdf.circle(bx + 0.8, cy2 + 1.7, 0.6, 'F'); } else iconOk(bx + 1.6, cy2 + 1.6, 1.6); }
        ls.forEach(l => { font(lead ? 'bold' : 'normal', 8.4, C.ink); pdf.text(l, lead ? bx : bx + (nested ? 3 : 4.6), cy2 + base(8.4)); cy2 += lh(8.4, 1.38); });
        cy2 += 1.6;
      });
    });
    y += h + 6;
  }

  /* =============== CONTACT (marque enregistrée) =============== */
  if (hasContact) {
    const lines = [];
    if (sg.name) lines.push([sg.name, 'bold', 12, C.deep]);
    if (sg.role) lines.push([sg.role, 'normal', 9, C.muted]);
    if (B.company) lines.push([B.company, 'bold', 9.4, C.ink]);
    contactLines.forEach(l => lines.push([l, 'normal', 9.2, C.ink]));
    const txt = sg.text ? wrap(sg.text, CW - 16, 8.8) : [];
    const h = lines.reduce((a, l) => a + lh(l[2], 1.4), 0) + txt.length * lh(8.8) + 16 + (txt.length ? 2 : 0);
    ensure(h + 14);
    sub('Votre contact', { minAfter: h });
    fill(C.deep); pdf.roundedRect(M, y, CW, h, 2.4, 2.4, 'F');
    let yy = y + 7;
    lines.forEach(([t, st, sz, col]) => { font(st, sz, col === C.deep || col === C.ink ? WHITE : mix(C.deep, WHITE, 0.72)); pdf.text(fit(t, CW - 16, sz, st), M + 8, yy + base(sz)); yy += lh(sz, 1.4); });
    if (txt.length) { yy += 2; txt.forEach(l => { font('normal', 8.8, mix(C.deep, WHITE, 0.78)); pdf.text(l, M + 8, yy + base(8.8)); yy += lh(8.8); }); }
    y += h + 4;
  }

  /* =============== ANNEXES =============== */
  section('Annexes', { over: 'Fiche, sources et méthode', minAfter: 70 });
  sub('A. Fiche d’identité du commerce', { minAfter: 30 });
  const bp = m.businessProfile || {};
  const profileRows = [
    ['Nom commercial', m.meta.business], ['Raison sociale', bp.legalName],
    ['Adresse', bp.address || m.meta.address], ['Téléphone', bp.phone || m.meta.phone],
    ['Site internet', bp.website || m.meta.website], ['Statut Google', bp.googleStatus],
    ['Note Google', bp.rating != null ? frNum(bp.rating) + '/5 · ' + (bp.reviews || 0) + ' avis' : ''],
    ['SIREN', bp.siren], ['SIRET du siège', bp.siret], ['Forme juridique', bp.legalForm],
    ['Activité (APE)', bp.naf], ['Création', bp.creationDate + (bp.ageLabel ? ' (' + bp.ageLabel + ')' : '')],
    ['Établissements', bp.establishments], ['Commune (registre)', [bp.postalCode, bp.legalCity].filter(Boolean).join(' ')],
  ].filter(x => x[1] != null && String(x[1]).trim() !== '' && String(x[1]).trim() !== '()');
  if (profileRows.length) kvGrid(profileRows.map(([k, v]) => [k, String(v)]));
  else para('Informations détaillées indisponibles dans le dossier.', { size: 8.8, color: C.muted });
  if (bp.hours && bp.hours.length) {
    ensure(10 + Math.ceil(bp.hours.length / 2) * 4.6);
    kicker('Horaires déclarés sur Google', M, y + 3, C.muted, 6.8); y += 6;
    const hw = (CW - 8) / 2, rows = Math.ceil(bp.hours.length / 2);
    bp.hours.forEach((h, i) => { const col = i < rows ? 0 : 1, row = i < rows ? i : i - rows; font('normal', 8.6, C.ink); pdf.text(fit(h, hw, 8.6), M + col * (hw + 8), y + row * 4.6 + 3); });
    y += rows * 4.6 + 4;
  }
  if (bp.legalStatus === 'matched') {
    ensure(12);
    font('normal', 8, C.muted);
    const note = 'Rapprochement avec le registre public (SIRENE) : confiance ' + (bp.confidence || 'à vérifier') + '. Vérifiez le SIRET et l’adresse avant tout usage administratif.';
    wrap(note, CW, 8).forEach(l => { pdf.text(l, M, y + base(8)); y += lh(8); });
    if (bp.officialUrl) { font('bold', 8, C.primary); pdf.textWithLink(T('Consulter la fiche officielle de l’entreprise ->'), M, y + base(8) + 0.6, { url: bp.officialUrl }); y += 6; }
    y += 2;
  } else para('Identité légale non confirmée : aucun SIREN ou SIRET n’est présenté comme certain.', { size: 8, color: C.muted });

  sub('B. Sources et fiabilité des mesures', { minAfter: 40 });
  const nMeas = m.sources.filter(s => s.status === 'measured').length, nUn = m.sources.filter(s => s.status === 'unmeasured').length, nNa = m.sources.filter(s => s.status === 'na').length;
  para(`${nMeas} ${plural(nMeas, 'source mesurée', 'sources mesurées')}, ${nUn} non ${plural(nUn, 'mesurée', 'mesurées')}${nNa ? `, ${nNa} sans objet` : ''}. Une source qui n’a pas répondu n’est jamais remplacée par une estimation.`, { size: 8.6, color: C.muted, gap: 3 });
  const srcCell = s => s === 'measured' ? { pill: 'Mesuré', tone: 'good' } : s === 'na' ? { pill: 'Sans objet', tone: 'none' } : { pill: 'Non mesuré', tone: 'warn' };
  table([{ w: 64 }, { w: 27 }, { w: 87 }], ['Source', 'État', 'Détail'], m.sources.map(s => [{ text: s.name, bold: true }, srcCell(s.status), s.detail]));
  if (m.unmeasuredNotes.length) {
    sub('C. Contrôles exclus du score', { minAfter: 20 });
    table([{ w: 64 }, { w: 114 }], ['Contrôle', 'Raison'], m.unmeasuredNotes.map(x => [{ text: x.label, bold: true }, 'Non mesuré : ' + x.why + '.']));
  }

  sub((m.unmeasuredNotes.length ? 'D' : 'C') + '. Méthode et limites', { minAfter: 30 });
  const notes = [
    'Le score reflète uniquement les critères réellement mesurés. Un critère non mesuré est exclu du calcul et n’est jamais compté comme un défaut.',
    'Les sources interrogées fournissent des échantillons (page d’accueil, quelques recherches, concurrents proches) et non des recensements exhaustifs.',
    m.competitors ? 'Le rang parmi les concurrents est établi sur le nombre d’avis publics ; ce n’est pas le classement de Google Maps.' : '',
    'Les gains de score indiqués sont des estimations. Relancer un audit comparable après correction permet de mesurer l’évolution réelle.',
    ...m.infoNotes.map(x => `${x.label} : ${x.why}.`),
    `Rapport généré le ${m.meta.generatedLabel} par ${APP} à partir du dossier d’audit du ${m.meta.auditDateLabel || 'commerce'}.`,
  ].filter(Boolean);
  notes.forEach(n => {
    const ls = wrap(n, CW - 6, 8.6);
    ensure(Math.min(ls.length * lh(8.6), 14));
    fill(C.primary); pdf.circle(M + 1.3, y + 1.9, 0.75, 'F');
    ls.forEach(l => { ensure(lh(8.6)); font('normal', 8.6, C.ink); pdf.text(l, M + 5, y + base(8.6)); y += lh(8.6); });
    y += 1.4;
  });

  /* =============== PIED DE PAGE (pagination, sauf couverture) =============== */
  const N = pdf.internal.getNumberOfPages();
  for (let i = 2; i <= N; i++) {
    pdf.setPage(i);
    stroke(C.line, 0.3); pdf.line(M, PH - 12, PW - M, PH - 12);
    font('normal', 7.4, C.muted); pdf.text(fit(`${APP} · ${REPORT_TITLE} · ${m.meta.business}${m.meta.auditDateLabel ? ' · ' + m.meta.auditDateLabel : ''}`, CW - 30, 7.4), M, PH - 7.6);
    font('bold', 7.4, C.deep); pdf.text(`${i} / ${N}`, PW - M, PH - 7.6, { align: 'right' });
  }
  return pdf;
}
