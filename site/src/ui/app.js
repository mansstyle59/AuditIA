// AuditIA — point d'entrée de la NOUVELLE interface.
// Lot 1 : authentification réelle (Supabase) et protection de la coquille.
// Lot 2 : accueil, liste des clients et fiche client alimentés par les données réelles.
// Lot 3 : section Prospects (recherche de commerces, commerces proches, ajout manuel avec contrôle des doublons).
// Lot 4 : audits complets (lancement, progression réelle, dossier d'audit avec score, plan d'action et recommandations).
// Lot 5 : rapports PDF et graphiques. Lot 6 : réglages (profil, marque, état des services).
import { NAV, emptyState, spinnerCard, errorCard, btn } from './components/ui.js';
import { mobileShell } from './layout-mobile.js';
import { desktopShell } from './layout-desktop.js';
import { bureauHomeMobile, bureauHomeDesktop, homeLiveInner, homeHeaderExtra, HOME_SUBTITLE } from './views/bureau-home.js';
import { DEFAULT_PERIOD, PERIODS } from '../data/home-metrics.js';
import { dashboardView } from './views/dashboard.js';
import { prospectsCsv } from '../data/dashboard-metrics.js';
import { statusOf } from './bureau-store.js';
import { auditHasAnalysis } from '../audit/scoring.js';
import { clientsView, clientsResultsHtml } from './views/clients.js';
import { clientDetailView } from './views/client-detail.js';
import { createSearchController } from './search-controller.js';
import { createAuditController } from './audit-controller.js';
import { createReportController } from './report-controller.js';
import { auditsView, auditDossierView } from './views/audits.js';
import { createSettingsController } from './settings-controller.js';
import { createBingController } from './bing-controller.js';
import { createBureauController } from './bureau-controller.js';
import { authScreen, authLoading, authError } from './screens/auth.js';
import { landingClick } from './screens/landing.js';
import { loadWorkspaceData, dataErrorMessage } from '../data/queries.js';
import { loadBrand } from '../data/settings.js';
import { defaultBrand } from '../settings/brand.js';
import { paintBrand } from './components/brand.js';
import { getAuthClient } from '../auth/client.js';
import { NOT_ALLOWED, createAuthService, parseAuthLink } from '../auth/service.js';

const root = document.getElementById('app');

