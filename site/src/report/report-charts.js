// AuditIA — graphiques du rapport (lot 5), version SVG pour l'aperçu à l'écran.
// Les valeurs viennent du modèle (report-model.js) : jamais recalculées, jamais arrondies autrement que dans le dossier.
// Le PDF dessine les MÊMES données en vectoriel (report-pdf.js) à partir de chartData().
import { escHtml } from '../core/utils.js';
import { toneOf } from './report-model.js';

/* Palette d'impression : encre violet très foncé sur fond blanc, tons d'état assombris (contraste ≥ 4,5:1 sur blanc). */
export const COLORS = {
  ink: '#1E1536', muted: '#5B5173', line: '#D9D2EE', paper: '#FFFFFF', tint: '#F4F0FE', tint2: '#E6DEFB',
  primary: '#6D3FE0', deep: '#2A1260', lavender: '#C4B5FD',
  good: '#15803D', warn: '#B45309', bad: '#B91C1C', none: '#6B6386',
};
export const toneColor = tone => COLORS[tone] || COLORS.none;
export const hexToRgb = hex => { const h = String(hex).replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };

const clamp = v => Math.max(0, Math.min(100, Number(v) || 0));

/* Données de chaque graphique, partagées par l'aperçu et le PDF. Un graphique sans donnée réelle vaut null. */
export function chartData(m) {
  return {
    score: m.score.value != null ? { value: m.score.value, tone: m.score.tone, range: m.score.range } : null,
    pillars: [
      { id: 'seo', label: 'SEO · Google', value: m.pillars.seo.value },
      { id: 'geo', label: 'GEO · assistants IA', value: m.pillars.geo.value },
    ],
    indicators: m.indicators.map(x => ({ id: x.id, label: x.label, value: x.value, group: x.group })),
    competitors: m.competitors ? m.competitors.list.filter(x => x.reviews != null).map(x => ({ id: 'cp-' + x.rank, label: x.name + (x.isSelf ? ' (ce commerce)' : ''), value: x.reviews, isSelf: x.isSelf })) : null,
    history: m.history ? m.history.map(x => ({ id: 'h-' + x.id, label: x.label, value: x.value, current: x.current })) : null,
  };
}

/* ---------- Jauge du score global ---------- */
export function gaugeSvg(data) {
  const r = 62, circ = 2 * Math.PI * r;
  if (!data) {
    return `<svg class="rp-chart rp-gauge" viewBox="0 0 160 160" role="img" aria-label="Score indisponible" data-chart="score" data-value="">
      <circle cx="80" cy="80" r="${r}" fill="none" stroke="${COLORS.tint2}" stroke-width="14"/>
      <text x="80" y="88" text-anchor="middle" font-size="36" font-weight="700" fill="${COLORS.none}">—</text>
      <text x="80" y="112" text-anchor="middle" font-size="13" fill="${COLORS.muted}">non calculable</text></svg>`;
  }
  const col = toneColor(data.tone), n = clamp(data.value);
  return `<svg class="rp-chart rp-gauge" viewBox="0 0 160 160" role="img" aria-label="Score global ${n} sur 100" data-chart="score" data-value="${n}">
    <title>Score global : ${n} sur 100</title>
    <circle cx="80" cy="80" r="${r}" fill="none" stroke="${COLORS.tint2}" stroke-width="14"/>
    <circle cx="80" cy="80" r="${r}" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${(circ * n / 100).toFixed(2)} ${circ.toFixed(2)}" transform="rotate(-90 80 80)"/>
    <text x="80" y="90" text-anchor="middle" font-size="42" font-weight="800" fill="${COLORS.ink}">${n}</text>
    <text x="80" y="112" text-anchor="middle" font-size="14" fill="${COLORS.muted}">sur 100</text></svg>`;
}

/* ---------- Barres horizontales (indicateurs, piliers, avis des concurrents) ---------- */
export function barsSvg(rows, { max = 100, suffix = '', title = '', id = 'bars', tone = true } = {}) {
  const H = 46, W = 360, trackX = 0, trackW = 300;
  const peak = Math.max(1, max === 'auto' ? Math.max(...rows.map(r => Number(r.value) || 0)) : max);
  const body = rows.map((r, i) => {
    const y = i * H;
    const has = r.value != null;
    const v = has ? Number(r.value) : 0;
    const w = has ? Math.max(v > 0 ? 3 : 0, trackW * Math.min(1, v / peak)) : 0;
    const col = r.isSelf ? COLORS.primary : tone ? toneColor(toneOf(v)) : COLORS.primary;
    const label = String(r.label).length > 44 ? String(r.label).slice(0, 43) + '…' : String(r.label);
    return `<g data-row="${escHtml(r.id)}" data-value="${has ? v : ''}">
      <text x="0" y="${y + 14}" font-size="13.5" font-weight="${r.isSelf ? 700 : 600}" fill="${COLORS.ink}">${escHtml(label)}</text>
      <rect x="${trackX}" y="${y + 22}" width="${trackW}" height="12" rx="6" fill="${COLORS.tint2}"/>
      ${has ? `<rect x="${trackX}" y="${y + 22}" width="${w.toFixed(1)}" height="12" rx="6" fill="${col}"/>` : ''}
      <text x="${W}" y="${y + 33}" text-anchor="end" font-size="14" font-weight="700" fill="${has ? COLORS.ink : COLORS.none}">${has ? escHtml(v + suffix) : 'non mesuré'}</text></g>`;
  }).join('');
  const h = rows.length * H;
  return `<svg class="rp-chart rp-bars" viewBox="0 0 ${W} ${h}" role="img" aria-label="${escHtml(title)}" data-chart="${escHtml(id)}"><title>${escHtml(title)}</title>${body}</svg>`;
}

/* ---------- Évolution du score (uniquement avec ≥ 2 audits réels) ---------- */
export function lineSvg(points) {
  const W = 360, H = 190, L = 34, R = 14, T = 16, B = 34;
  const iw = W - L - R, ih = H - T - B;
  const x = i => L + (points.length === 1 ? iw / 2 : iw * i / (points.length - 1));
  const y = v => T + ih * (1 - clamp(v) / 100);
  const grid = [0, 50, 100].map(g => `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" stroke="${COLORS.line}" stroke-width="1"/><text x="${L - 6}" y="${y(g) + 4}" text-anchor="end" font-size="11.5" fill="${COLORS.muted}">${g}</text>`).join('');
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const step = points.length > 6 ? Math.ceil(points.length / 5) : 1;
  const dots = points.map((p, i) => {
    const show = i % step === 0 || i === points.length - 1;
    return `<g data-row="${escHtml(p.id)}" data-value="${p.value}"><circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="${p.current ? 6 : 4.5}" fill="${p.current ? COLORS.primary : COLORS.paper}" stroke="${COLORS.primary}" stroke-width="2.5"/>
      <text x="${x(i).toFixed(1)}" y="${(y(p.value) - 10).toFixed(1)}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${COLORS.ink}">${p.value}</text>
      ${show ? `<text x="${x(i).toFixed(1)}" y="${H - 12}" text-anchor="middle" font-size="11.5" fill="${COLORS.muted}">${escHtml(p.label)}</text>` : ''}</g>`;
  }).join('');
  return `<svg class="rp-chart rp-line" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution du score sur ${points.length} audits" data-chart="history"><title>Évolution du score sur ${points.length} audits</title>${grid}<path d="${path}" fill="none" stroke="${COLORS.primary}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${dots}</svg>`;
}
