# AuditIA Intelligence 360 — moteur Python

Ce dossier ajoute un backend Python indépendant. Il ne remplace pas l'interface actuelle, le moteur d'audit JavaScript, Supabase ni les données existantes.

## Architecture actuelle

- `app/main.py` : API FastAPI, CORS et endpoints.
- `app/models.py` : validation des demandes d'audit.
- `app/providers/search.py` : fournisseur de découverte web public (DuckDuckGo HTML).
- `app/services/audit.py` : orchestration asynchrone, concurrence limitée, délais maximums, progression SSE et déduplication.
- `tests/` : tests unitaires du flux et du parseur.
- `.github/workflows/python-backend.yml` : vérification Python automatique à chaque PR ou push concerné.

## Fonctionnalités de cette première version

- Endpoint de santé `GET /health`.
- Endpoint `POST /api/v1/audits/stream` avec événements Server-Sent Events.
- Recherches parallèles : web, site officiel, Instagram, Facebook, YouTube, TikTok, LinkedIn, annuaires et concurrents.
- Concurrence limitée à trois requêtes simultanées par défaut.
- Délai maximal par source ; un échec ne bloque pas les autres.
- Événements distincts `source_started`, `source_completed` et `audit_completed`.
- Progression calculée sur les sources effectivement terminées.
- Déduplication des résultats par URL.
- Décodage des URL de redirection DuckDuckGo.

## Installation locale

Mac ou Linux :

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Tester le service :

```bash
curl http://127.0.0.1:8000/health
```

Lancer les tests :

```bash
pytest -q
```

L'API est documentée localement par FastAPI sur `http://127.0.0.1:8000/docs`.

## Contrat de recherche

Exemple de demande :

```json
{
  "company_name": "Boulangerie Martin",
  "city": "Narbonne",
  "sector": "boulangerie",
  "website": "https://example.com"
}
```

L'endpoint `POST /api/v1/audits/stream` renvoie des événements SSE au format `data: {JSON}\n\n`. Le client doit lire le flux HTTP en continu ; l'API POST n'est pas destinée à être consommée avec l'objet navigateur `EventSource` (qui ne sait pas envoyer ce corps JSON).

## Configuration

- `AUDITIA_ALLOWED_ORIGINS` : liste d'origines séparées par des virgules. Par défaut : `https://mansstyle59.github.io`.
- Ne jamais placer de clé privée, jeton d'administration ou clé fournisseur dans le navigateur ou dans GitHub.
- Le backend n'est pas encore déployé et l'endpoint d'audit n'a pas encore de mécanisme d'authentification utilisateur. Il doit rester un prototype local/de test jusqu'à la mise en place d'une authentification côté serveur, d'une limitation de débit et d'un proxy sécurisé (par exemple une fonction serveur liée à la session Supabase).

## Limites et qualité des données

Le connecteur DuckDuckGo HTML est une méthode de découverte best-effort, pas une API officielle ou garantie. Le fournisseur peut changer son HTML, limiter les requêtes ou ne pas répondre. Les résultats sont indicatifs ; une requête `site:` ne prouve pas qu'un compte social appartient réellement à l'entreprise.

Les photos/logos, les données Google Business, les avis, les contacts professionnels et les données légales doivent être ajoutés via des fournisseurs adaptés, autorisés et documentés. La collecte de prospects doit rester limitée aux informations professionnelles publiques pertinentes, avec provenance, finalité, durée de conservation et respect du RGPD et des règles de prospection.

## Étapes avant branchement à l'application

1. Exécuter la CI et corriger les tests si nécessaire.
2. Déployer le backend sur un hébergement Python adapté au budget.
3. Ajouter authentification, contrôle d'accès, limitation de débit et journalisation sans données sensibles.
4. Créer un proxy serveur sécurisé qui valide la session Supabase et relaie le flux SSE.
5. Brancher un adaptateur front isolé et tester sur une copie/staging.
6. Ne basculer aucune fonction de production avant validation sur iPhone Safari et ordinateur.

GitHub Pages ne peut publier que le site statique ; il ne fait pas tourner FastAPI. Le site actuel et son moteur JavaScript restent donc inchangés pendant cette phase.
