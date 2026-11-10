// AuditIA — appels Google Places (API « New ») via le proxy serveur « auditia-secure-api ».
// Port fidèle de l'ancienne interface : mêmes champs demandés, mêmes délais, même rayon (5 km), mêmes messages.
// Aucune clé Google n'est lue ni envoyée depuis le navigateur : le serveur la lit dans ses secrets.
// Premier paramètre des fonctions : getClient (renvoie le client Supabase, dont la session sert d'accès).
import { normalizePlace, nearbyOpportunity } from './places-model.js';
import { secureApi, PlacesError } from './secure-api.js';

export { PlacesError };

const NEARBY_TYPES = ['restaurant', 'cafe', 'bakery', 'store', 'shopping_mall', 'beauty_salon', 'hair_salon', 'car_repair', 'plumber', 'electrician', 'florist', 'pharmacy', 'clothing_store', 'lodging'];
export const NEARBY_RADIUS_M = 5000;
export const MAX_RESULTS = 20;

const MSG_TEXT_403 = 'Google refuse la recherche : vérifiez Places API (New) et les restrictions de la clé.';
const MSG_NEARBY_403 = 'Google refuse la recherche à proximité : vérifiez Places API (New) et les restrictions de la clé.';
const MSG_AUTOCOMPLETE_403 = 'Refusé (403) : activez « Places API (New) » et autorisez le domaine de l’application dans les restrictions de la clé.';
const MSG_DETAIL_403 = 'Google refuse la lecture de la fiche : vérifiez Places API (New) et les restrictions de la clé.';

// Recherche en langage naturel (équivalent de runNaturalLanguageSearch) : `parsed` vient de parseNaturalLanguageTarget.
export async function searchText(getClient, parsed) {
  const data = await secureApi(getClient, {
    action: 'places_searchText', textQuery: parsed.query, includedType: parsed.type || '', maxResultCount: MAX_RESULTS, mask: 'list',
  }, 18000, MSG_TEXT_403);
  return (data.places || []).map(normalizePlace).filter(p => p.placeId && p.name);
}

// Commerces proches (équivalent de loadNearbyBusinesses), triés par score d'opportunité puis par moins d'avis.
export async function searchNearby(getClient, pos) {
  const data = await secureApi(getClient, {
    action: 'places_searchNearby', latitude: pos.latitude, longitude: pos.longitude,
    includedTypes: NEARBY_TYPES, maxResultCount: MAX_RESULTS, radius: NEARBY_RADIUS_M,
  }, 15000, MSG_NEARBY_403);
  const rows = (data.places || []).map(normalizePlace).filter(p => p.placeId && p.name);
  rows.sort((a, b) => nearbyOpportunity(b).score - nearbyOpportunity(a).score || ((a.reviews || 0) - (b.reviews || 0)));
  return rows;
}

// Auto-complétion (équivalent de autocompletePlaces) : retourne [{ placeId, main, secondary }].
export async function autocomplete(getClient, text) {
  const input = String(text || '').trim();
  const d = await secureApi(getClient, { action: 'places_autocomplete', input }, 9000, MSG_AUTOCOMPLETE_403);
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
    const r2 = await secureApi(getClient, { action: 'places_searchText', textQuery: input, maxResultCount: 6, mask: 'minimal' }, 9000, MSG_AUTOCOMPLETE_403);
    return (r2.places || []).filter(p => p.id && p.displayName && p.displayName.text)
      .map(p => ({ placeId: p.id, main: p.displayName.text, secondary: p.formattedAddress || '' }));
  } catch (e) { return []; }
}

// Fiche complète d'un lieu choisi (équivalent de pickSuggestion).
export async function placeDetails(getClient, placeId) {
  const raw = await secureApi(getClient, { action: 'places_details', placeId, mask: 'detail' }, 12000, MSG_DETAIL_403);
  return normalizePlace(raw);
}

// D4 : nombre de photos d'une fiche (l'audit n'utilise que le nombre, comme engine.js : photoCount).
// Le masque « photos » demande uniquement ce champ au proxy. À confirmer contre fetchPlacePhotos d'origine.
export async function placePhotoCount(getClient, placeId) {
  const raw = await secureApi(getClient, { action: 'places_details', placeId, mask: 'photos' }, 12000, MSG_DETAIL_403);
  return Array.isArray(raw && raw.photos) ? raw.photos.length : 0;
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
