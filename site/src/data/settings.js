// AuditIA — LOT 6 : lecture et écriture des réglages (table app_settings existante, aucune nouvelle table).
// Les clés API sont masquées dès la lecture : la valeur brute ne quitte jamais ce module et n'est jamais réécrite.
import { EDITABLE_KEYS, API_META_KEYS, valuesFrom, validate, isAdminUser } from '../settings/settings-model.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../core/config.js';
import { brandFrom, defaultBrand } from '../settings/brand.js';

const READ_COLUMNS = ['user_id', 'updated_at', ...EDITABLE_KEYS, 'logo_data_url', ...API_META_KEYS].join(',');

// Le navigateur ne lit jamais les colonnes contenant les clés API.
// Leur état (présence + indice masqué) est obtenu depuis l'Edge Function sécurisée.
async function apiSettingsRequest(client, payload) {
  let token = '';
  try {
    const session = await client.auth.getSession();
    token = session && session.data && session.data.session && session.data.session.access_token || '';
  } catch (_) {}
  if (!token) { const e = new Error('session'); e.code = 'SESSION'; throw e; }
  let response;
  try {
    response = await fetch(SUPABASE_URL + '/functions/v1/auditia-secure-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
  } catch (_) { const e = new Error('network'); e.code = 'NETWORK'; throw e; }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.ok !== true) {
    const e = new Error(data && data.message || 'settings api unavailable');
    e.code = data && data.error || 'API_SETTINGS';
    throw e;
  }
  return data;
}

// Retourne { exists, values, api, updatedAt }. Les secrets restent exclusivement côté serveur.
export async function loadSettings(client, userId) {
  const r = await client.from('app_settings').select(READ_COLUMNS).eq('user_id', userId).maybeSingle();
  if (r.error) throw r.error;
  const row = r.data || null;
  let api = { keys: {}, other: {}, error: '' };
  try { api = await apiSettingsRequest(client, { action: 'settings_read' }); }
  catch (_) { api.error = 'Les états API n’ont pas pu être chargés. Rechargez les réglages.'; }
  return {
    exists: !!row,
    values: valuesFrom(row),
    api,
    updatedAt: row && row.updated_at ? row.updated_at : null,
  };
}

// Écrit les clés via la fonction serveur : aucune valeur secrète ne revient au navigateur.
export async function saveApiSettings(client, user, values) {
  if (!isAdminUser(user) || !user.id) { const e = new Error('forbidden'); e.code = 'FORBIDDEN'; throw e; }
  return apiSettingsRequest(client, { action: 'settings_save', values });
}

// Écrit UNIQUEMENT les champs de marque (jamais les clés). L'autorisation est vérifiée avant tout envoi.
export async function saveSettings(client, user, values) {
  if (!isAdminUser(user) || !user.id) { const e = new Error('forbidden'); e.code = 'FORBIDDEN'; throw e; }
  const v = validate(values);
  if (!v.ok) { const e = new Error('invalid'); e.code = 'INVALID'; e.errors = v.errors; throw e; }
  const payload = { user_id: user.id, ...v.clean, updated_at: new Date().toISOString() };
  const r = await client.from('app_settings').upsert(payload, { onConflict: 'user_id' }).select('updated_at').maybeSingle();
  if (r.error) throw r.error;
  return { values: v.clean, updatedAt: (r.data && r.data.updated_at) || payload.updated_at };
}

export function settingsErrorMessage(err) {
  const code = err && (err.code || '');
  if (code === 'FORBIDDEN' || code === 'not_authorized') return 'Seul le compte administrateur peut modifier les réglages.';
  if (code === 'SESSION' || code === 'invalid_session') return 'Session expirée. Reconnectez-vous puis réessayez.';
  if (code === 'NETWORK') return 'Connexion impossible. Vérifiez votre réseau puis réessayez.';
  if (code === 'INVALID') return 'Certains champs sont invalides. Corrigez-les puis réessayez.';
  if (code === '42501' || code === 'PGRST301' || /permission|jwt|row-level/i.test(String(err && err.message))) return 'Accès refusé aux réglages. Reconnectez-vous puis réessayez.';
  if (err && /Failed to fetch|NetworkError|timeout/i.test(String(err.message))) return 'Réseau indisponible. Vos modifications sont conservées à l’écran : réessayez.';
  return 'Les réglages n’ont pas pu être traités. Réessayez dans un instant.';
}

// Marque (nom, couleurs, logo, signature) : colonnes de marque UNIQUEMENT, jamais les clés API. Ne lève jamais d'erreur :
// en cas d'échec ou de réglages absents, la marque par défaut est utilisée.
const BRAND_COLUMNS = [...EDITABLE_KEYS, 'logo_data_url'].join(',');
export async function loadBrand(client, userId) {
  try {
    const r = await client.from('app_settings').select(BRAND_COLUMNS).eq('user_id', userId).maybeSingle();
    if (r.error || !r.data) return defaultBrand();
    return brandFrom(r.data);
  } catch (e) { return defaultBrand(); }
}
