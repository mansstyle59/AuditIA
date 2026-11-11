# Sécurité — AuditIA

## Mesures en place
- Les tables publiques `clients`, `audits` et `app_settings` ont RLS activé.
- Les politiques SQL limitent l'accès aux données au compte administrateur autorisé et à ses propres lignes.
- La clé Supabase publiée dans le navigateur est une clé publique ; elle ne remplace jamais RLS.
- Les appels aux API Google (Places, PageSpeed) et à la recherche web passent par la fonction `auditia-secure-api`. Le navigateur n'envoie que le jeton de session ; aucune clé Google n'est lue par le navigateur.
- L'écriture des clés se fait par la fonction serveur (`settings_save`), réservée à l'administrateur. Les clés ne sont jamais renvoyées en entier au navigateur (affichage masqué).
- Les liens affichés et les adresses envoyées aux services d'analyse doivent être `http` ou `https`. Les adresses locales, privées et les schémas `javascript:` sont refusés.
- Le service worker ne met en cache que les fichiers de l'application, jamais une requête avec paramètres.
- Les couleurs de marque injectées dans le style doivent être un code hexadécimal. Le logo enregistré est converti en PNG.

## À ne pas mettre dans le dépôt ni dans le navigateur
Ne jamais versionner les clés privées ou service-role, mots de passe, tokens de webhook ou secrets API. Une clé lue par du code client peut être extraite depuis le navigateur : elle doit rester dans les secrets de la fonction serveur, avec des restrictions côté fournisseur.

## Points restants
1. **Clés déjà enregistrées** : l'ancienne interface a pu stocker des clés (Google Places, PageSpeed, OpenAI, Bing) dans `app_settings`. Par précaution, les faire tourner (les révoquer et en créer de nouvelles), puis les ressaisir dans les réglages qui les envoient au serveur.
2. **Adresse administrateur en dur** : `ADMIN_EMAIL` figure dans `site/src/core/config.js` et dans la fonction `auditia-secure-api`. Il s'agit d'un identifiant et non d'un secret : le contrôle réel repose sur l'authentification Supabase et sur RLS. Un changement de compte nécessite de modifier les deux endroits.
3. **Mots de passe compromis** : dans Supabase Auth, activer « Leaked password protection ». Le contrôle de sécurité Supabase a signalé cette option comme désactivée lors du dernier audit.

## Webhooks et limitation de débit
La fonction `auditia-secure-api` vérifie le jeton de l'utilisateur et applique des quotas par minute et par jour, par utilisateur et par action. Avant d'ajouter un webhook ou un nouvel appel coûteux, il faut le placer dans une fonction qui :
1. vérifie l'identité Supabase de l'utilisateur et n'autorise que les opérations nécessaires ;
2. valide les paramètres et limite taille et fréquence côté serveur ;
3. lit les secrets dans les variables de la fonction, jamais dans `app_settings` ni dans le JavaScript client ;
4. renvoie `429` en cas de dépassement de quota ;
5. journalise les refus sans enregistrer de clés ni de données sensibles.

## État de déploiement (à vérifier dans Supabase)
- Edge Function : `auditia-secure-api` (JWT vérifié dans le code de la fonction).
- Limiteur : `public.auditia_consume_rate_limit`, exécutable uniquement par `service_role`.
- Table `public.auditia_api_rate_limits` : RLS activé, aucun accès direct pour `anon` et `authenticated`.
- Index sur `public.audits(client_id)`.
