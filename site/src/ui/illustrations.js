// AuditIA — illustrations originales (SVG en ligne, aucune image externe, aucun appel réseau).
// Les rapports montrés sont des EXEMPLES FICTIFS de démonstration : aucune donnée réelle, aucune statistique commerciale.

const EX_SCORE = 84; // score d'exemple (illustration uniquement)

// Anneau de score : r = rayon, p = pourcentage (0-100)
function ring(cx, cy, r, p, gid, track = '#E4DBFF', num = '#24104D', sub = '#6B5C9A', size = 30) {
  const c = 2 * Math.PI * r;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${track}" stroke-width="9"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#${gid})" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(c * p / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy + size * 0.18}" text-anchor="middle" font-size="${size}" font-weight="800" fill="${num}">${p}</text>
    <text x="${cx}" y="${cy + size * 0.18 + size * 0.55}" text-anchor="middle" font-size="${Math.round(size * 0.42)}" font-weight="600" fill="${sub}">/100</text>`;
}

function check(x, y, s = 11) {
  return `<circle cx="${x}" cy="${y}" r="${s / 2 + 1}" fill="#22C55E"/><path d="M${x - s * 0.28} ${y} l${s * 0.2} ${s * 0.22} l${s * 0.38} -${s * 0.42}" fill="none" stroke="#fff" stroke-width="${s * 0.17}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const GREEN_GRAD = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4ADE80"/><stop offset="1" stop-color="#16A34A"/></linearGradient>`;

// Petit histogramme décoratif (valeurs d'exemple)
function bars(x, y, w, h, vals, fill) {
  const n = vals.length, gap = 3, bw = (w - gap * (n - 1)) / n;
  return vals.map((v, i) => {
    const bh = Math.max(2, h * v / 100);
    return `<rect x="${(x + i * (bw + gap)).toFixed(1)}" y="${(y + h - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="1.5" fill="${fill}"/>`;
  }).join('');
}
const BARS = [38, 52, 44, 60, 48, 70, 56, 82, 64, 76, 58, 90, 72, 86, 66, 94];

/* ---------- Ordinateur portable avec un aperçu d'interface ---------- */
export function laptopSvg() {
  const nav = ['Accueil', 'Nouvel audit', 'Mes rapports', 'Mes clients', 'Paramètres'];
  const navItems = nav.map((t, i) => {
    const y = 108 + i * 32;
    return `${i === 0 ? `<rect x="104" y="${y - 15}" width="118" height="26" rx="9" fill="url(#lpAccent)"/>` : ''}
      <circle cx="119" cy="${y - 2}" r="4" fill="${i === 0 ? '#fff' : '#B9A6F5'}"/>
      <text x="132" y="${y + 2}" font-size="11.5" font-weight="${i === 0 ? 700 : 600}" fill="${i === 0 ? '#fff' : '#CDBFF7'}">${t}</text>`;
  }).join('');
  return `<svg class="ds-ill ds-ill--laptop" viewBox="0 0 760 470" role="img" aria-label="Illustration : un ordinateur portable affichant un exemple de rapport d'audit AuditIA" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lpScreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4B22A8"/><stop offset="1" stop-color="#1C0A44"/></linearGradient>
    <linearGradient id="lpAccent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#B26BFF"/><stop offset="1" stop-color="#7C4DF0"/></linearGradient>
    <linearGradient id="lpBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9D3EE"/><stop offset="1" stop-color="#9C90C4"/></linearGradient>
    <linearGradient id="lpLid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3A2A6B"/><stop offset="1" stop-color="#150833"/></linearGradient>
    <radialGradient id="lpGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#A78BFA" stop-opacity=".75"/><stop offset="1" stop-color="#A78BFA" stop-opacity="0"/></radialGradient>
    ${GREEN_GRAD('lpGreen')}
  </defs>
  <ellipse cx="380" cy="430" rx="360" ry="38" fill="url(#lpGlow)"/>
  <ellipse cx="380" cy="262" rx="330" ry="215" fill="url(#lpGlow)" opacity=".35"/>
  <rect x="64" y="14" width="632" height="382" rx="24" fill="url(#lpLid)" stroke="#B79CFF" stroke-width="2.5"/>
  <rect x="82" y="32" width="596" height="346" rx="10" fill="url(#lpScreen)"/>
  <circle cx="380" cy="23" r="2.6" fill="#6C5BA8"/>
  <path d="M30 396 H730 L712 420 Q708 426 700 426 H60 Q52 426 48 420 Z" fill="url(#lpBody)"/>
  <rect x="318" y="396" width="124" height="10" rx="5" fill="#B7ADD8"/>
  <path d="M40 420 H720 L716 428 Q712 434 704 434 H56 Q48 434 44 428 Z" fill="#7F72AE"/>
  <g font-family="inherit">
    <rect x="82" y="32" width="150" height="346" rx="10" fill="#14073A" opacity=".55"/>
    <rect x="104" y="48" width="26" height="26" rx="8" fill="url(#lpAccent)"/>
    <path d="M117 54 c.7 5.5 2.4 7 8 7.7 c-5.6.7 -7.3 2.2 -8 7.7 c-.7 -5.5 -2.4 -7 -8 -7.7 c5.6 -.7 7.3 -2.2 8 -7.7z" fill="#fff"/>
    <text x="137" y="68" font-size="15" font-weight="800" fill="#fff">Audit<tspan fill="#C9A8FF">IA</tspan></text>
    ${navItems}
    <rect x="252" y="50" width="408" height="312" rx="14" fill="#F4F0FF"/>
    <text x="270" y="78" font-size="14.5" font-weight="800" fill="#24104D">Rapport d’audit — Commerce local</text>
    <rect x="552" y="62" width="92" height="22" rx="11" fill="#E4DBFF"/>
    <text x="598" y="77" text-anchor="middle" font-size="10" font-weight="800" fill="#5B35A8">EXEMPLE FICTIF</text>
    <rect x="270" y="96" width="232" height="132" rx="12" fill="#fff"/>
    ${ring(332, 160, 38, EX_SCORE, 'lpGreen', '#E4DBFF', '#24104D', '#6B5C9A', 28)}
    ${['Fiche Google', 'SEO local', 'Avis clients', 'Performance web'].map((t, i) => `${check(392, 126 + i * 24, 12)}<text x="404" y="${130 + i * 24}" font-size="10.5" font-weight="700" fill="#2B1A5C">${t}</text>`).join('')}
    <image href="./assets/shop-card.webp" x="514" y="96" width="132" height="132" preserveAspectRatio="xMidYMid slice" clip-path="inset(0 round 12px)"/>
    <rect x="270" y="240" width="376" height="108" rx="12" fill="#fff"/>
    <text x="286" y="262" font-size="11" font-weight="800" fill="#5B35A8">Évolution du score (exemple)</text>
    ${bars(286, 272, 344, 66, BARS, '#8B5CF6')}
  </g>
</svg>`;
}

