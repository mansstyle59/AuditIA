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


const competitorAudit = {
  site: {
    competitors: {
      total: 8,
      selfRank: 5,
      list: [
        { name: "Concurrent sans avis", reviews: null, rating: 4.8, isSelf: false },
        { name: "Commerce audité", reviews: 5, rating: 4.0, isSelf: true },
        { name: "Concurrent avec avis", reviews: 12, rating: 4.5, isSelf: false },
      ],
    },
    rankings: [{ kw: "boulangerie Narbonne", pos: 4, found: true, error: false }],
  },
  scan: null,
};
const lowReviewPlan = improvementPlan(competitorAudit, client({
  place_id: "ChIJ-auditia-low-reviews",
  rating: 4.0,
  reviews: 5,
}));
const lowReviewAdvice = lowReviewPlan.find(item => item.axis === "Avis & réputation");
assert.match(lowReviewAdvice.why, /Concurrent avec avis en a déjà 12/);
assert.doesNotMatch(lowReviewAdvice.why, /Concurrent sans avis.*(?:null|0) avis/i,
  "competitors without a measured review count must not be described as having zero reviews");
const localSeoAdvice = lowReviewPlan.find(item => item.axis === "SEO local");
assert.match(localSeoAdvice.why, /Concurrent avec avis \(12 avis\)/);
assert.doesNotMatch(localSeoAdvice.why, /Concurrent sans avis.*(?:null|0) avis/i,
  "local SEO advice must not cite an unknown competitor review count");

const noMeasuredCompetitorAudit = {
  site: {
    competitors: {
      total: 2,
      selfRank: null,
      list: [
        { name: "Concurrent sans avis", reviews: null, rating: 4.8, isSelf: false },
        { name: "Commerce audité", reviews: 5, rating: 4.0, isSelf: true },
      ],
    },
    rankings: [],
  },
  scan: null,
};
const noMeasuredCompetitorPlan = improvementPlan(noMeasuredCompetitorAudit, client({
  place_id: "ChIJ-auditia-no-ranked-competitor",
  rating: 4.0,
  reviews: 5,
}));
const noMeasuredCompetitorAdvice = noMeasuredCompetitorPlan.find(item => item.axis === "Avis & réputation");
assert.doesNotMatch(noMeasuredCompetitorAdvice.why, /Concurrent sans avis/,
  "unknown competitor counts must be omitted from review advice");



// Malformed numeric values must stay unavailable, not become zero via Number("") or Number(false).
const malformedProfile = client({
  place_id: "ChIJ-auditia-malformed",
  rating: "",
  reviews: "",
  photoCount: "",
  hours: [],
});
const malformedPlan = improvementPlan(audit, malformedProfile);
const malformedReviewAdvice = malformedPlan.find(item => item.axis === "Avis & réputation");
assert.match(malformedReviewAdvice.title, /Vérifier les avis Google/);
assert.doesNotMatch(malformedReviewAdvice.why, /\b0 avis\b/,
  "an empty review count must not be interpreted as zero");
assert.doesNotMatch(malformedPlan.filter(item => item.axis === "Fiche Google").map(item => item.title).join(" "),
  /Ajouter des photos récentes/,
  "an empty photo count must not be interpreted as zero photos");

const malformedAudit = visibilityAudit(audit, malformedProfile);
for (const label of ["Note Google", "Volume d’avis"]) {
  const criterion = malformedAudit.items.find(item => item.label === label);
  assert.ok(criterion && criterion.measured === false,
    label + " must be unmeasured when its numeric source is empty");
}
assert.equal(malformedAudit.items.find(item => item.label === "Photos sur la fiche Google"), undefined,
  "an empty photo count must not create a measured zero-photo criterion");

const booleanProfile = client({
  place_id: "ChIJ-auditia-boolean",
  rating: true,
  reviews: false,
  photoCount: true,
});
const booleanAudit = visibilityAudit(audit, booleanProfile);
for (const label of ["Note Google", "Volume d’avis"]) {
  const criterion = booleanAudit.items.find(item => item.label === label);
  assert.ok(criterion && criterion.measured === false,
    label + " must reject boolean values");
}


const stringZeroProfile = client({
  place_id: "ChIJ-auditia-string-zero",
  rating: "4.5",
  reviews: "0",
  photoCount: "0",
});
const stringZeroPlan = improvementPlan(audit, stringZeroProfile);
const stringZeroAdvice = stringZeroPlan.find(item => item.axis === "Avis & réputation");
assert.match(stringZeroAdvice.why, /0 avis/,
  "a numeric string containing zero is still a legitimate observed count");
const stringZeroAudit = visibilityAudit(audit, stringZeroProfile);
assert.ok(stringZeroAudit.items.find(item => item.label === "Note Google").measured);
assert.ok(stringZeroAudit.items.find(item => item.label === "Volume d’avis").measured);


const stringZeroPhotoCriterion = stringZeroAudit.items.find(item => item.label === "Photos sur la fiche Google");
assert.ok(stringZeroPhotoCriterion && stringZeroPhotoCriterion.measured && stringZeroPhotoCriterion.val === 0,
  "a numeric string containing zero is a measured zero-photo value");

const outOfRangeProfile = client({
  place_id: "ChIJ-auditia-out-of-range",
  rating: 6,
  reviews: -1,
  photoCount: 2.5,
});
const outOfRangeAudit = visibilityAudit(audit, outOfRangeProfile);
for (const label of ["Note Google", "Volume d’avis"]) {
  const criterion = outOfRangeAudit.items.find(item => item.label === label);
  assert.ok(criterion && criterion.measured === false,
    label + " must reject out-of-range or fractional values");
}
assert.equal(outOfRangeAudit.items.find(item => item.label === "Photos sur la fiche Google"), undefined,
  "fractional photo counts must not be scored");

console.log("AuditIA scoring evidence tests passed.");
