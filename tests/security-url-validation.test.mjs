import test from "node:test";
import assert from "node:assert/strict";
import { isPublicHttpUrl as serverCheck } from "../supabase/functions/auditia-secure-api/url-validation.mjs";
import { isPublicHttpUrl as browserCheck, safePublicHttpUrl } from "../site/src/core/public-url.mjs";

const publicUrls = [
  "https://example.com",
  "https://www.example.fr/path?q=1",
  "https://8.8.8.8/",
  "http://172.32.0.1/",
  "https://[2001:4860:4860::8888]/",
  "https://[::ffff:8.8.8.8]/",
];

const blockedUrls = [
  "http://localhost/",
  "http://localhost.localdomain/",
  "http://127.0.0.1/",
  "http://127.1/",
  "http://2130706433/",
  "http://0x7f000001/",
  "http://10.0.0.1/",
  "http://172.16.0.1/",
  "http://172.31.255.255/",
  "http://192.168.1.1/",
  "http://169.254.169.254/latest/meta-data/",
  "http://100.64.0.1/",
  "http://192.0.2.1/",
  "http://198.18.0.1/",
  "http://metadata.google.internal/",
  "http://metadata.azure.com/",
  "http://host.docker.internal/",
  "http://service.local/",
  "http://internal/",
  "http://example.test/",
  "http://foo.nip.io/",
  "http://localtest.me/",
  "http://[::]/",
  "http://[::1]/",
  "http://[fc00::1]/",
  "http://[fe80::1]/",
  "http://[ff02::1]/",
  "http://[::ffff:7f00:1]/",
  "http://[::ffff:c0a8:101]/",
  "http://[2001:db8::1]/",
  "http://[2001:2::1]/",
  "http://[3fff::1]/",
  "https://user:password@example.com/",
  "ftp://example.com/",
  "http://intranet/",
  "http://999.999.999.999/",
];

test("les deux validations bloquent les destinations privées, locales et réservées", () => {
  for (const url of blockedUrls) {
    assert.equal(serverCheck(url), false, `Edge Function accepte à tort ${url}`);
    assert.equal(browserCheck(url), false, `frontend accepte à tort ${url}`);
  }
});

test("les deux validations acceptent les URL publiques HTTP(S)", () => {
  for (const url of publicUrls) {
    assert.equal(serverCheck(url), true, `Edge Function refuse ${url}`);
    assert.equal(browserCheck(url), true, `frontend refuse ${url}`);
  }
});

test("le helper navigateur conserve la normalisation URL attendue", () => {
  assert.equal(safePublicHttpUrl("https://example.com"), "https://example.com/");
  assert.equal(safePublicHttpUrl("http://127.1"), "");
  assert.equal(safePublicHttpUrl("ftp://example.com"), "");
});
