// AuditIA — recherche de commerces par activité dans le registre officiel (SIRENE), via l'API gratuite
// recherche-entreprises.api.gouv.fr. Sans clé, sans compte. Ce module ne fait que lire : il ne crée rien.
// Limite connue : le registre donne le nom, l'adresse et l'activité, mais ni téléphone ni site web.

export const REGISTRY_URL = 'https://recherche-entreprises.api.gouv.fr/search';

// Code d'activité principal (NAF) de chaque métier du Bureau
export const NAF_BY_CAT = {
  'Peintre façadier': '43.34Z',
  'Plombier': '43.22A',
  'Électricien': '43.21A',
};

export function nafFor(cat) {
  return Object.prototype.hasOwnProperty.call(NAF_BY_CAT, cat) ? NAF_BY_CAT[cat] : null;
}

// Zone acceptée : un code postal (11700) ou un département (11, 2A, 974)
export function zoneParams(zone) {
  const z = String(zone || '').trim().toUpperCase();
  if (/^\d{5}$/.test(z)) return { code_postal: z };
  if (/^(\d{2}|2A|2B|9\d{2})$/.test(z)) return { departement: z };
  return null;
}

export const ZONE_HELP = 'Indiquez un code postal (ex. 11700) ou un numéro de département (ex. 11).';

export function buildRegistryUrl(cat, zone, perPage = 25) {
  const naf = nafFor(cat);
  const zp = zoneParams(zone);
  if (!naf || !zp) return null;
  const q = new URLSearchParams({ activite_principale: naf, per_page: String(perPage), ...zp });
  return REGISTRY_URL + '?' + q.toString();
}

// Les noms du registre sont en majuscules : on les met en forme pour l'affichage
function displayName(raw) {
  const s = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!s || s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());
}

// Transforme la réponse de l'API en liste propre. Seuls les établissements actifs sont gardés.
export function parseRegistry(json, cat) {
  const out = [];
  for (const r of (json && Array.isArray(json.results) ? json.results : [])) {
    const s = r.siege || {};
    if ((s.etat_administratif || r.etat_administratif) !== 'A') continue;
    const siret = String(s.siret || '').trim();
    const name = displayName(r.nom_complet || r.nom_raison_sociale);
    if (!/^\d{14}$/.test(siret) || !name) continue;
    out.push({
      siret,
      name,
      city: displayName(s.libelle_commune),
      zip: String(s.code_postal || '').trim(),
      address: String(s.adresse || '').trim(),
      category: String(cat || '').trim(),
      naf: String(s.activite_principale || r.activite_principale || '').trim(),
    });
  }
  return out;
}

export async function findCandidates(cat, zone, fetchFn = fetch) {
  const url = buildRegistryUrl(cat, zone);
  if (!url) throw new Error(nafFor(cat) ? ZONE_HELP : 'Choisissez un métier précis (pas « Tous les métiers ») pour une recherche.');
  const res = await fetchFn(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('le registre est indisponible pour le moment (code ' + res.status + ').');
  return parseRegistry(await res.json(), cat);
}

// Clé de comparaison : sans accents, sans casse, sans ponctuation
const key = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Une entreprise est « déjà connue » si elle est déjà prospect (même nom dans la même ville)
export function isKnownClient(candidate, clients) {
  const n = key(candidate.name), c = key(candidate.city);
  return (clients || []).some(x => key(x.name) === n && key(x.city) === c);
}
