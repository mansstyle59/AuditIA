import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyStore, createAgent, addTask, setAgentStatus, tick, statusOf, progress, counts, messageFor, removeTask, statusLine, LOOKS,
  addFound, foundNew, setFoundStatus, finishSearch, failSearch, removeAgent,
  setProspectStatus, followUpsDue, setAllAgents, agentStats, TONES,
} from '../site/src/ui/bureau-store.js';

const clients = [
  { id: 1, name: 'Façades Test', city: 'Carcassonne', category: 'Peintre façadier' },
  { id: 2, name: 'Plomberie Test', city: 'Palaja', category: 'Plombier' },
  { id: 3, name: 'Électricité Test', city: 'Trèbes', details: { category: 'Électricien' } },
];

test('création d’agent : nom obligatoire, plafond de 9, rôle contrôlé', () => {
  const s = emptyStore();
  assert.equal(createAgent(s, { name: '   ', cat: 'Plombier', role: 'SDR IA' }).ok, false);
  const r = createAgent(s, { name: 'Inès', cat: '', role: 'n’importe quoi' });
  assert.equal(r.ok, true);
  assert.equal(r.agent.cat, 'Tous les métiers');
  assert.equal(r.agent.role, 'SDR IA');
  for (let i = 0; i < 8; i++) createAgent(s, { name: 'Agent' + i, cat: 'Plombier', role: 'SDR IA' });
  assert.equal(s.agents.length, 9);
  assert.equal(createAgent(s, { name: 'Dixième', cat: 'Plombier', role: 'SDR IA' }).ok, false);
});

test('tâche de recherche : zone obligatoire ; tâche de messages sans zone', () => {
  const s = emptyStore();
  const a = createAgent(s, { name: 'Max', cat: 'Électricien', role: 'Chercheur IA' }).agent;
  assert.equal(addTask(s, a.id, { type: 'recherche', cat: 'Électricien', zone: ' ' }).ok, false);
  assert.equal(addTask(s, a.id, { type: 'recherche', cat: 'Électricien', zone: '11000' }).ok, true);
  assert.equal(addTask(s, a.id, { type: 'message', cat: 'Plombier', zone: '' }).ok, true);
  assert.equal(addTask(s, 'inconnu', { type: 'message', cat: 'Plombier' }).ok, false);
  assert.equal(a.tasks.length, 2);
});

test('un agent au poste prépare un message par prospect de son métier, sans rien envoyer', () => {
  const s = emptyStore();
  const a = createAgent(s, { name: 'Jake', cat: 'Peintre façadier', role: 'SDR IA' }).agent;
  addTask(s, a.id, { type: 'message', cat: 'Peintre façadier' });
  setAgentStatus(s, a.id, 'working');
  assert.equal(tick(s, clients), true);
  assert.equal(statusOf(s, clients[0]), 'Message prêt');
  assert.equal(statusOf(s, clients[1]), 'À contacter');
  assert.equal(s.statuses['1'].by, 'Jake');
  tick(s, clients); // plus aucun prospect « À contacter » : la tâche est terminée
  assert.equal(a.tasks[0].status, 'done');
  tick(s, clients); // plus de tâche à traiter : l'agent repart
  assert.equal(a.status, 'idle');
});

test('la progression ne compte que les prospects du métier de l’agent', () => {
  const s = emptyStore();
  const a = createAgent(s, { name: 'Ryan', cat: 'Plombier', role: 'SDR IA' }).agent;
  s.statuses['2'] = { status: 'Contacté' };
  s.statuses['1'] = { status: 'Contacté' };
  const pr = progress(s, a, clients);
  assert.deepEqual(pr, { done: 1, total: 1, pct: 100 });
  const c = counts(s, clients);
  assert.equal(c.contacted, 2);
  assert.equal(c.agents, 1);
});

test('suppression de tâche et message d’accroche', () => {
  const s = emptyStore();
  const a = createAgent(s, { name: 'Léo', cat: 'Électricien', role: 'SDR IA' }).agent;
  const t = addTask(s, a.id, { type: 'message', cat: 'Électricien' });
  assert.equal(t.ok, true);
  removeTask(s, a.id, a.tasks[0].id);
  assert.equal(a.tasks.length, 0);
  const msg = messageFor(clients[0]);
  assert.ok(msg.includes('Façades Test à Carcassonne'));
  assert.ok(msg.endsWith('Souhaitez-vous recevoir le rapport ?'));
});

