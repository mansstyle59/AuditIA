# AuditIA — Étape 2 : extraction du moteur (sans modification visuelle)

Branche de travail : `refonte/etape-2-moteur` — sauvegarde : `backup/avant-refonte-2026-11-04` (= `main`, intact).

## Principe
Le script `<script type="module">` de `site/index.html` importe désormais des **modules ES natifs** (`site/src/…`), sans build ni framework. Les fonctions extraites sont copiées **à l'identique** (même code, mêmes noms) ; seul l'emplacement change. Aucun changement visuel, aucune table / RLS / Edge Function / clé API touchée.

## Modules extraits
| Module | Exports |
|---|---|
| `src/core/config.js` | SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, ADMIN_EMAIL, checklistTemplate, KEY_NAMES, defaultSettings, API_FIELD, API_MODE |
| `src/core/utils.js` | brandColor, safeColor, escHtml, safeHttpUrl, keyHash, withTimeout, norm, siteHost, hexToRgb |
| `src/core/auth-helpers.js` | validEmail, pwdIssue, authError |
| `src/audit/site-analysis.js` | SOCIAL_RX, BOOKING_RX, TRACK_RX, CMS_RX, AI_BOTS, parseRobotsForAI, geoFromHtml, analyzeSite, GENERIC_NAME, businessInUrl |
| `src/audit/scoring.js` | targetKeywords, socialVisibility, businessAge, rankBadge, improvementPlan, visibilityAudit, visibilityVerdict, actionPlan, visibilityLabel, auditUnmeasured, auditActions, auditHasAnalysis |
| `src/api/places-model.js` | mapCategory, cityFromComponents, normalizePlace, nearbyOpportunity, parseNaturalLanguageTarget |
| `src/api/bodacc.js` | nvNorm, nvParse |
| `src/api/web-read.js` | fetchDomainDate, fetchSirene, readSiteText, fetchGeoFiles, readSiteHtml, fetchScreenshot |
| `src/api/claude.js` | claudeAssistWith(getClient, …) — le client est injecté ; `index.html` garde un adaptateur `claudeAssist` |
| `src/report/pdf-helpers.js` | pdfScoreCol, pdfKit, pdfFooter, pdfAuditiaMark, pdfHeadBand, pdfClientVerdict, pdfExecutiveSummary, pdfEvidenceQuality |

Fichiers adaptés : `site/index.html` (imports, déclarations retirées), `site/sw.js` (précache des modules), `.github/workflows/pages.yml` (validation des modules).

## Non extrait (risque) et méthode de migration
| Bloc | Raison | Méthode proposée |
|---|---|---|
| Client Supabase (`getClient`) | utilise `sb`, `window.supabase` | module `core/supabase.js` avec état interne + `getClient()` |
| Chargement / sauvegarde (`refreshData`, saves) | globals `appClient/appUser/appSettings` | objet `store` explicite, injecté |
| Recherches Places / proches / langage naturel / BODACC (appels réseau) | état UI `nl*`, `nearby*`, `nv*` | fonctions pures + callbacks de progression |
| `runFullAudit` | `fullAuditState`, timers, `renderApp` | orchestrateur avec callback `onProgress` |
| PDF (`buildPdfFull/Simple`, `exportReport`) | `appSettings`, `pdfBusy` | passer settings et audit en paramètres |
| Graphiques / fonctions `*Html` | purement affichage | à traiter avec la refonte visuelle |
| O.C.A. (`oca.js`) | localStorage + contexte Supabase | à injecter, après le client Supabase |

## Vérifications réalisées
Syntaxe (node --check), ESLint `no-undef`, contrôle imports/exports, chargement sous Node, équivalence fonctionnelle avec la version d'origine (entrées aléatoires, réseau simulé : 1 720 requêtes), enregistrement des appels jsPDF, navigateur Chrome (Playwright, réseau simulé) : 14 vues identiques, données d'audit identiques, PDF de même taille, 0 erreur console ; scénarios de connexion identiques ; validation du workflow Pages.

## Non vérifié
Connexion réelle à Supabase, appels réels aux API Google / BODACC / Edge Functions, Studio IA en conditions réelles, publication effective sur GitHub Pages, Safari iPhone.

## Tester
1. Servir `site/` (`python3 -m http.server -d site`) et ouvrir l'application : connexion, dossiers, recherche, audit, PDF, prospection.
2. Console du navigateur : aucune erreur attendue.

## Retour arrière
- Immédiat : ne pas fusionner la branche (`main` inchangé).
- Après fusion : `git revert` des commits `a02657f..bac524d`, ou restaurer depuis `backup/avant-refonte-2026-11-04`.
