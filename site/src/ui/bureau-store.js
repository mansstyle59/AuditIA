// AuditIA — Bureau : logique des agents, des tâches et des statuts (sans affichage, sans réseau).
// Les données restent dans le navigateur, séparées par compte (localStorage).
// Un agent prépare des messages pour les prospects de son métier ; il n'envoie jamais rien.
// Les prospects sont les clients déjà enregistrés dans AuditIA (données réelles, lues seulement).
import { norm } from '../core/utils.js';
import { nafFor, zoneParams, ZONE_HELP, isKnownClient } from '../data/registry-prospects.js';

export const BU_STATUSES = ['À contacter', 'Message prêt', 'Contacté', 'Intéressé', 'Client', 'Refusé'];
export const BU_DONE = ['Contacté', 'Intéressé', 'Client'];
export const BU_ALL = 'Tous les métiers';
export const BU_CATS = ['Peintre façadier', 'Plombier', 'Électricien'];
export const BU_MAX_AGENTS = 9;
export const BU_STATUS_LABEL = { idle: 'En attente', working: 'En cours', break: 'Pause café' };

const KEY = 'auditia-bureau-v1:';
const COLORS = ['#60a5fa', '#f472b6', '#a78bfa', '#fbbf24', '#34d399', '#f87171', '#22d3ee', '#fb923c', '#c084fc'];
const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const HAIRS = ['#3b2a1f', '#1b1b1b', '#111111', '#7a4b2a', '#2b1d14', '#d4a017'];
// Coiffures et accessoires des personnages (un agent SDR porte un casque, les chercheurs des lunettes)
export const LOOKS = ['short', 'bun', 'side', 'long'];

export function emptyStore() { return { agents: [], statuses: {}, found: [] }; }

export function loadStore(userId) {
  try {
    const raw = localStorage.getItem(KEY + userId);
    const s = raw ? JSON.parse(raw) : null;
    if (s && Array.isArray(s.agents) && s.statuses && typeof s.statuses === 'object') return s;
  } catch (e) { /* stockage indisponible : bureau vide */ }
  return emptyStore();
}

export function saveStore(userId, store) {
  try { localStorage.setItem(KEY + userId, JSON.stringify(store)); } catch (e) { /* quota ou mode privé */ }
}

// Catégorie d'un client (même lecture que portfolio.js)
export function catOf(client) {
  return String(client.category || (client.details && client.details.category) || '').trim();
}

const sameCat = (wanted, client) => wanted === BU_ALL || norm(catOf(client)) === norm(wanted);

export function statusOf(store, client) {
  const e = store.statuses[String(client.id)];
  return (e && e.status) || 'À contacter';
}

export function teamOf(agent, clients) { return clients.filter(c => sameCat(agent.cat, c)); }

export function progress(store, agent, clients) {
  const team = teamOf(agent, clients);
  const done = team.filter(c => BU_DONE.includes(statusOf(store, c))).length;
  return { done, total: team.length, pct: team.length ? Math.round(done / team.length * 100) : 0 };
}

export function counts(store, clients) {
  const n = s => clients.filter(c => statusOf(store, c) === s).length;
  return {
    agents: store.agents.length,
    working: store.agents.filter(a => a.status === 'working').length,
    todo: n('À contacter'),
    ready: n('Message prêt'),
    contacted: n('Contacté'),
    hot: n('Intéressé') + n('Client'),
  };
}

// Tons de message proposés (le texte reste à relire avant tout envoi)
export const TONES = { chaleureux: 'Chaleureux', direct: 'Direct', formel: 'Formel' };
export const DEFAULT_TONE = 'chaleureux';
export const FOLLOWUP_DAYS = 3;

