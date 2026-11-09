import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prospectSplit, periodBadges, auditPerformance, recentActivity, agoLabel, ringSegments, windowsOf, periodOf } from '../site/src/data/home-metrics.js';

const NOW = Date.parse('2026-11-09T12:00:00Z');
const ago = d => new Date(NOW - d * 864e5).toISOString();

test('répartition des prospects : les refusés sont écartés du total', () => {
  const s = prospectSplit(['À contacter', 'À contacter', 'Message prêt', 'Contacté', 'Intéressé', 'Client', 'Refusé']);
  assert.deepEqual([s.todo, s.running, s.clients, s.refused, s.total], [2, 3, 1, 1, 6]);
  assert.equal(prospectSplit([]).total, 0);
});

test('période inconnue : retour à la semaine', () => {
  assert.equal(periodOf('nimporte').id, 'week');
  const w = windowsOf('month', NOW);
  assert.equal(w.to - w.from, 30 * 864e5);
});

test('pastilles : seuls les agents et prospects arrivés sur la période comptent', () => {
  const agents = [{ created: NOW - 2 * 864e5 }, { created: NOW - 40 * 864e5 }, {}];
  const clients = [{ id: 1, created_at: ago(1) }, { id: 2, created_at: ago(20) }, { id: 3, created_at: ago(2) }];
  const statusOf = c => (c.id === 3 ? 'Contacté' : 'À contacter');
  assert.deepEqual(periodBadges({ agents, clients, statusOf, periodId: 'week', now: NOW }), { newAgents: 1, newTodo: 1 });
  assert.deepEqual(periodBadges({ agents, clients, statusOf, periodId: 'month', now: NOW }), { newAgents: 1, newTodo: 2 });
});

test('performance : moyenne, progression et courbe sur les audits analysés', () => {
  const mk = (score, d) => ({ score, created_at: ago(d), status: 'Analysé' });
  const r = auditPerformance([], 'week', NOW);
  assert.deepEqual([r.count, r.avg, r.progression, r.series.length], [0, null, null, 0]);
  const p = auditPerformance([mk(80, 1), mk(90, 3), mk(70, 9)], 'week', NOW);
  assert.deepEqual([p.count, p.avg, p.progression, p.series], [2, 85, 21, [90, 80]]);
  // un audit sans analyse ne compte pas
  const none = auditPerformance([{ score: 90, created_at: ago(1) }], 'week', NOW);
  assert.equal(none.count, 0);
});

test('activité récente : triée, bornée à la période', () => {
  const clients = [{ id: 1, name: 'A', created_at: ago(1) }, { id: 2, name: 'B', created_at: ago(30) }];
  const items = recentActivity({ clients, audits: [], periodId: 'week', now: NOW });
  assert.equal(items.length, 1);
  assert.equal(items[0].name, 'A');
  assert.equal(recentActivity({ clients, audits: [], periodId: 'month', now: NOW + 1, limit: 1 }).length, 1);
});

test('« il y a » : minutes, heures, jours', () => {
  assert.equal(agoLabel(new Date(NOW - 12 * 6e4).toISOString(), NOW), 'il y a 12 min');
  assert.equal(agoLabel(new Date(NOW - 3 * 36e5).toISOString(), NOW), 'il y a 3 h');
  assert.equal(agoLabel(new Date(NOW - 2 * 864e5).toISOString(), NOW), 'il y a 2 j');
  assert.equal(agoLabel('', NOW), '');
});

test('anneau : les segments couvrent toute la circonférence', () => {
  const segs = ringSegments([7, 0, 0], 52);
  assert.equal(segs.length, 3);
  assert.ok(Math.abs(segs[0].len - 2 * Math.PI * 52) < 0.02);
  assert.deepEqual(ringSegments([0, 0, 0]), []);
});
