import { test } from 'node:test';
import assert from 'node:assert/strict';
import { funnelOf, weeklyAdds, monthlyScores, scoreBuckets, agentBoard } from '../site/src/data/dashboard-metrics.js';

test('entonnoir : taux calculés sur les bonnes bases', () => {
  const f = funnelOf(['À contacter', 'À contacter', 'Message prêt', 'Contacté', 'Intéressé', 'Client', 'Refusé']);
  assert.equal(f.total, 7);
  assert.equal(f.contactRate, 57);   // 4 contactés sur 7
  assert.equal(f.interestRate, 50);  // 2 intéressés sur 4 contactés
  assert.equal(f.closeRate, 50);     // 1 client sur 2 intéressés
  assert.equal(funnelOf([]).contactRate, null);
});

test('nouveaux commerces par semaine', () => {
  const now = Date.now();
  const d = n => new Date(now - n * 864e5).toISOString();
  const w = weeklyAdds([{ created_at: d(1) }, { created_at: d(2) }, { created_at: d(9) }, { created_at: d(200) }, {}], 4, now);
  assert.deepEqual(w, [0, 0, 1, 2]);
});

test('scores : seuls les audits analysés comptent', () => {
  const ok = s => ({ status: 'Analysé', score: s, created_at: new Date().toISOString() });
  const b = scoreBuckets([ok(30), ok(60), ok(90), ok(80), { status: 'En cours', score: 99 }]);
  assert.deepEqual(b, { low: 1, mid: 1, high: 2, total: 4 });
  const m = monthlyScores([ok(40), ok(60)], 3);
  assert.equal(m.length, 3);
  assert.equal(m[2].avg, 50);
  assert.equal(m[0].avg, null);
});

test('classement des agents', () => {
  const ag = [{ id: 1, name: 'A', role: 'SDR IA', status: 'idle' }, { id: 2, name: 'B', role: 'SDR IA', status: 'working' }];
  const rows = agentBoard(ag, a => (a.id === 2 ? { done: 3, total: 4, pct: 75 } : { done: 1, total: 4, pct: 25 }), () => ({ messages: 0, found: 0 }));
  assert.equal(rows[0].name, 'B');
});
