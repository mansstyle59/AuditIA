import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// AuditIA — fonction serveur « auditia-secure-api » : seul point d'accès aux API Google (Places, PageSpeed).
// Les clés ne sont jamais envoyées au navigateur. Elles sont lues dans les secrets de la fonction
// (GOOGLE_PLACES_API_KEY, PAGESPEED_API_KEY) ; repli sur app_settings tant que ces colonnes existent.
// Contrat : POST { action, ... } → réponse brute de Google (forme inchangée) ; erreur → { error: code }.
// Accès réservé à l'administrateur (jeton Supabase vérifié dans la fonction), origines autorisées uniquement.

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = "dewulf.denis@gmail.com";
const ALLOWED_ORIGINS = new Set([
  "https://mansstyle59.github.io",
  "https://auditia-apercu-temporaire.vercel.app",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const PLACES_BASE = "https://places.googleapis.com/v1/";
const PAGESPEED_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

// Masques de champs demandés à Google : identiques à ceux de l'ancienne interface (même facturation).
const MASKS: Record<string, string> = {
  list: "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.primaryType,places.types,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.regularOpeningHours",
  competitors: "places.id,places.displayName,places.rating,places.userRatingCount,places.websiteUri,places.primaryTypeDisplayName,places.businessStatus,places.googleMapsUri",
  minimal: "places.id,places.displayName,places.formattedAddress",
};
const DETAIL_MASK = "id,displayName,formattedAddress,addressComponents,primaryType,types,nationalPhoneNumber,websiteUri,rating,userRatingCount,businessStatus,regularOpeningHours,editorialSummary,photos";
const AUTOCOMPLETE_MASK = "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat";
const PAGESPEED_CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

// Quotas par utilisateur et par action (fenêtre en secondes).
const LIMITS: Record<string, { max: number; window: number }> = {
  places_searchText: { max: 20, window: 60 },
  places_searchNearby: { max: 20, window: 60 },
  places_autocomplete: { max: 30, window: 60 },
  places_details: { max: 40, window: 60 },
  pagespeed: { max: 4, window: 60 },
};

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://mansstyle59.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
});

function reply(origin: string | null, status: number, payload: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders(origin), ...extra } });
}
function safeText(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : fallback;
}
function envValue(name: string): string {
  return safeText(Deno.env.get(name), 500);
}
function validPublicUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return (u.protocol === "https:" || u.protocol === "http:") &&
      !["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(u.hostname) &&
      !u.hostname.endsWith(".local") && !u.hostname.endsWith(".internal");
  } catch { return false; }
}
async function serviceFetch(path: string, init: RequestInit = {}) {
  return fetch(`${PROJECT_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}
async function rateLimit(userId: string, action: string, limit: number, windowSeconds: number) {
  const response = await serviceFetch("rpc/auditia_consume_rate_limit", {
    method: "POST",
    body: JSON.stringify({
      p_bucket_key: `${userId}:${action}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    }),
  });
  if (!response.ok) throw new Error("Rate limiter unavailable");
  const result = await response.json();
  const row = Array.isArray(result) ? result[0] : result;
  return row as { allowed: boolean; current_count: number; retry_after_seconds: number };
}
async function getUserSettings(userId: string) {
  const query = new URLSearchParams({
    select: "google_places_api_key,pagespeed_api_key",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  const response = await serviceFetch(`app_settings?${query.toString()}`);
  if (!response.ok) throw new Error("Could not load server-side API settings");
  const rows = await response.json();
  return rows?.[0] || {};
}
// Relaie la réponse de Google telle quelle, avec les en-têtes de quota.
async function passthrough(upstream: Response, origin: string | null, max: number, used: number): Promise<Response> {
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "X-AuditIA-RateLimit-Limit": String(max),
      "X-AuditIA-RateLimit-Remaining": String(Math.max(0, max - used)),
    },
  });
}

