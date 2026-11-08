# Sécurité — AuditIA

## Mesures en place
- Les tables publiques `clients`, `audits` et `app_settings` ont RLS activé.
- Les politiques SQL limitent l'accès aux données au compte administrateur autorisé et à ses propres lignes.
- La clé Supabase publiée dans le navigateur est une clé publique ; elle ne remplace jamais RLS.
- L'index `audits_client_id_idx` accélère la relation entre audits et commerces.
- Les liens affichés et les adresses envoyées aux services d’analyse doivent être `http` ou `https`. Les adresses locales, privées et les schémas `javascript:` sont refusés.
- Le service worker ne met en cache que les fichiers de l’application, jamais une requête avec paramètres.
- Les couleurs de marque injectées dans le style doivent être un code hexadécimal. Le logo enregistré est converti en PNG.

## Politique robots.txt pour les audits
- Avant de demander la lecture d'une page, une capture ou une mesure PageSpeed, le moteur vérifie les règles robots.txt pour le jeton produit AuditIA et le chemin concerné.
- Si le chemin est interdit, ces lectures sont marquées « ignorées » et ne sont pas lancées. llms.txt n'est lu que si son chemin est autorisé.
- Si robots.txt est inaccessible, illisible, vide ou renvoyé sous forme de page HTML, le crawl est suspendu par prudence. Avec le proxy AllOrigins, un HTTP 404 ne permet pas de distinguer un robots.txt absent d'une erreur du proxy : AuditIA ne l'interprète donc pas comme une autorisation de crawler.
- Limite importante : la lecture HTML et les captures utilisent des services tiers (Jina Reader, AllOrigins, WordPress mShots). AuditIA vérifie sa propre politique avant de leur transmettre une URL, mais ne contrôle pas leur User-Agent ni leur respect interne des règles robots. La conformité complète du comportement de ces proxys n'est pas confirmée ; ne pas présenter ces lectures comme un crawl direct d'AuditIA.

## À ne pas mettre dans le dépôt ni dans le navigateur
Ne jamais versionner les clés privées/service-role, mots de passe, tokens de webhook ou secrets API. La clé Supabase publishable du navigateur est publique par conception et ne remplace jamais RLS.

Les clés Google Places/PageSpeed et autres clés API de réglages sont traitées côté serveur : le navigateur ne sélectionne pas les colonnes contenant les valeurs brutes. Il appelle `auditia-secure-api` pour lire un état masqué ou enregistrer une clé. La fonction utilise actuellement les colonnes API de `app_settings` via `service_role`, avec priorité aux valeurs enregistrées et repli sur les secrets de fonction. Les valeurs brutes ne sont pas renvoyées par `settings_read`. Ne jamais ajouter de lecture directe de ces colonnes au frontend.

Les politiques RLS et les permissions réelles de `app_settings` doivent être vérifiées dans Supabase : les migrations de cette table ne sont pas présentes dans le dépôt, donc leur configuration effective ne peut pas être confirmée ici.

## Proxy serveur et limitation de débit
- `auditia-secure-api` est la fonction Edge utilisée pour Google Places et PageSpeed. Elle vérifie le jeton Supabase, l'e-mail confirmé et le compte administrateur, puis applique une liste blanche d'actions et des limites de requêtes.
- Les quotas sont appliqués côté serveur par la RPC `auditia_consume_rate_limit` (fenêtres minute et jour). En cas d'indisponibilité du limiteur, l'appel échoue de manière fermée.
- Les clés sont lues depuis les réglages serveur ou les secrets de fonction. Ne jamais exposer les valeurs brutes dans les réponses, journaux ou modules navigateur.
- `claude-assist` est une fonction distincte ; sa clé Anthropic reste dans les secrets Supabase.
- Tout nouvel endpoint doit conserver l'authentification, l'autorisation minimale, la validation des entrées, les quotas et les journaux sans données sensibles.

## État de déploiement
- Edge Function : `auditia-secure-api` (active, JWT vérifié dans le code de la fonction).
- Limiteur : `public.auditia_consume_rate_limit`, exécutable uniquement par `service_role`.
- Table `public.auditia_api_rate_limits` : RLS activé, aucun accès direct accordé aux rôles `anon` et `authenticated`.
- Index ajouté sur `public.audits(client_id)`.

## Vérifications recommandées
Dans Supabase Auth, activer la protection contre les mots de passe compromis (« Leaked password protection »). Le contrôle de sécurité Supabase a signalé cette option comme désactivée lors du dernier audit.
