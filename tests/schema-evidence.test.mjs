import test from "node:test";
import assert from "node:assert/strict";
import { hasLocalBusinessSchema } from "../site/src/audit/schema-evidence.mjs";

test("reconnaît les types schema.org LocalBusiness et ses sous-types exacts", () => {
  assert.equal(hasLocalBusinessSchema("LocalBusiness"), true);
  assert.equal(hasLocalBusinessSchema("Restaurant"), true);
  assert.equal(hasLocalBusinessSchema("https://schema.org/Restaurant"), true);
  assert.equal(hasLocalBusinessSchema("schema:Bakery"), true);
});

test("ne confond pas Organization générique avec LocalBusiness", () => {
  assert.equal(hasLocalBusinessSchema("Organization"), false);
  assert.equal(hasLocalBusinessSchema("https://schema.org/Organization"), false);
  assert.equal(hasLocalBusinessSchema("NotLocalBusiness"), false);
  assert.equal(hasLocalBusinessSchema("BusinessOrganization"), false);
});

test("accepte un tableau de types si au moins un type local exact est présent", () => {
  assert.equal(hasLocalBusinessSchema(["Organization", "https://schema.org/LocalBusiness"]), true);
  assert.equal(hasLocalBusinessSchema(["Organization", "WebSite"]), false);
  assert.equal(hasLocalBusinessSchema([]), false);
  assert.equal(hasLocalBusinessSchema(null), false);
});

console.log("AuditIA local schema evidence tests passed.");
