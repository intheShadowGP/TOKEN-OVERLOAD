import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEngine, close } from './helpers.mjs';
import { CONFIG } from '../js/core/config.js';
import { canRebirth, rebirthThreshold } from '../js/core/prestige.js';
import { earnedGradeIndex, nextGradeProgress } from '../js/core/progression.js';
import { GRADES } from '../js/data/levels.js';
import { ACHIEVEMENTS } from '../js/data/achievements.js';

// ───── renaissance ─────

test('seuil : 1 M, 100 M, 1 Md, 100 Md, 1 T… (alternance ×100 / ×10)', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(rebirthThreshold), [1e6, 1e8, 1e9, 1e11, 1e12, 1e14, 1e15]);
  for (let n = 1; n < 40; n++) assert.ok(rebirthThreshold(n) > rebirthThreshold(n - 1));
  assert.ok(Number.isFinite(rebirthThreshold(CONFIG.prestige.maxRenaissances)));
});

test('renaissance impossible sous le seuil, jamais automatique', () => {
  const e = makeEngine({ buildings: { 'cdi-pc': 5000 } });
  e.state.runGenerated = 999_999;
  e.state.totalGenerated = 999_999;
  assert.equal(canRebirth(e.state), false);
  assert.equal(e.rebirth(), null);
  e.advance(3600);
  assert.equal(e.state.renaissances, 0, 'advance ne déclenche jamais de renaissance');
});

test('renaissance : remet la partie à zéro et conserve l’historique', () => {
  const e = makeEngine({
    tokens: 5e6,
    runGenerated: 2e6,
    totalGenerated: 3e6,
    totalClicks: 1234,
    manualClicks: 1234,
    buildings: { 'cdi-pc': 40, 'family-pc': 12 },
    totalBuildingsBought: 80,
    upgrades: { 'wheel-mouse': true },
    autoclickers: { 'ahk-macro': 3 },
    achievements: { 'first-token': 1 },
    gradeIndex: 2,
  });
  e.state.effects.push({ id: 'nvidia-delivery', endsAt: 999 });
  const record = e.rebirth();
  const s = e.state;
  assert.equal(record.n, 1);
  // remis à zéro
  assert.equal(s.tokens, 0);
  assert.equal(s.runGenerated, 0);
  assert.deepEqual(s.buildings, {});
  assert.deepEqual(s.upgrades, {});
  assert.deepEqual(s.autoclickers, {});
  assert.equal(s.effects.length, 0);
  assert.equal(e.rates.rawTps, 0);
  assert.equal(e.rates.clickBase, 1);
  // conservé
  assert.equal(s.totalGenerated, 3e6);
  assert.equal(s.totalClicks, 1234);
  assert.equal(s.totalBuildingsBought, 80);
  assert.equal(s.renaissances, 1);
  assert.ok(Object.hasOwn(s.achievements, 'first-token'));
  assert.equal(s.gradeIndex, 0, 'le grade repart de Noobie');
  assert.equal(s.bestGradeIndex, 2, 'le meilleur grade est conservé');
  assert.equal(s.runClicks, 0);
  assert.equal(s.runBuildingsBought, 0);
  assert.equal(s.rebirthHistory.length, 1);
});

test('après renaissance, la même infrastructure produit exactement ×4', () => {
  const e = makeEngine({ runGenerated: 1e6, totalGenerated: 1e6 });
  e.state.buildings = { 'cdi-pc': 10 };
  const before = e.rates.tps / (1 + e.rates.achievements) / (1 + e.rates.grades);
  e.rebirth();
  e.state.buildings = { 'cdi-pc': 10 };
  e.invalidate();
  const after = e.rates.tps / (1 + e.rates.achievements) / (1 + e.rates.grades);
  assert.ok(close(after, before * 4), `${after} vs ${before * 4}`);
});

test('renaissances successives : multiplicateur 4^n', () => {
  const e = makeEngine();
  for (let n = 1; n <= 4; n++) {
    e.state.runGenerated = rebirthThreshold(e.state.renaissances);
    e.state.totalGenerated += e.state.runGenerated;
    assert.ok(e.rebirth());
    assert.equal(e.rates.prestige, 4 ** n);
  }
});

// ───── grades ─────

