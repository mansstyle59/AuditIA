# AuditIA — AffiAds

Site public AuditIA publié avec **GitHub Pages** depuis le dossier `site/`.

## Ce qui est publié

- Page d’accueil responsive en thème sombre
- Présentation des fonctionnalités prévues d’AuditIA
- Liens vers le dépôt et les informations du projet

## Déploiement GitHub Pages

Le workflow `.github/workflows/pages.yml` publie directement le dossier `site/` sur chaque push vers `main`.

## Authentification

GitHub Pages sert uniquement des fichiers statiques : il ne peut pas vérifier des mots de passe ni protéger des données privées côté serveur par lui-même. Pour ajouter une vraie connexion par e-mail/mot de passe, il faut connecter un fournisseur d'authentification externe compatible avec les sites statiques et protéger tout accès aux données côté service/API. Aucun mot de passe ne doit être stocké dans le dépôt ni dans le JavaScript public.

L'adresse administrateur souhaitée est `Dewulf.denis@gmail.com`. Aucun mot de passe n'est inclus dans le dépôt.

## Périmètre du dépôt

Le dépôt n'embarque pas un backend autonome complet. Les anciens fichiers sources contiennent encore des références AppDeploy et ne sont pas utilisés dans la publication Pages actuelle.