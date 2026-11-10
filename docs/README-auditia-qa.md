# AuditIA — checklist de vérification avant publication

Cette liste doit être suivie après toute modification significative de `site/index.html`. Elle ne signifie pas que les tests ont déjà été exécutés.

## Flux fonctionnels
- [ ] Connexion administrateur avec identifiants valides.
- [ ] Erreur lisible avec identifiants invalides et réseau indisponible.
- [ ] Réinitialisation du mot de passe.
- [ ] Création, édition et consultation d’un client.
- [ ] Création, édition, consultation et export d’un audit.
- [ ] Données conservées après actualisation et nouvelle connexion.
- [ ] Réglages et intégrations : état configuré/non configuré explicite.
- [ ] Échec d’une API ou d’une clé absente n’empêche pas les étapes indépendantes.
- [ ] Aucune clé secrète intégrée dans le code client ou affichée dans l’interface.
- [ ] Vérifier que les règles Supabase RLS limitent les données au compte autorisé.

## Mobile — iPhone Safari
- [ ] En-tête visible, sans trou ni recouvrement avec le contenu.
- [ ] Zone sûre iOS respectée en haut et en bas.
- [ ] Un seul système de navigation visible ; boutons accessibles au pouce.
- [ ] Aucun débordement horizontal à 320, 375, 390 et 430 px.
- [ ] Formulaires utilisables avec le clavier ouvert.
- [ ] Menus fermables par bouton, arrière-plan et changement de page.
- [ ] Contraste et taille de texte lisibles.
- [ ] Export/aperçu PDF utilisable depuis Safari.

## Ordinateur
- [ ] Mise en page fluide à 768, 1024, 1280 et 1440 px.
- [ ] Navigation clavier, focus visible et libellés de formulaire.
- [ ] Tableaux et longues valeurs ne débordent pas.

## Publication
- [ ] Vérifier le diff avant fusion.
- [ ] Exécuter les vérifications disponibles ; noter clairement celles qui nécessitent un test manuel.
- [ ] Confirmer la réussite du workflow GitHub Pages.
- [ ] Vérifier le site publié sur mobile et ordinateur.
- [ ] Contrôler les journaux de console et réseau, sans exposer de secrets.
- [ ] Prévoir un retour arrière vers le dernier commit stable en cas de régression.

## Conditions de livraison
Ne dire « testé » que pour les tests effectivement réalisés et documentés. Ne pas affirmer qu'un flux est protégé sans vérifier la configuration des politiques Supabase et le comportement réel.
