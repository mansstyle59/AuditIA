# AuditIA — Étape 4 : intégration des fonctionnalités dans la nouvelle interface

Branche : `refonte/etape-4-integration` (base : `refonte/etape-3-design`). Aucune fusion, aucune publication.
L'ancienne interface (`site/index.html`) reste inchangée et fonctionnelle. Supabase distant : non modifié.

## LOT 1 — Authentification (réalisé)

### Modules
- `site/src/auth/client.js` : client Supabase (mêmes options que l'ancienne interface, dont `storageKey: 'auditia-auth'` : la session est partagée entre les deux interfaces).
- `site/src/auth/service.js` : logique pure, client injecté. Connexion, session, mot de passe oublié, nouveau mot de passe, déconnexion, lecture des liens de réinitialisation. Règles conservées : accès réservé à `ADMIN_EMAIL`, blocage après 5 échecs pendant 60 s, mêmes messages (helpers de l'étape 2), message neutre pour « mot de passe oublié ».
- `site/src/ui/screens/auth.js` + `site/src/styles/auth.css` : écrans de connexion, mot de passe oublié, nouveau mot de passe, lien expiré, chargement, erreur (mobile : une colonne ; ordinateur : deux colonnes).
- `site/src/ui/views/account.js` : vue « Compte » (adresse connectée, déconnexion).
- `site/src/ui/app.js` : point d'entrée (remplace `app-demo.js`) ; la coquille n'est rendue qu'avec une session valide.

### Différences volontaires avec l'ancienne interface
1. « Mot de passe oublié » avec réseau coupé : l'ancienne interface affichait le message de succès ; la nouvelle affiche « Connexion impossible. Vérifiez votre réseau internet. »
2. Déconnexion : retour direct à l'écran de connexion (sans rechargement de la page).
3. Session terminée dans un autre onglet : retour à la connexion avec un message.
4. Le chargement des données (clients, audits, réglages) n'est pas encore fait : lot 2.

### À savoir
- Les e-mails de réinitialisation renvoient vers la racine du site (ancienne interface), car l'URL de la nouvelle page n'est pas forcément autorisée dans les réglages Supabase (non modifiés). L'écran de nouveau mot de passe de la nouvelle interface fonctionne dès qu'un lien arrive sur cette page.
- L'accueil affiche encore des données de démonstration signalées par un bandeau « Démo ».

### Tests (Supabase simulé, aucune connexion réelle)
Voir le rapport de livraison du lot 1.
