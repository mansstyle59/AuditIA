// AuditIA — rédaction assistée par Claude (proxy serveur sécurisé).
// La clé API Anthropic reste dans les secrets Supabase : elle n'est jamais envoyée au navigateur.
// Accès réservé au compte administrateur, avec quota quotidien appliqué de façon atomique.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://mansstyle59.github.io";
const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MAX_PROMPT = 12000;
const MAX_SYSTEM = 2000;
const MAX_TOKENS_CAP = 1200;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Méthode non autorisée." });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5";
  const limit = Math.max(1, Number(Deno.env.get("AI_DAILY_LIMIT") ?? "30"));
  const adminEmail = (Deno.env.get("ADMIN_EMAIL") ?? "").trim().toLowerCase();

  // 1) Authentification : le JWT de l'utilisateur doit être valide
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json(401, { error: "Connexion requise." });
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "Session expirée. Reconnecte-toi." });
  const user = userData.user;

  // 2) Autorisation : compte administrateur uniquement
  if (!adminEmail || (user.email ?? "").toLowerCase() !== adminEmail) {
    return json(403, { error: "Accès réservé au compte administrateur." });
  }
  if (!apiKey) return json(503, { error: "Assistant IA non configuré (clé API manquante côté serveur)." });

  // 3) Données : taille bornée
  let body: { prompt?: unknown; system?: unknown; maxTokens?: unknown };
  try { body = await req.json(); } catch { return json(400, { error: "Requête invalide." }); }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const system = typeof body.system === "string" ? body.system.slice(0, MAX_SYSTEM) : undefined;
  if (!prompt) return json(400, { error: "Consigne vide." });
  if (prompt.length > MAX_PROMPT) return json(413, { error: "Texte trop long pour une seule demande." });
  const maxTokens = Math.min(MAX_TOKENS_CAP, Math.max(64, Number(body.maxTokens) || 800));

  // 4) Quota quotidien, réservé atomiquement avant l'appel
  const svc = createClient(url, service, { auth: { persistSession: false } });
  const day = new Date().toISOString().slice(0, 10);
  const { data: used, error: quotaErr } = await svc.rpc("ai_reserve_request", {
    p_user: user.id, p_day: day, p_limit: limit,
  });
  if (quotaErr) return json(500, { error: "Quota indisponible. Réessaie plus tard." });
  if (used === null || used === undefined) {
    return json(429, { error: `Quota quotidien atteint (${limit} demandes par jour). Réessaie demain.`, limit, remaining: 0 });
  }
  const remaining = Math.max(0, limit - Number(used));

  // 5) Appel à l'API Claude ; en cas d'échec, la demande n'est pas comptée
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    await svc.rpc("ai_release_request", { p_user: user.id, p_day: day });
    return json(502, { error: "Claude ne répond pas. Réessaie dans un instant." });
  }
  if (!res.ok) {
    await svc.rpc("ai_release_request", { p_user: user.id, p_day: day });
    const status = res.status === 429 ? 429 : 502;
    return json(status, { error: res.status === 429 ? "Claude est saturé pour le moment. Réessaie plus tard." : "Erreur de l'API Claude." });
  }
  const data = await res.json();
  const text = (data.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("").trim();
  const inTok = Number(data.usage?.input_tokens ?? 0);
  const outTok = Number(data.usage?.output_tokens ?? 0);
  await svc.rpc("ai_add_tokens", { p_user: user.id, p_day: day, p_in: inTok, p_out: outTok });

  return json(200, { text, remaining, model, usage: { input: inTok, output: outTok } });
});
