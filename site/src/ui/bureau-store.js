// AuditIA — Bureau : logique des agents, des tâches et des statuts (sans affichage, sans réseau).
// Les données restent dans le navigateur, séparées par compte (localStorage).
// Un agent prépare des messages pour les prospects de son métier ; il n'envoie jamais rien.
// Les prospects sont les clients déjà enregistrés dans AuditIA (données réelles, lues seulement).
import { norm } from '../core/utils.js';

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

export function emptyStore() { return { agents: [], statuses: {} }; }

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

// Message d'accroche proposé (à relire avant tout envoi)
export function messageFor(client) {
  const city = String(client.city || '').trim();
  return `Bonjour, je me suis intéressé à ${client.name}${city ? ' à ' + city : ''}. Je propose un audit gratuit de votre visibilité sur Google et dans les réponses des assistants IA (ChatGPT, Gemini…) : ce qui fonctionne déjà et ce qui manque. Souhaitez-vous recevoir le rapport ?`;
}

export function createAgent(store, { name, cat, role }) {
  const clean = String(name || '').trim().slice(0, 24);
  if (!clean) return { ok: false, error: 'Donnez un prénom à l’agent.' };
  if (store.agents.length >= BU_MAX_AGENTS) return { ok: false, error: `Le bureau accueille ${BU_MAX_AGENTS} agents au maximum.` };
  const i = store.agents.length;
  const chosenRole = role === 'Chercheur IA' ? 'Chercheur IA' : 'SDR IA';
  const agent = {
    id: 'a' + Date.now().toString(36) + i,
    name: clean,
    role: chosenRole,
    cat: String(cat || '').trim() || BU_ALL,
    look: LOOKS[i % LOOKS.length],
    color: COLORS[i % COLORS.length],
    skin: SKINS[i % SKINS.length],
    hair: HAIRS[i % HAIRS.length],
    status: 'idle',
    current: null,
    tasks: [],
  };
  store.agents.push(agent);
  return { ok: true, agent };
}

export function addTask(store, agentId, { type, cat, zone }) {
  const a = store.agents.find(x => x.id === agentId);
  if (!a) return { ok: false, error: 'Créez d’abord un agent.' };
  const kind = type === 'recherche' ? 'recherche' : 'message';
  const place = String(zone || '').trim();
  if (kind === 'recherche' && !place) return { ok: false, error: 'Indiquez la ville ou la zone à rechercher.' };
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
    if (!t) { a.status = 'idle'; a.current = null; changed = true; return; }
    const next = clients.find(c => sameCat(t.cat, c) && statusOf(store, c) === 'À contacter');
    if (next) {
      store.statuses[String(next.id)] = { status: 'Message prêt', by: a.name };
      t.processed = (t.processed || 0) + 1;
      a.current = next.name;
    } else {
      t.status = 'done';
      a.current = null;
    }
    changed = true;
  });
  return changed;
}

// Phrase d'état affichée sur la carte de l'agent : dit ce qu'il fait, ou pourquoi il ne fait rien
export function statusLine(store, a) {
  if (a.status === 'break') return 'En pause café. Aucun prospect traité pendant la pause.';
  const todo = a.tasks.filter(t => t.status === 'todo');
  if (a.status === 'working') {
    if (a.current) return `En cours : message préparé pour ${a.current}.`;
    if (!todo.some(t => t.type === 'message')) return 'Aucune tâche « Messages » à traiter. Ajoutez-en une ci-dessous.';
    return 'En cours : recherche du prochain prospect à traiter.';
  }
  if (!a.tasks.length) return 'Sans tâche. Ajoutez-en une dans le formulaire ci-dessous.';
  if (todo.some(t => t.type === 'message')) return 'Prêt. Faites-le travailler pour préparer les messages.';
  if (todo.some(t => t.type === 'recherche')) return 'Tâche de recherche à faire depuis Prospects.';
  return 'Toutes ses tâches sont terminées.';
}