// Thème persistant : sombre par défaut pour ne pas modifier l'apparence historique.
const THEME_KEY = 'auditia-theme';
function readThemePreference() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  } catch {
    return 'dark';
  }
}
function applyTheme(theme, persist = true) {
  const selected = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = selected;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', selected === 'light' ? '#F7F5FC' : '#0A0326');
  if (persist) {
    try { localStorage.setItem(THEME_KEY, selected); } catch { /* stockage indisponible : thème conservé pour la session */ }
  }
  syncThemeButtons();
}
// Le bouton annonce le thème vers lequel on bascule ; à rappeler après chaque recomposition de la coquille.
function syncThemeButtons() {
  const selected = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  root.querySelectorAll('[data-theme-toggle]').forEach(button => {
    const next = selected === 'light' ? 'dark' : 'light';
    button.textContent = next === 'light' ? '☀️ Thème clair' : '🌙 Thème sombre';
    button.setAttribute('aria-label', next === 'light' ? 'Passer au thème clair' : 'Passer au thème sombre');
    button.setAttribute('aria-pressed', String(selected === 'light'));
  });
}
applyTheme(readThemePreference(), false);
const wide = window.matchMedia('(min-width: 900px)');
const TITLES = Object.fromEntries(NAV.map(n => [n.id, n.label]));
const state = {
  user: null, view: 'home', clientId: null, recoveryShown: false,
  auditId: null,
  data: { status: 'idle', clients: [], audits: [], error: '' },
  ui: { q: '', tier: '', sort: 'urgence', period: DEFAULT_PERIOD, dbWeeks: 8 }, // filtres de la liste des clients et période du bureau
  brand: defaultBrand(), // marque enregistrée (réglages) ; marque par défaut si absente
  gen: 0, // numéro de chargement : un résultat périmé (déconnexion, nouveau chargement) est ignoré
};
const LIVE_VIEWS = ['home', 'dashboard', 'clients', 'client', 'prospects', 'bureau', 'messages', 'audits', 'audit'];

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
const report = createReportController({ getBrand: () => state.brand, getData: () => state.data, runningId: () => audits.runningId() });
document.addEventListener('click', event => { report.onClick(event.target); });
// Réglages (lot 6) : profil, marque, état des services. Écriture réservée à l'administrateur, clés jamais affichées ni réécrites.
const settings = createSettingsController({
  getUser: () => state.user,
  getSupabase: () => getAuthClient(),
  rerender: () => { if (state.user && state.view === 'settings') renderWorkspace(); },
  onSaved: brand => { state.brand = brand; paintBrand(brand); }, // marque mise à jour sans recomposer l'écran
});
const bing = createBingController({
  getSupabase: () => getAuthClient(),
  getClient: id => state.data.clients.find(c => String(c.id) === String(id)) || null,
  rerender: () => { if (state.user && state.view === 'client') renderWorkspace(); },
});
// Bureau : agents et tâches (données du compte dans le navigateur) ; prospects = clients enregistrés, lus seulement
const bureau = createBureauController({
  getUser: () => state.user,
  getData: () => state.data,
  getView: () => state.view,
  rerender: () => { if (state.user && ['bureau', 'home', 'messages'].includes(state.view)) renderWorkspace(); },
  getSupabase: () => getAuthClient(),
  reload: silentReload,
});
const auth = createAuthService({ getClient: getAuthClient, redirectUrl: REDIRECT_URL });

