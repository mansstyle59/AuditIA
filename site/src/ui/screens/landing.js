// AuditIA — page d'accueil publique (avant connexion) : composition marketing, affichage uniquement.
// Mobile et ordinateur ont des compositions différentes (menu, illustration, grille) ; le texte est commun.
// Aucune statistique commerciale : seuls des faits du produit sont affichés. Les rapports montrés sont des exemples fictifs.
import { laptopSvg, phoneSvg, featIcon, reportPreviewHtml } from '../illustrations.js';

const TAGLINE = 'Auditer mieux, décider plus clairement';

const NAV = [
  { id: 'top', label: 'Accueil' },
  { id: 'fonctionnalites', label: 'Fonctionnalités' },
  { id: 'exemples', label: 'Exemples de rapports' },
  { id: 'contenu-audit', label: 'Contenu de l’audit' },
  { id: 'apropos', label: 'À propos' },
];

const WHY = [
  { ico: 'search', title: 'Audit complet', text: 'Analyse de votre visibilité et de votre présence en ligne.' },
  { ico: 'chart', title: 'Rapport pro', text: 'Un rapport clair, illustré et prêt à remettre à vos clients.' },
  { ico: 'bolt', title: 'Plan d’action', text: 'Des recommandations concrètes et priorisées pour progresser.' },
  { ico: 'target', title: 'Visibilité locale', text: 'Repérez ce qui freine un commerce local et ce qu’il faut corriger en premier.' },
];

const FACTS = [
  { ico: 'chart', value: 'SEO + GEO', label: 'Deux axes d’analyse' },
  { ico: 'target', value: '/100', label: 'Score et plan d’action' },
  { ico: 'shop', value: 'PDF', label: 'Rapport à remettre' },
];

const FOR_WHO = [
  { ico: 'shop', label: 'Commerçants indépendants' },
  { ico: 'chef', label: 'Restaurants & Cafés' },
  { ico: 'tools', label: 'Artisans & Services' },
];