/* ---------- Smartphone avec un aperçu d'audit + pastilles d'icônes ---------- */
function badgeTile(x, y, inner) {
  return `<g transform="translate(${x} ${y})"><rect width="64" height="64" rx="20" fill="#3B1D85" stroke="#8B66E8" stroke-width="1.5"/><g fill="none" stroke="#E6DEFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" transform="translate(16 16)">${inner}</g></g>`;
}
export function phoneSvg() {
  const rows = ['Visibilité Google', 'Référencement local', 'Fiche établissement', 'Performance web'];
  return `<svg class="ds-ill ds-ill--phone" viewBox="0 0 440 600" role="img" aria-label="Illustration : un smartphone affichant un exemple d'audit AuditIA avec un score de ${EX_SCORE} sur 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="phScreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3C1C86"/><stop offset="1" stop-color="#1A0840"/></linearGradient>
    <linearGradient id="phBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7C5BD6"/><stop offset="1" stop-color="#2A1260"/></linearGradient>
    <radialGradient id="phGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#B08CFF" stop-opacity=".8"/><stop offset="1" stop-color="#B08CFF" stop-opacity="0"/></radialGradient>
    ${GREEN_GRAD('phGreen')}
  </defs>
  <ellipse cx="220" cy="540" rx="205" ry="40" fill="url(#phGlow)"/>
  <ellipse cx="220" cy="535" rx="170" ry="22" fill="none" stroke="#C4B5FD" stroke-width="3" opacity=".8"/>
  <ellipse cx="220" cy="300" rx="190" ry="250" fill="url(#phGlow)" opacity=".3"/>
  <rect x="112" y="40" width="216" height="470" rx="40" fill="url(#phBody)" stroke="#C4B5FD" stroke-width="2.5"/>
  <rect x="122" y="50" width="196" height="450" rx="32" fill="url(#phScreen)"/>
  <rect x="190" y="60" width="60" height="16" rx="8" fill="#0C031F"/>
  <g font-family="inherit">
    <text x="220" y="108" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">Audit<tspan fill="#C9A8FF">IA</tspan></text>
    <rect x="136" y="122" width="168" height="170" rx="16" fill="#2D1572" stroke="#5B3DB5"/>
    <text x="220" y="146" text-anchor="middle" font-size="12.5" font-weight="800" fill="#fff">Votre audit</text>
    ${ring(220, 205, 38, EX_SCORE, 'phGreen', '#4B2C99', '#FFFFFF', '#CFC3F2', 28)}
    <rect x="170" y="254" width="100" height="22" rx="11" fill="#16A34A"/>
    <text x="220" y="269" text-anchor="middle" font-size="10.5" font-weight="800" fill="#fff">Très bon niveau</text>
    ${rows.map((t, i) => `<rect x="136" y="${304 + i * 36}" width="168" height="30" rx="9" fill="#2D1572"/>
      <text x="146" y="${323 + i * 36}" font-size="11" font-weight="700" fill="#E6DEFF">${t}</text>${check(289, 319 + i * 36, 12)}`).join('')}
    <text x="220" y="476" text-anchor="middle" font-size="9.5" font-weight="700" fill="#BFB0EE">EXEMPLE FICTIF</text>
  </g>
  ${badgeTile(24, 150, '<path d="M8 1c4 0 7 3 7 7 0 5-7 12-7 12S1 13 1 8c0-4 3-7 7-7z"/><circle cx="8" cy="8" r="2.4"/>')}
  ${badgeTile(352, 120, '<path d="M2 12 L8 5 l5 5 l9 -9"/><path d="M17 1h5v5"/>')}
  ${badgeTile(14, 260, '<path d="M2 8l2-6h16l2 6"/><path d="M3 8v14h18V8"/><path d="M9 22v-8h6v8"/>')}
  ${badgeTile(358, 240, '<path d="M12 2l3 6.4 7 .9-5.1 4.8 1.3 7L12 17.7 5.8 21l1.3-7L2 9.3l7-.9z"/>')}
  ${badgeTile(34, 380, '<path d="M3 21V12M10 21V6M17 21V14M24 21V2" transform="translate(-2 0)"/>')}
  ${badgeTile(344, 360, '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.4"/>')}
</svg>`;
}

