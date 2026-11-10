# AuditIA Intelligence 360 — moteur Python (première base)

Ce dossier ajoute un backend Python indépendant. Il ne remplace pas l'interface existante, le moteur d'audit JavaScript, Supabase ni les fonctions déjà en place.

## Fonctionnalités de cette première base

- API FastAPI avec contrôle de santé `/health`.
- Endpoint `/api/v1/audits/stream` qui envoie de vrais événements SSE.
- Recherches parallèles web, site officiel, Instagram, Facebook, YouTube, LinkedIn, annuaires et concurrents.
- Résultats transmis au fur et à mesure, avec progression calculée sur les sources réellement terminées.
- Une source en échec ne bloque pas les autres.

## Installation locale (Mac Intel ou Apple Silicon)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Vérifier `http://127.0.0.1:8000/health`.

## Limites connues — étape prototype

Le connecteur DuckDuckGo HTML est une découverte web indicative, non une API officielle : disponibilité, résultats et structure HTML peuvent changer. Les recherches `site:` ne prouvent pas qu'un compte social est officiel. Aucun scraping derrière connexion, contournement de CAPTCHA, collecte de données privées ou extraction massive de données personnelles n'est prévu.

Les photos/logos, données Google Business, avis, contacts professionnels et données légales nécessiteront des connecteurs adaptés, leurs autorisations et une validation des droits d'utilisation. La recherche de prospects devra privilégier les coordonnées professionnelles publiques pertinentes, documenter les sources et respecter le RGPD et les règles de prospection.

## Intégration et hébergement

Le site actuel est une application statique GitHub Pages et utilise déjà un moteur JavaScript avec progression réelle et Supabase. Ce backend est volontairement isolé : il n'est pas encore branché au site ni déployé. Avant branchement, il faut choisir un hébergement Python compatible avec le budget, protéger l'API contre les abus, définir l'authentification et faire un test d'intégration sans toucher au moteur existant.

Aucune clé secrète ne doit être ajoutée au dépôt ou au navigateur.
