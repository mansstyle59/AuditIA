import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

// places-model.js is a browser ES module in the static site; import a temporary .mjs copy in CI.
const tempDir = await mkdtemp(join(tmpdir(), "auditia-place-evidence-"));
const source = await readFile(new URL("../site/src/api/places-model.js", import.meta.url), "utf8");
await writeFile(join(tempDir, "places-model.mjs"), source, "utf8");
const model = await import(pathToFileURL(join(tempDir, "places-model.mjs")).href);
after(() => rm(tempDir, { recursive: true, force: true }));

test("un compteur d'avis absent ou mal formé reste non mesuré", () => {
  for (const value of [null, undefined, "", "   ", "NaN", -1, 1.5, true, {}, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(model.normalizeReviewCount(value), null, String(value));
  }
});

test("un zéro explicite et les entiers valides restent des observations", () => {
  assert.equal(model.normalizeReviewCount(0), 0);
  assert.equal(model.normalizeReviewCount("0"), 0);
  assert.equal(model.normalizeReviewCount(12), 12);
  assert.equal(model.normalizeReviewCount("12"), 12);
});

test("normalizePlace ne transforme pas un nombre d'avis absent en zéro", () => {
  assert.equal(model.normalizePlace({ userRatingCount: undefined }).reviews, null);
  assert.equal(model.normalizePlace({ userRatingCount: 0 }).reviews, 0);
});

test("les avis inconnus ne déclenchent pas une recommandation de faible volume", () => {
  const base = { website: "https://example.test", hours: ["Lundi"], rating: 4.5 };
  const unknown = model.nearbyOpportunity({ ...base, reviews: null });
  const zero = model.nearbyOpportunity({ ...base, reviews: 0 });

  assert.equal(unknown.score, 0);
  assert.ok(!unknown.reasons.some(reason => /avis/i.test(reason)));
  assert.equal(zero.score, 15);
  assert.ok(zero.reasons.includes("moins de 10 avis Google"));
});

test("le classement ne donne pas de rang aux commerces sans compteur d'avis", () => {
  const ranked = model.rankByReviewEvidence([
    { name: "Avis inconnus", reviews: null },
    { name: "Zéro avis", reviews: 0 },
    { name: "Dix avis", reviews: 10 },
    { name: "Compteur invalide", reviews: "inconnu" },
    { name: "Vingt-cinq avis", reviews: 25 },
  ]);

  assert.deepEqual(ranked.map(row => [row.name, row.reviews, row.rank]), [
    ["Vingt-cinq avis", 25, 1],
    ["Dix avis", 10, 2],
    ["Zéro avis", 0, 3],
    ["Avis inconnus", null, null],
    ["Compteur invalide", null, null],
  ]);
});