/* ---------- Icônes des fonctionnalités ---------- */
const FEAT = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L22 22"/><path d="M8 11h6M11 8v6"/>',
  chart: '<path d="M4 20V11M10 20V4M16 20V13M22 20V8" transform="translate(-1 0)"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/><path d="M12 12L20 4M16 4h4v4"/>',
  shop: '<path d="M3 9l2-5h14l2 5"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/>',
  chef: '<path d="M7 14a4 4 0 0 1-1-7.9 5 5 0 0 1 9.8-1A4 4 0 0 1 17 14z"/><path d="M7 14v6h10v-6"/>',
  tools: '<path d="M14 6a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3z"/><path d="M5 4l4 4M4 9l5-5"/>',
};
export function featIcon(name) {
  return `<svg class="ds-feat-ico" viewBox="0 0 26 26" aria-hidden="true" focusable="false"><defs><linearGradient id="fi-${name}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9D5FF"/><stop offset="1" stop-color="#A78BFA"/></linearGradient></defs><g fill="none" stroke="url(#fi-${name})" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(1 1)">${FEAT[name] || ''}</g></svg>`;
}

/* ---------- Aperçu d'un rapport (carte claire) ---------- */
export function reportPreviewHtml() {
  const items = ['Fiche Google', 'SEO local', 'Avis clients', 'Performance web'];
  return `<figure class="ds-rp-card">
    <figcaption class="ds-rp-card__head"><span class="ds-rp-card__title">Rapport d’audit — Commerce local</span><span class="ds-rp-card__tag">Exemple fictif</span></figcaption>
    <div class="ds-rp-card__body">
      <svg class="ds-rp-card__ring" viewBox="0 0 110 110" role="img" aria-label="Score d’exemple : ${EX_SCORE} sur 100" xmlns="http://www.w3.org/2000/svg"><defs>${GREEN_GRAD('rpGreen')}</defs>${ring(55, 55, 44, EX_SCORE, 'rpGreen', '#E4DBFF', '#24104D', '#6B5C9A', 32)}</svg>
      <ul class="ds-rp-card__list">${items.map(t => `<li><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7.5" fill="#22C55E"/><path d="M4.6 8.2l2.3 2.3 4.5-4.9" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>${t}</li>`).join('')}</ul>
      <img class="ds-rp-card__shop" src="./assets/shop-card.webp" alt="Illustration d’un commerce local" width="480" height="327" loading="lazy" decoding="async">
    </div>
    <svg class="ds-rp-card__bars" viewBox="0 0 360 54" preserveAspectRatio="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${bars(0, 4, 360, 46, BARS.concat([62, 88, 70, 92]), '#8B5CF6')}</svg>
  </figure>`;
}
