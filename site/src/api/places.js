// AuditIA — appels Google Places (API « New ») de la nouvelle interface.
// Port fidèle de l'ancienne interface : mêmes adresses, mêmes champs demandés, mêmes corps de requête,
// mêmes délais, même rayon (5 km). La clé est fournie par l'appelant ; elle n'est ni stockée ni affichée ici.
import { withTimeout } from '../core/utils.js';
import { normalizePlace, nearbyOpportunity } from './places-model.js';

const BASE = 'https://places.googleapis.com/v1/';
const LIST_FIELDS = 'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.primaryType,places.types,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.regularOpeningHours';
const DETAIL_FIELDS = 'id,displayName,formattedAddress,addressComponents,primaryType,types,nationalPhoneNumber,websiteUri,rating,userRatingCount,businessStatus,regularOpeningHours,editorialSummary,photos';
const NEARBY_TYPES = ['restaurant', 'cafe', 'bakery', 'store', 'shopping_mall', 'beauty_salon', 'hair_salon', 'car_repair', 'plumber', 'electrician', 'florist', 'pharmacy', 'clothing_store', 'lodging'];
export const NEARBY_RADIUS_M = 5000;
export const MAX_RESULTS = 20;

// kind : 'config' (pas de clé) | 'api' (Google a répondu une erreur) | 'network' | 'timeout' | 'geo'
export class PlacesError extends Error {
  constructor(kind, message, extra = {}) { super(message); this.kind = kind; Object.assign(this, extra); }
}

async function post(path, key, fieldMask, body, ms, msg403) {
  const headers = { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key };
  if (fieldMask) headers['X-Goog-FieldMask'] = fieldMask;
  return send(BASE + path, { method: 'POST', headers, body: JSON.stringify(body) }, ms, msg403);
}

async function send(url, init, ms, msg403) {
  let response;
  try { response = await withTimeout(fetch(url, init), ms); }
  catch (e) {
    if (e && e.message === 'timeout') throw new PlacesError('timeout', 'Délai dépassé. Réessayez.');
    throw new PlacesError('network', 'Connexion impossible. Vérifiez votre réseau internet.');
  }
  if (!response.ok) {
    const d = await response.json().catch(() => null);
    const text = response.status === 403 ? msg403 : (d && d.error && d.error.message) || ('Erreur Google Places HTTP ' + response.status);
    throw new PlacesError('api', text, { status: response.status });
  }
  return response.json();
}

// Recherche en langage naturel (équivalent de runNaturalLanguageSearch) : `parsed` vient de parseNaturalLanguageTarget.
export async function searchText(key, parsed) {
  const body = { textQuery: parsed.query, languageCode: 'fr', regionCode: 'FR', maxResultCount: MAX_RESULTS };
  if (parsed.type) body.includedType = parsed.type;
  const data = await post('places:searchText', key, LIST_FIELDS, body, 18000,
    'Google refuse la recherche : vérifiez Places API (New) et les restrictions de la clé.');
  return (data.places || []).map(normalizePlace).filter(p => p.placeId && p.name);
}

// Commerces proches (équivalent de loadNearbyBusinesses), triés par score d'opportunité puis par moins d'avis.
export async function searchNearby(key, pos) {
  const data = await post('places:searchNearby', key, LIST_FIELDS, {
    includedTypes: NEARBY_TYPES, maxResultCount: MAX_RESULTS, rankPreference: 'DISTANCE', languageCode: 'fr', regionCode: 'FR',
    locationRestriction: { circle: { center: pos, radius: NEARBY_RADIUS_M } },
  }, 15000, 'Google refuse la recherche à proximité : vérifiez Places API (New) et les restrictions de la clé.');
  const rows = (data.places || []).map(normalizePlace).filter(p => p.placeId && p.name);
  rows.sort((a, b) => nearbyOpportunity(b).score - nearbyOpportunity(a).score || ((a.reviews || 0) - (b.reviews || 0)));
  return rows;
}

// Auto-complétion (équivalent de autocompletePlaces) : retourne [{ placeId, main, secondary }].
export async function autocomplete(key, text) {
  const input = String(text || '').trim();
  const msg403 = 'Refusé (403) : activez « Places API (New) » et autorisez le domaine de l’application dans les restrictions de la clé.';
  const d = await post('places:autocomplete', key, '', { input, languageCode: 'fr', regionCode: 'FR' }, 9000, msg403);
  const sugg = (d.suggestions || []).map(s => s.placePrediction).filter(Boolean);
  if (sugg.length) {
    return sugg.slice(0, 6).map(s => ({
      placeId: s.placeId,
      main: (s.structuredFormat && s.structuredFormat.mainText && s.structuredFormat.mainText.text) || (s.text && s.text.text) || '',
      secondary: (s.structuredFormat && s.structuredFormat.secondaryText && s.structuredFormat.secondaryText.text) || '',
    }));
  }
  // Repli de l'ancienne interface : recherche texte simple quand l'auto-complétion ne propose rien
  try {
    const r2 = await post('places:searchText', key, 'places.id,places.displayName,places.formattedAddress',
      { textQuery: input, languageCode: 'fr', regionCode: 'FR', maxResultCount: 6 }, 9000, msg403);
    return (r2.places || []).filter(p => p.id && p.displayName && p.displayName.text)
      .map(p => ({ placeId: p.id, main: p.displayName.text, secondary: p.formattedAddress || '' }));
  } catch (e) { return []; }
}

// Fiche complète d'un lieu choisi (équivalent de pickSuggestion).
export async function placeDetails(key, placeId) {
  const raw = await send(BASE + 'places/' + encodeURIComponent(placeId),
    { headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': DETAIL_FIELDS } }, 12000,
    'Google refuse la lecture de la fiche : vérifiez Places API (New) et les restrictions de la clé.');
  return normalizePlace(raw);
}

// Géolocalisation du navigateur (mêmes délais et messages que l'ancienne interface).
export function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new PlacesError('geo', 'La géolocalisation n’est pas disponible sur cet appareil.', { code: 0 })); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      err => reject(new PlacesError('geo',
        err.code === 1 ? 'Autorisez la localisation dans votre navigateur pour trouver les commerces proches.'
          : err.code === 2 ? 'Position indisponible. Vérifiez que la localisation est activée.'
            : 'La demande de position a expiré. Réessayez.', { code: err.code })),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
}
