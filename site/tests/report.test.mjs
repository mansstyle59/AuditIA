// Tests du modèle de rapport (logique pure). Lancer : node --test site/tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBusinessProfile, buildReport } from '../src/report/report-model.js';

const now = new Date('2026-11-10T10:00:00Z');
const client = {
  name: 'Boulangerie Martin', city: 'Narbonne', category: 'boulangerie', website: 'https://boulangerie-martin.example',
  details: {
    rating: 4.7, reviews: 85, hours: ['Lun 7h-19h', 'Mar 7h-19h'], status: 'OPERATIONAL', photoCount: 12,
    sirene: { matched: true, siren: '123456789', siret: '12345678900011', denomination: 'MARTIN SARL', dateCreation: '2009-05-01', matchConfidence: 'élevée', etablissements: 1 },
  },
};

test('une fiche SIRENE rapprochée alimente la fiche légale et les horaires', () => {
  const bp = buildBusinessProfile(client, now);
  assert.equal(bp.legalStatus, 'matched');
  assert.equal(bp.legalName, 'MARTIN SARL');
  assert.equal(bp.siren, '123456789');
  assert.equal(bp.officialUrl, 'https://annuaire-entreprises.data.gouv.fr/entreprise/123456789');
  assert.deepEqual(bp.hours, ['Lun 7h-19h', 'Mar 7h-19h']);
  assert.equal(bp.googleStatus, 'En activité');
  assert.equal(bp.ageLabel, '17 ans');
});

test('sans rapprochement SIRENE, aucun SIREN n’est présenté comme certain', () => {
  const bp = buildBusinessProfile({ name: 'X', details: {} }, now);
  assert.equal(bp.legalStatus, 'unmatched');
  assert.equal(bp.siren, '');
  assert.equal(bp.legalName, '');
  assert.deepEqual(bp.hours, []);
});

test('le modèle complet expose la fiche légale', () => {
  const audit = { id: 'a1', status: 'Analysé', createdAt: now.toISOString(), site: { pageRead: true, socials: [], directories: [] }, scan: null };
  const model = buildReport(audit, client, [audit], now);
  assert.equal(model.businessProfile.legalStatus, 'matched');
});
