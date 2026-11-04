import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = "dewulf.denis@gmail.com";
const ALLOWED_ORIGINS = new Set([
  "https://mansstyle59.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

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
    const limits: Record<string, { max: number; window: number }> = {
      places_searchText: { max: 20, window: 60 },
      places_searchNearby: { max: 20, window: 60 },
      places_autocomplete: { max: 30, window: 60 },
      places_details: { max: 40, window: 60 },
      pagespeed: { max: 4, window: 60 },
    };
    const rule = limits[action];
    if (!rule) return reply(origin, 400, { error: "unsupported_action" });

    const rl = await rateLimit(user.id, action, rule.max, rule.window);
    if (!rl.allowed) {
      return reply(origin, 429, { error: "rate_limit_exceeded", retry_after_seconds: rl.retry_after_seconds },
        { "Retry-After": String(rl.retry_after_seconds) });
    }

    const settings = await getUserSettings(user.id);
    let upstream: Response;
    if (action.startsWith("places_")) {
      const key = safeText(settings.google_places_api_key, 500);
      if (!key) return reply(origin, 424, { error: "google_places_key_not_configured" });
      const headers = new Headers({ "X-Goog-Api-Key": key });
      let url = "https://places.googleapis.com/v1/places:searchText";
      let method = "POST";
      let requestBody: string | undefined;
      if (action === "places_searchText") {
        headers.set("Content-Type", "application/json");
        headers.set("X-Goog-FieldMask", "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.primaryType,places.primaryTypeDisplayName,places.photos,places.regularOpeningHours,places.businessStatus,places.addressComponents");
        requestBody = JSON.stringify({
          textQuery: safeText(body.textQuery, 250),
          languageCode: "fr",
          regionCode: "FR",
          maxResultCount: Math.min(10, Math.max(1, Number(body.maxResultCount) || 5)),
        });
      } else if (action === "places_searchNearby") {
        headers.set("Content-Type", "application/json");
        headers.set("X-Goog-FieldMask", "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.primaryType,places.primaryTypeDisplayName,places.photos,places.regularOpeningHours,places.businessStatus");
        const lat = Number(body.latitude), lng = Number(body.longitude);
        const radius = Math.min(50000, Math.max(100, Number(body.radius) || 5000));
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          return reply(origin, 400, { error: "invalid_coordinates" });
        }
        requestBody = JSON.stringify({
          includedTypes: Array.isArray(body.includedTypes) ? body.includedTypes.filter((x) => typeof x === "string").slice(0, 8) : [],
          maxResultCount: Math.min(20, Math.max(1, Number(body.maxResultCount) || 10)),
          locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
          languageCode: "fr", regionCode: "FR",
        });
        url = "https://places.googleapis.com/v1/places:searchNearby";
      } else if (action === "places_autocomplete") {
        headers.set("Content-Type", "application/json");
        headers.set("X-Goog-FieldMask", "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat");
        requestBody = JSON.stringify({
          input: safeText(body.input, 180), languageCode: "fr", regionCode: "FR",
        });
        url = "https://places.googleapis.com/v1/places:autocomplete";
      } else {
        const placeId = safeText(body.placeId, 300);
        if (!/^[A-Za-z0-9_-]+$/.test(placeId)) return reply(origin, 400, { error: "invalid_place_id" });
        headers.set("X-Goog-FieldMask", "id,displayName,formattedAddress,addressComponents,primaryType,types,nationalPhoneNumber,websiteUri,rating,userRatingCount,businessStatus,location,regularOpeningHours,photos");
        url = "https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId);
        method = "GET";
      }
      upstream = await fetch(url, { method, headers, ...(requestBody ? { body: requestBody } : {}) });
    } else {
      const key = safeText(settings.pagespeed_api_key, 500);
      if (!key) return reply(origin, 424, { error: "pagespeed_key_not_configured" });
      const target = safeText(body.url, 2048);
      if (!validPublicUrl(target)) return reply(origin, 400, { error: "invalid_target_url" });
      const u = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
      u.searchParams.set("url", target);
      u.searchParams.set("key", key);
      const strategy = body.strategy === "desktop" ? "desktop" : "mobile";
      u.searchParams.set("strategy", strategy);
      const categories = Array.isArray(body.categories) ? body.categories : ["performance", "accessibility", "best-practices", "seo"];
      for (const cat of categories.slice(0, 4)) {
        if (["performance", "accessibility", "best-practices", "seo"].includes(String(cat))) u.searchParams.append("category", String(cat));
      }
      upstream = await fetch(u.toString(), { signal: AbortSignal.timeout(55_000) });
    }

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "X-AuditIA-RateLimit-Limit": String(rule.max),
        "X-AuditIA-RateLimit-Remaining": String(Math.max(0, rule.max - rl.current_count)),
      },
    });
  } catch (error) {
    console.error("auditia-secure-api error", error instanceof Error ? error.message : "unknown");
    return reply(origin, 503, { error: "secure_api_unavailable", message: "Service temporairement indisponible. Réessayez." });
  }
});
