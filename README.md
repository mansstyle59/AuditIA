# AuditIA — AffiAds

Application autonome d'audit de visibilité numérique des commerces.

## Fonctionnalités

- Gestion des clients et historique des audits
- Checklist terrain avec score manuel distinct des mesures automatiques
- Analyse mobile via Google PageSpeed Insights / Lighthouse
- Enrichissement par des sources publiques : Photon / OpenStreetMap, Overpass, RDAP et Jina Reader
- Réglages des clés API facultatives, export CSV et rapport imprimable d'une page
- Interface responsive et authentification avec contrôle administrateur côté serveur

## Technologies

- Vite + TypeScript
- Backend AppDeploy SDK (`@appdeploy/sdk`)
- Client AppDeploy (`@appdeploy/client`)

## Développement frontend

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Backend et déploiement

Le backend actuel utilise les services d'authentification et de base de données d'AppDeploy. Pour l'exécuter hors d'AppDeploy, il faudra adapter ces dépendances à une cible d'hébergement compatible. Les données clients/audits de l'ancienne instance et ses éventuels secrets ne sont pas transférés par ce dépôt.

## Sécurité

- Ne commitez jamais de clés API ou de secrets.
- Les routes privées sont protégées par authentification et liste d'administrateurs.
- Les clés Google réglées dans l'interface sont enregistrées dans le localStorage du navigateur : utilisez uniquement des clés restreintes.
