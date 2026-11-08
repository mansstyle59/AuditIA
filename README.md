# AuditIA — AffiAds

Application web d'audit de visibilité numérique des commerces locaux.

**En ligne :** https://mansstyle59.github.io/AuditIA/

## Structure du dépôt

Le site est publié directement depuis `site/` par GitHub Pages, sans bundler ni étape de compilation.

- `site/index.html` — point d’entrée GitHub Pages ; redirige vers l’interface officielle.
- `site/nouvelle-interface.html` — page active de l’application (coquille HTML et feuilles CSS).
- `site/src/ui/app.js` — véritable point d’entrée JavaScript de l’application : authentification Supabase, navigation et espace de travail.
- `site/src/` — modules JavaScript, vues, styles, moteur d’audit et intégrations.
- `site/manifest.webmanifest` et les icônes — manifeste PWA et ressources d’installation.
- `.github/workflows/pages.yml` — valide les ressources et tests, puis publie le dossier `site/` sur GitHub Pages à chaque push sur `main`.

L’ancienne interface autonome reste dans le dépôt pour compatibilité ; elle n’est pas le point d’entrée actif de la nouvelle application.

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
