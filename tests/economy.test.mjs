import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEngine, close } from './helpers.mjs';
import { buildingCost, buildingRawTps, computeRates, maxAffordable, milestoneMultiplier, prestigeMultiplier } from '../js/core/economy.js';
import { formatDuration, formatNumber } from '../js/core/numbers.js';
import { CONFIG } from '../js/core/config.js';
import { AUTOCLICKERS, BUILDINGS, BUILDING_MAP, CLICK_UPGRADES } from '../js/data/upgrades.js';

const cdi = BUILDING_MAP.get('cdi-pc');

test('au moins 25 infrastructures, identifiants uniques, progression croissante', () => {
  assert.ok(BUILDINGS.length >= 25);
  assert.equal(new Set(BUILDINGS.map((b) => b.id)).size, BUILDINGS.length);
  for (let i = 1; i < BUILDINGS.length; i++) {
    assert.ok(BUILDINGS[i].cost > BUILDINGS[i - 1].cost, `${BUILDINGS[i].id} coûte plus cher`);
    assert.ok(BUILDINGS[i].tps > BUILDINGS[i - 1].tps, `${BUILDINGS[i].id} produit plus`);
  }
  assert.ok(CLICK_UPGRADES.length >= 5, 'plusieurs améliorations de clic');
  assert.ok(AUTOCLICKERS.length >= 1);
});

test('coût exponentiel : prix(n) = base × 1,15^n, arrondi au supérieur', () => {
  assert.equal(buildingCost(cdi, 0, 1), 15);
  assert.equal(buildingCost(cdi, 1, 1), Math.ceil(15 * 1.15));
  assert.equal(buildingCost(cdi, 10, 1), Math.ceil(15 * 1.15 ** 10));
});

test('achat groupé = somme des achats unitaires (à l’arrondi près)', () => {
  for (const qty of [10, 25]) {
    let sum = 0;
    for (let i = 0; i < qty; i++) sum += 15 * 1.15 ** (5 + i);
    const bulk = buildingCost(cdi, 5, qty);
    assert.ok(bulk >= sum && bulk - sum < 1, `x${qty} : ${bulk} vs ${sum}`);
  }
});

test('maxAffordable renvoie le plus grand nombre réellement payable', () => {
  for (const budget of [0, 14, 15, 100, 12345, 1e9]) {
    const k = maxAffordable(cdi, 3, budget);
    assert.ok(k === 0 || buildingCost(cdi, 3, k) <= budget);
    assert.ok(buildingCost(cdi, 3, k + 1) > budget);
  }
});

test('paliers : ×2 à 25, 50, 100…', () => {
  assert.equal(milestoneMultiplier(24), 1);
  assert.equal(milestoneMultiplier(25), 2);
  assert.equal(milestoneMultiplier(50), 4);
  assert.equal(milestoneMultiplier(100), 8);
  assert.equal(buildingRawTps(cdi, 25), 0.1 * 25 * 2);
});

test('multiplicateur de renaissance = 4^n', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(prestigeMultiplier), [1, 4, 16, 64, 256]);
});

test('le multiplicateur global s’applique exactement une fois au TPS et au clic', () => {
  const base = makeEngine({ buildings: { 'cdi-pc': 10, 'family-pc': 3 } });
  const reborn = makeEngine({ buildings: { 'cdi-pc': 10, 'family-pc': 3 }, renaissances: 2 });
  const a = base.rates;
  const b = reborn.rates;
  assert.ok(close(a.rawTps, 10 * 0.1 + 3 * 0.5));
  assert.ok(close(b.rawTps, a.rawTps), 'la production brute ne dépend pas des renaissances');
  assert.ok(close(b.tps, a.tps * 16), `TPS ×16 : ${b.tps} vs ${a.tps}`);
  assert.ok(close(b.click, a.click * 16), `clic ×16 : ${b.click} vs ${a.click}`);
  assert.equal(a.click, 1);
});

test('bonus de succès et de grade multipliés au multiplicateur de renaissance', () => {
  const e = makeEngine({ renaissances: 1, gradeIndex: 2, achievements: { 'first-token': 0, 'tokens-1m': 0 } });
  const r = computeRates(e.state);
  assert.ok(close(r.global, 4 * (1 + 0.03) * (1 + 0.2)));
});

test('clic : base la plus haute + part de production brute', () => {
  const e = makeEngine({ buildings: { 'cdi-pc': 100 }, upgrades: { 'wheel-mouse': true, 'mech-keyboard': true, 'shortcuts': true, 'caps-prompt': true, 'ai-assist': true } });
  const r = e.rates;
  assert.equal(r.clickBase, 500);
  assert.ok(close(r.click, 500 + 0.005 * r.rawTps));
});

test('formatage des grands nombres', () => {
  const nb = ' ';
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(0.1), '0,1');
  assert.equal(formatNumber(999), '999');
  assert.equal(formatNumber(1000), `1${nb}000`);
  assert.equal(formatNumber(123456), `123${nb}456`);
  assert.equal(formatNumber(1e6), `1${nb}M`);
  assert.equal(formatNumber(1.5e9), `1,5${nb}Md`);
  assert.equal(formatNumber(2.25e12), `2,25${nb}T`);
  assert.equal(formatNumber(1e15), `1${nb}Qa`);
  assert.equal(formatNumber(1.234e21), '1,23e21');
  assert.equal(formatNumber(2e6, { mode: 'sci' }), '2e6');
  assert.equal(formatNumber(NaN), '0');
  assert.equal(formatNumber(Infinity), '∞');
  assert.equal(formatDuration(59), `59${nb}s`);
  assert.equal(formatDuration(3725), `1${nb}h 02${nb}min`);
});

test('valeurs extrêmes : jamais NaN ni Infinity', () => {
  const e = makeEngine({ buildings: { singularity: CONFIG.maxOwned }, renaissances: CONFIG.prestige.maxRenaissances });
  const r = e.rates;
  assert.ok(Number.isFinite(r.tps) && r.tps <= CONFIG.maxValue);
  e.advance(86400);
  assert.ok(Number.isFinite(e.state.tokens) && e.state.tokens <= CONFIG.maxValue);
});
