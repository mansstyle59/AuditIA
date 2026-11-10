# AuditIA — améliorations du moteur d'audit (2026-11-10)

Branche locale : `audit/ameliorations-2026-11-10` (modifications non commitées, non poussées).

## Ce qui change

1. **Lecture multi-pages** : l'accueil est lu, puis jusqu'à 3 pages internes (services, tarifs, contact, à propos, FAQ, horaires) du même domaine. Leur contenu est ajouté à l'analyse (`site/src/api/web-read.js`, `readSiteHtml`).
2. **Plus de relais tiers pour les sites** : `allorigins`, `r.jina.ai` et le repli SIRENE ont été retirés. Les pages sont lues par la fonction serveur `auditia-secure-api`, action `site_read`. Elle refuse les adresses internes (localhost, IP privées, noms `.local`/`.internal`), contrôle chaque redirection et borne la taille lue.
3. **Pilier GEO recentré** : la réputation (avis, fiche Google, annuaires, réseaux, SIRENE) passe dans le pilier SEO. Le pilier GEO ne garde que la lisibilité pour les IA (données structurées, contenu, robots IA, llms.txt, FAQ, date, cohérence NAP).
   - **Attention** : les scores existants changent, car le calcul se fait à la volée.
   - Non fait : le test réel de citation dans un assistant IA. Il demande des appels payants par audit et une décision d'interface.
4. **Une seule liste d'actions** : les recommandations de conseil sont filtrées pour ne pas répéter les contrôles déjà présents dans le « Plan d'action » (`unifiedRecommendations`, `site/src/audit/scoring.js`).
5. **Recherche web plus fiable** :
   - côté serveur, l'action `web_search` utilise l'API officielle Brave si `BRAVE_SEARCH_API_KEY` est défini ;
   - côté backend, `build_default_provider` choisit Brave si la clé existe, sinon DuckDuckGo, avec une seule nouvelle tentative sur erreur transitoire ;
   - les résultats DuckDuckGo sont signalés comme « indicatifs » dans la réponse.
6. **Tests** : `node --test site/tests/*.test.mjs` (9 tests : moteur de score et recommandations) et `pytest` côté backend (5 tests). Un workflow CI `js-tests.yml` les lance.

## À faire avant de fusionner

- Déployer la fonction `auditia-secure-api` mise à jour sur Supabase, puis ajouter le secret `BRAVE_SEARCH_API_KEY` (sinon la recherche web renvoie « non configurée » et la découverte des réseaux et annuaires est vide).
- Tester sur un vrai site : certaines pages en JavaScript ne renvoient pas leur contenu sans rendu. `r.jina.ai` les rendait parfois, ce qui n'est plus le cas.
- Deno n'est pas installé dans l'environnement de travail : `site_read` et `web_search` n'ont **pas** été exécutés.
- Résidu de sécurité : le contrôle des adresses se fait sur le nom d'hôte, pas sur la résolution DNS. Vérifier le réseau de sortie de Supabase.
- Capture d'écran : `fetchScreenshot` appelle désormais directement le service WordPress mShots. Si le navigateur bloque la requête (CORS), la capture disparaît du rapport.

## Non vérifié

Connexion réelle à Supabase, appels réels à Brave, lecture de sites réels, rendu du rapport PDF avec les nouveaux scores, Safari iPhone.