test('phrase d’état : dit ce que fait l’agent, ou pourquoi il ne fait rien', () => {
  const s = emptyStore();
  const a = createAgent(s, { name: 'Sophie', cat: 'Peintre façadier', role: 'SDR IA' }).agent;
  assert.match(statusLine(s, a), /Sans tâche/);
  addTask(s, a.id, { type: 'recherche', cat: 'Peintre façadier', zone: '11000' });
  assert.match(statusLine(s, a), /Tâche de recherche/);
  addTask(s, a.id, { type: 'message', cat: 'Peintre façadier' });
  assert.match(statusLine(s, a), /Faites-le travailler/);
  setAgentStatus(s, a.id, 'working');
  tick(s, clients);
  assert.equal(a.current, 'Façades Test');
  assert.match(statusLine(s, a), /message préparé pour Façades Test/);
  assert.equal(a.tasks.find(t => t.type === 'message').processed, 1);
  setAgentStatus(s, a.id, 'break');
  assert.match(statusLine(s, a), /pause café/);
});

test('création d’agent : apparence cohérente et tâche terminée sans prospect', () => {
  const s = emptyStore();
  const a = createAgent(s, { name: 'Ryan', cat: 'Serrurier', role: 'SDR IA' }).agent;
  assert.ok(LOOKS.includes(a.look));
  addTask(s, a.id, { type: 'message', cat: 'Serrurier' });
  setAgentStatus(s, a.id, 'working');
  tick(s, clients);
  assert.equal(a.tasks[0].status, 'done');
  assert.equal(a.current, null);
  assert.equal(a.tasks[0].processed, undefined);
});

test('recherche : métier précis et zone en code postal ou département', () => {
  const s = emptyStore();
  const a = createAgent(s, { name: 'Léa', cat: 'Plombier', role: 'Chercheur IA' }).agent;
  assert.equal(addTask(s, a.id, { type: 'recherche', cat: 'Tous les métiers', zone: '11000' }).ok, false);
  assert.equal(addTask(s, a.id, { type: 'recherche', cat: 'Plombier', zone: 'Carcassonne' }).ok, false);
  assert.equal(addTask(s, a.id, { type: 'recherche', cat: 'Plombier', zone: '11' }).ok, true);
});

test('fin de recherche : nouvelles entreprises à valider, doublons exclus', () => {
  const s = emptyStore();
  const a = createAgent(s, { name: 'Léa', cat: 'Plombier', role: 'Chercheur IA' }).agent;
  addTask(s, a.id, { type: 'recherche', cat: 'Plombier', zone: '11' });
  const t = a.tasks[0];
  const list = [
    { siret: '11111111111111', name: 'Nouveau Plombier', city: 'Azille' },
    { siret: '22222222222222', name: 'Plomberie Test', city: 'Palaja' },
  ];
  const added = finishSearch(s, t, list, clients);
  assert.equal(added, 1);
  assert.equal(t.status, 'done');
  assert.equal(foundNew(s).length, 1);
  assert.match(t.reason, /1 nouvelle/);
  // une deuxième recherche ne recrée pas la même entreprise
  assert.equal(addFound(s, list.slice(0, 1), t.id), 0);
  assert.equal(setFoundStatus(s, '11111111111111', 'added'), true);
  assert.equal(foundNew(s).length, 0);
});

test('recherche en échec : la tâche le dit, sans rien inventer', () => {
  const s = emptyStore();
  const a = createAgent(s, { name: 'Léa', cat: 'Plombier', role: 'Chercheur IA' }).agent;
  addTask(s, a.id, { type: 'recherche', cat: 'Plombier', zone: '11' });
  failSearch(a.tasks[0], 'le registre est indisponible');
  assert.equal(a.tasks[0].failed, true);
  assert.equal(foundNew(s).length, 0);
  assert.match(a.tasks[0].reason, /impossible/);
});

test('plus aucun prospect à contacter : la raison est écrite sur la tâche', () => {
  const s = emptyStore();
  const a = createAgent(s, { name: 'Max', cat: 'Plombier', role: 'SDR IA' }).agent;
  addTask(s, a.id, { type: 'message', cat: 'Plombier' });
  setAgentStatus(s, a.id, 'working');
  tick(s, clients);
  tick(s, clients);
  const t = a.tasks[0];
  assert.equal(t.status, 'done');
  assert.match(t.reason, /déjà suivis/);
});

test('suppression d’agent : retire l’agent et ses tâches, garde les autres et les statuts des prospects', () => {
  const s = emptyStore();
  const a = createAgent(s, { name: 'Léo', cat: 'Plombier', role: 'SDR IA' }).agent;
  const b = createAgent(s, { name: 'Zoé', cat: 'Électricien', role: 'SDR IA' }).agent;
  addTask(s, a.id, { type: 'message', cat: 'Plombier', zone: '' });
  s.statuses['2'] = { status: 'Contacté', by: 'Léo' };
  assert.equal(removeAgent(s, a.id).name, 'Léo');
  assert.deepEqual(s.agents.map(x => x.id), [b.id]);
  assert.equal(s.agents.some(x => x.tasks.length && x.id === a.id), false);
  assert.equal(statusOf(s, clients[1]), 'Contacté');
  assert.equal(removeAgent(s, 'inconnu'), null);
  assert.equal(s.agents.length, 1);
});

