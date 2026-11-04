// AuditIA — point d'entrée de la NOUVELLE interface.
// Lot 1 : authentification réelle (Supabase) et protection de la coquille.
// Lot 2 : accueil, liste des clients et fiche client alimentés par les données réelles.
// Lot 3 : section Prospects (recherche de commerces, commerces proches, ajout manuel avec contrôle des doublons).
// Lot 4 : audits complets (lancement, progression réelle, dossier d'audit avec score, plan d'action et recommandations).
// Lot 5 : rapports PDF et graphiques. Lot 6 : réglages (profil, marque, état des services).
import { NAV, emptyState, spinnerCard, errorCard } from './components/ui.js';
import { mobileShell } from './layout-mobile.js';
import { desktopShell } from './layout-desktop.js';
import { homeMobile, homeDesktop } from './views/home.js';
import { clientsView, clientsResultsHtml } from './views/clients.js';
import { clientDetailView } from './views/client-detail.js';
import { createSearchController } from './search-controller.js';
import { createAuditController } from './audit-controller.js';
import { createReportController } from './report-controller.js';
import { auditsView, auditDossierView } from './views/audits.js';
import { createSettingsController } from './settings-controller.js';
import { authScreen, authLoading, authError } from './screens/auth.js';
import { loadWorkspaceData, dataErrorMessage } from '../data/queries.js';
import { getAuthClient } from '../auth/client.js';
import { NOT_ALLOWED, createAuthService, parseAuthLink } from '../auth/service.js';

const root = document.getElementById('app');
const wide = window.matchMedia('(min-width: 900px)');
const TITLES = Object.fromEntries(NAV.map(n => [n.id, n.label]));
const state = {
  user: null, view: 'home', clientId: null, recoveryShown: false,
  auditId: null,
  data: { status: 'idle', clients: [], audits: [], error: '' },
  ui: { q: '', tier: '', sort: 'urgence' }, // filtres de la liste des clients
  gen: 0, // numéro de chargement : un résultat périmé (déconnexion, nouveau chargement) est ignoré
};
const LIVE_VIEWS = ['home', 'clients', 'client', 'prospects', 'audits', 'audit'];

// Les e-mails de réinitialisation renvoient vers la racine du site (ancienne interface incluse).
// Pour qu'ils reviennent sur cette page, l'URL devrait être autorisée dans Supabase (réglage distant, non modifié ici).
const REDIRECT_URL = location.origin + location.pathname.replace(/[^/]*$/, '');
// Rechargement silencieux (sans écran de chargement) : sert à vérifier les doublons et à mettre les listes à jour
async function silentReload() {
  const loaded = await loadWorkspaceData(await getAuthClient());
  if (!state.user) throw new Error('session terminée');
  state.data = { status: 'ready', ...loaded, error: '' };
  return loaded;
}
// Section Prospects : le contrôleur garde son propre état ; il lit les clients pour repérer les doublons
const search = createSearchController({
  getUser: () => state.user,
  getClients: () => state.data.clients,
  getSupabase: () => getAuthClient(),
  rerender: () => { if (state.user && state.view === 'prospects') renderWorkspace(); },
  reload: silentReload,
});
// Audits complets : le moteur garde l'état de l'analyse, l'écran peut être quitté et rouvert pendant qu'elle tourne.
// On ne recompose pas Prospects (formulaires en cours de saisie) ; les autres écrans se mettent à jour.
const audits = createAuditController({
  getUser: () => state.user,
  getData: () => state.data,
  setData: d => { if (state.user) state.data = d; },
  getSupabase: () => getAuthClient(),
  rerender: () => { if (state.user && state.data.status === 'ready' && state.view !== 'prospects') renderWorkspace(); },
  reload: silentReload,
  open: id => { state.view = 'audit'; state.auditId = id; window.scrollTo(0, 0); },
});
// Rapports PDF (lot 5) : aperçu, téléchargement, partage. Lecture seule : aucune écriture, aucun nouvel audit.
const report = createReportController({ getData: () => state.data, runningId: () => audits.runningId() });
document.addEventListener('click', event => { report.onClick(event.target); });
// Réglages (lot 6) : profil, marque, état des services. Écriture réservée à l'administrateur, clés jamais affichées ni réécrites.
const settings = createSettingsController({
  getUser: () => state.user,
  getSupabase: () => getAuthClient(),
  rerender: () => { if (state.user && state.view === 'settings') renderWorkspace(); },
});
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