// Phrase d'accroche fondée sur le score réel de l'audit déjà réalisé (client._score) ; vide s'il n'y en a pas
function scoreLine(client, tone) {
  const sc = Number(client._score);
  if (!Number.isFinite(sc) || sc <= 0) return '';
  if (sc >= 75) return tone === 'direct' ? ` Votre score est de ${sc}/100 : bon, avec encore des gains possibles.` : ` Votre visibilité ressort plutôt bien (${sc}/100), avec encore quelques pistes pour aller plus loin.`;
  if (sc >= 50) return tone === 'direct' ? ` Votre score est de ${sc}/100 : il y a de la marge.` : ` Votre visibilité ressort à ${sc}/100 : correcte, avec plusieurs points faciles à améliorer.`;
  return tone === 'direct' ? ` Votre score est de ${sc}/100 : c’est faible et corrigeable.` : ` Votre visibilité ressort à ${sc}/100 : il y a de belles marges de progression.`;
}

export function messageFor(client, tone = DEFAULT_TONE, kind = 'accroche') {
  const city = String(client.city || '').trim();
  const where = city ? ' à ' + city : '';
  const n = client.name;
  const sc = scoreLine(client, tone);
  if (kind === 'relance') {
    if (tone === 'direct') return `Bonjour, je reviens vers vous au sujet de ${n}.${sc} Avez-vous eu le temps de voir mon message sur l’audit gratuit de votre visibilité ? Je peux vous l’envoyer en 2 minutes.`;
    if (tone === 'formel') return `Bonjour, je me permets de revenir vers vous concernant ${n}${where}. Je vous avais proposé un audit gratuit de votre visibilité en ligne.${sc} Êtes-vous disponible pour que je vous en transmette le rapport ?`;
    return `Bonjour, je reviens vers vous pour ${n}${where}. J’espère que tout va bien ! Je vous avais proposé un audit gratuit de votre visibilité sur Google et les assistants IA.${sc} Souhaitez-vous que je vous envoie le rapport ?`;
  }
  if (tone === 'direct') return `Bonjour, j’ai regardé la visibilité de ${n}${where} sur Google et dans les réponses des assistants IA.${sc || ' Il y a des points à corriger.'} Je vous envoie l’audit gratuit ?`;
  if (tone === 'formel') return `Bonjour, je me suis intéressé à ${n}${where}. Je vous propose un audit gratuit de votre visibilité sur Google et dans les réponses des assistants IA (ChatGPT, Gemini…), indiquant ce qui fonctionne et ce qui manque.${sc} Souhaitez-vous recevoir le rapport ?`;
  return `Bonjour, je me suis intéressé à ${n}${where}. Je propose un audit gratuit de votre visibilité sur Google et dans les réponses des assistants IA (ChatGPT, Gemini…) : ce qui fonctionne déjà et ce qui manque.${sc} Souhaitez-vous recevoir le rapport ?`;
}

// Fait avancer un prospect dans le pipeline (action de l'utilisateur)
export function setProspectStatus(store, clientId, status, by = '') {
  if (!BU_STATUSES.includes(status)) return false;
  store.statuses[String(clientId)] = { status, by, at: Date.now() };
  return true;
}

// Prospects « Contacté » sans suite depuis FOLLOWUP_DAYS jours ou plus
export function followUpsDue(store, clients, now = Date.now(), days = FOLLOWUP_DAYS) {
  const limit = now - days * 86400000;
  return clients.filter(c => {
    const e = store.statuses[String(c.id)];
    return e && e.status === 'Contacté' && Number(e.at) && e.at <= limit;
  });
}

// Lancer ou arrêter tous les agents d'un coup
export function setAllAgents(store, status) {
  let n = 0;
  store.agents.forEach(a => {
    if (status === 'working' && !a.tasks.some(t => t.status === 'todo')) return;
    if (a.status !== status) { a.status = status; n++; }
  });
  return n;
}

// Bilan d'un agent : ce qu'il a réellement produit
export function agentStats(a) {
  const t = a.tasks || [];
  return {
    messages: t.filter(x => x.type === 'message').reduce((n, x) => n + (x.processed || 0), 0),
    found: t.filter(x => x.type === 'recherche').reduce((n, x) => n + (x.processed || 0), 0),
    done: t.filter(x => x.status === 'done').length,
  };
}

