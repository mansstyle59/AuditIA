import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./robots.js", import.meta.url), "utf8");
const robots = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const { parseRobotsPolicy } = robots;

const rules = `User-agent: AuditIA
Disallow: /admin
Allow: /admin/public
User-agent: *
Disallow: /private
`;

assert.equal(parseRobotsPolicy(rules, "AuditIA", "/admin/secret").allowed, false);
assert.equal(parseRobotsPolicy(rules, "AuditIA", "/admin/public/page").allowed, true,
  "the longer Allow rule overrides the shorter Disallow");
assert.equal(parseRobotsPolicy(rules, "AuditIA", "/private").allowed, true,
  "a specific user-agent group takes precedence over the wildcard group");
assert.equal(parseRobotsPolicy(rules, "AuditIA", "/Admin").allowed, true,
  "robots paths are case-sensitive");
assert.equal(parseRobotsPolicy(rules, "OtherBot", "/private").allowed, false,
  "unknown crawlers use the wildcard group");

const wildcardRules = `User-agent: *
Disallow: /search*
Allow: /search/open$
Disallow: /same
Allow: /same
`;
assert.equal(parseRobotsPolicy(wildcardRules, "AuditIA", "/search/open").allowed, true);
assert.equal(parseRobotsPolicy(wildcardRules, "AuditIA", "/search/open/child").allowed, false);
assert.equal(parseRobotsPolicy(wildcardRules, "AuditIA", "/same").allowed, true,
  "Allow wins when Allow and Disallow have the same specificity");

const combinedGroups = `User-agent: AuditIA
Disallow: /one
User-agent: AuditIA
Disallow: /two
`;
assert.equal(parseRobotsPolicy(combinedGroups, "AuditIA", "/one").allowed, false);
assert.equal(parseRobotsPolicy(combinedGroups, "AuditIA", "/two").allowed, false,
  "rules from repeated matching user-agent groups are combined");

assert.equal(parseRobotsPolicy("# no directives\n", "AuditIA", "/").allowed, true);
assert.equal(parseRobotsPolicy("Sitemap: https://example.com/sitemap.xml\n", "AuditIA", "/").allowed, true,
  "a sitemap-only robots.txt does not restrict crawling");
assert.equal(parseRobotsPolicy("not a robots directive", "AuditIA", "/").allowed, null,
  "an unparseable robots file is unknown, not permission to crawl");
assert.equal(parseRobotsPolicy("User-agent: *\nDisallow: /" + "a".repeat(2050), "AuditIA", "/").allowed, null,
  "overlong rule patterns fail closed");
assert.equal(parseRobotsPolicy("x".repeat(512 * 1024 + 1), "AuditIA", "/").status, "too-large",
  "oversized robots files are rejected before parsing");

console.log("AuditIA robots policy tests passed.");
