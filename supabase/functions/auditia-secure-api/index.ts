import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// AuditIA — auditia-secure-api, VERSION 2.
// Seul point d'accès serveur aux API Google (Places API New, PageSpeed Insights).
// - Clés : uniquement dans les secrets de la fonction (GOOGLE_PLACES_API_KEY, PAGESPEED_API_KEY).
//   Aucune lecture de app_settings, aucun repli. Une clé n'est jamais renvoyée ni journalisée.
// - Accès : jeton utilisateur vérifié auprès d'Auth, e-mail confirmé, administrateur uniquement.
// - Entrées : action en liste blanche, champs bornés, Content-Type JSON obligatoire.
// - Quotas : par minute et par jour, par utilisateur et par action (table existante via la RPC de limitation).

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = "dewulf.denis@gmail.com";
const GOOGLE_PLACES_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") || "";
const PAGESPEED_KEY = Deno.env.get("PAGESPEED_API_KEY") || "";

// Origines autorisées : production GitHub Pages, aperçu Vercel stable. Les origines de développement
// ne sont acceptées que si elles sont listées dans la variable ALLOWED_ORIGINS_DEV (absente en production).
const ALLOWED_ORIGINS = new Set<string>([
  "https://mansstyle59.github.io",
  "https://auditia-apercu-temporaire.vercel.app",
  ...(Deno.env.get("ALLOWED_ORIGINS_DEV") || "").split(",").map((s) => s.trim()).filter(Boolean),
]);

const PLACES_BASE = "https://places.googleapis.com/v1/";
const PAGESPEED_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const BRAVE_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY") || "";
const SITE_TIMEOUT_MS = 12_000;
const SITE_MAX_BYTES = 1_500_000;
const SITE_MAX_REDIRECTS = 3;
const UPSTREAM_TIMEOUT_MS = 20_000;
const PAGESPEED_TIMEOUT_MS = 55_000;
const MAX_BODY_CHARS = 24_000;

// Masques de champs : identiques à ceux de l'ancienne et de la nouvelle interface (même facturation).
const MASKS: Record<string, string> = {
  list: "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.primaryType,places.types,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.regularOpeningHours",
  competitors: "places.id,places.displayName,places.rating,places.userRatingCount,places.websiteUri,places.primaryTypeDisplayName,places.businessStatus,places.googleMapsUri",
  minimal: "places.id,places.displayName,places.formattedAddress",
};
const DETAIL_MASK = "id,displayName,formattedAddress,addressComponents,primaryType,types,nationalPhoneNumber,websiteUri,rating,userRatingCount,businessStatus,regularOpeningHours,editorialSummary,photos";
const AUTOCOMPLETE_MASK = "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat";
const PAGESPEED_CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

// Quotas : minute (fenêtre courte, anti-rafale) et jour (plafond de coût). Valeurs à ajuster après observation.
const LIMITS: Record<string, { perMinute: number; perDay: number }> = {
  places_searchText: { perMinute: 20, perDay: 300 },
  places_searchNearby: { perMinute: 10, perDay: 150 },
  places_autocomplete: { perMinute: 30, perDay: 1500 },
  places_details: { perMinute: 30, perDay: 400 },
  pagespeed: { perMinute: 4, perDay: 40 },
  site_read: { perMinute: 60, perDay: 1500 },
  web_search: { perMinute: 20, perDay: 400 },
};

// Messages d'erreur stables, sans détail interne. Le client les affiche tels quels.
const ERRORS: Record<string, [number, string]> = {
  method_not_allowed: [405, "Méthode non autorisée."],
  origin_not_allowed: [403, "Origine non autorisée."],
  authentication_required: [401, "Connexion requise."],
  invalid_session: [401, "Session expirée. Reconnectez-vous."],
  email_not_confirmed: [403, "Adresse e-mail non confirmée."],
  not_authorized: [403, "Accès refusé."],
  unsupported_media_type: [415, "Type de contenu non pris en charge."],
  request_too_large: [413, "Requête trop volumineuse."],
  invalid_json: [400, "Requête invalide."],
  unsupported_action: [400, "Action non prise en charge."],
  invalid_query: [400, "Recherche vide."],
  invalid_mask: [400, "Demande non prise en charge."],
  invalid_coordinates: [400, "Position invalide."],
  invalid_input: [400, "Saisie vide."],
  invalid_place_id: [400, "Identifiant de lieu invalide."],
  invalid_target_url: [400, "Adresse de site non analysable."],
  google_places_key_not_configured: [424, "La clé Google Places n’est pas configurée côté serveur."],
  pagespeed_key_not_configured: [424, "La clé PageSpeed n’est pas configurée côté serveur."],
  search_key_not_configured: [424, "La clé de recherche web n’est pas configurée côté serveur."],
  site_unreadable: [502, "Site inaccessible ou illisible."],
  search_unavailable: [502, "Recherche web indisponible."],
  rate_limit_exceeded: [429, "Trop de requêtes. Patientez une minute."],
  daily_quota_exceeded: [429, "Quota journalier atteint. Réessayez demain."],
  secure_api_unavailable: [503, "Service temporairement indisponible. Réessayez."],
};

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://mansstyle59.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "600",
  "Vary": "Origin",
  "Cache-Control": "no-store",
});

