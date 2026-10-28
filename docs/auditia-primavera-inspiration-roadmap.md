# AuditIA — feuille de route inspirée de Primavera

Date d'observation : 28 octobre 2026

Référence observée :
- Page de campagne/agences : https://primaverapp.com/agences
- Présentation du scraper : https://primaverapp.com/scraper-google-maps
- Méthodologie : https://primaverapp.com/methodologie

## Objectif

Faire évoluer AuditIA vers un parcours commercial de bout en bout : identifier un commerce, examiner sa visibilité locale, réunir des preuves, prioriser les améliorations, puis remettre un rapport client de qualité professionnelle.

Cette feuille de route est une proposition. Elle ne signifie pas que ces fonctions sont déjà implémentées.

## Principes retenus

1. Recherche d'entreprises guidée par le métier, la zone et des critères formulés en français.
2. Prévisualisation claire du périmètre et des champs disponibles avant l'analyse.
3. Enrichissement progressif à partir de sources accessibles : fiche publique, site web, outils d'analyse et informations professionnelles publiques.
4. Chaque donnée porte un statut : observée, fournie par le client, estimée, introuvable ou à confirmer.
5. Un constat important doit être relié à une preuve, une URL et si possible une date de vérification.
6. L'IA explique les éléments réellement trouvés ; elle ne fabrique pas de coordonnées, avis, scores, positions ou résultats commerciaux.
7. Rapport express pour la première prise de contact, rapport complet documenté pour la prestation payante.
8. Navigation et données existantes — clients, audits, Supabase, exports PDF, authentification et application mobile — à préserver.

## Parcours produit recommandé

### Étape 1 — Recherche commerciale
- Nom de commerce, activité, ville/département et zone.
- Critères facultatifs en langage naturel : indépendant, présence de site, avis récents, site à améliorer, etc.
- Afficher la recherche comprise avant de l'exécuter.
- Permettre d'ajuster la cible et de prévisualiser les résultats disponibles.
- Indiquer clairement la source et les limites des résultats.

### Étape 2 — Qualification des résultats
- Présenter identité, localisation, téléphone/site lorsqu'ils sont disponibles, et sources associées.
- Signaler les champs absents plutôt que de les deviner.
- Prévenir les doublons et distinguer établissement indépendant et réseau lorsque l'information est vérifiable.
- Ne lancer ni collecte massive ni service payant sans action explicite de l'utilisateur.

### Étape 3 — Audit documenté
- Présence locale, cohérence des coordonnées publiques, avis, site mobile, performance, réseaux et concurrents si vérifiables.
- Pour chaque constat : preuve, date, gravité, confiance, recommandation et effort estimé.
- Distinguer mesure réelle, appréciation IA, estimation et donnée non disponible.
- Conserver le détail de méthode et les erreurs des sources, sans bloquer toute l'analyse si une source est indisponible.

### Étape 4 — Rapport vendable
- Couverture AffiAds/AuditIA propre et personnalisable.
- Résumé exécutif avec trois priorités.
- Résultats reliés à des preuves et limites explicites.
- Plan d'action classé par impact estimé et effort.
- Version express et version complète sans doublons.
- Contrôle d'affichage du PDF sur iPhone et ordinateur.

## Priorités d'implémentation

### P0 — Sécuriser l'existant
- Travailler sur une branche dédiée et conserver la possibilité de revenir en arrière.
- Ne pas remplacer globalement `site/index.html` sans diff et tests.
- Vérifier la recherche actuelle, les dossiers clients, les audits, les intégrations et les deux exports PDF.
- Vérifier les erreurs réseau, l'absence de clés et les quotas : signaler l'indisponibilité sans inventer un résultat.

### P1 — Améliorer l'expérience de recherche
- Clarifier le formulaire et les critères.
- Ajouter un récapitulatif de la recherche avant lancement.
- Montrer la provenance, les champs disponibles et les limites.
- Rendre les états « recherche », « résultats partiels », « aucune donnée » et « erreur » faciles à comprendre sur mobile.

### P2 — Renforcer la preuve et la qualification
- Unifier les statuts de confiance et les URLs sources.
- Ajouter un résumé IA fondé uniquement sur les résultats présents.
- Prioriser les constats et actions réellement justifiés.

### P3 — Conversion commerciale et suivi
- Mieux présenter le rapport express et le rapport complet.
- Ajouter un suivi d'actions avec responsable, statut et date cible.
- Comparer les audits successifs uniquement quand les mesures comparables existent.

## Conformité et limites

- Vérifier les conditions d'utilisation des sources et utiliser les API autorisées plutôt que contourner des limites ou extraire des données en violation des conditions.
- Pour les données personnelles et la prospection, documenter la source, la finalité, l'information nécessaire et le droit d'opposition. Le traitement dépend du contexte ; ne pas présenter une règle générale comme une autorisation universelle.
- Ne jamais promettre un classement Google, un nombre de prospects, des ventes ou une hausse de chiffre d'affaires.
- Les règles de conservation, de suppression et les droits d'accès doivent rester cohérents avec Supabase et la politique de confidentialité.

## Critères d'acceptation

- La recherche actuelle fonctionne toujours.
- Aucun client ou audit existant n'est perdu.
- Les PDF express et complet s'exportent correctement.
- Chaque métrique est étiquetée comme mesurée, estimée ou indisponible.
- Les écrans restent lisibles et utilisables sur iPhone.
- Les erreurs de source n'interrompent pas les autres analyses disponibles.
- Les changements sont isolés, testés et réversibles.
