import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyStore, createAgent, addTask, setAgentStatus, tick, statusOf, progress, counts, messageFor, removeTask, statusLine, LOOKS,
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
  assert.equal(addTask(s, a.id, { type: 'recherche', cat: 'Électricien', zone: 'Carcassonne' }).ok, true);
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
  addTask(s, a.id, { type: 'recherche', cat: 'Peintre façadier', zone: 'Carcassonne' });
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