// Niveaux : vitesse réelle de traitement (prospects traités à chaque cycle de 5 s ; le junior travaille un cycle sur deux)
export const LEVELS = {
  junior: { label: 'Junior', perTick: 1, every: 2, hint: '1 prospect toutes les 10 s' },
  confirme: { label: 'Confirmé', perTick: 1, every: 1, hint: '1 prospect toutes les 5 s' },
  expert: { label: 'Expert', perTick: 2, every: 1, hint: '2 prospects toutes les 5 s' },
};
export const levelOf = a => LEVELS[a && a.level] || LEVELS.confirme;

export function createAgent(store, { name, cat, role, level }) {
  const clean = String(name || '').trim().slice(0, 24);
  if (!clean) return { ok: false, error: 'Donnez un prénom à l’agent.' };
  if (store.agents.length >= BU_MAX_AGENTS) return { ok: false, error: `Le bureau accueille ${BU_MAX_AGENTS} agents au maximum.` };
  const i = store.agents.length;
  const chosenRole = role === 'Chercheur IA' ? 'Chercheur IA' : 'SDR IA';
  const agent = {
    id: 'a' + Date.now().toString(36) + i,
    name: clean,
    role: chosenRole,
    level: LEVELS[level] ? level : 'confirme',
    cat: String(cat || '').trim() || BU_ALL,
    look: LOOKS[i % LOOKS.length],
    color: COLORS[i % COLORS.length],
    skin: SKINS[i % SKINS.length],
    hair: HAIRS[i % HAIRS.length],
    status: 'idle',
    current: null,
    tasks: [],
    created: Date.now(),
  };
  store.agents.push(agent);
  return { ok: true, agent };
}

export function setAgentLevel(store, agentId, level) {
  const a = store.agents.find(x => x.id === agentId);
  if (!a || !LEVELS[level]) return null;
  a.level = level;
  a.beat = 0;
  return a;
}

export function addTask(store, agentId, { type, cat, zone }) {
  const a = store.agents.find(x => x.id === agentId);
  if (!a) return { ok: false, error: 'Créez d’abord un agent.' };
  const kind = type === 'recherche' ? 'recherche' : 'message';
  const place = String(zone || '').trim();
  if (kind === 'recherche') {
    if (!nafFor(String(cat || '').trim())) return { ok: false, error: 'Choisissez un métier précis pour une recherche.' };
    if (!zoneParams(place)) return { ok: false, error: ZONE_HELP };
  }
  a.tasks.push({
    id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: kind,
    cat: String(cat || '').trim() || BU_ALL,
    zone: place,
    status: 'todo',
  });
  return { ok: true, agent: a };
}

export function taskLabel(t) {
  return t.type === 'recherche' ? `Rechercher : ${t.cat} · ${t.zone}` : `Messages : ${t.cat}`;
}

export function findTask(store, agentId, taskId) {
  const a = store.agents.find(x => x.id === agentId);
  const t = a && a.tasks.find(x => x.id === taskId);
  return t ? { agent: a, task: t } : null;
}

export function removeTask(store, agentId, taskId) {
  const a = store.agents.find(x => x.id === agentId);
  if (a) a.tasks = a.tasks.filter(t => t.id !== taskId);
}

// Suppression définitive d'un agent, avec ses tâches. Les prospects gardent leur statut :
// seul l'agent disparaît du bureau. Retourne l'agent supprimé, ou null s'il n'existe pas.
export function removeAgent(store, agentId) {
  const i = store.agents.findIndex(x => x.id === agentId);
  if (i < 0) return null;
  const [gone] = store.agents.splice(i, 1);
  return gone;
}

export function setAgentStatus(store, agentId, status) {
  const a = store.agents.find(x => x.id === agentId);
  if (a && ['idle', 'working', 'break'].includes(status)) a.status = status;
  return a || null;
}

