# AuditIA — AffiAds

Application web d'audit de visibilité numérique des commerces locaux.

**En ligne :** https://mansstyle59.github.io/AuditIA/

## Structure du dépôt

Un seul site, publié tel quel — pas d'étape de compilation.

- `site/` — l'application complète (une page `index.html` autonome : HTML, CSS et JavaScript).
  - `site/index.html` — connexion + espace de travail (clients, audits, réglages).
  - `site/manifest.webmanifest` — manifeste PWA (ajout à l'écran d'accueil).
  - `site/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `favicon-32.png`, `auditia-icon.svg` — icônes.
- `.github/workflows/pages.yml` — publie automatiquement le dossier `site/` sur GitHub Pages à chaque push sur `main`.

## Connexion

L'accès est **réservé au compte administrateur** (`dewulf.denis@gmail.com`).
La connexion s'appuie sur **Supabase** (e-mail + mot de passe, lien de réinitialisation du mot de passe). Aucun mot de passe n'est stocké dans le dépôt : seule la clé publique (publishable) Supabase, prévue pour le navigateur, figure dans le code. Les données (clients, audits, réglages) sont rangées côté Supabase, protégées par les règles d'accès (RLS) du projet.

## Mettre à jour le site

Toute modification poussée sur la branche `main` est publiée automatiquement par GitHub Pages en une minute environ.

## Assistant Claude (Studio)

Le bouton « Affiner avec Claude » du Studio passe par la fonction Supabase `claude-assist` (`supabase/functions/claude-assist`). La clé API Anthropic n'est jamais dans le navigateur ni dans le dépôt.

Secrets à définir dans Supabase (Edge Functions → Secrets) :
- `ANTHROPIC_API_KEY` : la clé API Anthropic (obligatoire).
- `ADMIN_EMAIL` : l'adresse du compte autorisé à utiliser l'assistant (obligatoire, sinon accès refusé).
- `AI_DAILY_LIMIT` : nombre maximal de demandes par jour (facultatif, 30 par défaut).
- `ANTHROPIC_MODEL` : modèle Claude utilisé (facultatif, `claude-sonnet-5-5` par défaut).

Le quota est tenu dans la table `public.ai_usage` (migration `20261102120000_ai_usage_quota.sql`).
