/** Renaissance : seuil, éligibilité, application. */
import { CONFIG } from './config.js';
import { resetRun } from './state.js';
import { prestigeMultiplier } from './economy.js';
import { REBIRTH_THRESHOLDS } from '../data/prestige.js';
import { ACHIEVEMENTS } from '../data/achievements.js';

const P = CONFIG.prestige;
const SR = CONFIG.superRebirth;

/** Tokens à générer pendant la partie en cours pour renaître (n = renaissances déjà faites). */
export function rebirthThreshold(n) {
  const table = REBIRTH_THRESHOLDS;
  return table[Math.max(0, Math.min(n, table.length - 1))];
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
    current: prestigeMultiplier(s.renaissances, s.superRenaissances),
    next: prestigeMultiplier(s.renaissances + 1, s.superRenaissances),
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

// ───── Super Renaissance ─────

/** Tokens à générer dans la partie pour la Super Renaissance. */
export function superThreshold() {
  return Math.min(CONFIG.maxValue, rebirthThreshold(SR.renaissances - 1) * SR.tokenFactor);
}

/** État détaillé des trois conditions de la Super Renaissance. */
export function superStatus(s) {
  const required = ACHIEVEMENTS.filter((a) => a.id !== SR.finalAchievement);
  const missing = required.filter((a) => !Object.hasOwn(s.achievements, a.id));
  const need = superThreshold();
  const status = {
    renaissances: { have: s.renaissances, need: SR.renaissances, ok: s.renaissances >= SR.renaissances },
    tokens: { have: s.runGenerated, need, ok: s.renaissances >= SR.renaissances && s.runGenerated >= need },
    achievements: { have: required.length - missing.length, need: required.length, ok: missing.length === 0, missing },
  };
  status.ready = s.superRenaissances < SR.max && status.renaissances.ok && status.tokens.ok && status.achievements.ok;
  return status;
}

/**
 * Super Renaissance : remet à zéro la partie et les renaissances, accorde un
 * multiplicateur permanent ×1 000 000. Succès, statistiques et record de grade conservés.
 */
export function performSuperRebirth(s) {
  if (!superStatus(s).ready) return null;
  const record = { n: s.superRenaissances + 1, generated: s.runGenerated, at: s.playTime };
  s.superHistory.push(record);
  s.superRenaissances += 1;
  s.renaissances = 0;
  s.rebirthHistory = [];
  resetRun(s);
  return record;
}
