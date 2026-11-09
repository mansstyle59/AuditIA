// AuditIA — logique pure de la recherche de commerces (aucun réseau, aucun affichage).
import { norm } from '../core/utils.js';
import { parseNaturalLanguageTarget } from '../api/places-model.js';

export const CATEGORIES = ['Commerce', 'Restaurant', 'Artisan', 'Beauté & bien-être', 'Automobile', 'Hébergement', 'Autre'];

// Analyse la phrase avec parseNaturalLanguageTarget (inchangé). Ses règles d'activité utilisent \b, qui ne reconnaît pas
// une lettre accentuée en début ou fin de mot (« Électriciens », « café ») : on retente alors sans accents,
// uniquement pour trouver le type d'activité. Le texte envoyé à Google garde ses accents.
export function parseTarget(raw) {
  const parsed = parseNaturalLanguageTarget(raw);
  if (!parsed.type) {
    const plain = parseNaturalLanguageTarget(String(raw || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    if (plain.type) parsed.type = plain.type;
  }
  return parsed;
}

// Filtres reconnus dans la phrase (mêmes règles que l'ancienne interface) appliqués aux résultats Google.
export function applyFilters(rows, parsed) {
  let out = rows;
  if (parsed.noWebsite) out = out.filter(p => !p.website);
  if (parsed.lowRating) out = out.filter(p => p.rating != null && p.rating < 4);
  if (parsed.minReviews) out = out.filter(p => Number(p.reviews || 0) >= parsed.minReviews);
  return { rows: out, removed: rows.length - out.length };
}

export function filterLabels(parsed) {
  const l = [];
  if (parsed.noWebsite) l.push('Sans site web');
  if (parsed.lowRating) l.push('Note sous 4/5');
  if (parsed.minReviews) l.push('Au moins ' + parsed.minReviews + ' avis');
  return l;
}

// Doublon : même identifiant Google (place_id), sinon même nom et même ville (accents et casse ignorés).
export function findDuplicate(clients, candidate) {
  const pid = String(candidate.placeId || '');
  const name = norm(candidate.name), city = norm(candidate.city);
  for (const c of clients || []) {
    const d = c.details || {};
    if (pid && String(d.place_id || '') === pid) return { client: c, reason: 'place_id' };
  }
  if (!name) return null;
  for (const c of clients || []) {
    if (norm(c.name) !== name) continue;
    const cc = norm(c.city);
    if (!city || !cc || cc === city) return { client: c, reason: 'nom_ville' };
  }
  return null;
}

export function normalizeWebsite(value) {
  const w = String(value || '').trim();
  if (!w) return null;
  return /^https?:\/\//i.test(w) ? w : 'https://' + w;
}

// Ligne `clients` à enregistrer : mêmes colonnes et même structure `details` que l'ancienne interface.
export function clientRowFromPlace(place, userId, over = {}, source = 'Google Places') {
  const website = normalizeWebsite(over.website != null ? over.website : place.website);
  const name = String(over.name != null ? over.name : place.name || '').trim();
  const city = String(over.city != null ? over.city : (place.city || place.address || '')).trim();
  const category = String(over.category || place.category || 'Autre').trim() || 'Autre';
  return {
    user_id: userId, name, city, category, website, phone: place.phone || null,
    details: {
      place_id: place.placeId || null, address: place.address || '', category, primaryType: place.primaryType || '',
      phone: place.phone || null, rating: place.rating == null ? null : place.rating, reviews: place.reviews == null ? null : place.reviews,
      status: place.status || '', hours: place.hours || null, website: website || place.website || null,
      editorialSummary: place.summary || '', photoCount: place.photoCount == null ? null : place.photoCount,
      domainCreated: null, source, fetchedAt: new Date().toISOString(),
    },
  };
}

// Ajout sans fiche Google (saisie libre) : seuls les champs du formulaire sont enregistrés.
export function clientRowFromForm(f, userId) {
  return {
    user_id: userId, name: String(f.name || '').trim(), city: String(f.city || '').trim(),
    category: String(f.category || 'Autre').trim() || 'Autre', website: normalizeWebsite(f.website),
  };
}
