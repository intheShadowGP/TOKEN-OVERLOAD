import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from './simulate.mjs';

const H = 3600;
const within = (value, target, tolerance) => Math.abs(value - target) <= target * tolerance;

// Joueur de référence (tests/bot.mjs) : achats optimaux, 4 clics/s, événements coupés.
const { results, superResult } = simulate({ runs: 100, superRebirth: true, quiet: true, unlockPlayerAchievements: true });
const at = (n) => results[n - 1].total / H;

test('équilibrage : 100 renaissances atteintes', () => {
  assert.equal(results.length, 100);
});

test('équilibrage : 1re renaissance vers 45 min', () => {
  assert.ok(within(results[0].time / 60, 45, 0.1), `${(results[0].time / 60).toFixed(1)} min`);
});

test('équilibrage : 20 renaissances vers 36 h (Transcendance), 30 vers 72 h (Omniscience)', () => {
  assert.ok(within(at(20), 36, 0.1), `20e à ${at(20).toFixed(1)} h`);
  assert.ok(within(at(30), 72, 0.1), `30e à ${at(30).toFixed(1)} h`);
});

test('équilibrage : chaque partie est plus longue que la précédente (à 5 % près)', () => {
  for (let n = 1; n < results.length; n++) assert.ok(results[n].time >= results[n - 1].time * 0.95, `partie ${n + 1}`);
});

test('équilibrage : Super Renaissance après environ un mois de jeu, succès « Je suis artificielle »', () => {
  assert.equal(superResult.ready, true, JSON.stringify(superResult.missing));
  const days = superResult.total / 86400;
  assert.ok(days >= 27 && days <= 33, `${days.toFixed(1)} jours`);
  assert.equal(superResult.artificial, true);
});