async function handlePlaces(
  action: string, body: Record<string, unknown>, key: string,
  origin: string | null, rule: { max: number }, used: number,
): Promise<Response> {
  const headers = new Headers({ "X-Goog-Api-Key": key, "Content-Type": "application/json" });
  let url: string;
  let method = "POST";
  let payload: string | undefined;

  if (action === "places_searchText") {
    const textQuery = safeText(body.textQuery, 250);
    if (!textQuery) return reply(origin, 400, { error: "invalid_query" });
    const mask = MASKS[safeText(body.mask, 20) || "list"];
    if (!mask) return reply(origin, 400, { error: "invalid_mask" });
    const req: Record<string, unknown> = {
      textQuery, languageCode: "fr", regionCode: "FR",
      maxResultCount: clampInt(body.maxResultCount, 1, 20, 20),
    };
    const includedType = safeText(body.includedType, 60);
    if (includedType) req.includedType = includedType;
    headers.set("X-Goog-FieldMask", mask);
    url = PLACES_BASE + "places:searchText";
    payload = JSON.stringify(req);
  } else if (action === "places_searchNearby") {
    const lat = Number(body.latitude), lng = Number(body.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return reply(origin, 400, { error: "invalid_coordinates" });
    }
    const types = Array.isArray(body.includedTypes)
      ? body.includedTypes.filter((x): x is string => typeof x === "string").slice(0, 20)
      : [];
    headers.set("X-Goog-FieldMask", MASKS.list);
    url = PLACES_BASE + "places:searchNearby";
    payload = JSON.stringify({
      includedTypes: types,
      maxResultCount: clampInt(body.maxResultCount, 1, 20, 20),
      rankPreference: "DISTANCE",
      languageCode: "fr", regionCode: "FR",
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: clampInt(body.radius, 100, 50000, 5000) },
      },
    });
  } else if (action === "places_autocomplete") {
    const input = safeText(body.input, 180);
    if (!input) return reply(origin, 400, { error: "invalid_input" });
    headers.set("X-Goog-FieldMask", AUTOCOMPLETE_MASK);
    url = PLACES_BASE + "places:autocomplete";
    payload = JSON.stringify({ input, languageCode: "fr", regionCode: "FR" });
  } else {
    const placeId = safeText(body.placeId, 300);
    if (!/^[A-Za-z0-9_-]+$/.test(placeId)) return reply(origin, 400, { error: "invalid_place_id" });
    headers.set("X-Goog-FieldMask", body.mask === "photos" ? "photos" : DETAIL_MASK);
    url = PLACES_BASE + "places/" + encodeURIComponent(placeId);
    method = "GET";
  }

  const upstream = await fetch(url, { method, headers, body: payload, signal: AbortSignal.timeout(20000) });
  return passthrough(upstream, origin, rule.max, used);
}

async function handlePagespeed(
  body: Record<string, unknown>, key: string,
  origin: string | null, rule: { max: number }, used: number,
): Promise<Response> {
  const target = safeText(body.url, 2048);
  if (!validPublicUrl(target)) return reply(origin, 400, { error: "invalid_target_url" });
  const u = new URL(PAGESPEED_URL);
  u.searchParams.set("url", target);
  u.searchParams.set("key", key);
  u.searchParams.set("strategy", body.strategy === "desktop" ? "desktop" : "mobile");
  PAGESPEED_CATEGORIES.forEach((c) => u.searchParams.append("category", c));
  u.searchParams.set("locale", "fr");
  const upstream = await fetch(u.toString(), { signal: AbortSignal.timeout(55000) });
  return passthrough(upstream, origin, rule.max, used);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return reply(origin, 405, { error: "method_not_allowed" }, { Allow: "POST, OPTIONS" });
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return reply(origin, 403, { error: "origin_not_allowed" });

  const authorization = req.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization) return reply(origin, 401, { error: "authentication_required" });

  try {
    const userResponse = await fetch(`${PROJECT_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!userResponse.ok) return reply(origin, 401, { error: "invalid_session" });
    const user = await userResponse.json();
    if (!user?.id || safeText(user.email, 254).toLowerCase() !== ADMIN_EMAIL) {
      return reply(origin, 403, { error: "not_authorized" });
    }

    const raw = await req.text();
    if (raw.length > 24_000) return reply(origin, 413, { error: "request_too_large" });
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw); } catch { return reply(origin, 400, { error: "invalid_json" }); }
    const action = safeText(body.action, 40);
    const rule = LIMITS[action];
    if (!rule) return reply(origin, 400, { error: "unsupported_action" });

    const rl = await rateLimit(user.id, action, rule.max, rule.window);
    if (!rl.allowed) {
      return reply(origin, 429, { error: "rate_limit_exceeded", retry_after_seconds: rl.retry_after_seconds },
        { "Retry-After": String(rl.retry_after_seconds) });
    }

    // Secrets de fonction d'abord ; app_settings seulement en repli (à supprimer après migration).
    const settings = await getUserSettings(user.id);
    if (action.startsWith("places_")) {
      const key = envValue("GOOGLE_PLACES_API_KEY") || safeText(settings.google_places_api_key, 500);
      if (!key) return reply(origin, 424, { error: "google_places_key_not_configured" });
      return handlePlaces(action, body, key, origin, rule, rl.current_count);
    }
    const key = envValue("PAGESPEED_API_KEY") || safeText(settings.pagespeed_api_key, 500);
    if (!key) return reply(origin, 424, { error: "pagespeed_key_not_configured" });
    return handlePagespeed(body, key, origin, rule, rl.current_count);
  } catch (error) {
    console.error("auditia-secure-api error", error instanceof Error ? error.message : "unknown");
    return reply(origin, 503, { error: "secure_api_unavailable", message: "Service temporairement indisponible. Réessayez." });
  }
});
