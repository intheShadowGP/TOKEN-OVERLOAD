/** Succès : détection des déblocages. */
import { ACHIEVEMENTS } from '../data/achievements.js';
import { BUILDINGS, CLICK_UPGRADES } from '../data/upgrades.js';

/**
 * Débloque les succès dont la condition est remplie et les renvoie.
 * @param {import('./state.js').GameState} s
 * @param {{ tps: number }} rates
 */
export function checkAchievements(s, rates) {
  const ctx = { tps: rates.tps, buildingTypes: BUILDINGS.length, clickUpgradeCount: CLICK_UPGRADES.length };
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (Object.hasOwn(s.achievements, a.id)) continue;
    if (a.check(s, ctx)) {
      s.achievements[a.id] = s.playTime;
      unlocked.push(a);
    }
  }
  return unlocked;
}

export function achievementCount(s) {
  return Object.keys(s.achievements).length;
}
