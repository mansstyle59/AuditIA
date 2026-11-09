import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

// scoring.js is a browser ES module in a static site without package.json "type": "module".
// Copy it to a temporary .mjs file so Node can import the pure scoring functions in CI.
const tempDir = await mkdtemp(join(tmpdir(), "auditia-scoring-"));
const source = await readFile(new URL("../site/src/audit/scoring.js", import.meta.url), "utf8");
await writeFile(join(tempDir, "scoring.mjs"), source, "utf8");
const { visibilityAudit, improvementPlan } = await import(pathToFileURL(join(tempDir, "scoring.mjs")).href);
after(() => rm(tempDir, { recursive: true, force: true }));

const item = (diagnostic, label) => diagnostic.items.find(x => x.label === label);

test("un client saisi manuellement ne prouve pas une fiche Google ni ses statistiques", () => {
  const client = {
    name: "Commerce test",
    city: "Narbonne",
    website: "",
    details: {
      address: "12 rue de test, Narbonne",
      rating: 4.8,
      reviews: 120,
      hours: ["Lundi : 9h–18h"],
      photoCount: 24,
    },
  };
  const diagnostic = visibilityAudit({}, client);

  for (const label of [
    "Fiche Google/Maps associée",
    "Note Google",
    "Volume d’avis",
    "Horaires renseignés",
    "Site web",
  ]) {
    assert.equal(item(diagnostic, label)?.measured, false, label + " doit rester non mesuré sans source vérifiée");
  }

  const plan = improvementPlan({}, client);
  const titles = plan.map(x => x.title);
  assert.ok(titles.includes("Vérifier et associer la fiche Google Business Profile"));
  assert.ok(titles.includes("Vérifier si le commerce dispose d’un site web"));
  assert.ok(!titles.includes("Lancer une collecte d’avis Google"));
  assert.ok(!titles.includes("Faire remonter la note Google"));
  assert.ok(!titles.includes("Vérifier les horaires sur la fiche Google"));
  assert.ok(!titles.includes("Publier des “posts” Google si vous gérez la fiche"));
  assert.ok(!titles.includes("Créer un site vitrine"));
});

test("un identifiant Google Places permet d’utiliser les données Google réellement associées", () => {
  const client = {
    name: "Commerce test",
    city: "Narbonne",
    details: { place_id: "ChIJfixture", rating: 4.8, reviews: 3, hours: [], photoCount: 2 },
  };
  const diagnostic = visibilityAudit({}, client);

  assert.equal(item(diagnostic, "Fiche Google/Maps associée")?.measured, true);
  assert.equal(item(diagnostic, "Fiche Google/Maps associée")?.ok, true);
  assert.equal(item(diagnostic, "Note Google")?.measured, true);
  assert.equal(item(diagnostic, "Volume d’avis")?.measured, true);
  assert.equal(item(diagnostic, "Horaires renseignés")?.measured, true);

  const titles = improvementPlan({}, client).map(x => x.title);
  assert.ok(titles.includes("Lancer une collecte d’avis Google"));
  assert.ok(titles.includes("Vérifier les horaires sur la fiche Google"));
  assert.ok(titles.includes("Ajouter des photos récentes (et régulièrement)"));
  assert.ok(titles.includes("Publier des “posts” Google si vous gérez la fiche"));
});

test("le numéro Google et le lien téléphonique du site sont deux mesures distinctes", () => {
  const client = { name: "Commerce test", details: { place_id: "ChIJfixture", googlePhone: "+33400000000", googlePhoneCheckedAt: "2026-11-09T09:00:00Z" } };
  const audit = { site: { pageRead: true, tel: [] } };
  const diagnostic = visibilityAudit(audit, client);
  const googlePhone = item(diagnostic, "Téléphone présent dans les données Google Places");
  const siteTel = item(diagnostic, "Lien téléphone cliquable sur le site (tel:)");

  assert.equal(googlePhone?.measured, true);
  assert.equal(googlePhone?.ok, true);
  assert.equal(googlePhone?.source, "Google Places (champ téléphonique)");
  assert.equal(siteTel?.measured, true);
  assert.equal(siteTel?.ok, false);
  assert.match(siteTel?.advice || "", /Aucun lien tel:/);
});

test("un échec de lecture Google Places ne devient pas une preuve d’absence de téléphone", () => {
  const diagnostic = visibilityAudit({}, { details: { place_id: "ChIJfixture" } });
  const phone = item(diagnostic, "Téléphone présent dans les données Google Places");
  assert.equal(phone?.measured, false);
});

test("un numéro absent de la réponse Places Details reste non mesuré, même après vérification", () => {
  const client = {
    phone: "04 11 22 33 44",
    details: {
      place_id: "ChIJfixture",
      phone: "04 11 22 33 44",
      googlePhone: null,
      googlePhoneCheckedAt: "2026-11-09T09:00:00Z",
    },
  };
  const diagnostic = visibilityAudit({}, client);
  const phone = item(diagnostic, "Téléphone présent dans les données Google Places");

  assert.equal(phone?.measured, false);
  assert.equal(phone?.ok, null);
  assert.equal(phone?.source, "Google Places (champ téléphonique)");
  assert.match(phone?.unmeasuredReason || "", /ne prouve pas que le téléphone est absent de Google Maps/);
});

test("un téléphone client ancien ne prouve pas la présence du numéro sur Google", () => {
  const diagnostic = visibilityAudit({}, {
    phone: "04 11 22 33 44",
    details: { place_id: "ChIJfixture", phone: "04 11 22 33 44" },
  });
  const phone = item(diagnostic, "Téléphone présent dans les données Google Places");

  assert.equal(phone?.measured, false);
  assert.equal(phone?.ok, null);
});

test("le contrôle HTTPS décrit uniquement le protocole de l’URL, pas la validité TLS", () => {
  const httpsDiagnostic = visibilityAudit({}, { website: "https://example.test" });
  const httpsItem = item(httpsDiagnostic, "Adresse du site en HTTPS");
  assert.equal(httpsItem?.measured, true);
  assert.equal(httpsItem?.ok, true);
  assert.match(httpsItem?.advice || "", /certificat TLS n’a pas été vérifié/);

  const httpDiagnostic = visibilityAudit({}, { website: "http://example.test" });
  const httpItem = item(httpDiagnostic, "Adresse du site en HTTPS");
  assert.equal(httpItem?.ok, false);
  assert.match(httpItem?.advice || "", /Vérifier la redirection HTTPS/);
});
