import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEngine, memoryStorage } from './helpers.mjs';
import { CONFIG } from '../js/core/config.js';
import { SaveError, checksum, deserialize, loadGame, safeStorage, sanitizeState, saveGame, serialize, wipeGame } from '../js/core/storage.js';
import { createInitialState } from '../js/core/state.js';

/** Re-signe une enveloppe après modification de ses données. */
function resign(text, mutate) {
  const env = JSON.parse(text);
  mutate(env.data, env);
  env.checksum = checksum(JSON.stringify(env.data));
  return JSON.stringify(env);
}

function playedState() {
  const e = makeEngine({ tokens: 5e6, runGenerated: 5e6, totalGenerated: 9e6, totalClicks: 3000, manualClicks: 3000 });
  e.buyBuilding('cdi-pc', 10);
  e.buyClickUpgrade('wheel-mouse');
  e.triggerEvent('nvidia-delivery');
  e.state.settings.volume = 0.3;
  e.state.settings.numberFormat = 'sci';
  return e.state;
}

test('export puis import : partie identique', () => {
  const s = playedState();
  const text = serialize(s);
  const { state, errors } = deserialize(text);
  assert.deepEqual(errors, []);
  assert.deepEqual(state, JSON.parse(JSON.stringify(s)));
});

test('sauvegarde locale : écriture, relecture, copie de secours', () => {
  const backend = memoryStorage();
  const store = safeStorage(backend);
  const s = playedState();
  assert.equal(saveGame(store, s, 1000), true);
  s.tokens = 42;
  saveGame(store, s, 2000);
  const loaded = loadGame(store);
  assert.equal(loaded.source, 'save');
  assert.equal(loaded.state.tokens, 42);
  assert.ok(backend.getItem(CONFIG.save.backupKey), 'copie de secours présente');
  // sauvegarde principale corrompue : la copie de secours prend le relais
  backend.setItem(CONFIG.save.key, '{"tronqué');
  const fallback = loadGame(store);
  assert.equal(fallback.source, 'backup');
  assert.equal(fallback.state.renaissances, s.renaissances);
});

test('stockage indisponible ou tout corrompu : nouvelle partie sans planter', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('x'); } };
  const store = safeStorage(broken);
  assert.equal(store.available, false);
  assert.equal(loadGame(store).source, 'new');
  assert.equal(saveGame(store, createInitialState()), false);
  const mem = memoryStorage();
  mem.setItem(CONFIG.save.key, 'garbage');
  assert.equal(loadGame(safeStorage(mem)).source, 'corrupted');
});

test('réinitialisation : suppression effective de toutes les clés du jeu', () => {
  const backend = memoryStorage();
  const store = safeStorage(backend);
  saveGame(store, createInitialState());
  saveGame(store, createInitialState());
  backend.setItem(CONFIG.save.corruptedKey, 'x');
  backend.setItem('autre-site', 'garder');
  assert.equal(wipeGame(store), true);
  assert.deepEqual([...backend.map.keys()], ['autre-site']);
});

test('import refusé : JSON invalide, mauvais format, taille excessive', () => {
  assert.throws(() => deserialize('pas du json'), SaveError);
  assert.throws(() => deserialize('{"format":"autre","data":{}}'), SaveError);
  assert.throws(() => deserialize('x'.repeat(CONFIG.save.maxImportBytes + 1)), /volumineux/);
  assert.throws(() => deserialize(''), SaveError);
});

test('import refusé : empreinte d’intégrité incorrecte', () => {
  const env = JSON.parse(serialize(playedState()));
  env.data.tokens = 1e100;
  assert.throws(() => deserialize(JSON.stringify(env)), /intégrité/);
});

