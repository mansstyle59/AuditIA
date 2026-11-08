import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readTextLimited } from "../site/src/api/bounded-fetch.mjs";

const encoder = new TextEncoder();

const ok = text => new Response(text, { status: 200 });
const fetchReturning = response => async () => response;

assert.equal(
  await readTextLimited("https://example.com/", {}, 1000, 16, fetchReturning(ok("AuditIA"))),
  "AuditIA",
  "a small text response is read normally"
);

await assert.rejects(
  readTextLimited(
    "https://example.com/",
    {},
    1000,
    8,
    fetchReturning(new Response("123456789", { status: 200, headers: { "content-length": "9" } }))
  ),
  error => error.code === "response_too_large",
  "declared Content-Length above the cap is rejected before reading"
);

let streamCancelled = false;
const oversizedStream = new ReadableStream({
  start(controller) {
    controller.enqueue(encoder.encode("1234"));
    controller.enqueue(encoder.encode("5678"));
  },
  cancel() { streamCancelled = true; }
});
await assert.rejects(
  readTextLimited("https://example.com/", {}, 1000, 5, fetchReturning(new Response(oversizedStream))),
  error => error.code === "response_too_large",
  "chunked responses are stopped when the byte cap is crossed"
);
assert.equal(streamCancelled, true, "the oversized stream is cancelled");

const utf8Stream = new ReadableStream({
  start(controller) {
    controller.enqueue(encoder.encode("bon"));
    controller.enqueue(encoder.encode("jour"));
    controller.close();
  }
});
assert.equal(
  await readTextLimited("https://example.com/", {}, 1000, 7, fetchReturning(new Response(utf8Stream))),
  "bonjour",
  "bounded streaming preserves normal multi-chunk UTF-8 text"
);

const webReadSource = readFileSync(new URL("../site/src/api/web-read.js", import.meta.url), "utf8");
assert.match(webReadSource, /'X-Robots-Txt'\s*:\s*'AuditIA'/,
  "Jina Reader must check robots.txt using the AuditIA user-agent token");
assert.match(webReadSource, /readSiteText\(robotsUrl,\{\},8000,512\*1024\)/,
  "robots.txt is capped at 512 KiB before parsing");

console.log("AuditIA bounded web-read tests passed.");
