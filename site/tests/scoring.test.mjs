// Tests unitaires du moteur de score (fonctions pures). Lancer : node --test site/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  visibilityAudit, visibilityLabel, targetKeywords, socialVisibility, auditUnmeasured, auditActions,
} from '../src/audit/scoring.js';

const client = {
  name: 'Boulangerie Martin', city: 'Narbonne', category: 'boulangerie', website: 'https://boulangerie-martin.example',
  phone: '04 68 00 00 00',
  details: { place_id: 'abc', rating: 4.7, reviews: 85, hours: ['Lun 7h-19h'], photoCount: 12, phone: '04 68 00 00 00' },
};
const analysis = {
  site: {
    pageRead: true, title: 'Boulangerie Martin à Narbonne', metaDesc: 'Pain artisanal', viewport: true,
    socials: [{ net: 'Instagram', url: 'https://instagram.com/x' }, { net: 'Facebook', url: 'https://facebook.com/x' }],
    directories: [{ name: 'Pages Jaunes' }, { name: 'TripAdvisor' }],
    localSchema: true, ldTypes: ['Bakery'], words: 400, addressOnSite: true, hoursOnSite: true, tel: ['0468000000'],
    geo: { robots: { read: true, blocked: [], total: 8 }, llms: false, faq: false, lists: true, digits: 6, dated: true },
  },
  scan: { scores: { performance: 80, seo: 95 } },
};

test('un audit complet produit un score entre 0 et 100 et un libellé cohérent', () => {
  const diag = visibilityAudit(analysis, client);
  assert.ok(diag.index >= 0 && diag.index <= 100, `score hors limites : ${diag.index}`);
  assert.equal(diag.hasScore, true);
  assert.equal(visibilityLabel(85).c, 'ok');
  assert.equal(visibilityLabel(50).c, 'mid');
  assert.equal(visibilityLabel(10).c, 'bad');
});

test('le pilier GEO ne contient que des signaux de lisibilité pour les IA', () => {
  const diag = visibilityAudit(analysis, client);
  const geoLabels = diag.items.filter(x => x.pillar === 'geo').map(x => x.label);
  for (const reputation of ['Avis publics', 'Présence reconnue (Google/Maps)', 'Présence dans les annuaires détectés', 'Entreprise présente dans SIRENE']) {
    assert.ok(!geoLabels.includes(reputation), `« ${reputation} » ne doit plus être dans le pilier GEO`);
  }
  assert.ok(geoLabels.includes('Données structurées LocalBusiness'));
});

test('une donnée absente n’est jamais comptée comme un défaut', () => {
  const diag = visibilityAudit({ site: null, scan: null }, { name: 'Sans données', city: 'Narbonne', details: {} });
  const unmeasured = diag.items.filter(x => !x.measured);
  assert.ok(unmeasured.length > 0);
  for (const item of unmeasured) assert.equal(item.ok, null, `${item.label} doit rester « non mesuré »`);
});

test('les publications Google ne sont jamais comptées comme un défaut', () => {
  const items = auditUnmeasured(analysis, client);
  const pub = items.find(x => /Publications Google/.test(x.label));
  assert.ok(pub, 'la mention des publications doit figurer dans les non-mesurés');
  assert.equal(pub.n, 0);
});

test('les actions issues du diagnostic sont classées par impact décroissant', () => {
  const weak = { ...analysis, site: { ...analysis.site, socials: [], directories: [], localSchema: false, geo: { ...analysis.site.geo, faq: false } } };
  const diag = visibilityAudit(weak, client);
  const actions = auditActions(weak, client, diag);
  const order = { 'Élevé': 3, 'Moyen': 2, 'Faible': 1, 'À vérifier': 0 };
  for (let i = 1; i < actions.length; i++) {
    assert.ok(order[actions[i - 1].impact] >= order[actions[i].impact], 'ordre d’impact non respecté');
  }
});

test('les mots-clés cibles incluent la ville et les formulations de recherche locale', () => {
  const kw = targetKeywords(client);
  assert.ok(kw.seo.some(k => k.includes('Narbonne')));
  assert.equal(kw.geo.length, 3);
});

test('le comptage des réseaux sociaux respecte les seuils', () => {
  assert.equal(socialVisibility({ site: { socials: [] } }).tone, 'bad');
  assert.equal(socialVisibility({ site: { socials: [{ net: 'Instagram' }, { net: 'Facebook' }] } }).tone, 'mid');
  assert.equal(socialVisibility({ site: null }).analyzed, false);
});

import { unifiedRecommendations, improvementPlan, actionPlan } from '../src/audit/scoring.js';

test('une recommandation déjà couverte par le plan d’action n’est pas répétée', () => {
  const weak = { ...analysis, site: { ...analysis.site, localSchema: false } };
  const diag = visibilityAudit(weak, client);
  const plan = actionPlan(weak, client, diag);
  const recos = improvementPlan(weak, client);
  const unified = unifiedRecommendations(recos, plan);
  const planLabels = new Set(plan.map(p => p.t));
  assert.ok(unified.length <= recos.length);
  assert.ok(!unified.some(r => /données structurées/i.test(r.title) && planLabels.has('Données structurées LocalBusiness')));
});

test('une note Google basse ne tombe pas dans le sujet « volume d’avis »', () => {
  const recos = [{ title: 'Faire remonter la note Google' }, { title: 'Lancer une collecte d’avis Google' }];
  const unified = unifiedRecommendations(recos, [{ t: 'Note Google' }]);
  assert.deepEqual(unified.map(r => r.title), ['Lancer une collecte d’avis Google']);
});
