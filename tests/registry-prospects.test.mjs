import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nafFor, zoneParams, buildRegistryUrl, parseRegistry, isKnownClient, findCandidates } from '../site/src/data/registry-prospects.js';

const fixture = { results: [
  { nom_complet: 'LUCIEN IZART', siege: { siret: '41962385500030', etat_administratif: 'A', adresse: '1 AVENUE DE LA RESISTANCE 11700 PEPIEUX', code_postal: '11700', libelle_commune: 'PEPIEUX', activite_principale: '43.34Z' } },
  { nom_complet: 'FERME DEMOLIE', siege: { siret: '12345678900011', etat_administratif: 'C', code_postal: '11700', libelle_commune: 'PEPIEUX' } },
  { nom_raison_sociale: 'Peinture Durand', siege: { siret: '98765432100022', etat_administratif: 'A', code_postal: '11700', libelle_commune: 'AZILLE' } },
  { nom_complet: 'SANS SIRET', siege: { etat_administratif: 'A' } },
] };

test('métier -> code NAF', () => {
  assert.equal(nafFor('Peintre façadier'), '43.34Z');
  assert.equal(nafFor('Plombier'), '43.22A');
  assert.equal(nafFor('Tous les métiers'), null);
  assert.equal(nafFor('constructor'), null);
});

test('zone : code postal ou département seulement', () => {
  assert.deepEqual(zoneParams('11700'), { code_postal: '11700' });
  assert.deepEqual(zoneParams(' 11 '), { departement: '11' });
  assert.deepEqual(zoneParams('2a'), { departement: '2A' });
  assert.equal(zoneParams('Carcassonne et alentours'), null);
  assert.equal(zoneParams(''), null);
});

test('URL de recherche', () => {
  const url = buildRegistryUrl('Peintre façadier', '11700');
  assert.match(url, /^https:\/\/recherche-entreprises\.api\.gouv\.fr\/search\?/);
  assert.match(url, /activite_principale=43\.34Z/);
  assert.match(url, /code_postal=11700/);
  assert.equal(buildRegistryUrl('Plombier', 'abc'), null);
});

test('réponse : seules les entreprises actives avec SIRET valide, noms lisibles', () => {
  const list = parseRegistry(fixture, 'Peintre façadier');
  assert.deepEqual(list.map(x => x.siret), ['41962385500030', '98765432100022']);
  assert.equal(list[0].name, 'Lucien Izart');
  assert.equal(list[0].city, 'Pepieux');
  assert.equal(list[0].category, 'Peintre façadier');
  assert.deepEqual(parseRegistry(null, 'Plombier'), []);
});

test('doublon : même nom et même ville que un prospect existant', () => {
  assert.equal(isKnownClient({ name: 'Lucien Izart', city: 'Pépieux' }, [{ name: 'LUCIEN IZART', city: 'pepieux' }]), true);
  assert.equal(isKnownClient({ name: 'Lucien Izart', city: 'Azille' }, [{ name: 'Lucien Izart', city: 'Pepieux' }]), false);
});

test('recherche : erreur claire si le registre répond mal, rien n’est inventé', async () => {
  await assert.rejects(findCandidates('Plombier', '11700', async () => ({ ok: false, status: 503 })), /code 503/);
  const ok = await findCandidates('Peintre façadier', '11700', async () => ({ ok: true, json: async () => fixture }));
  assert.equal(ok.length, 2);
});
