// AuditIA — LOT 7 : marque enregistrée dans les réglages (fonctions pures).
// Règles : jamais de clé API ni de donnée technique dans la marque ; solution de secours complète si absente ou invalide.
import { COLORS } from '../report/report-charts.js';

// Valeurs d'usine de la table app_settings : elles signifient « non personnalisé ».
const FACTORY_PRIMARY = ['#7657ed', '#5b5fef'];
const FACTORY_ACCENT = ['#ffad72'];
const MAX_LOGO_CHARS = 450000; // ~330 Ko : au-delà, le logo est ignoré (PDF et écran restent légers)

const hex6 = v => (/^#[0-9a-fA-F]{6}$/.test(String(v || '').trim()) ? String(v).trim().toLowerCase() : '');
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = a => '#' + a.map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrastWhite = h => 1.05 / (lum(h) + 0.05);

// Logo : uniquement PNG ou JPEG encodés en base64 (formats lisibles par le PDF et sans script).
export function safeLogo(v) {
  const s = String(v || '').trim();
  if (!s || s.length > MAX_LOGO_CHARS) return '';
  const m = /^data:image\/(png|jpeg|jpg);base64,[A-Za-z0-9+/=\s]+$/.exec(s);
  return m ? s.replace(/\s+/g, '') : '';
}
export function logoFormat(dataUrl) { return /^data:image\/png/.test(dataUrl) ? 'PNG' : 'JPEG'; }

export const defaultBrand = () => ({
  custom: false, appName: 'AuditIA', company: '', tagline: '',
  primary: COLORS.primary, deep: COLORS.deep, accent: '', logo: '',
  signature: { name: '', role: '', text: '' }, contact: { email: '', phone: '', website: '', address: '' },
});

// row : ligne app_settings (champs de marque + logo_data_url). Retourne toujours une marque utilisable.
export function brandFrom(row) {
  const b = defaultBrand();
  if (!row || typeof row !== 'object') return b;
  const s = k => String(row[k] == null ? '' : row[k]).replace(/\s+/g, ' ').trim();
  b.appName = s('app_name').slice(0, 80) || b.appName;
  b.company = s('company_name').slice(0, 120); b.tagline = s('tagline').slice(0, 180);
  const p = hex6(row.primary_color);
  if (p && !FACTORY_PRIMARY.includes(p) && contrastWhite(p) >= 3) { b.primary = p; b.deep = toHex(rgb(p).map(v => v * 0.42)); b.custom = true; }
  const a = hex6(row.accent_color);
  if (a && !FACTORY_ACCENT.includes(a)) b.accent = a;
  b.logo = safeLogo(row.logo_data_url);
  b.signature = { name: s('signature_name').slice(0, 100), role: s('signature_role').slice(0, 140), text: String(row.signature_text == null ? '' : row.signature_text).trim().slice(0, 300) };
  b.contact = { email: s('contact_email').slice(0, 160), phone: s('phone').slice(0, 30), website: s('website').slice(0, 200), address: s('address').slice(0, 200) };
  if (b.logo || b.company || b.appName !== 'AuditIA') b.custom = true;
  return b;
}
export function brandInitials(b) {
  const name = String((b && b.appName) || 'AuditIA').trim();
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  const caps = name.match(/[A-ZÀ-Ý]/g) || [];
  return (caps.length >= 2 ? caps[0] + caps[1] : name.slice(0, 2)).toUpperCase() || 'AI';
}
