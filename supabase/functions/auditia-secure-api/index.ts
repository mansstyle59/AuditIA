import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { isPublicHttpUrl } from "./url-validation.mjs";

// AuditIA — auditia-secure-api.
// La version de déploiement est gérée par Supabase ; ne pas la déduire de ce fichier.
// Proxy serveur pour Google Places, PageSpeed Insights et Bing Webmaster Tools.
// - Clés : Places/PageSpeed/Bing sont lues dans app_settings avec service_role.
//   GOOGLE_PLACES_API_KEY et PAGESPEED_API_KEY dans les secrets de fonction sont des replis
//   uniquement si la valeur enregistrée est vide. Bing utilise la clé app_settings.
// - settings_read renvoie uniquement l'état configuré et un indice masqué, jamais la clé complète.
// - Limite de cloisonnement : la RLS autorise l'administrateur à lire sa propre ligne app_settings
//   via l'API Supabase ; ces clés ne sont donc pas isolées strictement du compte administrateur.
// - Accès : jeton utilisateur vérifié auprès d'Auth, e-mail confirmé, administrateur uniquement.
// - Entrées : action en liste blanche, champs bornés, Content-Type JSON obligatoire.
// - Quotas : par minute et par jour, par utilisateur et par action (table existante via la RPC de limitation).

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = "dewulf.denis@gmail.com";
const GOOGLE_PLACES_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") || "";
const PAGESPEED_KEY = Deno.env.get("PAGESPEED_API_KEY") || "";