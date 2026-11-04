// AuditIA — point d'entrée de la NOUVELLE interface.
// Lot 1 : authentification réelle (Supabase) et protection de la coquille.
// Les écrans métier (accueil, clients, audits…) restent à brancher aux lots suivants :
// l'accueil affiche encore des données de démonstration, clairement signalées.
import { NAV, emptyState } from './components/ui.js';
import { mobileShell } from './layout-mobile.js';
import { desktopShell } from './layout-desktop.js';
import { homeMobile, homeDesktop } from './views/home.js';
import { accountView } from './views/account.js';
import { authScreen, authLoading, authError } from './screens/auth.js';
import { DEMO } from './demo-data.js';
import { getAuthClient } from '../auth/client.js';
import { NOT_ALLOWED, createAuthService, parseAuthLink } from '../auth/service.js';

const root = document.getElementById('app');
const wide = window.matchMedia('(min-width: 900px)');
const TITLES = Object.fromEntries(NAV.map(n => [n.id, n.label]));
const state = { user: null, active: 'home', recoveryShown: false };

// Les e-mails de réinitialisation renvoient vers la racine du site (ancienne interface incluse).
// Pour qu'ils reviennent sur cette page, l'URL devrait être autorisée dans Supabase (réglage distant, non modifié ici).
const REDIRECT_URL = location.origin + location.pathname.replace(/[^/]*$/, '');
const auth = createAuthService({ getClient: getAuthClient, redirectUrl: REDIRECT_URL });

/* ---------- Écrans de connexion ---------- */
function showAuth(mode, msg = '', kind = 'error') {
  root.innerHTML = authScreen(mode, msg, kind);
  document.documentElement.dataset.layout = 'auth';
  window.scrollTo(0, 0);
  const first = root.querySelector('input');
  if (first) setTimeout(() => first.focus(), 60);
}

function setMsg(text, kind) {
  const el = document.getElementById('authMsg');
  if (!el) return;
  el.textContent = text || '';
  el.className = 'ds-msg' + (text ? (kind === 'ok' ? ' ds-msg--ok' : ' ds-msg--error') : '');
}

function busy(btn, on, label) {
  if (!btn) return;
  btn.disabled = on;
  if (on) { btn.dataset.l = btn.textContent; btn.textContent = label || 'Veuillez patienter…'; }
  else if (btn.dataset.l) btn.textContent = btn.dataset.l;
}

const val = id => (document.getElementById(id)?.value || '').trim();

/* ---------- Espace protégé ---------- */
function placeholder() {
  return emptyState({
    title: 'Section non branchée',
    text: "Cette section sera branchée aux prochains lots. Pour l'instant, utilisez l'interface actuelle.",
  });
}

function renderWorkspace() {
  if (!state.user) { showAuth('signin'); return; } // protection : jamais de contenu sans session valide
  const isWide = wide.matches;
  let body;
  if (state.active === 'home') body = isWide ? homeDesktop(DEMO) : homeMobile(DEMO);
  else if (state.active === 'settings') body = accountView(state.user);
  else body = placeholder();
  const params = { title: TITLES[state.active], active: state.active, body };
  root.innerHTML = isWide
    ? desktopShell({ ...params, account: { email: state.user.email || '' } })
    : mobileShell(params);
  document.documentElement.dataset.layout = isWide ? 'desktop' : 'mobile';
}

function enter(user) {
  state.user = user;
  state.active = 'home';
  renderWorkspace();
  window.scrollTo(0, 0);
}

async function logout() {
  state.user = null;
  await auth.signOut();
  showAuth('signin');
}

/* ---------- Formulaires ---------- */
async function onSignin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  busy(btn, true, 'Connexion…'); setMsg('');
  const r = await auth.signIn(val('siEmail'), document.getElementById('siPwd').value);
  busy(btn, false);
  if (!r.ok) { setMsg(r.message); return; }
  enter(r.user);
}

async function onForgot(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  busy(btn, true, 'Envoi…'); setMsg('');
  const r = await auth.sendReset(val('foEmail'));
  busy(btn, false);
  setMsg(r.message, r.ok ? 'ok' : 'error');
}

async function onReset(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  busy(btn, true, 'Enregistrement…'); setMsg('');
  const r = await auth.setNewPassword(document.getElementById('rPwd').value, document.getElementById('rPwd2').value);
  busy(btn, false);
  if (!r.ok) {
    if (r.message === NOT_ALLOWED) { showAuth('signin', r.message); return; }
    setMsg(r.message); return;
  }
  if (r.user) { enter(r.user); return; }
  showAuth('signin', r.message, 'ok');
}

/* ---------- Événements (délégation sur la racine) ---------- */
root.addEventListener('click', event => {
  const t = event.target;
  const go = t.closest('[data-go]');
  if (go) { showAuth(go.dataset.go); return; }
  const sp = t.closest('[data-showpwd]');
  if (sp) {
    const input = document.getElementById(sp.dataset.showpwd);
    if (input) {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      sp.textContent = show ? 'Masquer' : 'Afficher';
      sp.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
    }
    return;
  }
  if (t.closest('[data-retry]')) { boot(); return; }
  if (t.closest('[data-logout]')) { logout(); return; }
  const nav = t.closest('[data-nav]');
  if (nav && state.user) { state.active = nav.dataset.nav; renderWorkspace(); window.scrollTo(0, 0); }
});

root.addEventListener('submit', event => {
  const id = event.target.id;
  if (id === 'fSignin') onSignin(event);
  else if (id === 'fForgot') onForgot(event);
  else if (id === 'fReset') onReset(event);
});

// Changement de largeur : on recompose la coquille, sans toucher aux formulaires en cours de saisie
wide.addEventListener('change', () => { if (state.user) renderWorkspace(); });

/* ---------- Démarrage ---------- */
async function boot() {
  root.innerHTML = authLoading();
  document.documentElement.dataset.layout = 'auth';
  try {
    await getAuthClient();
    const link = parseAuthLink(location.hash, location.search);
    await auth.watch(
      () => { if (!state.recoveryShown) { state.recoveryShown = true; showAuth('reset'); } },
      () => { if (state.user) { state.user = null; showAuth('signin', 'Votre session s’est terminée. Reconnectez-vous.'); } },
    );
    const session = await auth.peekSession();
    if (link.dirty && link.type !== 'recovery') history.replaceState(null, '', location.pathname);
    if (link.error) { showAuth('expired'); return; }
    if (link.type === 'recovery') { state.recoveryShown = true; showAuth('reset'); return; }
    if (session && session.user) {
      const r = await auth.acceptUser(session.user);
      if (r.ok) { enter(r.user); return; }
      showAuth('signin', r.message);
      return;
    }
    showAuth('signin');
  } catch (err) {
    root.innerHTML = authError('Connexion impossible. Vérifiez votre réseau internet.');
  }
}

boot();
