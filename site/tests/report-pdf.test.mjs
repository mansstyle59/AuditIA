// Tests du générateur PDF : il doit produire un document complet, sans planter, dans tous les cas courants.
// Lancer : node --test site/tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildReport } from '../src/report/report-model.js';
import { buildReportPdf, pdfSafe } from '../src/report/report-pdf.js';
import { defaultBrand } from '../src/settings/brand.js';

const require = createRequire(import.meta.url);
const { jsPDF } = require('../vendor/jspdf.umd.min.js');
/* Enregistre les textes écrits (le PDF étant compressé, on ne peut pas chercher dans sa sortie). */
class Rec extends jsPDF {
  constructor(...args) { super(...args); this.__t = []; const orig = this.text.bind(this); this.text = (t, ...a) => { this.__t.push([].concat(t).join(' ')); return orig(t, ...a); }; }
}
const texts = pdf => (pdf.__t || []).join('\n');
const now = new Date('2026-11-25T10:00:00Z');

const client = {
  id: 'c1', name: 'Boulangerie Martin', city: 'Narbonne', category: 'Boulangerie', website: 'https://boulangerie-martin.example',
  details: {
    rating: 4.6, reviews: 128, photoCount: 34, hours: ['Lun 7h-19h', 'Mar 7h-19h'], status: 'OPERATIONAL',
    sirene: { matched: true, siren: '812345678', siret: '81234567800019', denomination: 'MARTIN SARL', dateCreation: '2015-06-01', matchConfidence: 'élevée', etablissements: 1 },
  },
};
const site = {
  hasWebsite: true, pageRead: true, analyzedAt: now.toISOString(), finalUrl: client.website,
  socials: [{ net: 'Facebook', url: 'https://facebook.com/x' }], directories: [{ name: 'PagesJaunes', url: 'https://pagesjaunes.fr/x' }],
  title: 'Boulangerie', metaDesc: '', viewport: true, ldTypes: [], localSchema: false, words: 400,
  competitors: { total: 3, selfRank: 2, list: [{ name: 'A', rating: 4.5, reviews: 300, rank: 1 }, { name: 'Boulangerie Martin', rating: 4.6, reviews: 128, rank: 2, isSelf: true }, { name: 'C', rating: 4, reviews: 20, rank: 3 }] },
  rankings: [{ kw: 'boulangerie Narbonne', pos: 4, found: true }, { kw: 'pain Narbonne', pos: null, found: false }],
};
const scan = { scores: { performance: 54, accessibility: 81, bestPractices: 92, seo: 85 }, metrics: { 'Plus grand contenu (LCP)': '5,9 s' } };
const a1 = { id: 'a1', client_id: 'c1', status: 'Analysé', score: 62, created_at: now.toISOString(), site, scan };
const a0 = { id: 'a0', client_id: 'c1', status: 'Analysé', score: 50, created_at: '2026-10-01T10:00:00Z', site: { ...site, analyzedAt: '2026-10-01T10:00:00Z' }, scan };

const pdfOf = (audit, c, all, brand = null) => { const m = buildReport(audit, c, all, now); m.brand = brand; return buildReportPdf(Rec, m); };

test('rapport complet (registre SIRENE, historique, concurrents) : généré sans erreur', () => {
  const pdf = pdfOf(a1, client, [a1, a0]);
  const n = pdf.internal.getNumberOfPages();
  assert.ok(n >= 6 && n <= 16, 'nombre de pages raisonnable : ' + n);
  assert.match(pdf.output(), /annuaire-entreprises\.data\.gouv\.fr\/entreprise\/812345678/, 'lien vers la fiche officielle');
});

test('commerce sans site ni données : généré sans erreur', () => {
  const bare = { id: 'c2', name: 'Garage', city: 'Lézignan', details: {} };
  const a = { id: 'a2', client_id: 'c2', status: 'Analysé', score: 30, created_at: now.toISOString(), site: { hasWebsite: false, pageRead: false, socials: [], directories: [] }, scan: null };
  const pdf = pdfOf(a, bare, [a]);
  assert.ok(pdf.internal.getNumberOfPages() >= 4);
  assert.match(texts(pdf), /Sans objet : aucun site web/);
});

test('marque personnalisée avec signature et coordonnées : bloc contact présent', () => {
  const brand = { ...defaultBrand(), custom: true, primary: '#0F766E', deep: '#063F3B', company: 'AffiAds', signature: { name: 'Denis', role: 'Consultant', text: '' }, contact: { email: 'contact@exemple.fr', phone: '', website: '', address: '' } };
  const out = texts(pdfOf(a1, client, [a1], brand));
  assert.match(out, /Votre contact/);
  assert.match(out, /contact@exemple\.fr/);
  assert.match(out, /Préparé par|Denis/);
});

test('pdfSafe retire les caractères non imprimables par les polices standard', () => {
  assert.equal(pdfSafe('Score ≥ 50 → OK ✓'), 'Score >= 50 -> OK ');
});
