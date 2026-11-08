/* AuditIA — lecture HTTP bornée : timeout et plafond de taille appliqués au flux,
   avant accumulation en mémoire. Utilitaire pur testable avec fetch injecté. */

function tooLargeError() {
  const error = new Error("Réponse HTTP trop volumineuse");
  error.code = "response_too_large";
  return error;
}

export async function readBytesLimited(
  url,
  opts = {},
  timeoutMs = 40000,
  maxBytes = 5 * 1024 * 1024,
  fetchImpl = globalThis.fetch
) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new RangeError("maxBytes invalide");
  }
  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetch indisponible");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 40000);
  let reader = null;

  try {
    const response = await fetchImpl(url, { ...(opts || {}), signal: controller.signal });
    if (!response.ok) {
      const error = new Error("HTTP " + response.status);
      error.status = response.status;
      throw error;
    }

    const contentType = (response.headers?.get?.("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const declaredLength = response.headers?.get?.("content-length");
    if (declaredLength != null && declaredLength.trim() !== "") {
      const length = Number(declaredLength);
      if (Number.isFinite(length) && length >= 0 && length > maxBytes) {
        controller.abort();
        throw tooLargeError();
      }
    }

    if (!response.body || typeof response.body.getReader !== "function") {
      // Ne pas appeler text()/blob()/arrayBuffer() ici : ils accumulent la réponse
      // complète avant de permettre le contrôle de taille.
      if (response.status === 204 || response.status === 205 || declaredLength === "0") {
        return { bytes: new Uint8Array(0), contentType };
      }
      const error = new Error("Flux HTTP non disponible ; réponse refusée par prudence");
      error.code = "response_stream_unavailable";
      throw error;
    }

    reader = response.body.getReader();
    const chunks = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch {}
        controller.abort();
        throw tooLargeError();
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { bytes, contentType };
  } finally {
    clearTimeout(timer);
    try { reader?.releaseLock(); } catch {}
  }
}

export async function readTextLimited(
  url,
  opts = {},
  timeoutMs = 40000,
  maxBytes = 5 * 1024 * 1024,
  fetchImpl = globalThis.fetch
) {
  const { bytes } = await readBytesLimited(url, opts, timeoutMs, maxBytes, fetchImpl);
  return new TextDecoder("utf-8").decode(bytes);
}
