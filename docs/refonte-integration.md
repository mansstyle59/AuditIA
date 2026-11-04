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
- (lot 2) L’accueil affiche désormais les vraies données.

### Tests (Supabase simulé, aucune connexion réelle)
Voir le rapport de livraison du lot 1.

## LOT 2 — Accueil et gestion des clients (réalisé)

### Modules
- `site/src/data/queries.js` : lecture seule des tables `clients` et `audits` (mêmes requêtes que l'ancienne interface : `select('*')`, tri `created_at` décroissant) et messages d'erreur lisibles (réseau, session expirée, autre).
- `site/src/data/portfolio.js` : règles métier pures reprises de l'ancienne interface (statistiques d'accueil, score et niveau d'un commerce, tendance, filtre, tri, fiche client). Aucune dépendance à l'affichage.
- `site/src/ui/views/home.js`, `clients.js`, `client-detail.js` : accueil, liste (recherche, tri, niveaux, catégories) et fiche client (appeler, site web, localiser, audits associés, évolution, informations).
- `site/src/ui/app.js` : chargement (attente / erreur avec « Réessayer » / vide / prêt), navigation accueil → clients → fiche, déconnexion qui vide les données. Les résultats arrivant après une déconnexion sont ignorés.
- Les données de démonstration (`demo-data.js`) sont supprimées : aucune donnée fictive dans l'interface connectée.

### Volontairement non branché (lots suivants)
- Ouverture du détail d'un audit (lot 4), ajout/modification d'un commerce (lot 3), réglages `app_settings` (lot 6). Messages honnêtes + lien vers l'ancienne interface.

### Sécurité
- Uniquement des requêtes GET sur `clients` et `audits`. Aucune écriture, aucune Edge Function, tables/RLS/clés inchangées.
- Le site web d'un commerce n'est affiché en lien que s'il commence par http(s) ; tout le texte venant de la base est échappé.

### Tests (Supabase SIMULÉ, aucune connexion réelle)
Voir le rapport de livraison du lot 2.

## LOT 3 — Recherche et ajout de commerces (réalisé)

Section « Prospects » de la nouvelle interface : recherche en langage naturel, commerces proches, ajout manuel.

### Modules
- `site/src/api/places.js` : appels Google Places portés à l'identique de l'ancienne interface (mêmes adresses, champs demandés, corps de requête, délais, rayon 5 km, 20 résultats). La clé est passée en paramètre, jamais affichée ni stockée.
- `site/src/data/places-search.js` : logique pure : analyse de la phrase (`parseNaturalLanguageTarget` inchangé, avec une 2ᵉ tentative sans accents pour « Électriciens », « café »), filtres (sans site, note < 4, nombre d'avis), détection des doublons, construction de la ligne `clients`.
- `site/src/data/queries.js` : lecture de la clé Google Places déjà enregistrée (`app_settings`, lecture seule) et insertion d'un commerce (`clients`).
- `site/src/ui/search-controller.js` et `views/prospects.js` : état, états d'écran (chargement, vide, erreur API, réseau, délai, géolocalisation refusée, résultats partiels, réessayer).
- `app.js`, `home.js`, `clients.js` : navigation vers Prospects, liens « Trouver des commerces / Ajouter un commerce ».

### Doublons (nouveau : l'ancienne interface n'en contrôlait pas)
Même `place_id` Google, ou même nom + même ville (accents et casse ignorés). Contrôle affiché dans les résultats, puis refait sur des données rechargées juste avant l'insertion (autre appareil). Si la vérification échoue, l'ajout est annulé.

### Volontairement non repris (lots suivants)
Création et lancement d'un audit à l'ajout (lot 4), recherche de la date du domaine, mise à jour du statut de la clé dans les réglages (lot 6).

### Sécurité
Seule écriture : insertion dans `clients`. Tables, RLS, Edge Functions et clés inchangées.

## LOT 4 — Audits complets

### Fichiers
- `site/src/audit/engine.js` : orchestration reprise de `runFullAudit` (10 sources en parallèle, délais maximum identiques, une source en échec ne bloque pas l'audit, un seul audit à la fois, mêmes écritures). L'état vit dans le moteur : on peut quitter l'écran et y revenir.
- `site/src/api/audit-sources.js` : `fetchSerp`, `findWebPresence`, `fetchPlacePhotos`, `fetchCompetitors`, `checkRankings`, `fetchPagespeed` copiés de l'ancienne interface (mêmes adresses, corps, délais) ; seules les variables globales sont remplacées par des dépendances injectées. Les 4 autres sources (site, SIRENE, domaine, capture, robots.txt/llms.txt) viennent de `web-read.js` (étape 2).
- `site/src/data/audits.js`, `ui/audit-controller.js`, `ui/views/audits.js`, `ui/views/audit-live.js` ; `client-detail.js`, `prospects.js`, `app.js`, CSS, `sw.js` (v121), `queries.js` (lecture des clés, insertion d'un dossier).

### Lancement
Fiche client (Nouvel audit / Lancer l'analyse), onglet Audits (Analyser), notice Prospects après ajout (Lancer l'audit). Règle conservée : le dossier non analysé d'un client est réutilisé, sinon un dossier est créé. La liste des clients n'avait pas de lancement dans l'ancienne interface : rien n'y est ajouté.

### Progression
Réelle : une ligne par source (en attente, en cours, analysée, indisponible, sans objet), compteurs, barre = part de sources terminées (pas d'animation simulée), valeurs reçues, temps écoulé. Bandeau « audit en cours » sur les autres écrans.

### Résultats
Score /100, SEO/GEO, plan d'action (`actionPlan`/`auditActions`), recommandations (`improvementPlan`), critères mesurés/non mesurés, sources indisponibles (`auditUnmeasured` + limites de la dernière analyse), Lighthouse, concurrents, mots-clés, présence, historique, liens vers la fiche client.

### Sécurité
Écritures identiques à l'ancien moteur : insertion `audits`, mise à jour `clients.details` et `audits`. Clés lues en lecture seule dans `app_settings`, jamais affichées. Tables, RLS, Edge Functions inchangées. Rapports PDF et graphiques : lot 5.

## Lot 5 — PDF professionnels et graphiques

### Fichiers
- `site/src/report/report-model.js` : modèle pur du rapport (lecture seule). Statut de chaque source déduit du dossier : mesuré / non mesuré / sans objet. Historique uniquement avec ≥ 2 audits réellement analysés du même client.
- `site/src/report/report-charts.js` : données des graphiques (`chartData`) et graphiques SVG (jauge, barres, courbe) pour l'aperçu.
- `site/src/report/report-pdf.js` : PDF A4 vectoriel (jsPDF embarqué `vendor/jspdf.umd.min.js`) : couverture, synthèse, indicateurs SEO/GEO, sources et fiabilité, performance, concurrents, mots-clés, points forts/faibles, plan d'action, recommandations, évolution, notes ; pied de page paginé AuditIA ; tableaux sans ligne coupée (en-tête répété).
- `site/src/report/report-view.js` : aperçu HTML (même modèle, même données que le PDF).
- `site/src/ui/report-controller.js` : aperçu plein écran, téléchargement, partage (si le navigateur le permet), « Ouvrir pour imprimer » (ouvre le PDF, l'impression se fait depuis le lecteur PDF).
- `site/src/styles/report.css`, `sw.js` (cache v122), boutons dans `views/audits.js` (dossier + liste), `desktop.css` (en-tête du dossier).

### Règles
- Aucune écriture, aucun nouvel audit, aucun appel réseau pendant la génération ; le dossier n'est pas modifié.
- Aucune valeur inventée : une donnée absente est « non mesurée » ; un site absent est « sans objet » ; le score reste celui du moteur existant (scoring inchangé).
- Aucune clé, identifiant technique ni message d'erreur interne dans le rapport.
- Concurrents : 10 lignes maximum, le commerce audité est toujours conservé.

### Tests
`lot5_new.py` (53 scénarios, données simulées) : complet, sources indisponibles, sans site, longues recommandations, 40 concurrents, sans historique, mobile et bureau, géométrie du PDF (marges, pages vides, pied de page), cohérence graphiques/dossier, lecture seule, erreur de génération.

## LOT 6 — Paramètres et configuration

**Intégré** : écran Réglages (profil et rôle, marque et signature, couleurs, état des services). Lecture et écriture de la table `app_settings` existante, limitées aux champs de marque ; les clés API ne sont jamais écrites ni affichées en entier (indice `••••` + 4 derniers caractères). Écriture réservée à l'administrateur, vérifiée avant tout envoi (en plus de la RLS). Aucun test réel de service, aucun statut « opérationnel ».

**Fichiers** : `src/settings/settings-model.js`, `src/data/settings.js`, `src/ui/settings-controller.js`, `src/ui/views/settings.js`, `src/ui/views/account.js` (carte Compte), `src/styles/settings.css`, câblage `app.js`, `sw.js` v123.

**Points de sécurité (documentés, NON corrigés)** :
1. Clés API en clair dans `app_settings`, lisibles par le navigateur (pré-existant). Correctif proposé à part : déplacer vers des secrets serveur / Edge Function.
2. Clé OpenAI stockée dans `app_settings` côté navigateur : à supprimer ou déplacer côté serveur.
3. Ancienne interface : tests réseau de clés (quota) et hash de clé dans `localStorage['auditia.keystatus']`.
4. Administrateur = e-mail codé en dur (compte unique).
5. Supabase : protection contre les mots de passe compromis désactivée (réglage à activer dans Supabase).

**Limites connues** : les PDF de la nouvelle interface n'utilisent pas encore les réglages de marque enregistrés ; logo et clés API restent gérés par l'ancienne interface.

## LOT 7 — Harmonisation finale et identité visuelle

**Marque enregistrée** (`src/settings/brand.js`, `loadBrand` dans `src/data/settings.js`) : nom, société, couleurs, logo PNG/JPEG (≤ ~330 Ko), signature et contact, lus en lecture seule dans `app_settings` (colonnes de marque uniquement, jamais les clés). Appliquée à l'en-tête mobile, à la barre latérale, à l'aperçu du rapport et aux PDF. Repli complet : marque par défaut si les réglages sont absents, en erreur ou invalides (logo SVG ou trop lourd ignoré ; couleur trop claire pour l'impression ignorée).
**PDF** : nom/couleur/logo sur la couverture, en-têtes et pieds, bloc « Votre contact » ; aucune clé ni donnée technique.
**Harmonisation** : jetons `--ds-ok/warn/err-*` (plus de couleurs d'état en dur), doublons CSS retirés, bouton retour non étiré sur ordinateur, espacements des cartes, carte « À analyser » lisible.
**Limites connues** : un logo très large reste petit dans la pastille de la barre latérale ; deux boutons « Lancer l'analyse » coexistent dans un dossier non analysé (conservés) ; `sw.js` v124.