const TABS = [
  { id: 'top', label: 'Accueil', d: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>' },
  { id: 'fonctionnalites', label: 'Fonctions', d: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>' },
  { id: 'exemples', label: 'Exemples', d: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>' },
  { id: 'connexion', label: 'Connexion', d: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' },
];

const svgIcon = d => `<svg class="ds-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
const scrollBtn = (id, label, cls) => `<button type="button" class="${cls}" data-scroll="${id}">${label}</button>`;

function header() {
  return `<header class="ds-l-head" id="top">
    <div class="ds-l-wrap ds-l-head__in">
      <a class="ds-l-logo" href="./" aria-label="AuditIA by AffiAds — accueil"><span class="ds-lockup"><img class="ds-lockup__mark" src="./auditia-mark.svg" alt="" width="56" height="56"><span class="ds-lockup__text"><b>AUDITIA</b><small>by AffiAds</small></span></span></a>
      <nav class="ds-l-nav" aria-label="Navigation du site">${NAV.map((n, i) => scrollBtn(n.id, n.label, 'ds-l-nav__item' + (i === 0 ? ' is-active' : ''))).join('')}</nav>
      <div class="ds-l-cta">${scrollBtn('connexion', 'Connexion', 'ds-btn ds-l-btn')}${scrollBtn('connexion', 'Lancer un audit', 'ds-btn ds-btn--primary ds-l-btn')}</div>
      <button type="button" class="ds-l-burger" data-menu-toggle aria-expanded="false" aria-controls="lMenu" aria-label="Ouvrir le menu">${svgIcon('<path d="M4 7h16M4 12h16M4 17h16"/>')}</button>
    </div>
    <nav class="ds-l-menu" id="lMenu" aria-label="Menu" hidden>
      ${NAV.map(n => scrollBtn(n.id, n.label, 'ds-l-menu__item')).join('')}
      ${scrollBtn('connexion', 'Connexion', 'ds-l-menu__item ds-l-menu__item--cta')}
    </nav>
  </header>`;
}

function hero() {
  return `<section class="ds-l-hero ds-l-wrap" aria-labelledby="lTitle">
    <div class="ds-l-hero__text">
      <p class="ds-l-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c.6 5.2 3.2 7.8 8.4 8.4-5.2.6-7.8 3.2-8.4 8.4-.6-5.2-3.2-7.8-8.4-8.4C8.8 10.8 11.4 8.2 12 3z" fill="currentColor"/></svg>Portfolio – AuditIA</p>
      <h1 id="lTitle" class="ds-l-title">L’outil d’audit complet pour les <span class="ds-l-grad">commerçants</span></h1>
      <p class="ds-l-lead">Analyse, visibilité, performance et plan d’action pour développer votre activité locale.</p>
      <div class="ds-l-actions">${scrollBtn('fonctionnalites', 'Découvrir AuditIA', 'ds-btn ds-btn--primary ds-l-btn ds-l-btn--lg')}${scrollBtn('exemples', 'Voir un exemple', 'ds-btn ds-l-btn ds-l-btn--lg')}</div>
      <ul class="ds-l-facts">${FACTS.map(f => `<li>${featIcon(f.ico)}<strong>${f.value}</strong><span>${f.label}</span></li>`).join('')}</ul>
    </div>
    <div class="ds-l-hero__visual">${laptopSvg()}${phoneSvg()}<p class="ds-l-caption">Illustration de démonstration — exemple fictif</p></div>
  </section>`;
}

function why() {
  return `<section class="ds-l-split ds-l-wrap" id="fonctionnalites" aria-labelledby="lWhy">
    <div>
      <h2 id="lWhy" class="ds-l-h2">Pourquoi choisir AuditIA ?</h2>
      <ul class="ds-l-why">${WHY.map(w => `<li class="ds-l-why__card">${featIcon(w.ico)}<h3>${w.title}</h3><p>${w.text}</p></li>`).join('')}</ul>
    </div>
    <div id="exemples">
      <h2 class="ds-l-h2">Aperçu d’un rapport AuditIA</h2>
      ${reportPreviewHtml()}
    </div>
  </section>`;
}

function forWho() {
  return `<section class="ds-l-forwho ds-l-wrap" aria-labelledby="lFor">
    <h2 id="lFor" class="ds-l-h2">Pour qui ?</h2>
    <ul class="ds-l-for">${FOR_WHO.map(f => `<li class="ds-l-for__card">${featIcon(f.ico)}<span>${f.label}</span></li>`).join('')}</ul>
  </section>`;
}


function auditDetails() {
  const areas = [
    ['search', 'Fiche établissement', 'Informations, catégories, coordonnées, horaires et cohérence des données publiques.'],
    ['chart', 'Référencement local', 'Présence locale, pages utiles, titres, contenus et éléments SEO accessibles.'],
    ['target', 'Visibilité & concurrence', 'Repères de visibilité et comparaison des informations disponibles, sans promesse de classement.'],
    ['chef', 'Avis & confiance', 'Volume et qualité apparente des avis, réponses et signaux de confiance visibles.'],
    ['bolt', 'Performance du site', 'Temps de chargement et indicateurs techniques disponibles, notamment via PageSpeed.'],
    ['tools', 'Priorités d’amélioration', 'Actions classées par impact estimé, effort et urgence pour guider les prochaines étapes.'],
  ];
  const steps = [
    ['01', 'Choisissez le commerce', 'Recherchez l’établissement ou renseignez ses informations principales.'],
    ['02', 'Lancez l’analyse', 'AuditIA rassemble les données accessibles et évalue les différents axes.'],
    ['03', 'Passez à l’action', 'Consultez le score, les constats et les recommandations dans le dossier et le PDF.'],
  ];
  return `<section class="ds-l-wrap ds-l-details" id="contenu-audit" aria-labelledby="lDetails">
    <h2 id="lDetails" class="ds-l-h2">Que contient un audit AuditIA ?</h2>
    <p class="ds-l-section-lead">Une vue structurée de la présence en ligne du commerce, avec des constats compréhensibles et des pistes concrètes.</p>
    <ul class="ds-l-audit-grid">${areas.map(([ico,title,text]) => `<li class="ds-l-audit-card">${featIcon(ico)}<h3>${title}</h3><p>${text}</p></li>`).join('')}</ul>
    <div class="ds-l-deliverables">
      <div><span class="ds-l-mini-label">LIVRABLES</span><h3>Des résultats faciles à exploiter</h3><p>Retrouvez les éléments clés dans l’espace AuditIA et préparez un rapport PDF professionnel à partager avec votre client.</p></div>
      <ul class="ds-l-deliver-list">
        <li><strong>Score sur 100</strong><span>Un repère synthétique, à lire avec le détail des critères.</span></li>
        <li><strong>Constats et points à améliorer</strong><span>Les éléments repérés pendant l’analyse, avec leur contexte.</span></li>
        <li><strong>Plan d’action priorisé</strong><span>Des recommandations organisées pour avancer étape par étape.</span></li>
      </ul>
    </div>
  </section>
  <section class="ds-l-wrap ds-l-process" aria-labelledby="lProcess">
    <h2 id="lProcess" class="ds-l-h2">Simple, de la recherche au rapport</h2>
    <ol class="ds-l-steps">${steps.map(([num,title,text]) => `<li><span class="ds-l-step-num">${num}</span><div><h3>${title}</h3><p>${text}</p></div></li>`).join('')}</ol>
    <p class="ds-l-disclaimer">Les résultats dépendent des informations accessibles et des services connectés. Un score est un indicateur d’aide à la décision, pas une garantie de positionnement Google ni de croissance commerciale.</p>
  </section>`;
}

function cta() {
  return `<section class="ds-l-wrap"><div class="ds-l-banner">
    <div class="ds-l-banner__ico">${featIcon('chart')}</div>
    <div class="ds-l-banner__text"><h2>Passez à l’action avec AuditIA</h2><p>Obtenez un audit professionnel et un plan personnalisé pour développer votre activité.</p></div>
    ${scrollBtn('connexion', 'Lancer un audit maintenant →', 'ds-btn ds-btn--primary ds-l-btn ds-l-btn--lg')}
  </div></section>`;
}

function about() {
  return `<section class="ds-l-wrap ds-l-about" id="apropos" aria-labelledby="lAbout">
    <h2 id="lAbout" class="ds-l-h2">À propos</h2>
    <p>AuditIA, by AffiAds, est un assistant de visibilité locale : il analyse la présence en ligne d’un commerce (fiche Google, site web, référencement, visibilité dans les outils d’IA), puis prépare un rapport PDF et un plan d’action.</p>
  </section>`;
}

export function landingScreen({ loginCard }) {
  return `<div class="ds-landing">
    ${header()}
    <main>
      ${hero()}
      ${why()}
      ${forWho()}
      ${auditDetails()}
      ${cta()}
      ${about()}
      <section class="ds-l-login ds-l-wrap" id="connexion" aria-label="Connexion">${loginCard}</section>
    </main>
    <footer class="ds-l-foot ds-l-wrap"><p>AuditIA · ${TAGLINE}</p><p>Les illustrations et rapports présentés sont des exemples fictifs de démonstration.</p></footer>
    <nav class="ds-l-tabbar" aria-label="Navigation principale">${TABS.map((t, i) => `<button type="button" class="ds-l-tab${i === 0 ? ' is-active' : ''}" data-scroll="${t.id}">${svgIcon(t.d)}<span>${t.label}</span></button>`).join('')}</nav>
  </div>`;
}

// Interactions de la page publique (défilement, menu). Renvoie true si le clic a été traité.
export function landingClick(target, root) {
  const toggle = target.closest('[data-menu-toggle]');
  const menu = root.querySelector('#lMenu');
  if (toggle && menu) {
    const open = menu.hidden;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    return true;
  }
  const go = target.closest('[data-scroll]');
  if (!go || !root.querySelector('.ds-landing')) return false;
  const id = go.dataset.scroll;
  if (menu && !menu.hidden) {
    menu.hidden = true;
    const t = root.querySelector('[data-menu-toggle]');
    if (t) { t.setAttribute('aria-expanded', 'false'); t.setAttribute('aria-label', 'Ouvrir le menu'); }
  }
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior = smooth ? 'smooth' : 'auto';
  if (id === 'top') window.scrollTo({ top: 0, behavior });
  else { const el = root.querySelector('#' + id); if (el) el.scrollIntoView({ behavior, block: 'start' }); }
  root.querySelectorAll('.ds-l-tab, .ds-l-nav__item').forEach(b => b.classList.toggle('is-active', b.dataset.scroll === id));
  return true;
}
