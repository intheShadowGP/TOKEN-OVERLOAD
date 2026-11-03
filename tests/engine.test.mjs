import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEngine, close } from './helpers.mjs';
import { CONFIG } from '../js/core/config.js';
import { buildingCost } from '../js/core/economy.js';
import { BUILDING_MAP } from '../js/data/upgrades.js';

test('un clic rapporte 1 token au départ et compte dans toutes les statistiques', () => {
  const e = makeEngine();
  assert.equal(e.click(0), 1);
  const s = e.state;
  assert.equal(s.tokens, 1);
  assert.equal(s.runGenerated, 1);
  assert.equal(s.totalGenerated, 1);
  assert.equal(s.totalClicks, 1);
  assert.equal(s.manualClicks, 1);
});

test('limitation à 25 clics manuels par seconde (répétition clavier)', () => {
  const e = makeEngine();
  let gained = 0;
  for (let i = 0; i < 100; i++) gained += e.click(500);
  assert.equal(e.state.manualClicks, CONFIG.maxManualClicksPerSecond);
  e.click(1600);
  assert.equal(e.state.manualClicks, CONFIG.maxManualClicksPerSecond + 1);
  assert.ok(gained > 0);
});

test('achat : déduit le coût exact, incrémente possession et clusters historiques', () => {
  const e = makeEngine({ tokens: 100, totalGenerated: 100, runGenerated: 100 });
  assert.equal(e.buyBuilding('cdi-pc', 1), true);
  assert.equal(e.state.tokens, 85);
  assert.equal(e.state.buildings['cdi-pc'], 1);
  assert.equal(e.state.totalBuildingsBought, 1);
});

test('achat refusé sans fonds suffisants, x10 exige les 10 unités', () => {
  const e = makeEngine({ tokens: 14, totalGenerated: 14 });
  assert.equal(e.buyBuilding('cdi-pc', 1), false);
  assert.equal(e.state.tokens, 14);
  const cdi = BUILDING_MAP.get('cdi-pc');
  const nine = buildingCost(cdi, 0, 9);
  e.state.tokens = nine;
  e.state.totalGenerated = nine;
  assert.equal(e.quoteBuilding('cdi-pc', 10).affordable, false);
  assert.equal(e.buyBuilding('cdi-pc', 10), false);
  assert.equal(e.buyBuilding('cdi-pc', 'max'), true);
  assert.equal(e.state.buildings['cdi-pc'], 9);
  assert.ok(e.state.tokens >= 0 && e.state.tokens < 15 * 1.15 ** 9);
});

test('identifiant inconnu : aucun achat', () => {
  const e = makeEngine({ tokens: 1e9, totalGenerated: 1e9 });
  assert.equal(e.buyBuilding('__proto__', 1), false);
  assert.equal(e.buyClickUpgrade('constructor'), false);
  assert.equal(e.buyAutoclicker('toString'), false);
});

test('améliorations de clic : achat unique et prérequis', () => {
  const e = makeEngine({ tokens: 1e7, totalGenerated: 1e7 });
  assert.equal(e.buyClickUpgrade('mech-keyboard'), false, 'prérequis manquant');
  assert.equal(e.buyClickUpgrade('wheel-mouse'), true);
  assert.equal(e.buyClickUpgrade('wheel-mouse'), false, 'déjà possédée');
  assert.equal(e.rates.clickBase, 5);
  assert.equal(e.buyClickUpgrade('mech-keyboard'), true);
  assert.equal(e.rates.clickBase, 25);
  assert.ok(close(e.click(0), 25 * e.rates.global));
});

test('production automatique indépendante du découpage du temps (delta time)', () => {
  const a = makeEngine({ buildings: { 'cdi-pc': 10, 'raspberry': 2 } }, { allAchievements: true });
  const b = makeEngine({ buildings: { 'cdi-pc': 10, 'raspberry': 2 } }, { allAchievements: true });
  a.advance(60);
  for (let i = 0; i < 3600; i++) b.advance(1 / 60);
  assert.ok(close(a.state.tokens, b.state.tokens, 1e-6), `${a.state.tokens} vs ${b.state.tokens}`);
  assert.ok(close(a.state.tokens, 60 * (10 * 0.1 + 2 * 12) * a.rates.global, 1e-9));
});

test('les effets temporaires sont intégrés au découpage exact de leur échéance', () => {
  const e = makeEngine({ buildings: { 'cdi-pc': 10 } }, { allAchievements: true });
  const g = e.rates.global;
  e.triggerEvent('nvidia-delivery'); // ×2 pendant 60 s
  const before = e.state.tokens;
  e.advance(100);
  // 60 s à 2 tok/s + 40 s à 1 tok/s (× multiplicateur global)
  assert.ok(close(e.state.tokens - before, (60 * 2 + 40 * 1) * g, 1e-9), String(e.state.tokens - before));
  assert.equal(e.state.effects.length, 0);
});

test('hors ligne : efficacité réduite, plafond 24 h, sans auto-clics', () => {
  const e = makeEngine({ buildings: { 'cdi-pc': 10 }, autoclickers: { 'ahk-macro': 4 } }, { allAchievements: true });
  const { gained } = e.advance(3600, { offline: true });
  assert.ok(close(gained, 3600 * e.rates.tps * CONFIG.offline.efficiency));
  assert.equal(e.state.autoClicks, 0);
  assert.equal(e.state.playTime, 0, 'le temps hors ligne ne compte pas comme temps de jeu');
  const f = makeEngine({ buildings: { 'cdi-pc': 10 } }, { allAchievements: true });
  const capped = f.advance(10 * 86400, { offline: true }).gained;
  assert.ok(close(capped, 86400 * f.rates.tps * CONFIG.offline.efficiency));
});

test('auto-cliqueurs : vrais clics comptés et rémunérés à la puissance de clic', () => {
  const e = makeEngine({ autoclickers: { 'ahk-macro': 2 } }, { allAchievements: true }); // 1 clic/s
  e.advance(10);
  assert.equal(e.state.autoClicks, 10);
  assert.equal(e.state.totalClicks, 10);
  assert.ok(close(e.state.tokens, 10 * e.rates.click));
});

test('meilleure production historique mémorisée', () => {
  const e = makeEngine({ buildings: { 'cdi-pc': 50 } }, { allAchievements: true });
  e.advance(1);
  assert.ok(close(e.state.bestTps, e.rates.tps));
});
