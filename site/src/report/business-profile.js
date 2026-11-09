// AuditIA — profil commerce pour les rapports. Fonctions pures : aucune recherche réseau ni donnée inventée.
const clean = value => String(value == null ? '' : value).replace(/\\s+/g, ' ').trim();
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function legalAgeLabel(creationDate, referenceDate = new Date()) {
  const start = parseDate(creationDate);
  const end = parseDate(referenceDate);
  if (!start || !end || start > end) return '';
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years < 0) return '';
  if (years === 0) return months + (months > 1 ? ' mois' : ' mois');
  return years + (years > 1 ? ' ans' : ' an') + (months ? ' et ' + months + ' mois' : '');
}

export function buildBusinessProfile(client, referenceDate = new Date()) {
  const c = client || {};
  const d = c.details || {};
  const sirene = d.sirene && d.sirene.matched ? d.sirene : null;
  const googlePhoneKnown = has(d, 'googlePhone');
  const phone = googlePhoneKnown ? clean(d.googlePhone) : clean(d.phone || c.phone);
  const phoneSource = googlePhoneKnown
    ? (d.googlePhoneCheckedAt ? 'Google Places · vérifié le ' + new Date(d.googlePhoneCheckedAt).toLocaleDateString('fr-FR') : 'Google Places')
    : phone ? (d.place_id ? 'Google Places · fiche enregistrée' : 'Fiche client · source non vérifiée') : '';
  const creationDate = sirene && sirene.dateCreation ? clean(sirene.dateCreation) : '';
  const ageLabel = legalAgeLabel(creationDate, referenceDate);
  return {
    legalName: clean(sirene && sirene.denomination),
    address: clean(d.address || c.address),
    phone,
    phoneSource,
    email: clean(d.email || c.email),
    website: clean(c.website || d.website),
    siren: clean(sirene && sirene.siren),
    siret: clean(sirene && sirene.siret),
    legalForm: clean(sirene && sirene.formeJuridique),
    naf: clean(sirene && [sirene.naf, sirene.nafSection].filter(Boolean).join(' · ')),
    creationDate,
    ageLabel,
    establishments: sirene && sirene.etablissements != null ? String(sirene.etablissements) : '',
    postalCode: clean(sirene && sirene.codePostal),
    legalCity: clean(sirene && sirene.ville),
    googleStatus: clean(d.status),
    rating: d.rating == null ? null : Number(d.rating),
    reviews: d.reviews == null ? null : Number(d.reviews),
    hours: Array.isArray(d.hours) ? d.hours.filter(Boolean).map(clean) : [],
    dirigeant: clean(sirene && sirene.dirigeant),
    dirigeantRole: clean(sirene && sirene.dirigeantRole),
    legalStatus: sirene ? 'matched' : '',
    confidence: clean(sirene && sirene.matchConfidence),
    officialUrl: clean(sirene && sirene.officialUrl),
    googlePhoneCheckedAt: clean(d.googlePhoneCheckedAt),
  };
}
