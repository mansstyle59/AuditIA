// AuditIA — écrans de connexion (affichage uniquement, aucune logique d'accès).
// Les identifiants d'éléments (siEmail, siPwd, foEmail, rPwd, rPwd2, authMsg…) sont ceux de l'ancienne interface.
import { escHtml } from '../../core/utils.js';
import { landingScreen } from './landing.js';

const TAGLINE = 'Auditer mieux, décider plus clairement';

function brand() {
  return '<a class="ds-auth__brand" href="./" aria-label="AuditIA by AffiAds — accueil"><span class="ds-lockup"><img class="ds-lockup__mark" src="./auditia-mark.svg" alt="" width="56" height="56"><span class="ds-lockup__text"><b>AUDITIA</b><small>by AffiAds</small></span></span></a>';
}

function pwdField(id, label, autocomplete) {
  return `<label class="ds-field" for="${id}"><span class="ds-field__label">${label}</span>
    <span class="ds-pwd">
      <input class="ds-input" id="${id}" type="password" autocomplete="${autocomplete}" required minlength="8" autocapitalize="none" autocorrect="off" spellcheck="false">
      <button class="ds-pwd__toggle" type="button" data-showpwd="${id}" aria-label="Afficher le mot de passe">Afficher</button>
    </span></label>`;
}

function emailField(id) {
  return `<label class="ds-field" for="${id}"><span class="ds-field__label">Adresse e-mail</span>
    <input class="ds-input" id="${id}" type="email" inputmode="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="vous@exemple.fr" required></label>`;
}

function message(text, kind) {
  const cls = text ? (kind === 'ok' ? ' ds-msg--ok' : ' ds-msg--error') : '';
  return `<div class="ds-msg${cls}" id="authMsg" role="status" aria-live="polite">${escHtml(text || '')}</div>`;
}

function frame(inner) {
  return `<div class="ds-auth">
    <aside class="ds-auth__hero" aria-hidden="true">
      <p class="ds-auth__hero-title">${TAGLINE}</p>
      <p class="ds-auth__hero-text">Audits de visibilité numérique pour les commerces locaux : un espace privé pour suivre vos clients, vos audits et vos rapports.</p>
    </aside>
    <main class="ds-auth__main">${brand()}${inner}<p class="ds-auth__foot">AuditIA · ${TAGLINE}</p></main>
  </div>`;
}

export function authLoading() {
  return frame('<section class="ds-auth__card ds-auth__card--center" role="status" aria-live="polite"><span class="ds-spinner" aria-hidden="true"></span><p>Vérification de votre session…</p></section>');
}

export function authError(textMessage) {
  return frame(`<section class="ds-auth__card"><h1>Connexion impossible</h1><p class="ds-auth__lead">${escHtml(textMessage)}</p>
    <button class="ds-btn ds-btn--primary ds-btn--block" type="button" data-retry>Réessayer</button></section>`);
}

export function authScreen(mode, msg = '', kind = 'error') {
  if (mode === 'forgot') {
    return frame(`<section class="ds-auth__card"><h1>Mot de passe oublié</h1>
      <p class="ds-auth__lead">Indiquez votre adresse : vous recevrez un lien sécurisé pour choisir un nouveau mot de passe.</p>
      <form id="fForgot" novalidate>${emailField('foEmail')}
        <button class="ds-btn ds-btn--primary ds-btn--block" type="submit">Envoyer le lien</button>${message(msg, kind)}</form>
      <button class="ds-link" type="button" data-go="signin">← Retour à la connexion</button></section>`);
  }
  if (mode === 'reset') {
    return frame(`<section class="ds-auth__card"><h1>Nouveau mot de passe</h1>
      <p class="ds-auth__lead">Choisissez un nouveau mot de passe pour votre compte AuditIA.</p>
      <form id="fReset" novalidate>${pwdField('rPwd', 'Nouveau mot de passe', 'new-password')}${pwdField('rPwd2', 'Confirmer le mot de passe', 'new-password')}
        <p class="ds-auth__hint">8 caractères minimum, avec au moins une lettre et un chiffre.</p>
        <button class="ds-btn ds-btn--primary ds-btn--block" type="submit">Enregistrer</button>${message(msg, kind)}</form></section>`);
  }
  if (mode === 'expired') {
    return frame(`<section class="ds-auth__card"><h1>Lien expiré</h1>
      <p class="ds-auth__lead">Ce lien n’est plus valable : il a expiré ou a déjà été utilisé. Demandez-en un nouveau, ou connectez-vous si vous avez déjà un mot de passe.</p>
      <button class="ds-btn ds-btn--primary ds-btn--block" type="button" data-go="forgot">Recevoir un nouveau lien</button>
      <button class="ds-link" type="button" data-go="signin">Retour à la connexion</button></section>`);
  }
  // Connexion : page d'accueil publique, la carte de connexion (mêmes champs et mêmes identifiants) est en bas de page.
  return landingScreen({ loginCard: `<section class="ds-auth__card"><h2 class="ds-auth__title">Connexion</h2>
    <p class="ds-auth__lead">Retrouvez vos audits et votre espace de travail.</p>
    <form id="fSignin" novalidate>${emailField('siEmail')}${pwdField('siPwd', 'Mot de passe', 'current-password')}
      <button class="ds-btn ds-btn--primary ds-btn--block" type="submit">Se connecter</button>${message(msg, kind)}</form>
    <button class="ds-link" type="button" data-go="forgot">Mot de passe oublié ?</button></section>` });
}