test('import refusé : types et bornes invalides', () => {
  const base = serialize(playedState());
  const cases = [
    (d) => (d.tokens = -5),
    (d) => (d.tokens = 'beaucoup'),
    (d) => (d.totalClicks = 1.5),
    (d) => (d.renaissances = 1e9),
    (d) => (d.buildings['cdi-pc'] = -1),
    (d) => (d.buildings['inconnu'] = 3),
    (d) => (d.upgrades.shortcuts = true), // prérequis « Clavier mécanique » absent
    (d) => (d.settings.volume = 99),
    (d) => (d.settings.numberFormat = '<img src=x onerror=alert(1)>'),
    (d) => (d.log = 'texte'),
    (d) => delete d.tokens,
    (d) => (d.tokens = d.totalGenerated * 10),
  ];
  for (const mutate of cases) assert.throws(() => deserialize(resign(base, mutate)), SaveError, mutate.toString());
});

test('import refusé : version future ou absente', () => {
  const base = serialize(playedState());
  assert.throws(() => deserialize(resign(base, (d) => (d.v = 999))), /plus récente/);
  assert.throws(() => deserialize(resign(base, (d) => delete d.v)), /Version/);
});

test('pollution de prototype impossible', () => {
  const base = serialize(playedState());
  const text = resign(base, (d) => {
    d.buildings = JSON.parse('{"__proto__":{"polluted":true},"cdi-pc":3}');
  });
  assert.throws(() => deserialize(text), SaveError);
  const { state } = deserialize(text, { strict: false });
  assert.equal(({}).polluted, undefined);
  assert.equal(Object.getPrototypeOf(state.buildings), Object.prototype);
  assert.equal(state.buildings['cdi-pc'], 3);
});

test('les multiplicateurs d’effets ne peuvent pas être injectés', () => {
  const base = serialize(playedState());
  const text = resign(base, (d) => {
    d.effects = [{ id: 'nvidia-delivery', endsAt: d.clock + 30, mult: 1e100, effects: [{ target: 'production', mult: 1e100 }] }];
  });
  const { state } = deserialize(text);
  assert.deepEqual(Object.keys(state.effects[0]).sort(), ['endsAt', 'id']);
});

test('un grade non mérité est ramené au grade justifié par les statistiques', () => {
  const { state } = sanitizeState({ ...createInitialState(), gradeIndex: 11, bestGradeIndex: 11 });
  assert.equal(state.gradeIndex, 0);
  assert.equal(state.bestGradeIndex, 0);
});

test('migration v1 → v2 : l’ancien grade devient le meilleur grade atteint', () => {
  const v1 = { ...createInitialState(), v: 1, totalBuildingsBought: 40, totalClicks: 20000, renaissances: 1, gradeIndex: 4 };
  delete v1.bestGradeIndex;
  const text = JSON.stringify({ format: 'token-overload-save', version: 1, checksum: checksum(JSON.stringify(v1)), data: v1 });
  const { state, errors } = deserialize(text);
  assert.deepEqual(errors, []);
  assert.equal(state.v, 2);
  assert.equal(state.bestGradeIndex, 4);
  assert.equal(state.gradeIndex, 0, 'le grade courant se regagne pendant la partie');
});

test('le texte du journal est nettoyé (caractères de contrôle, longueur)', () => {
  const raw = { ...createInitialState(), log: [{ t: 1, kind: 'info', text: `a\u0000b c${'z'.repeat(500)}` }] };
  const { state } = sanitizeState(raw);
  assert.equal(state.log[0].text.length, 200);
  assert.ok(![...state.log[0].text].some((ch) => ch.charCodeAt(0) === 0 || ch.charCodeAt(0) === 0x2028));
});

test('chargement local tolérant : données partiellement abîmées corrigées, pas rejetées', () => {
  const store = safeStorage(memoryStorage());
  const text = resign(serialize(playedState()), (d) => {
    d.buildings.inconnu = 4;
    d.settings.volume = 'fort';
  });
  store.set(CONFIG.save.key, text);
  const loaded = loadGame(store);
  assert.equal(loaded.source, 'save');
  assert.ok(loaded.errors.length >= 2);
  assert.equal(loaded.state.buildings.inconnu, undefined);
  assert.equal(loaded.state.settings.volume, 0.5);
  assert.equal(loaded.state.buildings['cdi-pc'], 10);
});