// Un agent au poste traite sa tâche « Messages » : le prochain prospect de son métier passe à « Message prêt ».
// Retourne true si quelque chose a changé.
export function tick(store, clients) {
  let changed = false;
  store.agents.forEach(a => {
    if (a.status !== 'working') return;
    const t = a.tasks.find(x => x.type === 'message' && x.status === 'todo');
    if (!t) {
      // Une recherche en attente est traitée par le contrôleur : l'agent reste au poste jusqu'à son terme.
      if (a.tasks.some(x => x.type === 'recherche' && x.status === 'todo')) return;
      a.status = 'idle'; a.current = null; changed = true; return;
    }
    const lv = levelOf(a);
    a.beat = (a.beat || 0) + 1;
    if (a.beat % lv.every !== 0) return; // junior : un cycle sur deux
    for (let k = 0; k < lv.perTick; k++) {
      const next = clients.find(c => sameCat(t.cat, c) && statusOf(store, c) === 'À contacter');
      if (next) {
        store.statuses[String(next.id)] = { status: 'Message prêt', by: a.name, at: Date.now() };
        t.processed = (t.processed || 0) + 1;
        a.current = next.name;
      } else {
        t.status = 'done';
        t.reason = noTargetReason(t, clients);
        a.current = null;
        break;
      }
    }
    changed = true;
  });
  return changed;
}

// Explication lisible quand un agent n'a plus de prospect à traiter pour son métier
function noTargetReason(t, clients) {
  const team = clients.filter(c => sameCat(t.cat, c));
  if (!team.length) return 'Aucun prospect enregistré pour ce métier. Lancez une recherche pour en trouver.';
  return 'Les ' + team.length + ' prospect(s) de ce métier sont déjà suivis : aucun « À contacter » à traiter.';
}

// Entreprises trouvées par une recherche, à valider avant d'entrer dans le portefeuille
export function addFound(store, list, taskId) {
  store.found = store.found || [];
  let added = 0;
  for (const c of list) {
    if (store.found.some(f => f.siret === c.siret)) continue;
    store.found.push({ ...c, taskId, status: 'new' });
    added++;
  }
  return added;
}

export function setFoundStatus(store, siret, status) {
  const f = (store.found || []).find(x => x.siret === siret);
  if (f) f.status = status;
  return !!f;
}

export function foundNew(store) {
  return (store.found || []).filter(f => f.status === 'new');
}

// Fin d'une tâche de recherche : on dit combien de nouvelles entreprises ont été trouvées, ou pourquoi aucune
export function finishSearch(store, task, list, clients) {
  const fresh = list.filter(c => !isKnownClient(c, clients));
  const added = addFound(store, fresh, task.id);
  task.status = 'done';
  task.processed = added;
  task.reason = added
    ? added + ' nouvelle(s) entreprise(s) trouvée(s) dans le registre : à valider ci-dessous.'
    : (list.length ? 'Toutes les entreprises trouvées sont déjà dans votre portefeuille.' : 'Aucune entreprise active trouvée pour ce métier et cette zone.');
  return added;
}

export function failSearch(task, message) {
  task.status = 'done';
  task.processed = 0;
  task.failed = true;
  task.reason = 'Recherche impossible : ' + message;
}

// Phrase d'état affichée sur la carte de l'agent : dit ce qu'il fait, ou pourquoi il ne fait rien
export function statusLine(store, a) {
  if (a.status === 'break') return 'En pause café. Aucun prospect traité pendant la pause.';
  const todo = a.tasks.filter(t => t.status === 'todo');
  if (a.status === 'working') {
    if (a.current) return `En cours : message préparé pour ${a.current}.`;
    if (todo.some(t => t.type === 'recherche')) return 'En cours : recherche d’entreprises dans le registre officiel.';
    if (!todo.some(t => t.type === 'message')) return 'Aucune tâche « Messages » à traiter. Ajoutez-en une ci-dessous.';
    return 'En cours : recherche du prochain prospect à traiter.';
  }
  if (!a.tasks.length) return 'Sans tâche. Ajoutez-en une dans le formulaire ci-dessous.';
  if (todo.some(t => t.type === 'message')) return 'Prêt. Faites-le travailler pour préparer les messages.';
  if (todo.some(t => t.type === 'recherche')) return 'Tâche de recherche : faites-le travailler pour interroger le registre.';
  return 'Toutes ses tâches sont terminées.';
}
