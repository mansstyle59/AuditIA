import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const tempDir = await mkdtemp(join(tmpdir(), "auditia-business-profile-"));
const source = await readFile(new URL("../site/src/report/business-profile.js", import.meta.url), "utf8");
await writeFile(join(tempDir, "business-profile.mjs"), source, "utf8");
const model = await import(pathToFileURL(join(tempDir, "business-profile.mjs")).href);
test.after(() => rm(tempDir, { recursive: true, force: true }));

test("business profile exposes SIRENE legal identity and director without calling them the owner", () => {
  const profile = model.buildBusinessProfile({
    name: "Atelier Exemple",
    details: { sirene: { matched: true, denomination: "EXEMPLE SARL", siren: "123456789", siret: "12345678900012", dirigeant: "Alice Exemple", dateCreation: "2020-01-15", formeJuridique: "SARL" } }
  }, new Date("2025-01-15T12:00:00Z"));
  assert.equal(profile.legalName, "EXEMPLE SARL");
  assert.equal(profile.dirigeant, "Alice Exemple");
  assert.equal(profile.creationDate, "2020-01-15");
  assert.equal(profile.ageLabel, "5 ans");
  assert.equal(profile.legalStatus, "matched");
});

test("a freshly checked missing Google phone is not replaced by an old client phone", () => {
  const profile = model.buildBusinessProfile({
    phone: "04 00 00 00 00",
    details: { place_id: "place-id", phone: "04 00 00 00 00", googlePhone: null, googlePhoneCheckedAt: "2026-11-09T09:00:00Z" }
  }, new Date("2026-11-09T12:00:00Z"));
  assert.equal(profile.phone, "");
  assert.match(profile.phoneSource, /Google Places/);
});

test("manual phone data is clearly marked as unverified and missing reviews remain unknown", () => {
  const profile = model.buildBusinessProfile({ phone: "04 11 22 33 44", details: { reviews: null } });
  assert.equal(profile.phone, "04 11 22 33 44");
  assert.match(profile.phoneSource, /non vérifiée/);
  assert.equal(profile.reviews, null);
});
