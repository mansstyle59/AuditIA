# AuditIA — AffiAds

Application web d'audit de visibilité numérique des commerces locaux.

**En ligne :** https://mansstyle59.github.io/AuditIA/

## Structure du dépôt

Un site statique publié tel quel sur GitHub Pages, sans étape de compilation.

- `site/` — l'application.
  - `site/index.html` — redirection vers l'interface officielle.
  - `site/nouvelle-interface.html` — interface officielle (chargée par `site/src/`).
  - `site/src/` — modules JavaScript et CSS (auth, audit, api, report, settings, ui).
  - `site/tests/` — tests du moteur d'audit, du rapport et des sources.
  - `site/vendor/` — bibliothèques embarquées (Supabase, jsPDF, html2canvas).
  - `site/sw.js`, `manifest.webmanifest` et icônes — mode hors-ligne et ajout à l'écran d'accueil.
- `supabase/functions/auditia-secure-api/` — fonction serveur : seul point d'accès aux API Google, PageSpeed et à la recherche web. Les clés sont lues uniquement dans les secrets de la fonction.
- `supabase/functions/claude-assist/` — assistant Claude du Studio.
- `supabase/migrations/` — migrations SQL.
- `backend/` — service Python d'audit et ses tests.
- `docs/` — notes de conception et offre client.
- `.github/workflows/pages.yml` — vérifie puis publie `site/` sur GitHub Pages à chaque push sur `main`.

## Connexion

L'accès est réservé au compte administrateur. La connexion s'appuie sur **Supabase** (e-mail + mot de passe, lien de réinitialisation). Seule la clé publique (publishable) Supabase figure dans le code. Les données sont protégées par les règles d'accès (RLS) du projet. Voir `SECURITY.md`.

## Mettre à jour le site

Toute modification poussée sur `main` est publiée automatiquement par GitHub Pages en une minute environ, après les vérifications du workflow.

## Assistant Claude (Studio)

Le bouton « Affiner avec Claude » passe par la fonction Supabase `claude-assist`. La clé API Anthropic n'est jamais dans le navigateur ni dans le dépôt.

Secrets à définir dans Supabase (Edge Functions → Secrets) :
- `ANTHROPIC_API_KEY` : la clé API Anthropic (obligatoire).
- `ADMIN_EMAIL` : l'adresse du compte autorisé à utiliser l'assistant (obligatoire, sinon accès refusé).
- `AI_DAILY_LIMIT` : nombre maximal de demandes par jour (facultatif, 30 par défaut).
- `ANTHROPIC_MODEL` : modèle Claude utilisé (facultatif, `claude-sonnet-5-5` par défaut).

Le quota est tenu dans la table `public.ai_usage` (migration `20261102120000_ai_usage_quota.sql`).

## Secrets de `auditia-secure-api`

- `GOOGLE_PLACES_API_KEY`, `PAGESPEED_API_KEY`, `BRAVE_SEARCH_API_KEY` : clés des services externes.
- `ALLOWED_ORIGINS_DEV` : facultatif, origines de développement supplémentaires (absent en production).
