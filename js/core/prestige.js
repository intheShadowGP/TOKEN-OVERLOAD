/** Renaissance : seuil, éligibilité, application. */
import { CONFIG } from './config.js';
import { resetRun } from './state.js';
import { prestigeMultiplier } from './economy.js';

const P = CONFIG.prestige;

/** Tokens à générer pendant la partie en cours pour renaître (n = renaissances déjà faites). */
export function rebirthThreshold(n) {
  let threshold = P.baseThreshold;
  for (let i = 0; i < n; i++) threshold *= thresholdGrowth(i);
  return Math.min(threshold, CONFIG.maxValue);
}

/** Facteur appliqué au seuil lors de la (i+1)-ième renaissance. */
export function thresholdGrowth(i) {
  return Math.max(P.growthMin, P.growthStart * P.growthDecay ** i);
}

export function canRebirth(s) {
  return s.renaissances < P.maxRenaissances && s.runGenerated >= rebirthThreshold(s.renaissances);
}

export function rebirthProgress(s) {
  const need = rebirthThreshold(s.renaissances);
  return { have: s.runGenerated, need, ratio: Math.min(1, s.runGenerated / need) };
}

/** Aperçu affiché avant confirmation. */
export function rebirthPreview(s) {
  return {
    current: prestigeMultiplier(s.renaissances),
    next: prestigeMultiplier(s.renaissances + 1),
    nextThreshold: rebirthThreshold(s.renaissances + 1),
  };
}

/**
 * Effectue la renaissance. Ne s'exécute que si les conditions sont remplies.
 * @param {import('./state.js').GameState} s
 */
export function performRebirth(s) {
  if (!canRebirth(s)) return null;
  const record = {
    n: s.renaissances + 1,
    generated: s.runGenerated,
    duration: s.runTime,
    at: s.playTime,
  };
  s.rebirthHistory.push(record);
  if (s.rebirthHistory.length > 500) s.rebirthHistory.shift();
  s.renaissances += 1;
  resetRun(s);
  return record;
}