test('12 grades, conditions croissantes, tableau de départ respecté', () => {
  assert.equal(GRADES.length, 12);
  assert.deepEqual(GRADES[4].req, { clusters: 30, clicks: 10000, renaissances: 1 });
  assert.deepEqual(GRADES[11].req, { clusters: 1200, clicks: 5000000, renaissances: 30 });
  for (let i = 1; i < GRADES.length; i++) for (const k of ['clusters', 'clicks', 'renaissances']) assert.ok(GRADES[i].req[k] >= GRADES[i - 1].req[k]);
});

test('toutes les conditions doivent être remplies', () => {
  const e = makeEngine({ runBuildingsBought: 1000, runClicks: 1e6, totalBuildingsBought: 1000, totalClicks: 1e6, renaissances: 0 });
  assert.equal(earnedGradeIndex(e.state), 3, 'Script Kiddie : il manque une renaissance pour Prompt Engineer');
  e.state.renaissances = 1;
  assert.equal(earnedGradeIndex(e.state), 4);
});

test('le grade repart de zéro à chaque renaissance, conditions comptées depuis la renaissance', () => {
  const e = makeEngine({ tokens: 1e6, totalGenerated: 1e6, runGenerated: 1e6 });
  for (let i = 0; i < 5; i++) e.buyBuilding('cdi-pc', 1);
  for (let i = 0; i < 500; i++) e.click(i * 100);
  e.evaluateProgress();
  assert.equal(e.state.gradeIndex, 2, 'Vibe Codeur');
  e.rebirth();
  assert.equal(e.state.gradeIndex, 0, 'retour à Noobie après la renaissance');
  assert.equal(e.state.bestGradeIndex, 2, 'record conservé');
  assert.equal(e.state.totalBuildingsBought, 5, 'clusters historiques conservés dans les statistiques');
  assert.equal(e.state.totalClicks, 500, 'clics historiques conservés dans les statistiques');
  const p = nextGradeProgress(e.state);
  assert.equal(p.grade.id, 'prompt-beginner');
  assert.equal(p.items.find((x) => x.key === 'clusters').have, 0, 'les anciens clusters ne comptent plus');
  e.state.tokens = 1e6;
  e.state.totalGenerated += 1e6;
  for (let i = 0; i < 15; i++) e.buyBuilding('cdi-pc', 1);
  for (let i = 0; i < 2000; i++) e.click(i * 100);
  e.evaluateProgress();
  assert.equal(e.state.gradeIndex, 3, 'Script Kiddie regagné pendant la nouvelle partie');
  assert.equal(e.state.bestGradeIndex, 3);
  assert.equal(e.state.totalBuildingsBought, 20);
});

test('une montée de grade émet une notification et augmente la production', () => {
  const e = makeEngine({ buildings: { 'cdi-pc': 1 }, totalBuildingsBought: 1, runBuildingsBought: 1 });
  const seen = [];
  e.on('grade', (g) => seen.push(g.id));
  const before = e.rates.tps;
  for (let i = 0; i < 100; i++) e.click(i * 100);
  e.evaluateProgress(); // le moteur évalue la progression à chaque tick (advance)
  assert.deepEqual(seen, ['prompt-beginner']);
  assert.ok(e.rates.tps > before);
});

// ───── succès ─────

test('au moins 25 succès, identifiants uniques', () => {
  assert.ok(ACHIEVEMENTS.length >= 25);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  for (const a of ACHIEVEMENTS) assert.ok(a.name && a.text && typeof a.check === 'function' && a.reward > 0);
});

test('succès débloqués une seule fois, avec bonus permanent', () => {
  const e = makeEngine();
  const unlocked = [];
  e.on('achievement', (a) => unlocked.push(a.id));
  e.click(0);
  e.evaluateProgress();
  assert.ok(unlocked.includes('first-token'));
  e.click(10);
  e.evaluateProgress();
  assert.equal(unlocked.filter((id) => id === 'first-token').length, 1);
  assert.ok(close(e.rates.achievements, 0.01));
});

test('succès de production et de renaissance', () => {
  const e = makeEngine({ buildings: { 'gpu-cluster': 2 }, runGenerated: 1e6, totalGenerated: 1e6 });
  e.evaluateProgress();
  assert.ok(Object.hasOwn(e.state.achievements, 'tps-1m'));
  assert.ok(Object.hasOwn(e.state.achievements, 'own-gpu-cluster'));
  e.rebirth();
  assert.ok(Object.hasOwn(e.state.achievements, 'reb-1'));
  assert.ok(Object.hasOwn(e.state.achievements, 'tps-1m'), 'succès conservés après renaissance');
});
