# Sécurité — AuditIA

## Mesures en place
- Les tables publiques `clients`, `audits` et `app_settings` ont RLS activé.
- Les politiques SQL limitent l'accès aux données au compte administrateur autorisé et à ses propres lignes.
- La clé Supabase publiée dans le navigateur est une clé publique ; elle ne remplace jamais RLS.
- L'index `audits_client_id_idx` accélère la relation entre audits et commerces.
- Les liens affichés et les adresses envoyées aux services d’analyse doivent être `http` ou `https`. Les adresses locales, privées et les schémas `javascript:` sont refusés.
- Le service worker ne met en cache que les fichiers de l’application, jamais une requête avec paramètres.
- Les couleurs de marque injectées dans le style doivent être un code hexadécimal. Le logo enregistré est converti en PNG.

## À ne pas mettre dans le dépôt ni dans le navigateur
Ne jamais versionner les clés privées/service-role, mots de passe, tokens de webhook ou secrets API. Les clés de navigateur (Google Places, PageSpeed, OpenAI, Bing) ne doivent pas être considérées comme secrètes si le code client les lit : elles peuvent être extraites depuis le navigateur. Les déplacer derrière une fonction serveur/Edge Function, puis les stocker dans les secrets Supabase, avec restrictions de clés côté fournisseur.

## Webhooks et limitation de débit
Le projet actuel est un site statique GitHub Pages et ne déclare actuellement aucune Edge Function Supabase. Il n'y a donc pas de point d'entrée serveur AuditIA où placer un secret de webhook et un limiteur fiable. Un compteur côté navigateur ne protège pas contre les abus. Avant d'exposer des webhooks ou des appels API coûteux, créer une Edge Function qui :
1. vérifie l'identité Supabase de l'utilisateur et autorise seulement les opérations nécessaires ;
2. valide les paramètres et limite taille/fréquence des requêtes côté serveur ;
3. lit les clés depuis les secrets de fonction, jamais depuis `app_settings` ou le JavaScript client ;
4. applique un rate limit côté serveur (par utilisateur et/ou IP) et renvoie `429` en cas de dépassement ;
5. journalise les refus sans enregistrer les clés ni les données sensibles.

## État de déploiement
- Edge Function : `auditia-secure-api` (active, JWT vérifié dans le code de la fonction).
- Limiteur : `public.auditia_consume_rate_limit`, exécutable uniquement par `service_role`.
- Table `public.auditia_api_rate_limits` : RLS activé, aucun accès direct accordé aux rôles `anon` et `authenticated`.
- Index ajouté sur `public.audits(client_id)`.

## Vérifications recommandées
Dans Supabase Auth, activer la protection contre les mots de passe compromis (« Leaked password protection »). Le contrôle de sécurité Supabase a signalé cette option comme désactivée lors du dernier audit.
