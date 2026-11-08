import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./utils.js", import.meta.url), "utf8");
const utils = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

assert.equal(utils.googleReviewCount(null), null);
assert.equal(utils.googleReviewCount(undefined), null);
assert.equal(utils.googleReviewCount(""), null);
assert.equal(utils.googleReviewCount(0), 0, "zero reviews is a real observed value");
assert.equal(utils.googleReviewCount("12"), 12);
assert.equal(utils.googleReviewCount(-1), null);
assert.equal(utils.googleReviewCount(2.5), null);
assert.equal(utils.googleReviewCount(true), null);

assert.equal(utils.googleRatingValue(4.5), 4.5);
assert.equal(utils.googleRatingValue(6), null);
assert.equal(utils.googleRatingValue(-1), null);
assert.equal(utils.formatGoogleProfileSummary(null, null), "");
assert.equal(utils.formatGoogleProfileSummary(4.5, null), "★ 4,5/5 · avis non disponibles");
assert.equal(utils.formatGoogleProfileSummary(null, 0), "Note non disponible · 0 avis");
assert.equal(utils.formatGoogleProfileSummary(4.5, 12), "★ 4,5/5 · 12 avis");

const places = [
  { name: "Avis inconnu", reviews: null, rating: 4.9 },
  { name: "Zéro avis", reviews: 0, rating: 4.8 },
  { name: "Dix avis", reviews: 10, rating: 4.2 },
  { name: "Dix avis mieux notés", reviews: 10, rating: 4.7 },
];
places.sort(utils.compareGoogleReviewCounts);
assert.deepEqual(places.map(x => x.name), ["Dix avis mieux notés", "Dix avis", "Zéro avis", "Avis inconnu"]);

const sourceAudit = readFileSync(new URL("../api/audit-sources.js", import.meta.url), "utf8");
assert.match(sourceAudit, /reviews:googleReviewCount\(p\.userRatingCount\)/);
assert.match(sourceAudit, /all\.sort\(compareGoogleReviewCounts\)/);
assert.doesNotMatch(sourceAudit, /Number\(p\.userRatingCount\)\s*\|\|\s*0/);

for (const path of [
  "../report/report-view.js",
  "../report/report-pdf.js",
  "../ui/views/audits.js",
  "../ui/views/client-detail.js",
  "../ui/views/prospects.js",
]) {
  const content = readFileSync(new URL(path, import.meta.url), "utf8");
  assert.doesNotMatch(content, /reviews\s*\|\|\s*0/, path + " must not turn missing reviews into zero");
}

console.log("AuditIA Google evidence tests passed.");
