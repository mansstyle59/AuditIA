import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// scoring.js is intentionally dependency-free. Import its exact source as ESM
// because this static site has no package.json with type=module.
const source = readFileSync(new URL("./scoring.js", import.meta.url), "utf8");
const scoring = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const { improvementPlan, visibilityAudit } = scoring;

const audit = { site: null, scan: null };
const client = details => ({
  name: "Boulangerie Test",
  city: "Narbonne",
  category: "Boulangerie",
  website: "",
  phone: "",
  details,
});

const unknownProfile = client({
  address: "12 rue du Test, 11100 Narbonne",
  rating: null,
  reviews: null,
  hours: null,
});

const unknownAudit = visibilityAudit(audit, unknownProfile);
const googleCriteria = unknownAudit.items.filter(item =>
  ["Fiche Google Business", "Présence reconnue (Google/Maps)"].includes(item.label)
);
assert.equal(googleCriteria.length, 2);
assert.ok(googleCriteria.every(item => item.measured === false && item.ok === null),
  "an address without a Google Place ID must remain unverified, not score as a confirmed profile");

const unknownPlan = improvementPlan(audit, unknownProfile);
const profileRecommendation = unknownPlan.find(item => item.axis === "Fiche Google");
assert.match(profileRecommendation.title, /Vérifier et relier/);
assert.doesNotMatch(profileRecommendation.title, /Créer et faire valider/);
assert.match(profileRecommendation.why, /ne prouve pas que la fiche est absente/i);

const reviewRecommendation = unknownPlan.find(item => item.axis === "Avis & réputation");
assert.match(reviewRecommendation.title, /Vérifier les avis Google/);
assert.match(reviewRecommendation.why, /nombre d’avis n’a pas été récupéré/i);
assert.doesNotMatch(reviewRecommendation.why, /\b0 avis\b/,
  "missing review data must not be displayed as zero reviews");

const hoursRecommendation = unknownPlan.find(item =>
  item.axis === "Fiche Google" && /horaires/i.test(item.title)
);
assert.match(hoursRecommendation.title, /Vérifier les horaires/);
assert.match(hoursRecommendation.why, /ne signifie pas/i);

const importedProfile = client({
  place_id: "ChIJ-auditia-test",
  address: "12 rue du Test, 11100 Narbonne",
  rating: 4.7,
  reviews: 25,
  hours: ["Lundi : 09:00–18:00"],
});
const importedAudit = visibilityAudit(audit, importedProfile);
const importedGoogleCriteria = importedAudit.items.filter(item =>
  ["Fiche Google Business", "Présence reconnue (Google/Maps)"].includes(item.label)
);
assert.ok(importedGoogleCriteria.every(item => item.measured === true && item.ok === true),
  "an explicit Google Place ID is positive evidence of a Google Places listing");

const zeroReviewsPlan = improvementPlan(audit, client({
  place_id: "ChIJ-auditia-zero",
  rating: null,
  reviews: 0,
  hours: ["Lundi : 09:00–18:00"],
}));
const zeroReviewsRecommendation = zeroReviewsPlan.find(item => item.axis === "Avis & réputation");
assert.match(zeroReviewsRecommendation.title, /collecte d’avis/);
assert.match(zeroReviewsRecommendation.why, /0 avis/,
  "an explicitly observed zero must remain distinguishable from missing data");

console.log("AuditIA scoring evidence tests passed.");
