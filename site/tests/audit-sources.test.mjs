// Non-régression : chaque fonction appelée par le moteur doit être exposée par createAuditSources.
// Lancer : node --test site/tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAuditSources } from '../src/api/audit-sources.js';

test('le moteur ne référence que des fonctions exposées par audit-sources', () => {
  const engine = readFileSync(new URL('../src/audit/engine.js', import.meta.url), 'utf8');
  const used = new Set([...engine.matchAll(/src\.([A-Za-z_]\w*)\(/g)].map(m => m[1]));
  const src = createAuditSources({ getClient: () => null });
  const missing = [...used].filter(name => typeof src[name] !== 'function');
  assert.deepEqual(missing, []);
});
