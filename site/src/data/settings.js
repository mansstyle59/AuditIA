// AuditIA — LOT 6 : lecture et écriture des réglages (table app_settings existante, aucune nouvelle table).
// Les clés API sont masquées dès la lecture : la valeur brute ne quitte jamais ce module et n'est jamais réécrite.
import { EDITABLE_KEYS, KEY_COLUMNS, maskAll, valuesFrom, validate, isAdminUser } from '../settings/settings-model.js';

const READ_COLUMNS = ['user_id', 'updated_at', ...EDITABLE_KEYS, ...KEY_COLUMNS].join(',');

// Retourne { exists, values, masks, updatedAt }. Lève une erreur en cas d'échec réseau ou de droits.
export async function loadSettings(client, userId) {
  const r = await client.from('app_settings').select(READ_COLUMNS).eq('user_id', userId).maybeSingle();
  if (r.error) throw r.error;
  const row = r.data || null;
  return { exists: !!row, values: valuesFrom(row), masks: maskAll(row), updatedAt: row && row.updated_at ? row.updated_at : null };
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
  if (code === 'FORBIDDEN') return 'Seul le compte administrateur peut modifier les réglages.';
  if (code === 'INVALID') return 'Certains champs sont invalides. Corrigez-les puis réessayez.';
  if (code === '42501' || code === 'PGRST301' || /permission|jwt|row-level/i.test(String(err && err.message))) return 'Accès refusé aux réglages. Reconnectez-vous puis réessayez.';
  if (err && /Failed to fetch|NetworkError|timeout/i.test(String(err.message))) return 'Réseau indisponible. Vos modifications sont conservées à l’écran : réessayez.';
  return 'Les réglages n’ont pas pu être traités. Réessayez dans un instant.';
}