test('tons de message : trois tons, relance différente de l’accroche', () => {
  const c = clients[0];
  const first = Object.keys(TONES).map(t => messageFor(c, t));
  assert.equal(new Set(first).size, 3);
  first.forEach(m => assert.ok(m.includes(c.name)));
  assert.notEqual(messageFor(c, 'direct', 'relance'), messageFor(c, 'direct'));
});

test('pipeline : statut avancé par l’utilisateur, relance après 3 jours', () => {
  const s = emptyStore();
  assert.equal(setProspectStatus(s, 1, 'Inconnu'), false);
  assert.equal(setProspectStatus(s, 1, 'Contacté', 'vous'), true);
  assert.equal(statusOf(s, clients[0]), 'Contacté');
  const now = Date.now();
  assert.equal(followUpsDue(s, clients, now).length, 0);
  assert.equal(followUpsDue(s, clients, now + 4 * 86400000).length, 1);
  setProspectStatus(s, 1, 'Intéressé');
  assert.equal(followUpsDue(s, clients, now + 9 * 86400000).length, 0);
});

test('actions groupées et bilan par agent', () => {
  const s = emptyStore();
  const a = createAgent(s, { name: 'Inès', cat: 'Plombier', role: 'SDR IA' }).agent;
  const b = createAgent(s, { name: 'Léo', cat: 'Plombier', role: 'SDR IA' }).agent;
  addTask(s, a.id, { type: 'message', cat: 'Plombier' });
  assert.equal(setAllAgents(s, 'working'), 1); // Léo n’a pas de tâche
  assert.equal(a.status, 'working');
  assert.equal(b.status, 'idle');
  assert.equal(setAllAgents(s, 'idle'), 1);
  assert.deepEqual(agentStats(a), { messages: 0, found: 0, done: 0 });
});

test('niveaux : l’expert traite plus vite que le confirmé, le junior un cycle sur deux', () => {
  const many = Array.from({ length: 10 }, (_, i) => ({ id: 100 + i, name: 'P' + i, city: 'X', category: 'Plombier' }));
  const done = level => {
    const s = emptyStore();
    const a = createAgent(s, { name: 'T', cat: 'Plombier', role: 'SDR IA', level }).agent;
    addTask(s, a.id, { type: 'message', cat: 'Plombier', zone: '' });
    setAgentStatus(s, a.id, 'working');
    tick(s, many); tick(s, many);
    return s.agents[0].tasks[0].processed || 0;
  };
  assert.equal(done('junior'), 1);
  assert.equal(done('confirme'), 2);
  assert.equal(done('expert'), 4);
  assert.equal(createAgent(emptyStore(), { name: 'Z', level: 'nimportequoi' }).agent.level, 'confirme');
});

test('un agent avec seulement une recherche en attente reste au poste', () => {
  const s = emptyStore();
  const a = createAgent(s, { name: 'R', cat: 'Plombier', role: 'Chercheur IA' }).agent;
  assert.equal(addTask(s, a.id, { type: 'recherche', cat: 'Plombier', zone: '11' }).ok, true);
  setAgentStatus(s, a.id, 'working');
  assert.equal(tick(s, []), false);
  assert.equal(s.agents[0].status, 'working');
  s.agents[0].tasks[0].status = 'done';
  assert.equal(tick(s, []), true);
  assert.equal(s.agents[0].status, 'idle');
});

import { setAgentLevel } from '../site/src/ui/bureau-store.js';
test('niveau modifiable ; les messages citent le score réel seulement s’il existe', () => {
  const s = emptyStore();
  const a = createAgent(s, { name: 'N', cat: 'Plombier', role: 'SDR IA' }).agent;
  assert.equal(setAgentLevel(s, a.id, 'expert').level, 'expert');
  assert.equal(setAgentLevel(s, a.id, 'bidon'), null);
  assert.equal(s.agents[0].level, 'expert');
  const c = { id: 9, name: 'Chez Paul', city: 'Aude' };
  assert.ok(!messageFor(c, 'chaleureux').includes('/100'));
  assert.ok(messageFor({ ...c, _score: 42 }, 'chaleureux').includes('42/100'));
  assert.ok(messageFor({ ...c, _score: 42 }, 'direct', 'relance').includes('42/100'));
});
