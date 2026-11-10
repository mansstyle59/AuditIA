// AuditIA — appel unique au proxy serveur « auditia-secure-api » (Google Places et PageSpeed).
// Le navigateur n'envoie que le jeton de session de l'administrateur : aucune clé Google n'est lue ici.
// Les erreurs sont converties en PlacesError (même classe qu'avant) avec des messages en français.
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../core/config.js';

// kind : 'config' (clé absente côté serveur) | 'api' (refus, quota ou erreur) | 'network' | 'timeout'
export class PlacesError extends Error {
  constructor(kind, message, extra = {}) { super(message); this.kind = kind; Object.assign(this, extra); }
}

// Messages des codes renvoyés par le proxy (jamais de détail technique).
const PROXY_MESSAGES = {
  authentication_required: 'Session absente. Reconnectez-vous puis réessayez.',
  invalid_session: 'Session expirée. Reconnectez-vous puis réessayez.',
  email_not_confirmed: 'Adresse e-mail non confirmée.',
  not_authorized: 'Accès refusé à cette fonctionnalité.',
  origin_not_allowed: 'Adresse de l’application non autorisée.',
  google_places_key_not_configured: 'La clé Google Places n’est pas configurée côté serveur.',
  pagespeed_key_not_configured: 'La clé PageSpeed n’est pas configurée côté serveur.',
  rate_limit_exceeded: 'Trop de requêtes. Patientez une minute puis réessayez.',
  daily_quota_exceeded: 'Quota journalier atteint. Réessayez demain.',
  secure_api_unavailable: 'Service temporairement indisponible. Réessayez.',
  search_key_not_configured: 'La recherche web n’est pas configurée côté serveur.',
  site_unreadable: 'Site inaccessible ou illisible.',
  search_unavailable: 'Recherche web indisponible. Réessayez plus tard.',
};

// Appelle le proxy avec le jeton de session. Retourne le JSON renvoyé par Google (forme inchangée).
// msg403 : message affiché pour un refus Google (403), comme dans l'ancienne interface.
export async function secureApi(getClient, body, ms, msg403) {
  const client = await getClient();

  // C2 : une exception de session est convertie en PlacesError, comme les autres erreurs.
  let token = '';
  try {
    const sess = await client.auth.getSession();
    token = (sess && sess.data && sess.data.session && sess.data.session.access_token) || '';
  } catch (e) {
    throw new PlacesError('api', 'Session indisponible. Reconnectez-vous puis réessayez.', { status: 401, code: 'invalid_session' });
  }
  if (!token) throw new PlacesError('api', 'Session expirée. Reconnectez-vous puis réessayez.', { status: 401, code: 'invalid_session' });

  // C3 : AbortController coupe réellement la requête au délai. Le minuteur couvre aussi la lecture du corps.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    let response;
    try {
      response = await fetch(SUPABASE_URL + '/functions/v1/auditia-secure-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, apikey: SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      if (e && e.name === 'AbortError') throw new PlacesError('timeout', 'Délai dépassé. Réessayez.');
      throw new PlacesError('network', 'Connexion impossible. Vérifiez votre réseau internet.');
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const code = data && typeof data.error === 'string' ? data.error : '';
      const googleMsg = data && data.error && typeof data.error === 'object' ? data.error.message : '';
      // C1 : repli sur le message lisible renvoyé par le proxy avant le code HTTP brut.
      const proxyMsg = data && typeof data.message === 'string' ? data.message : '';
      let message = code ? (PROXY_MESSAGES[code] || '') : '';
      if (!message && response.status === 403 && msg403) message = msg403;
      if (!message) message = proxyMsg || googleMsg || ('Erreur HTTP ' + response.status);
      throw new PlacesError(response.status === 424 ? 'config' : 'api', message, { status: response.status, code });
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}
