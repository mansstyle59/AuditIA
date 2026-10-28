# AuditIA — contrôle de la recherche en langage naturel

## Parcours manuel à vérifier après validation du script
1. Ouvrir AuditIA avec le compte administrateur.
2. Vérifier que le bloc « Décrivez les commerces que vous cherchez » apparaît sur l'accueil.
3. Sans clé Google Places, lancer une requête et vérifier que l'application explique comment configurer la clé sans planter.
4. Avec une clé Places API (New) autorisée pour le domaine GitHub Pages, chercher « Restaurants à Narbonne sans site web ».
5. Vérifier que les résultats proviennent de Google Places, que le filtre « sans site web » est appliqué aux résultats renvoyés et que les champs absents restent absents.
6. Créer un audit depuis un résultat, puis vérifier que le client et le dossier d'audit apparaissent dans les vues existantes.
7. Vérifier les exports PDF express et complet et le rendu iPhone Safari.

## Limites connues à communiquer
- L'interprétation actuelle est une première version déterministe, sans modèle IA distant : types de commerces et quelques filtres sont reconnus par règles.
- Les critères complexes, l'identification des indépendants et les critères de contenu de site ne sont pas encore analysés par une IA.
- Google Places renvoie un nombre limité de résultats par page. Le filtre « sans site » s'applique uniquement aux résultats reçus, pas à l'ensemble des commerces d'une ville.
- Une clé Google Places active peut entraîner une facturation selon le compte Google Cloud et les champs demandés.
- Les tests réels de recherche nécessitent une clé autorisée et n'ont pas été exécutés dans cet environnement.
