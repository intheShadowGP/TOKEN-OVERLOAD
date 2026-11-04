import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEngine, close } from './helpers.mjs';
import { CONFIG } from '../js/core/config.js';
import { rebirthThreshold, superStatus, superThreshold } from '../js/core/prestige.js';
import { BOOSTERS, BUILDING_MAP } from '../js/data/upgrades.js';
import { ACHIEVEMENTS } from '../js/data/achievements.js';
import { buildingCost } from '../js/core/economy.js';

const rich = { tokens: 1e30, totalGenerated: 1e30, runGenerated: 1e30 };

// ───── boosters ─────

test('5 boosters, achat unique, refusés sans fonds', () => {
  assert.equal(BOOSTERS.length, 5);
  const e = makeEngine({ tokens: 1, totalGenerated: 1 });
  assert.equal(e.buyBooster('ether-mine'), false);
  e.state.tokens = 1e30;
  e.state.totalGenerated = 1e30;
  assert.equal(e.buyBooster('ether-mine'), true);
  assert.equal(e.buyBooster('ether-mine'), false, 'déjà acheté');
  assert.equal(e.buyBooster('__proto__'), false);
});

test('prix des boosters : hors de portée vers la 5e renaissance, atteignables vers la 8e', () => {
  const cheapest = Math.min(...BOOSTERS.map((b) => b.cost));
  const dearest = Math.max(...BOOSTERS.map((b) => b.cost));
  // seuil de la 6e renaissance = tokens générés pendant la partie après 5 renaissances
  assert.ok(cheapest > rebirthThreshold(5) * 5, 'très cher après 5 renaissances');
  assert.ok(dearest < rebirthThreshold(8) * 2, 'atteignable après 8 renaissances');
});

test('Mine d’Ether-Token : production ×3, appliquée une seule fois', () => {
  const e = makeEngine({ ...rich, buildings: { 'cdi-pc': 10 } }, { allAchievements: true });
  const before = e.rates.tps;
  e.buyBooster('ether-mine');
  assert.ok(close(e.rates.tps, before * 3));
});

test('Amplificateur de prompt : clics ×10', () => {
  const e = makeEngine(rich, { allAchievements: true });
  const before = e.rates.click;
  e.buyBooster('prompt-amplifier');
  assert.ok(close(e.rates.click, before * 10));
});

test('Compresseur de contexte : infrastructures 50 % moins chères', () => {
  const e = makeEngine(rich);
  const def = BUILDING_MAP.get('datacenter');
  e.buyBooster('context-compressor');
  assert.equal(e.quoteBuilding('datacenter', 1).cost, Math.ceil(buildingCost(def, 0, 1) * 0.5));
});

test('Bouclier neuronal : tous les incidents neutralisés', () => {
  const e = makeEngine({ ...rich, buildings: { 'cdi-pc': 10 } });
  e.buyBooster('neural-firewall');
  for (const id of ['datacenter-outage', 'vram-leak', 'fake-ddos', 'intern-deleted', 'neural-overload']) assert.equal(e.triggerEvent(id).blocked, 'booster', id);
  assert.equal(e.state.effects.length, 0);
});

test('Accélérateur d’aléas : bonus deux fois plus longs', () => {
  const e = makeEngine({ ...rich, buildings: { 'cdi-pc': 10 } });
  e.buyBooster('event-accelerator');
  e.triggerEvent('nvidia-delivery');
  assert.equal(e.state.effects[0].endsAt, e.state.clock + 120);
});

test('les boosters sont remis à zéro à chaque renaissance', () => {
  const e = makeEngine(rich);
  e.buyBooster('ether-mine');
  e.rebirth();
  assert.deepEqual(e.state.boosters, {});
});

// ───── Super Renaissance ─────

const allButFinal = Object.fromEntries(ACHIEVEMENTS.filter((a) => a.id !== CONFIG.superRebirth.finalAchievement).map((a) => [a.id, 0]));

function readyEngine() {
  const need = superThreshold();
  return makeEngine({ renaissances: 100, tokens: need, runGenerated: need, totalGenerated: need * 2, achievements: { ...allButFinal }, totalBuildingsBought: 5000, totalClicks: 1e7 });
}

test('seuil de la Super Renaissance : seuil de la 100e renaissance + 5 000 %', () => {
  assert.equal(superThreshold(), rebirthThreshold(99) * 51);
});

test('conditions : 100 renaissances, tokens, tous les succès sauf « Je suis artificielle »', () => {
  const ok = readyEngine();
  assert.equal(superStatus(ok.state).ready, true);
  const few = readyEngine();
  few.state.renaissances = 99;
  assert.equal(superStatus(few.state).ready, false);
  const poor = readyEngine();
  poor.state.runGenerated = superThreshold() * 0.99;
  assert.equal(superStatus(poor.state).ready, false);
  const missing = readyEngine();
  delete missing.state.achievements['export'];
  const st = superStatus(missing.state);
  assert.equal(st.ready, false);
  assert.deepEqual(st.achievements.missing.map((a) => a.id), ['export']);
});

test('Super Renaissance : remet les renaissances à zéro, ×1 000 000 permanent, succès final', () => {
  const e = readyEngine();
  const record = e.superRebirth();
  const s = e.state;
  assert.equal(record.n, 1);
  assert.equal(s.superRenaissances, 1);
  assert.equal(s.renaissances, 0);
  assert.equal(s.tokens, 0);
  assert.equal(s.gradeIndex, 0);
  assert.equal(e.rates.prestige, 1e6);
  assert.ok(Object.hasOwn(s.achievements, 'i-am-artificial'));
  assert.equal(s.totalClicks, 1e7, 'statistiques conservées');
  assert.equal(e.superRebirth(), null, 'conditions plus remplies');
});
