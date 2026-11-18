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

test('la couleur du score suit son étiquette (48 = « moyenne » = ambre, jamais rouge)', () => {
  const audit = { id: 'a2', status: 'Analysé', score: 48, createdAt: now.toISOString(), site: { pageRead: true, socials: [], directories: [] }, scan: null };
  const model = buildReport(audit, client, [audit], now);
  const map = { 'Bonne visibilité': 'good', 'Visibilité moyenne': 'warn', 'Mauvaise visibilité': 'bad' };
  assert.equal(model.score.tone, map[model.score.label]);
});

test('la proposition reprend les actions du plan, sans promesse de résultat', async () => {
  const { offerCards, OFFER } = await import('../src/settings/offer.js');
  const cards = offerCards([{ title: 'Action A' }, { title: 'Action B' }, { title: 'C' }, { title: 'D' }, { title: 'E' }]);
  assert.equal(cards.length, 3);
  assert.equal(cards[1].price, '90 €');
  assert.equal(cards[2].price, '20 €/mois');
  assert.equal(cards[1].items.length, 1 + OFFER.visibility.maxActions);
  assert.equal(offerCards([])[1].items.length, 1);
  assert.equal(offerCards([], { enabled: false }).length, 0);
  const texte = JSON.stringify(cards).toLowerCase();
  assert.ok(!/garanti(?!e)|assur|à coup sûr|plus de clients|chiffre d’affaires/.test(texte.replace('aucun résultat n’est garanti', '')));
});
