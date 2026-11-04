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
