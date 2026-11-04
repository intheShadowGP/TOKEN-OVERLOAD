// Rejoue une partie complète avec les vraies règles (seuils de js/data/prestige.js)
// et le joueur de référence de bot.mjs : renaissance dès que possible, puis
// Super Renaissance. Usage : node tests/simulate.mjs [renaissances] [--super]
import { GameEngine } from '../js/core/engine.js';
import { createInitialState } from '../js/core/state.js';
import { formatDuration, formatNumber } from '../js/core/numbers.js';
import { GRADES } from '../js/data/levels.js';
import { ACHIEVEMENTS } from '../js/data/achievements.js';
import { createBot, stepFor } from './bot.mjs';

/** Succès qui dépendent du joueur et non de l'économie (événements, export). */
export const PLAYER_ACHIEVEMENTS = ['event-1', 'event-25', 'event-rare', 'event-blocked', 'export'];

export function simulate({ runs = 10, superRebirth = false, maxHoursPerRun = 400, quiet = false, unlockPlayerAchievements = false } = {}) {
  const state = createInitialState(0);
  state.settings.events = false;
  const engine = new GameEngine(state, { rng: () => 0.5 });
  const bot = createBot(engine);
  const results = [];

  for (let run = 0; run < runs; run++) {
    while (!engine.canRebirth() && state.runTime < maxHoursPerRun * 3600) bot.step(stepFor(state.runTime));
    if (!engine.canRebirth()) break;
    results.push({ run: run + 1, time: state.runTime, total: state.playTime, grade: GRADES[state.gradeIndex].name });
    if (!quiet) console.log(`renaissance ${String(run + 1).padStart(3)} : partie ${formatDuration(state.runTime).padEnd(16)} cumul ${formatDuration(state.playTime).padEnd(14)} grade ${GRADES[state.gradeIndex].name}`);
    engine.rebirth();
  }

  let superResult = null;
  if (superRebirth) {
    if (unlockPlayerAchievements) for (const id of PLAYER_ACHIEVEMENTS) state.achievements[id] = state.playTime;
    while (!engine.superStatus().ready && state.runTime < maxHoursPerRun * 3600) bot.step(stepFor(state.runTime));
    const ready = engine.superStatus().ready;
    const total = state.playTime;
    const record = ready ? engine.superRebirth() : null;
    superResult = { ready, total, record, artificial: Object.hasOwn(state.achievements, 'i-am-artificial'), missing: engine.superStatus().achievements.missing.map((a) => a.id) };
    if (!quiet) console.log(ready ? `SUPER RENAISSANCE après ${formatDuration(total)} (${(total / 86400).toFixed(1)} jours)` : `Super Renaissance non atteinte : ${JSON.stringify(superResult.missing)}`);
  }
  return { results, superResult, achievements: Object.keys(state.achievements).length, totalAchievements: ACHIEVEMENTS.length, tokens: formatNumber(state.totalGenerated) };
}

if (process.argv[1]?.endsWith('simulate.mjs')) {
  const runs = Number(process.argv[2] ?? 30);
  simulate({ runs, superRebirth: process.argv.includes('--super'), unlockPlayerAchievements: true });
}