function bodyFor(isWide) {
  if (state.view === 'settings') return settings.html();
  if (!LIVE_VIEWS.includes(state.view)) return placeholder();
  const d = state.data;
  if (d.status === 'idle' || d.status === 'loading') return spinnerCard('Chargement de vos données…');
  if (d.status === 'error') return errorCard({ title: 'Chargement impossible', text: d.error });
  if (state.view === 'client') {
    const c = d.clients.find(x => String(x.id) === String(state.clientId));
    if (c) return clientDetailView(c, d.audits, audits);
    state.view = 'clients'; // client introuvable (supprimé ?) : retour à la liste
  }
  if (state.view === 'clients') return clientsView(d, state.ui);
  if (state.view === 'prospects') return search.html();
  if (state.view === 'audits') return auditsView(d, audits.filter(), audits.notice(), audits.snapshot());
  if (state.view === 'audit') {
    const a = d.audits.find(x => String(x.id) === String(state.auditId));
    if (a) return auditDossierView(a, d.clients.find(x => String(x.id) === String(a.client_id)) || null, d, audits);
    state.view = 'audits'; // dossier introuvable (supprimé ?) : retour à la liste
    return auditsView(d, audits.filter(), audits.notice(), audits.snapshot());
  }
  return isWide ? homeDesktop(d) : homeMobile(d);
}

function renderWorkspace() {
  if (!state.user) { showAuth('signin'); return; } // protection : jamais de contenu sans session valide
  const isWide = wide.matches;
  const body = bodyFor(isWide);
  const active = state.view === 'client' ? 'clients' : state.view === 'audit' ? 'audits' : state.view;
  const title = state.view === 'client' ? 'Fiche client' : state.view === 'audit' ? 'Dossier d’audit' : TITLES[state.view];
  const params = { title, active, body };
  root.innerHTML = isWide
    ? desktopShell({ ...params, account: { email: state.user.email || '' } })
    : mobileShell(params);
  document.documentElement.dataset.layout = isWide ? 'desktop' : 'mobile';
  if (state.view === 'prospects' && state.data.status === 'ready') search.mounted();
}

// Chargement des clients et des audits (lecture seule). Un résultat arrivé après une déconnexion est ignoré.
async function loadData() {
  const gen = ++state.gen;
  state.data = { status: 'loading', clients: [], audits: [], error: '' };
  renderWorkspace();
  try {
    const client = await getAuthClient();
    const loaded = await loadWorkspaceData(client);
    if (gen !== state.gen || !state.user) return;
    state.data = { status: 'ready', ...loaded, error: '' };
  } catch (err) {
    if (gen !== state.gen || !state.user) return;
    state.data = { status: 'error', clients: [], audits: [], error: dataErrorMessage(err) };
  }
  renderWorkspace();
}

function enter(user) {
  state.user = user;
  state.view = 'home';
  state.clientId = null;
  state.ui = { q: '', tier: '', sort: 'urgence' };
  search.reset();
  report.close(); audits.reset(); settings.reset();
  window.scrollTo(0, 0);
  loadData();
}

function refreshClientResults() {
  const el = document.getElementById('clientsResults');
  if (el) el.innerHTML = clientsResultsHtml(state.data, state.ui);
  const input = document.querySelector('[data-client-filter]');
  if (input && input.value !== state.ui.q) input.value = state.ui.q;
}

async function logout() {
  state.user = null;
  state.gen++; // annule un chargement en cours
  search.reset(); // vide les résultats, la clé et les recherches en cours
  report.close(); audits.reset(); settings.reset();
  state.data = { status: 'idle', clients: [], audits: [], error: '' };
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
  if (!state.user) return;
  if (audits.onClick(t)) return;
  if (search.onClick(t)) return;
  if (settings.onClick(t)) return;
  const oa = t.closest('[data-open-audit]');
  if (oa) { state.view = 'audit'; state.auditId = oa.dataset.openAudit; renderWorkspace(); window.scrollTo(0, 0); return; }
  const open = t.closest('[data-open-client]');
  if (open) { state.view = 'client'; state.clientId = open.dataset.openClient; renderWorkspace(); window.scrollTo(0, 0); return; }
  if (t.closest('[data-reload]')) { loadData(); return; }
  const tier = t.closest('[data-client-tier]');
  if (tier) { const k = tier.dataset.clientTier; state.ui.tier = state.ui.tier === k ? '' : k; refreshClientResults(); return; }
  const chip = t.closest('[data-client-chip]');
  if (chip) { state.ui.q = chip.dataset.clientChip; refreshClientResults(); return; }
  const nav = t.closest('[data-nav]');
  if (nav) { state.view = nav.dataset.nav; if (state.view === 'settings') settings.open(); renderWorkspace(); window.scrollTo(0, 0); }
});

// Recherche et tri des clients : seuls les résultats sont recomposés, le champ garde le focus
root.addEventListener('input', event => {
  if (!state.user) return;
  if (event.target.matches('[data-client-filter]')) { state.ui.q = event.target.value; refreshClientResults(); return; }
  if (audits.onInput(event.target)) return;
  if (settings.onInput(event.target)) return;
  search.onInput(event.target);
});
root.addEventListener('change', event => {
  if (state.user && event.target.matches('[data-client-sort]')) { state.ui.sort = event.target.value; refreshClientResults(); }
});

root.addEventListener('submit', event => {
  const id = event.target.id;
  if (state.user && search.onSubmit(event.target)) { event.preventDefault(); return; }
  if (state.user && settings.onSubmit(event.target)) { event.preventDefault(); return; }
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
