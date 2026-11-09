import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readTextLimited, readBytesLimited } from "../site/src/api/bounded-fetch.mjs";

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

let textStreamCancelled = false;
const oversizedTextStream = new ReadableStream({
  start(controller) {
    controller.enqueue(encoder.encode("1234"));
    controller.enqueue(encoder.encode("5678"));
  },
  cancel() { textStreamCancelled = true; }
});
await assert.rejects(
  readTextLimited("https://example.com/", {}, 1000, 5, fetchReturning(new Response(oversizedTextStream))),
  error => error.code === "response_too_large",
  "chunked text responses are stopped when the byte cap is crossed"
);
assert.equal(textStreamCancelled, true, "the oversized text stream is cancelled");

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

let imageStreamCancelled = false;
const oversizedImageStream = new ReadableStream({
  start(controller) {
    controller.enqueue(new Uint8Array(4));
    controller.enqueue(new Uint8Array(4));
  },
  cancel() { imageStreamCancelled = true; }
});
await assert.rejects(
  readBytesLimited(
    "https://example.com/image",
    {},
    1000,
    5,
    fetchReturning(new Response(oversizedImageStream, { headers: { "content-type": "image/png" } }))
  ),
  error => error.code === "response_too_large",
  "binary/image responses are stopped before exceeding the byte cap"
);
assert.equal(imageStreamCancelled, true, "the oversized image stream is cancelled");

const image = await readBytesLimited(
  "https://example.com/image",
  {},
  1000,
  16,
  fetchReturning(new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/png" } }))
);
assert.equal(image.bytes.byteLength, 3, "small binary responses are returned as bytes");
assert.equal(image.contentType, "image/png", "the binary response content type is preserved");

await assert.rejects(
  readBytesLimited("https://example.com/", {}, 1000, 16, fetchReturning(new Response(null))),
  error => error.code === "response_stream_unavailable",
  "a non-stream response is refused rather than fully buffered without a cap"
);

const webReadSource = readFileSync(new URL("../site/src/api/web-read.js", import.meta.url), "utf8");
assert.match(webReadSource, /export async function fetchRobotsPolicy\(site\)\s*\{\s*site=safeHttpUrl\(site\);\s*if\(!site\)/,
  "fetchRobotsPolicy must reject invalid public URLs before any proxy request");
assert.match(webReadSource, /'X-Robots-Txt'\s*:\s*'AuditIA'/,
  "Jina Reader must check robots.txt using the AuditIA user-agent token");
assert.match(webReadSource, /readSiteText\(robotsUrl,\{\},8000,512\*1024\)/,
  "robots.txt is capped at 512 KiB before parsing");
assert.match(webReadSource, /readBytesLimited\(url,\{\},18000,maxBytes\)/,
  "mShots screenshots use streaming byte limits");
assert.doesNotMatch(webReadSource, /const blob=await r\.blob\(\)/,
  "screenshots must not use unbounded blob buffering");

console.log("AuditIA bounded web-read tests passed.");
