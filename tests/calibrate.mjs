// Calibrage des seuils de renaissance par simulation.
//
// Courbe cible (temps de jeu cumulé du joueur de référence, voir bot.mjs) :
//   1re renaissance : 45 min · 20e : ~36 h · 30e : ~72 h · Super Renaissance : ~1 mois (720 h)
// Pour chaque partie, on simule le joueur pendant la durée cible et on prend
// les tokens générés comme seuil. Le joueur joue de façon identique quel que
// soit le seuil : la table obtenue reproduit donc exactement la courbe.
//
// Usage : node tests/calibrate.mjs [--write]   (--write régénère js/data/prestige.js)
import { writeFileSync } from 'node:fs';
import { GameEngine } from '../js/core/engine.js';
import { createInitialState, resetRun } from '../js/core/state.js';
import { CONFIG } from '../js/core/config.js';
import { formatDuration, formatNumber } from '../js/core/numbers.js';
import { BOOSTERS, BUILDINGS } from '../js/data/upgrades.js';
import { GRADES } from '../js/data/levels.js';
import { createBot, stepFor } from './bot.mjs';

const H = 3600;
const ANCHORS = { first: 0.75, r20: 35.5, r30: 71, total: 720 };

/** Temps cumulé cible (heures) pour atteindre la renaissance n. q : courbure après la 30e. */
export function targetHours(n, q) {
  if (n <= 20) return ANCHORS.first * n ** (Math.log(ANCHORS.r20 / ANCHORS.first) / Math.log(20));
  if (n <= 30) return ANCHORS.r20 * (n / 20) ** (Math.log(ANCHORS.r30 / ANCHORS.r20) / Math.log(30 / 20));
  return ANCHORS.r30 * (n / 30) ** q;
}

/** Une simulation complète ; renvoie la table de seuils et les observations. */
export function calibrate({ q = 1.7, quiet = true } = {}) {
  const state = createInitialState(0);
  state.settings.events = false;
  const engine = new GameEngine(state, { rng: () => 0.5 });
  const bot = createBot(engine);
  const thresholds = [];
  const firstBuy = {};
  const boosterRun = {};
  const gradeAt = {};
  let maxBank = [];
  let bestGrade = 0;

  const watch = (run) => {
    const s = engine.state;
    for (const b of BUILDINGS) if ((s.buildings[b.id] ?? 0) > 0 && !(b.id in firstBuy)) firstBuy[b.id] = run;
    for (const b of BOOSTERS) if (s.boosters[b.id] && !(b.id in boosterRun)) boosterRun[b.id] = run;
    maxBank[run] = Math.max(maxBank[run] ?? 0, s.tokens);
    while (s.bestGradeIndex > bestGrade) gradeAt[GRADES[++bestGrade].id] = { hours: s.playTime / H, run, renaissances: s.renaissances };
  };

  for (let n = 1; n <= CONFIG.superRebirth.renaissances; n++) {
    const duration = (targetHours(n, q) - targetHours(n - 1, q)) * H;
    while (state.runTime < duration) {
      bot.step(Math.min(stepFor(state.runTime), duration - state.runTime));
      watch(n);
    }
    thresholds.push(Number(state.runGenerated.toPrecision(3)));
    if (!quiet && (n <= 20 || n % 10 === 0)) console.log(`renaissance ${String(n).padStart(3)} : partie ${formatDuration(duration).padEnd(16)} cumul ${formatDuration(state.playTime).padEnd(14)} seuil ${formatNumber(state.runGenerated)}`);
    // renaissance forcée (le seuil n'existe pas encore)
    state.rebirthHistory.push({ n, generated: state.runGenerated, duration: state.runTime, at: state.playTime });
    state.renaissances += 1;
    resetRun(state);
    engine.invalidate();
    engine.evaluateProgress();
  }

  // partie de la Super Renaissance : 51 × le seuil de la 100e
  const superNeed = thresholds[thresholds.length - 1] * CONFIG.superRebirth.tokenFactor;
  const cap = 2000 * H;
  while (state.runGenerated < superNeed && state.runTime < cap) {
    bot.step(stepFor(state.runTime));
    watch(CONFIG.superRebirth.renaissances + 1);
  }
  return { thresholds, superHours: state.runTime / H, totalHours: state.playTime / H, firstBuy, boosterRun, gradeAt, maxBank, achievements: Object.keys(state.achievements) };
}

if (process.argv[1]?.endsWith('calibrate.mjs')) {
  // ajuste la courbure après la 30e pour que la Super Renaissance tombe vers 720 h
  let lo = 1, hi = 3, best = null;
  for (let i = 0; i < 7; i++) {
    const q = (lo + hi) / 2;
    const r = calibrate({ q });
    console.log(`q=${q.toFixed(3)} : 100e renaissance à ${(targetHours(100, q)).toFixed(0)} h, Super Renaissance à ${r.totalHours.toFixed(0)} h`);
    if (!best || Math.abs(r.totalHours - ANCHORS.total) < Math.abs(best.r.totalHours - ANCHORS.total)) best = { q, r };
    if (r.totalHours > ANCHORS.total) hi = q;
    else lo = q;
  }
  const r = calibrate({ q: best.q, quiet: false });
  console.log(`\nSuper Renaissance : partie de ${formatDuration(r.superHours * H)}, total ${r.totalHours.toFixed(1)} h`);
  console.log('\nGrades atteints :');
  for (const [id, g] of Object.entries(r.gradeAt)) console.log(`  ${id.padEnd(24)} ${g.hours.toFixed(1).padStart(6)} h (${g.renaissances} renaissances)`);
  console.log('\nPremier achat (n° de partie) :');
  for (const b of BUILDINGS.slice(-10)) console.log(`  ${b.name.padEnd(40)} partie ${r.firstBuy[b.id] ?? '—'}`);
  console.log('\nBoosters achetés (n° de partie) :', JSON.stringify(r.boosterRun));
  console.log(`Seuils : 6e partie ${formatNumber(r.thresholds[5])}, 9e partie ${formatNumber(r.thresholds[8])}`);
  console.log(`Tokens max en banque : partie 6 = ${formatNumber(r.maxBank[6])}, partie 9 = ${formatNumber(r.maxBank[9])}`);
  console.log(`Succès obtenus par le joueur de référence (événements coupés) : ${r.achievements.length}`);
  if (process.argv.includes('--write')) {
    const header = `/**\n * Seuils de renaissance (tokens à générer pendant la partie), indexés par le\n * nombre de renaissances déjà faites : REBIRTH_THRESHOLDS[0] = 1re renaissance.\n * FICHIER GÉNÉRÉ par tests/calibrate.mjs (q = ${best.q.toFixed(3)}) — ne pas modifier à la main.\n * Courbe visée : 45 min pour la 1re, ~36 h cumulées pour la 20e, ~72 h pour la\n * 30e, ~720 h (1 mois) pour la Super Renaissance.\n */\n`;
    const rows = [];
    for (let i = 0; i < r.thresholds.length; i += 5) rows.push('  ' + r.thresholds.slice(i, i + 5).map((v) => v.toExponential(2).replace('e+', 'e')).join(', ') + ',');
    writeFileSync(new URL('../js/data/prestige.js', import.meta.url), `${header}export const REBIRTH_THRESHOLDS = Object.freeze([\n${rows.join('\n')}\n]);\n`);
    console.log('\njs/data/prestige.js régénéré.');
  }
}