/* ---------- Écrans de connexion ---------- */
function showAuth(mode, msg = '', kind = 'error') {
  root.innerHTML = authScreen(mode, msg, kind);
  syncThemeButtons();
  document.documentElement.dataset.layout = 'auth';
  window.scrollTo(0, 0);
  if (mode === 'signin') {
    // Page d'accueil publique : pas de focus automatique (le clavier iPhone masquerait la page) ;
    // un message (session terminée, accès refusé…) ramène directement à la carte de connexion.
    const card = msg && document.getElementById('connexion');
    if (card) card.scrollIntoView({ block: 'center' });
    return;
  }
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
const COMING = {
  rapports: {
    title: 'Rapports',
    text: 'Les rapports PDF se préparent depuis le dossier de chaque audit : aperçu, téléchargement et partage. Une page de synthèse de tous vos rapports arrive bientôt.',
    action: { label: 'Voir les audits', nav: 'audits' },
  },
  devis: { title: 'Devis & Offres', text: 'La création de devis et d’offres n’est pas encore disponible dans AuditIA. Elle sera ajoutée prochainement.' },
  formations: { title: 'Formations', text: 'Les formations ne sont pas encore disponibles dans AuditIA. Elles seront ajoutées prochainement.' },
};
function placeholder() {
  const c = COMING[state.view];
  if (!c) {
    return emptyState({
      title: 'Section non branchée',
      text: "Cette section sera branchée aux prochains lots. Pour l'instant, utilisez l'interface actuelle.",
    });
  }
  return emptyState({ title: c.title + ' — bientôt disponible', text: c.text })
    + (c.action ? `<div class="ds-d-actions">${btn({ label: c.action.label, variant: 'primary', attrs: `data-nav="${c.action.nav}"` })}</div>` : '');
}

function bodyFor(isWide) {
  if (state.view === 'settings') return settings.html();
  if (!LIVE_VIEWS.includes(state.view)) return placeholder();
  const d = state.data;
  if (d.status === 'idle' || d.status === 'loading') return spinnerCard('Chargement de vos données…');
  if (d.status === 'error') return errorCard({ title: 'Chargement impossible', text: d.error });
  if (state.view === 'client') {
    const c = d.clients.find(x => String(x.id) === String(state.clientId));
    if (c) return clientDetailView(c, d.audits, audits, bing);
    state.view = 'clients'; // client introuvable (supprimé ?) : retour à la liste
  }
  if (state.view === 'clients') return clientsView(d, state.ui);
  if (state.view === 'prospects') return search.html();
  if (state.view === 'bureau') return bureau.html();
  if (state.view === 'messages') return bureau.messagesHtml();
  if (state.view === 'audits') return auditsView(d, audits.filter(), audits.notice(), audits.snapshot());
  if (state.view === 'audit') {
    const a = d.audits.find(x => String(x.id) === String(state.auditId));
    if (a) return auditDossierView(a, d.clients.find(x => String(x.id) === String(a.client_id)) || null, d, audits);
    state.view = 'audits'; // dossier introuvable (supprimé ?) : retour à la liste
    return auditsView(d, audits.filter(), audits.notice(), audits.snapshot());
  }
  const hc = bureau.homeContext();
  if (!hc) return '';
  if (state.view === 'dashboard') return dashboardView({ data: d, store: hc.store, weeks: state.ui.dbWeeks });
  const ctx = { data: d, store: hc.store, sel: hc.sel, period: state.ui.period, snap: audits.snapshot() };
  return isWide ? bureauHomeDesktop(ctx) : bureauHomeMobile(ctx);
}

function exportProspects() {
  const hc = bureau.homeContext();
  if (!hc || state.data.status !== 'ready') return;
  const { clients, audits: list } = state.data;
  const rows = clients.map(c => {
    const a = list.filter(x => String(x.client_id) === String(c.id) && auditHasAnalysis(x))
      .sort((x, y) => String(y.updated_at || y.created_at || '').localeCompare(String(x.updated_at || x.created_at || '')))[0];
    return { name: c.name, city: c.city, category: c.category, status: statusOf(hc.store, c), score: a ? Number(a.score) || '' : '' };
  });
  const url = URL.createObjectURL(new Blob([prospectsCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'auditia-prospects.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function renderWorkspace() {
  if (!state.user) { showAuth('signin'); return; } // protection : jamais de contenu sans session valide
  const isWide = wide.matches;
  const body = bodyFor(isWide);
  const active = state.view === 'client' ? 'clients' : state.view === 'audit' ? 'audits' : state.view;
  const title = state.view === 'client' ? 'Fiche client' : state.view === 'audit' ? 'Dossier d’audit' : TITLES[state.view];
  const isHome = state.view === 'home';
  const params = { title, active, body, brand: state.brand };
  root.innerHTML = isWide
    ? desktopShell({
      ...params,
      subtitle: isHome ? HOME_SUBTITLE.desktop : '',
      headerExtra: isHome && state.data.status === 'ready' ? homeHeaderExtra(state.ui.period) : '',
      account: { email: state.user.email || '' },
      badges: { messages: state.data.status === 'ready' ? bureau.readyCount() : 0 },
      search: state.view === 'clients' ? state.ui.q : '',
    })
    : mobileShell({ ...params, subtitle: isHome ? HOME_SUBTITLE.mobile : '' });
  document.documentElement.dataset.layout = isWide ? 'desktop' : 'mobile';
  paintBrand(state.brand, root);
  syncThemeButtons();
  if (state.view === 'prospects' && state.data.status === 'ready') search.mounted();
  if ((state.view === 'bureau' || state.view === 'messages') && state.data.status === 'ready') bureau.mounted();
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

// Marque enregistrée : chargée en arrière-plan ; l'écran reste utilisable avec la marque par défaut en attendant ou en cas d'échec.
async function loadBrandNow(user) {
  const client = await getAuthClient();
  if (state.user !== user) return; // déconnecté avant l'envoi : aucune requête
  const b = await loadBrand(client, user.id);
  if (state.user !== user) return; // déconnexion ou autre session entre-temps : résultat ignoré
  state.brand = b; paintBrand(b, root);
}

function enter(user) {
  state.user = user;
  state.view = 'home';
  state.clientId = null;
  state.ui = { q: '', tier: '', sort: 'urgence', period: DEFAULT_PERIOD, dbWeeks: 8 };
  search.reset();
  report.close(); audits.reset(); settings.reset(); bing.reset(); bureau.reset();
  window.scrollTo(0, 0);
  loadData();
  loadBrandNow(user);
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
  report.close(); audits.reset(); settings.reset(); bureau.reset();
  state.data = { status: 'idle', clients: [], audits: [], error: '' };
  state.brand = defaultBrand(); paintBrand(state.brand, root); // la marque d'un compte ne reste pas affichée après déconnexion
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
  const themeButton = t.closest('[data-theme-toggle]');
  if (themeButton) {
    applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
    return;
  }
  if (landingClick(t, root)) return; // page d'accueil publique : défilement et menu
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
  if (bing.onClick(t)) return;
  if (audits.onClick(t)) return;
  if (search.onClick(t)) return;
  if (bureau.onClick(t)) return;
  if (settings.onClick(t)) return;
  const wk = t.closest('[data-db-weeks]');
  if (wk) { state.ui.dbWeeks = Number(wk.dataset.dbWeeks) || 8; renderWorkspace(); return; }
  if (t.closest('[data-db-export]')) { exportProspects(); return; }
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
  if (nav) {
    state.view = nav.dataset.nav;
    if (state.view === 'settings') settings.open();
    renderWorkspace();
    const anchor = nav.dataset.navAnchor && document.getElementById(nav.dataset.navAnchor);
    if (anchor) anchor.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0);
  }
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
  if (state.user && event.target.matches('[data-client-sort]')) { state.ui.sort = event.target.value; refreshClientResults(); return; }
  if (state.user && event.target.matches('[data-home-period]')) {
    if (PERIODS.some(p => p.id === event.target.value)) { state.ui.period = event.target.value; renderWorkspace(); }
  }
});

root.addEventListener('submit', event => {
  const id = event.target.id;
  if (state.user && event.target.matches('[data-global-search]')) {
    // Recherche de la barre du haut : ouvre la liste des clients déjà filtrée
    event.preventDefault();
    state.ui.q = String(new FormData(event.target).get('q') || '').trim();
    state.view = 'clients';
    renderWorkspace();
    window.scrollTo(0, 0);
    return;
  }
  if (state.user && search.onSubmit(event.target)) { event.preventDefault(); return; }
  if (state.user && settings.onSubmit(event.target)) { event.preventDefault(); return; }
  if (id === 'fSignin') onSignin(event);
  else if (id === 'fForgot') onForgot(event);
  else if (id === 'fReset') onReset(event);
});

// Changement de largeur : on recompose la coquille, sans toucher aux formulaires en cours de saisie
wide.addEventListener('change', () => { if (state.user) renderWorkspace(); });

// « En direct » : l'accueil se met à jour chaque seconde (agents, audit en cours) sans recomposer la page
setInterval(() => {
  if (!state.user || state.view !== 'home' || state.data.status !== 'ready') return;
  const box = document.querySelector('[data-home-live]');
  const hc = bureau.homeContext();
  if (!box || !hc) return;
  const html = homeLiveInner({ data: state.data, store: hc.store, sel: hc.sel, period: state.ui.period, snap: audits.snapshot() });
  if (box.dataset.sig !== html) { box.innerHTML = html; box.dataset.sig = html; }
}, 1000);

document.addEventListener('keydown', e => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
  const si = document.querySelector('[data-search-input]');
  if (si) { e.preventDefault(); si.focus(); }
});

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
