// Utilitaires partagés par les tests TOKEN OVERLOAD.
import { GameEngine } from '../js/core/engine.js';
import { createInitialState } from '../js/core/state.js';
import { ACHIEVEMENTS } from '../js/data/achievements.js';


/**
 * Moteur déterministe, événements aléatoires coupés.
 * allAchievements : tous les succès déjà acquis, pour que le multiplicateur
 * reste constant pendant un test de calcul.
 */
export function makeEngine(patch = {}, { rng = () => 0.5, allAchievements = false } = {}) {
  const state = createInitialState(0);
  state.settings.events = false;
  if (allAchievements) for (const a of ACHIEVEMENTS) state.achievements[a.id] = 0;
  Object.assign(state, patch);
  return new GameEngine(state, { rng });
}

/** Stockage en mémoire compatible avec l'API localStorage. */
export function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    map,
  };
}

export const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
