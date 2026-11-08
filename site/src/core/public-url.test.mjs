import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const utilsSource = readFileSync(new URL("./utils.js", import.meta.url), "utf8");
const utilsModule = await import("data:text/javascript;base64," + Buffer.from(utilsSource).toString("base64"));

const edgePath = new URL("../../../supabase/functions/auditia-secure-api/index.ts", import.meta.url);
const edgeSource = readFileSync(edgePath, "utf8");
const match = edgeSource.match(/function validPublicUrl\(value: string\): boolean \{[\s\S]*?\n\}/);
assert.ok(match, "validPublicUrl must exist in the active Supabase Edge Function");
const edgeFunction = match[0].replace(
  "function validPublicUrl(value: string): boolean",
  "function validPublicUrl(value)"
);
const edgeModule = await import(
  "data:text/javascript;base64," + Buffer.from(edgeFunction + "\nexport { validPublicUrl };").toString("base64")
);

const cases = [
  ["https://example.com", true],
  ["https://auditia.fr/audit?source=test", true],
  ["http://8.8.8.8", true],
  ["http://172.32.0.1", true],
  ["ftp://example.com", false],
  ["javascript:alert(1)", false],
  ["https://user:password@example.com", false],
  ["http://localhost", false],
  ["http://app.local", false],
  ["http://service.internal", false],
  ["http://metadata.google.internal", false],
  ["http://127.0.0.1", false],
  ["http://2130706433", false],
  ["http://0x7f000001", false],
  ["http://0177.0.0.1", false],
  ["http://10.0.0.1", false],
  ["http://172.16.0.1", false],
  ["http://192.168.1.1", false],
  ["http://169.254.169.254", false],
  ["http://100.100.100.200", false],
  ["http://192.0.2.10", false],
  ["http://198.18.0.1", false],
  ["http://203.0.113.10", false],
  ["http://224.0.0.1", false],
  ["http://192.88.99.1", false],
  ["http://127.0.0.1.nip.io", false],
  ["http://[::1]", false],
  ["http://[fe80::1]", false],
  ["http://[fc00::1]", false],
  ["http://[::ffff:127.0.0.1]", false],
];

for (const [url, expected] of cases) {
  assert.equal(Boolean(utilsModule.safeHttpUrl(url)), expected, "browser validator: " + url);
  assert.equal(edgeModule.validPublicUrl(url), expected, "Edge Function validator: " + url);
}

console.log("URL security tests passed:", cases.length, "cases (browser + Edge Function).");
