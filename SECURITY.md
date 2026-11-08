# Sécurité — AuditIA

## Mesures observées
- Les tables `clients`, `audits` et `app_settings` ont RLS activé. Les politiques SQL observées limitent les lignes à l'utilisateur authentifié dont l'e-mail correspond au compte administrateur configuré.
- La clé Supabase publishable présente dans le navigateur est publique par conception ; elle ne remplace jamais RLS.
- `auditia-secure-api` et `claude-assist` sont des Edge Functions actives. La première vérifie le JWT, l'e-mail confirmé, l'autorisation administrateur, les actions autorisées et les quotas. Les appels Google Places, PageSpeed et Bing passent par cette fonction.
- Les clés Google Places, PageSpeed, Bing et autres réglages sont lues par la fonction avec `service_role` et ne sont pas renvoyées en clair par l'action `settings_read`. Les clés Anthropic sont conservées dans les secrets de `claude-assist`.
- Le limiteur utilise la RPC `auditia_consume_rate_limit` ; si le limiteur est indisponible, l'appel est refusé.
- Le service worker met en cache les ressources statiques de l'application, pas les réponses API contenant des paramètres.

## Limite importante concernant les clés API
Les clés Google Places/PageSpeed/Bing sont actuellement stockées dans la ligne `app_settings` du compte administrateur et lues côté serveur par `service_role`. La politique RLS observée autorise également l'administrateur authentifié à lire sa propre ligne `app_settings` via l'API Supabase. Elles ne sont donc pas accessibles aux utilisateurs non autorisés, mais elles ne sont pas isolées de manière stricte du compte administrateur authentifié.

Pour un cloisonnement serveur-only plus fort, migrer les clés vers Supabase Vault ou une table dédiée sans politique SELECT pour `authenticated`, puis adapter l'Edge Function et les réglages. **Ne pas supprimer ni migrer les clés sans migration testée et sauvegarde**, afin de préserver les intégrations existantes.

## URL, SSRF et services tiers
- Les URL d'audit sont limitées à HTTP(S) et validées côté client et Edge Function contre les destinations locales/privées connues.
- Une validation d'URL ne suffit pas à garantir la sécurité des redirections ou du DNS rebinding. Les proxys externes qui récupèrent eux-mêmes une URL peuvent appliquer leurs propres règles réseau : ne pas considérer ce contrôle comme une garantie complète contre ces scénarios.
- Ne jamais enregistrer dans les journaux une clé API, un jeton, une URL contenant des identifiants ou des données client sensibles.

## Politique robots.txt
- L'analyse du site consulte `robots.txt` avant la lecture HTML, la capture ou PageSpeed. Un chemin interdit est ignoré sans pénalité de score ; un fichier inaccessible, illisible ou une réponse de proxy ambiguë entraîne une suspension prudente du crawl.
- Le lecteur HTML utilise Jina Reader avec l'option de respect de robots et n'utilise plus le fallback AllOrigins pour le HTML.
- La vérification robots est faite avant de transmettre l'URL aux services tiers. AuditIA ne contrôle toutefois pas le User-Agent ni le comportement interne de WordPress mShots ou PageSpeed ; leur conformité robots exacte n'est pas garantie. Cette limite doit rester visible dans la documentation et les rapports.
- `llms.txt` n'est lu que si son chemin est autorisé par la politique robots.
- Le parser borne la taille du fichier et combine les groupes User-agent correspondants. Les règles `Allow` et `Disallow` sont évaluées par spécificité ; les égalités favorisent `Allow`.

## Conformité et publication
Aucun fichier dédié aux mentions légales, à la politique de confidentialité/RGPD ou aux cookies n'a été trouvé dans le dépôt au moment de ce contrôle. Ne pas présenter AuditIA comme prêt à être commercialisé tant que les coordonnées réelles de l'éditeur, les traitements, les services tiers, les cookies/traceurs et les obligations légales applicables n'ont pas été vérifiés et documentés. Ne pas inventer ces informations.

## Vérifications recommandées
- Dans Supabase Auth, vérifier l'activation de la protection contre les mots de passe compromis (« Leaked password protection »).
- Avant toute migration de secrets ou évolution du crawl, tester sur fixtures locales, préserver les données existantes et vérifier les quotas des services tiers.