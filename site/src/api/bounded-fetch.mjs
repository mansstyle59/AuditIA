/* AuditIA — lecture HTTP bornée : timeout et plafond de taille appliqués au flux,
   avant accumulation en mémoire. Utilitaire pur testable avec fetch injecté. */
export async function readTextLimited(url, opts = {}, timeoutMs = 40000, maxBytes = 5 * 1024 * 1024, fetchImpl = globalThis.fetch) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RangeError("maxBytes invalide");
  if (typeof fetchImpl !== "function") throw new TypeError("fetch indisponible");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 40000);
  let reader = null;

  const tooLarge = () => {
    const error = new Error("Réponse HTTP trop volumineuse");
    error.code = "response_too_large";
    return error;
  };

  try {
    const response = await fetchImpl(url, { ...(opts || {}), signal: controller.signal });
    if (!response.ok) {
      const error = new Error("HTTP " + response.status);
      error.status = response.status;
      throw error;
    }

    const declaredLength = response.headers?.get?.("content-length");
    if (declaredLength != null && declaredLength.trim() !== "") {
      const length = Number(declaredLength);
      if (Number.isFinite(length) && length > maxBytes) {
        controller.abort();
        throw tooLarge();
      }
    }

    if (!response.body || typeof response.body.getReader !== "function") {
      const text = await response.text();
      if (new TextEncoder().encode(text).byteLength > maxBytes) throw tooLarge();
      return text;
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
        throw tooLarge();
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder("utf-8").decode(bytes);
  } finally {
    clearTimeout(timer);
    try { reader?.releaseLock(); } catch {}
  }
}
