# AuditIA — Étape 3 : nouveau design system et nouvelle coquille

Branche : `refonte/etape-3-design` (base : `refonte/etape-2-moteur`).

## Principe
- L'interface actuelle (`site/index.html`) n'est **pas modifiée**. La nouvelle interface vit dans `site/nouvelle-interface.html`, avec des données fictives. Retour arrière : supprimer cette page et `site/src/ui`, `site/src/styles`.
- Les styles utilisent le préfixe `--ds-` et les classes `.ds-*` : aucun conflit avec les anciennes feuilles de style.
- Les modules métier (étape 2) ne sont pas branchés sur la nouvelle interface.

## Fichiers
Créés :
- `site/nouvelle-interface.html` : page de démonstration (viewport-fit=cover, métadonnées Apple).
- `site/src/styles/tokens.css` : couleurs violettes et lavande, espacements, rayons, tailles, ombres, zones de sécurité iOS.
- `site/src/styles/base.css` : reset léger, typographie, focus visible, réduction des animations.
- `site/src/styles/components.css` : boutons, cartes, statistiques, badges de score, barres, listes, tableaux, états vides.
- `site/src/styles/mobile.css` : coquille mobile (< 900 px) : en-tête opaque, barre fixe en bas.
- `site/src/styles/desktop.css` : coquille ordinateur (≥ 900 px) : barre latérale fixe, colonnes.
- `site/src/ui/components/ui.js` : composants HTML (btn, card, stat, scoreBadge, bar, listItem, emptyState, demoBanner, icon) et `NAV`.
- `site/src/ui/layout-mobile.js`, `site/src/ui/layout-desktop.js` : coquilles.
- `site/src/ui/views/home.js` : accueil, deux compositions (`homeMobile`, `homeDesktop`).
- `site/src/ui/demo-data.js` : données de démonstration, identifiées comme telles.
- `site/src/ui/app-demo.js` (devenu `app.js` au lot 1) : point d’entrée ; choisit la coquille selon la largeur, gère la navigation.

Modifiés :
- `site/sw.js` : cache `auditia-v117`, précache des nouveaux fichiers.

Non modifiés : `site/index.html`, `site/src/core|audit|api|report`, Supabase, clés API.

## Ce qui est fait
- Accueil visuel (KPI, derniers audits, répartition des scores, actions à traiter) en mobile et en ordinateur.
- Navigation : barre fixe en bas (mobile), barre latérale (ordinateur). Les autres sections affichent un état vide « non branchée ».
- Bandeau « Démo » visible sur la page.

## Non fait (volontairement)
- Branchement des fonctionnalités métier (audits, recherches, PDF, prospection, Studio IA, O.C.A.).
- Remplacement de l'interface actuelle.
- Icônes et logo définitifs (les icônes sont simples, en SVG inline).

## Tests réalisés
- Syntaxe de tous les modules, imports relatifs résolus.
- Script de contrôle du workflow Pages (réplique) : 16 modules, 39 ressources de service worker, OK.
- Chromium, sans erreur console ni avertissement, sur iPhone 390×844, Android 412×915, tablette 1024×768, ordinateur 1440×900 :
  - aucun débordement horizontal ;
  - aucun texte sous 13 px ;
  - aucun `backdrop-filter` ;
  - barre mobile en position fixe, dernier bloc de contenu au-dessus de la barre ;
  - navigation entre sections fonctionnelle.
- Captures contrôlées visuellement (mobile et ordinateur).

## Points à valider / non vérifié
- Fidélité aux maquettes : les maquettes de l'étape 1 n'étaient pas dans le dépôt ; les couleurs suivent la description (violet profond, lavande, accents). À comparer avec les images d'origine.
- Service worker : seule la liste de précache a été vérifiée ; son enregistrement n'est pas activé sur la page de démo.
- Safari iPhone réel (barre d'adresse, zones de sécurité avec encoche) : non testé sur appareil.
- Publication GitHub Pages : non publiée.
- La règle `!important` présente dans `base.css` est la réduction des animations (accessibilité), voulue.
- Les barres de progression utilisent une variable CSS `--pct` posée en ligne (donnée dynamique).
