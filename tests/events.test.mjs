import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEngine, close } from './helpers.mjs';
import { CONFIG } from '../js/core/config.js';
import { activeMultipliers, eligibleEvents, pickEvent } from '../js/core/events.js';
import { EVENTS } from '../js/data/events.js';

test('catalogue : toutes les catégories demandées sont présentes', () => {
  const ids = new Set(EVENTS.map((e) => e.id));
  for (const id of ['nvidia-delivery', 'perfect-prompt', 'new-gpu-cluster', 'cdi-mining', 'ciso-approval', 'optimized-patch', 'datacenter-outage', 'vram-leak', 'fake-ddos', 'intern-deleted', 'neural-overload', 'zero-day', 'quantum-breakthrough', 'imminent-singularity', 'forgotten-prompt', 'autonomous-net', 'security-patch', 'firewall', 'security-audit', 'immutable-backup']) {
    assert.ok(ids.has(id), id);
  }
});

test('tirage pondéré déterministe avec un générateur injecté', () => {
  const e = makeEngine({ totalGenerated: 1e9 });
  assert.equal(pickEvent(e.state, () => 0).id, EVENTS[0].id);
  assert.equal(pickEvent(e.state, () => 0.999999).id, eligibleEvents(e.state).at(-1).id);
});

test('pas de malus en tout début de partie', () => {
  const e = makeEngine({ totalGenerated: 10 });
  assert.ok(eligibleEvents(e.state).every((d) => d.kind !== 'negative'));
});

test('les événements se déclenchent selon le délai configuré, jamais en rafale', () => {
  const e = makeEngine({ buildings: { 'cdi-pc': 10 }, totalGenerated: 1e6 });
  e.state.settings.events = true;
  let count = 0;
  e.on('event', () => count++);
  e.on('event:blocked', () => count++);
  for (let i = 0; i < 3600; i++) e.advance(1);
  const max = Math.ceil((3600 - CONFIG.events.firstDelay) / CONFIG.events.minDelay) + 1;
  const min = Math.floor((3600 - CONFIG.events.firstDelay) / CONFIG.events.maxDelay);
  assert.ok(count >= min && count <= max, `${count} événements en 1 h`);
});

test('désactivés dans les paramètres : aucun événement', () => {
  const e = makeEngine({ buildings: { 'cdi-pc': 10 } });
  e.state.settings.events = false;
  let count = 0;
  e.on('event', () => count++);
  for (let i = 0; i < 1000; i++) e.advance(1);
  assert.equal(count, 0);
});

test('bonus temporaire puis retour à la normale', () => {
  const e = makeEngine({ buildings: { 'cdi-pc': 10 } }, { allAchievements: true });
  const base = e.rates.tps;
  e.triggerEvent('cdi-mining');
  assert.ok(close(e.rates.tps, base * 3));
  e.advance(91);
  assert.ok(close(e.rates.tps, base));
});

test('malus limité, perte de tokens plafonnée', () => {
  const e = makeEngine({ buildings: { 'cdi-pc': 10 }, tokens: 1e6, totalGenerated: 1e6 }, { allAchievements: true });
  const tps = e.rates.tps;
  const r = e.triggerEvent('intern-deleted');
  // min(5 % de 1 M, 120 s de production)
  assert.ok(close(r.amount, Math.min(5e4, 120 * tps)));
  assert.ok(close(e.state.tokens, 1e6 - r.amount));
  assert.equal(e.state.totalGenerated, 1e6, 'les statistiques historiques ne baissent jamais');
});

test('patch de sécurité : bloque les incidents pendant 120 s', () => {
  const e = makeEngine({ buildings: { 'cdi-pc': 10 } });
  e.triggerEvent('security-patch');
  const r = e.triggerEvent('datacenter-outage');
  assert.equal(r.blocked, 'shield');
  assert.equal(e.state.effects.length, 0);
  e.advance(121);
  assert.equal(e.triggerEvent('datacenter-outage').blocked, undefined);
});

test('firewall : neutralise exactement un incident', () => {
  const e = makeEngine({ buildings: { 'cdi-pc': 10 } });
  e.triggerEvent('firewall');
  assert.equal(e.state.firewallCharges, 1);
  assert.equal(e.triggerEvent('vram-leak').blocked, 'firewall');
  assert.equal(e.state.firewallCharges, 0);
  assert.equal(e.triggerEvent('vram-leak').blocked, undefined);
  assert.equal(e.state.eventsBlocked, 1);
});

test('sauvegarde immuable : protège des pertes de tokens et demande une sauvegarde', () => {
  const e = makeEngine({ buildings: { 'cdi-pc': 10 }, tokens: 1000, totalGenerated: 1000 });
  let saves = 0;
  e.on('save-request', () => saves++);
  e.triggerEvent('immutable-backup');
  assert.ok(saves >= 1);
  assert.equal(e.triggerEvent('intern-deleted').blocked, 'immunity');
  assert.equal(e.state.tokens, 1000);
});

test('récompense instantanée basée sur la production, comptée dans les tokens générés', () => {
  const e = makeEngine({ buildings: { 'cdi-pc': 10 } }, { allAchievements: true });
  const { tps, click } = e.rates;
  const r = e.triggerEvent('ciso-approval');
  assert.ok(close(r.amount, Math.max(200, 300 * tps + 100 * click)));
  assert.ok(close(e.state.runGenerated, r.amount));
});

test('cumul des multiplicateurs borné', () => {
  const e = makeEngine();
  for (const id of ['nvidia-delivery', 'cdi-mining', 'quantum-breakthrough', 'autonomous-net', 'imminent-singularity', 'optimized-patch']) e.triggerEvent(id);
  const m = activeMultipliers(e.state);
  assert.ok(m.production <= CONFIG.events.maxMultiplier);
});

test('compatibles avec les renaissances : effets temporaires effacés, protections conservées', () => {
  const e = makeEngine({ runGenerated: 1e8, totalGenerated: 1e8 });
  e.triggerEvent('nvidia-delivery');
  e.triggerEvent('firewall');
  e.rebirth();
  assert.equal(e.state.effects.length, 0);
  assert.equal(e.state.firewallCharges, 1);
});
