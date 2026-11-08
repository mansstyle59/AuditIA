import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./robots.js", import.meta.url), "utf8");
const robots = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const { parseRobotsPolicy, isRobotsResponseUnverifiable } = robots;

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

const overlappingGroups = `User-agent: Audit
Disallow: /legacy
User-agent: AuditIA
Disallow: /private
`;
assert.equal(parseRobotsPolicy(overlappingGroups, "AuditIA", "/legacy").allowed, false,
  "all matching named groups are combined per RFC 9309");
assert.equal(parseRobotsPolicy(overlappingGroups, "AuditIA", "/private").allowed, false,
  "the more specific user-agent group also applies");

assert.equal(parseRobotsPolicy("# no directives\n", "AuditIA", "/").allowed, true);
assert.equal(parseRobotsPolicy("Sitemap: https://example.com/sitemap.xml\n", "AuditIA", "/").allowed, true,
  "a sitemap-only robots.txt does not restrict crawling");
assert.equal(parseRobotsPolicy("not a robots directive", "AuditIA", "/").allowed, null,
  "an unparseable robots file is unknown, not permission to crawl");
assert.equal(parseRobotsPolicy("User-agent: *\nDisallow: /" + "a".repeat(2050), "AuditIA", "/").allowed, null,
  "overlong rule patterns fail closed");
assert.equal(parseRobotsPolicy("x".repeat(512 * 1024 + 1), "AuditIA", "/").status, "too-large",
  "oversized robots files are rejected before parsing");


assert.equal(isRobotsResponseUnverifiable(''), true,
  "an empty proxy response is ambiguous and must fail closed");
assert.equal(isRobotsResponseUnverifiable('<html><title>404 Not Found</title></html>'), true,
  "an HTML proxy error must not be treated as a missing robots.txt");
assert.equal(isRobotsResponseUnverifiable('  \n\t<!doctype html><title>Proxy error</title>'), true,
  "a doctype HTML proxy error must fail closed even without html/body tags");
assert.equal(isRobotsResponseUnverifiable('<div>Proxy error</div>'), true,
  "any HTML-like response must fail closed");
assert.equal(isRobotsResponseUnverifiable('User-agent: *\nDisallow: /private'), false,
  "a textual robots file can be evaluated");
assert.equal(parseRobotsPolicy('User-agent: *\nDisallow: /private', "AuditIA", "/private").allowed, false,
  "the fixture contains a real newline and its Disallow rule is enforced");
assert.equal(parseRobotsPolicy('404 Not Found', 'AuditIA', '/').allowed, null,
  "a plain-text proxy error is not permission to crawl");

console.log("AuditIA robots policy tests passed.");


const encodedUnreserved = "User-agent: *\nDisallow: /~private\n";
assert.equal(parseRobotsPolicy(encodedUnreserved, "AuditIA", "/%7Eprivate").allowed, false,
  "percent-encoded unreserved characters must match their literal form");
assert.equal(parseRobotsPolicy("User-agent: *\nDisallow: /%7eprivate\n", "AuditIA", "/~private").allowed, false,
  "hex digits in percent-encoding are case-insensitive");
assert.equal(parseRobotsPolicy("User-agent: *\nDisallow: /private%2Fadmin\n", "AuditIA", "/private/admin").allowed, true,
  "reserved %2F must not be decoded into a path separator");
