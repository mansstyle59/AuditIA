// AuditIA — chargement des données réelles (lecture seule).
// Mêmes requêtes et même ordre que refreshData() de l'ancienne interface (clients et audits,
// du plus récent au plus ancien). Les droits d'accès restent ceux de Supabase (RLS, non modifiés).

export async function loadWorkspaceData(client) {
  const [c, a] = await Promise.all([
    client.from('clients').select('*').order('created_at', { ascending: false }),
    client.from('audits').select('*').order('created_at', { ascending: false }),
  ]);
  if (c.error) throw c.error;
  if (a.error) throw a.error;
  return { clients: c.data || [], audits: a.data || [] };
}

// Message lisible pour l'utilisateur à partir d'une erreur Supabase ou réseau.
export function dataErrorMessage(err) {
  const raw = String((err && (err.message || err.error_description)) || '');
  if (/fetch|network/i.test(raw)) return 'Connexion impossible. Vérifiez votre réseau internet.';
  if (/jwt|token|expired|401|not authenticated/i.test(raw)) return 'Votre session n’est plus valide. Reconnectez-vous.';
  return 'Les données n’ont pas pu être chargées.' + (raw ? ' (' + raw.slice(0, 140) + ')' : '');
}

/* ---------- Lot 3 : clé Google Places et ajout d'un commerce ---------- */

// Lit uniquement la clé Google Places déjà enregistrée dans les réglages (même table et même filtre que
// l'ancienne interface). Lecture seule : la clé n'est ni modifiée, ni affichée, ni recopiée ailleurs.
export async function loadPlacesKey(client, userId) {
  const r = await client.from('app_settings').select('google_places_api_key').eq('user_id', userId).maybeSingle();
  if (r.error) throw r.error;
  return String((r.data && r.data.google_places_api_key) || '').trim();
}

// Ajoute un commerce au portefeuille (même insertion que l'ancienne interface).
export async function insertClient(client, row) {
  const r = await client.from('clients').insert(row).select().single();
  if (r.error) throw r.error;
  return r.data;
}