function reply(origin: string | null, code: string, extra: Record<string, string> = {}, payload: Record<string, unknown> = {}) {
  const [status, message] = ERRORS[code] || [500, "Erreur interne."];
  return new Response(JSON.stringify({ error: code, message, ...payload }), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8", ...extra },
  });
}
function safeText(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : fallback;
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
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

const API_SETTING_COLUMNS = [
  "google_places_api_key", "pagespeed_api_key", "google_maps_api_key",
  "bing_webmaster_api_key", "openai_api_key", "logo_dev_publishable_key",
  "search_console_property", "google_business_profile_url", "integrations_notes",
];
const API_SECRET_COLUMNS: Record<string, number> = {
  google_places_api_key: 500,
  pagespeed_api_key: 500,
  google_maps_api_key: 500,
  bing_webmaster_api_key: 500,
  openai_api_key: 500,
  logo_dev_publishable_key: 250,
};
const API_TEXT_COLUMNS: Record<string, number> = {
  search_console_property: 300,
  google_business_profile_url: 2048,
  integrations_notes: 3000,
};

async function getAdminSettingsRow(userId: string): Promise<Record<string, unknown>> {
  const columns = API_SETTING_COLUMNS.join(",");
  const query = `app_settings?select=${encodeURIComponent(columns)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`;
  const response = await serviceFetch(query);
  if (!response.ok) throw new Error("settings read unavailable");
  const rows = await response.json();
  return Array.isArray(rows) && rows[0] ? rows[0] as Record<string, unknown> : {};
}

function apiKeyStatus(row: Record<string, unknown>, column: string, envName = "") {
  const stored = safeText(row[column], 500);
  const env = envName ? safeText(Deno.env.get(envName), 500) : "";
  const configured = !!stored || !!env;
  const source = stored ? "Réglages sécurisés" : env ? "Secret serveur" : "Non configurée";
  const hint = stored
    ? (stored.length >= 12 ? "••••" + stored.slice(-4) : "••••••••")
    : env ? "••••••••" : "";
  return { configured, stored: !!stored, server: !!env, source, hint };
}

function settingsPayload(row: Record<string, unknown>) {
  return {
    keys: {
      google_places_api_key: apiKeyStatus(row, "google_places_api_key", "GOOGLE_PLACES_API_KEY"),
      pagespeed_api_key: apiKeyStatus(row, "pagespeed_api_key", "PAGESPEED_API_KEY"),
      google_maps_api_key: apiKeyStatus(row, "google_maps_api_key"),
      bing_webmaster_api_key: apiKeyStatus(row, "bing_webmaster_api_key"),
      openai_api_key: apiKeyStatus(row, "openai_api_key"),
      logo_dev_publishable_key: apiKeyStatus(row, "logo_dev_publishable_key"),
    },
    other: {
      search_console_property: safeText(row.search_console_property, 300),
      google_business_profile_url: safeText(row.google_business_profile_url, 2048),
      integrations_notes: safeText(row.integrations_notes, 3000),
    },
  };
}

async function handleSettings(action: string, body: Record<string, unknown>, userId: string, origin: string | null): Promise<Response> {
  if (action === "settings_read") {
    const row = await getAdminSettingsRow(userId);
    return new Response(JSON.stringify({ ok: true, ...settingsPayload(row) }), {
      status: 200,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const input = body.values;
  if (!input || typeof input !== "object" || Array.isArray(input)) return reply(origin, "invalid_json");
  const values = input as Record<string, unknown>;
  const update: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };

  for (const [column, max] of Object.entries(API_SECRET_COLUMNS)) {
    if (!Object.prototype.hasOwnProperty.call(values, column)) continue;
    const raw = values[column];
    if (typeof raw !== "string" || raw.length > max || /[\\u0000-\\u001F]/.test(raw)) return reply(origin, "invalid_json");
    update[column] = raw.trim();
  }
  for (const [column, max] of Object.entries(API_TEXT_COLUMNS)) {
    if (!Object.prototype.hasOwnProperty.call(values, column)) continue;
    const raw = values[column];
    if (typeof raw !== "string" || raw.length > max || /[\\u0000]/.test(raw)) return reply(origin, "invalid_json");
    const clean = raw.trim();
    if (column === "google_business_profile_url" && clean && !validPublicUrl(clean)) return reply(origin, "invalid_target_url");
    update[column] = clean;
  }

  if (Object.keys(update).length <= 2) return reply(origin, "invalid_json");
  const response = await serviceFetch("app_settings?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(update),
  });
  if (!response.ok) throw new Error("settings save unavailable");
  // Une clé enregistrée dans Réglages devient prioritaire sur le secret de secours de la fonction.
  const row = await getAdminSettingsRow(userId);
  return new Response(JSON.stringify({ ok: true, ...settingsPayload(row) }), {
    status: 200,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Compteur atomique (RPC existante, réservée au service_role). Échec = refus (fermé).
async function consume(bucket: string, limit: number, windowSeconds: number) {
  const response = await serviceFetch("rpc/auditia_consume_rate_limit", {
    method: "POST",
    body: JSON.stringify({ p_bucket_key: bucket, p_limit: limit, p_window_seconds: windowSeconds }),
  });
  if (!response.ok) throw new Error("rate limiter unavailable");
  const result = await response.json();
  const row = Array.isArray(result) ? result[0] : result;
  return row as { allowed: boolean; current_count: number; retry_after_seconds: number };
}

// Valide la requête AVANT toute consommation de quota. Retourne les champs normalisés pour l'appel amont.
// Lecture d'un site côté serveur (remplace les relais tiers). Refus des adresses internes, redirections contrôlées.
function isPublicHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (!h.includes(".") || h.includes(":")) return false; // pas de nom court, pas d'IPv6 littérale
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return false;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return false;
  }
  return true;
}

async function readLimited(res: Response, max: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < max) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  const merged = new Uint8Array(Math.min(total, max));
  let offset = 0;
  for (const c of chunks) {
    const room = merged.byteLength - offset;
    if (room <= 0) break;
    const part = c.subarray(0, Math.min(c.byteLength, room));
    merged.set(part, offset);
    offset += part.byteLength;
  }
  return new TextDecoder("utf-8").decode(merged.subarray(0, offset));
}

async function readSitePage(start: URL): Promise<{ status: number; finalUrl: string; contentType: string; body: string } | null> {
  let current = start;
  for (let hop = 0; hop <= SITE_MAX_REDIRECTS; hop++) {
    if (!isPublicHost(current.hostname)) return null;
    const res = await fetch(current.toString(), {
      redirect: "manual",
      headers: { "User-Agent": "AuditIA-Reader/1.0", Accept: "text/html,text/plain,application/xml;q=0.9,*/*;q=0.5" },
      signal: AbortSignal.timeout(SITE_TIMEOUT_MS),
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.body?.cancel().catch(() => {});
      if (!location) return null;
      current = new URL(location, current);
      if (!/^https?:$/.test(current.protocol)) return null;
      continue;
    }
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (contentType && !/text\/|xml|json/.test(contentType)) {
      await res.body?.cancel().catch(() => {});
      return null;
    }
    const body = await readLimited(res, SITE_MAX_BYTES);
    return { status: res.status, finalUrl: current.toString(), contentType, body };
  }
  return null;
}

function validateSiteRead(body: Record<string, unknown>, origin: string | null): { ok: true; key: string; fields: Record<string, unknown> } | { ok: false; res: Response } {
  let site: URL;
  try { site = new URL(safeText(body.url, 2000)); } catch { return { ok: false, res: reply(origin, "invalid_target_url") }; }
  if (!/^https?:$/.test(site.protocol) || !isPublicHost(site.hostname)) return { ok: false, res: reply(origin, "invalid_target_url") };
  const path = safeText(body.path, 200) || "/";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return { ok: false, res: reply(origin, "invalid_target_url") };
  return { ok: true, key: "site", fields: { origin: site.origin, path } };
}

function validateWebSearch(body: Record<string, unknown>, origin: string | null): { ok: true; key: string; fields: Record<string, unknown> } | { ok: false; res: Response } {
  const query = safeText(body.query, 200);
  if (!query) return { ok: false, res: reply(origin, "invalid_query") };
  return { ok: true, key: "brave", fields: { query } };
}

async function handleSiteRead(f: Record<string, unknown>, origin: string | null): Promise<Response> {
  const target = new URL(f.path as string, f.origin as string);
  const page = await readSitePage(target);
  if (!page) return reply(origin, "site_unreadable");
  return new Response(JSON.stringify(page), {
    status: 200,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

async function handleWebSearch(f: Record<string, unknown>, origin: string | null): Promise<Response> {
  if (!BRAVE_KEY) return reply(origin, "search_key_not_configured");
  const u = new URL(BRAVE_SEARCH_URL);
  u.searchParams.set("q", f.query as string);
  u.searchParams.set("count", "10");
  u.searchParams.set("country", "fr");
  u.searchParams.set("search_lang", "fr");
  const r = await fetch(u.toString(), {
    headers: { Accept: "application/json", "X-Subscription-Token": BRAVE_KEY },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!r.ok) return reply(origin, "search_unavailable");
  const j = await r.json().catch(() => null);
  const raw = Array.isArray(j?.web?.results) ? j.web.results : [];
  const results = raw
    .map((x: Record<string, unknown>) => ({ title: safeText(x.title, 240), url: safeText(x.url, 500), snippet: safeText(x.description, 500) }))
    .filter((x: { url: string }) => /^https?:\/\//.test(x.url));
  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

function validate(action: string, body: Record<string, unknown>, origin: string | null, apiKeys: { places: string; pagespeed: string }): { ok: true; key: string; fields: Record<string, unknown> } | { ok: false; res: Response } {
  if (action === "places_searchText") {
    const textQuery = safeText(body.textQuery, 250);
    if (!textQuery) return { ok: false, res: reply(origin, "invalid_query") };
    const maskName = safeText(body.mask, 20) || "list";
    if (!MASKS[maskName]) return { ok: false, res: reply(origin, "invalid_mask") };
    const includedType = safeText(body.includedType, 60);
    return { ok: true, key: apiKeys.places, fields: { textQuery, mask: MASKS[maskName], includedType, maxResultCount: clampInt(body.maxResultCount, 1, 20, 20) } };
  }
  if (action === "places_searchNearby") {
    const lat = Number(body.latitude), lng = Number(body.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { ok: false, res: reply(origin, "invalid_coordinates") };
    const types = Array.isArray(body.includedTypes) ? body.includedTypes.filter((x): x is string => typeof x === "string" && x.length <= 60).slice(0, 20) : [];
    return { ok: true, key: apiKeys.places, fields: { lat, lng, types, radius: clampInt(body.radius, 100, 50000, 5000), maxResultCount: clampInt(body.maxResultCount, 1, 20, 20) } };
  }
  if (action === "places_autocomplete") {
    const input = safeText(body.input, 180);
    if (!input) return { ok: false, res: reply(origin, "invalid_input") };
    return { ok: true, key: apiKeys.places, fields: { input } };
  }
  if (action === "places_details") {
    const placeId = safeText(body.placeId, 300);
    if (!/^[A-Za-z0-9_-]+$/.test(placeId)) return { ok: false, res: reply(origin, "invalid_place_id") };
    return { ok: true, key: apiKeys.places, fields: { placeId, mask: body.mask === "photos" ? "photos" : DETAIL_MASK } };
  }
  // pagespeed
  const target = safeText(body.url, 2048);
  if (!validPublicUrl(target)) return { ok: false, res: reply(origin, "invalid_target_url") };
  return { ok: true, key: apiKeys.pagespeed, fields: { target, strategy: body.strategy === "desktop" ? "desktop" : "mobile" } };
}

// Appel amont. La clé n'apparaît que dans l'en-tête ou l'URL de cet appel, jamais dans une réponse ou un journal.
async function callUpstream(action: string, f: Record<string, unknown>, key: string): Promise<Response> {
  if (action === "places_searchText") {
    const req: Record<string, unknown> = { textQuery: f.textQuery, languageCode: "fr", regionCode: "FR", maxResultCount: f.maxResultCount };
    if (f.includedType) req.includedType = f.includedType;
    return fetch(PLACES_BASE + "places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": f.mask as string },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  }
  if (action === "places_searchNearby") {
    return fetch(PLACES_BASE + "places:searchNearby", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": MASKS.list },
      body: JSON.stringify({
        includedTypes: f.types, maxResultCount: f.maxResultCount, rankPreference: "DISTANCE", languageCode: "fr", regionCode: "FR",
        locationRestriction: { circle: { center: { latitude: f.lat, longitude: f.lng }, radius: f.radius } },
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  }
  if (action === "places_autocomplete") {
    return fetch(PLACES_BASE + "places:autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": AUTOCOMPLETE_MASK },
      body: JSON.stringify({ input: f.input, languageCode: "fr", regionCode: "FR" }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  }
  if (action === "places_details") {
    return fetch(PLACES_BASE + "places/" + encodeURIComponent(f.placeId as string), {
      method: "GET",
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": f.mask as string },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  }
  const u = new URL(PAGESPEED_URL);
  u.searchParams.set("url", f.target as string);
  u.searchParams.set("key", key);
  u.searchParams.set("strategy", f.strategy as string);
  PAGESPEED_CATEGORIES.forEach((c) => u.searchParams.append("category", c));
  u.searchParams.set("locale", "fr");
  return fetch(u.toString(), { signal: AbortSignal.timeout(PAGESPEED_TIMEOUT_MS) });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return reply(origin, "method_not_allowed", { Allow: "POST, OPTIONS" });
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return reply(origin, "origin_not_allowed");

  const authorization = req.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization) return reply(origin, "authentication_required");

  try {
    // Vérification réelle du jeton auprès d'Auth (signature, expiration, révocation).
    const userResponse = await fetch(`${PROJECT_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!userResponse.ok) return reply(origin, "invalid_session");
    const user = await userResponse.json();
    if (!user?.id) return reply(origin, "invalid_session");
    if (!user.email_confirmed_at && !user.confirmed_at) return reply(origin, "email_not_confirmed");
    if (safeText(user.email, 254).toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return reply(origin, "not_authorized");

    if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return reply(origin, "unsupported_media_type");
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) return reply(origin, "request_too_large");
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw); } catch { return reply(origin, "invalid_json"); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply(origin, "invalid_json");

    const action = safeText(body.action, 40);
    if (action === "settings_read" || action === "settings_save") {
      return await handleSettings(action, body, user.id, origin);
    }
    const limits = LIMITS[action];
    if (!limits) return reply(origin, "unsupported_action");

    if (action === "site_read" || action === "web_search") {
      const v2 = action === "site_read" ? validateSiteRead(body, origin) : validateWebSearch(body, origin);
      if (!v2.ok) return v2.res;
      const minute = await consume(`${user.id}:${action}:min`, limits.perMinute, 60);
      if (!minute.allowed) {
        return reply(origin, "rate_limit_exceeded", { "Retry-After": String(minute.retry_after_seconds) }, { retry_after_seconds: minute.retry_after_seconds });
      }
      const day = await consume(`${user.id}:${action}:day`, limits.perDay, 86400);
      if (!day.allowed) {
        return reply(origin, "daily_quota_exceeded", { "Retry-After": String(day.retry_after_seconds) }, { retry_after_seconds: day.retry_after_seconds });
      }
      return action === "site_read" ? await handleSiteRead(v2.fields, origin) : await handleWebSearch(v2.fields, origin);
    }

    // Validation complète AVANT consommation de quota : une requête invalide ne consomme rien.
    const settingsRow = await getAdminSettingsRow(user.id);
    const apiKeys = {
      places: safeText(settingsRow.google_places_api_key, 500) || GOOGLE_PLACES_KEY,
      pagespeed: safeText(settingsRow.pagespeed_api_key, 500) || PAGESPEED_KEY,
    };
    const v = validate(action, body, origin, apiKeys);
    if (!v.ok) return v.res;
    if (!v.key) return reply(origin, action.startsWith("places_") ? "google_places_key_not_configured" : "pagespeed_key_not_configured");

    const minute = await consume(`${user.id}:${action}:min`, limits.perMinute, 60);
    if (!minute.allowed) {
      return reply(origin, "rate_limit_exceeded", { "Retry-After": String(minute.retry_after_seconds) }, { retry_after_seconds: minute.retry_after_seconds });
    }
    const day = await consume(`${user.id}:${action}:day`, limits.perDay, 86400);
    if (!day.allowed) {
      return reply(origin, "daily_quota_exceeded", { "Retry-After": String(day.retry_after_seconds) }, { retry_after_seconds: day.retry_after_seconds });
    }

    const upstream = await callUpstream(action, v.fields, v.key);
    // Filet de sécurité : si Google renvoyait la clé dans sa réponse, elle serait masquée avant envoi.
    const text = (await upstream.text()).split(v.key).join("[masqué]");
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "X-AuditIA-RateLimit-Limit": String(limits.perMinute),
        "X-AuditIA-RateLimit-Remaining": String(Math.max(0, limits.perMinute - minute.current_count)),
      },
    });
  } catch (error) {
    // Journal sans détail sensible : jamais de clé, jamais de corps de requête.
    console.error("auditia-secure-api", error instanceof Error ? error.name : "error");
    return reply(origin, "secure_api_unavailable");
  }
});
