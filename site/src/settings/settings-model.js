// AuditIA — LOT 6 : modèle des réglages (fonctions pures, aucun accès réseau).
// Règles de sécurité : une clé API n'est jamais restituée en clair ; on n'en garde qu'un indice masqué.
import { defaultSettings, ADMIN_EMAIL } from '../core/config.js';

// Champs de marque modifiables depuis la nouvelle interface (les clés API ne le sont pas).
export const EDITABLE = [
  { key: 'app_name', label: 'Nom de l’application', max: 80, required: true },
  { key: 'company_name', label: 'Nom de l’entreprise', max: 120, required: true },
  { key: 'tagline', label: 'Phrase de marque', max: 180 },
  { key: 'contact_email', label: 'E-mail professionnel', max: 160, type: 'email' },
  { key: 'phone', label: 'Téléphone', max: 30, type: 'tel' },
  { key: 'website', label: 'Site web', max: 200, type: 'url' },
  { key: 'address', label: 'Adresse professionnelle', max: 200 },
  { key: 'signature_name', label: 'Nom affiché', max: 100 },
  { key: 'signature_role', label: 'Fonction / spécialité', max: 140 },
  { key: 'signature_text', label: 'Message de signature', max: 300, long: true },
  { key: 'primary_color', label: 'Couleur principale', type: 'color' },
  { key: 'accent_color', label: 'Couleur d’accent', type: 'color' },
];
export const EDITABLE_KEYS = EDITABLE.map(f => f.key);

// Services : seuls Places et PageSpeed alimentent réellement la nouvelle interface (lots 3 et 4).
export const SERVICES = [
  { id: 'places', column: 'google_places_api_key', label: 'Google Places', role: 'Recherche et détails des commerces (Prospects).', used: true },
  { id: 'pagespeed', column: 'pagespeed_api_key', label: 'PageSpeed Insights', role: 'Performance du site dans les audits.', used: true },
  { id: 'claude', column: null, label: 'Assistant Claude', role: 'Fonction serveur : la clé reste côté serveur et n’est jamais lue ici.', used: false, server: true },
];
// Colonnes de clés lues uniquement pour savoir si elles sont renseignées (jamais affichées).
export const KEY_COLUMNS = ['google_places_api_key', 'pagespeed_api_key', 'google_maps_api_key', 'logo_dev_publishable_key', 'bing_webmaster_api_key', 'openai_api_key'];
export const OTHER_KEYS = [
  { column: 'google_maps_api_key', label: 'Google Maps' },
  { column: 'logo_dev_publishable_key', label: 'Logo.dev' },
  { column: 'bing_webmaster_api_key', label: 'Bing Webmaster' },
  { column: 'openai_api_key', label: 'OpenAI' },
];

export const isAdminUser = user => !!(user && user.email && String(user.email).trim().toLowerCase() === ADMIN_EMAIL.toLowerCase());

// Indice masqué : jamais la clé entière (4 derniers caractères seulement, si la clé est assez longue).
export function maskKey(value) {
  const v = String(value == null ? '' : value).trim();
  if (!v) return { present: false, hint: '' };
  return { present: true, hint: v.length >= 12 ? '••••' + v.slice(-4) : '••••••••' };
}
export function maskAll(row) {
  const out = {};
  KEY_COLUMNS.forEach(c => { out[c] = maskKey(row ? row[c] : ''); });
  return out;
}

// Valeurs affichées : réglages enregistrés, complétés par les valeurs par défaut si absents.
export function valuesFrom(row) {
  const d = defaultSettings();
  const v = {};
  EDITABLE_KEYS.forEach(k => {
    const raw = row && row[k] != null ? String(row[k]) : '';
    v[k] = raw !== '' || (row && row[k] === '') ? raw : String(d[k] == null ? '' : d[k]);
  });
  // Une couleur vide ou invalide retombe sur la valeur par défaut (jamais d'écran cassé).
  ['primary_color', 'accent_color'].forEach(k => { if (!/^#[0-9a-fA-F]{6}$/.test(v[k])) v[k] = String(d[k]).length === 7 ? d[k] : '#7657ed'; });
  return v;
}

export function validate(values) {
  const errors = {}; const clean = {};
  EDITABLE.forEach(f => {
    const v = String(values && values[f.key] != null ? values[f.key] : '').trim();
    clean[f.key] = v;
    if (f.required && !v) errors[f.key] = 'Ce champ est obligatoire.';
    else if (f.max && v.length > f.max) errors[f.key] = `${f.max} caractères au maximum.`;
    else if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) errors[f.key] = 'Adresse e-mail invalide.';
    else if (f.type === 'tel' && v && !/^[0-9 +().\-]{3,30}$/.test(v)) errors[f.key] = 'Numéro de téléphone invalide.';
    else if (f.type === 'url' && v) {
      try { const u = new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v); if (!u.hostname.includes('.')) throw new Error('x'); }
      catch (e) { errors[f.key] = 'Adresse de site invalide.'; }
    } else if (f.type === 'color' && !/^#[0-9a-fA-F]{6}$/.test(v)) errors[f.key] = 'Couleur invalide.';
  });
  return { ok: Object.keys(errors).length === 0, errors, clean };
}

export const isDirty = (a, b) => EDITABLE_KEYS.some(k => String((a || {})[k] ?? '') !== String((b || {})[k] ?? ''));

// État affiché par service : on ne dit JAMAIS « connecté » ni « opérationnel » (rien n'est testé ici).
export function serviceStatus(svc, masks) {
  if (svc.server) return { tone: 'neutral', label: 'Non vérifié ici', detail: 'Géré côté serveur ; aucun test lancé.' };
  const m = masks && masks[svc.column];
  if (!m) return { tone: 'neutral', label: 'État inconnu', detail: 'Réglages non chargés.' };
  return m.present
    ? { tone: 'neutral', label: 'Clé renseignée', detail: `${m.hint} · non testée (aucun appel facturable lancé)` }
    : { tone: 'warn', label: 'Clé absente', detail: 'Ajoutez-la depuis l’ancienne interface.' };
}
