/** Forme de l'état de jeu, état initial et remise à zéro de partie. */
import { CONFIG } from './config.js';
import { defaultSettings } from './settings.js';

export const SAVE_VERSION = 1;

/** @param {number} [now] horodatage (ms) de création */
export function createInitialState(now = Date.now()) {
  return {
    v: SAVE_VERSION,
    createdAt: now,
    lastSaved: now,

    // économie de la partie en cours
    tokens: 0,
    runGenerated: 0,
    runClicks: 0,
    runBuildingsBought: 0,
    runTime: 0,
    buildings: /** @type {Record<string, number>} */ ({}),
    upgrades: /** @type {Record<string, true>} */ ({}),
    autoclickers: /** @type {Record<string, number>} */ ({}),
    autoClickCarry: 0,

    // historique (jamais remis à zéro)
    totalGenerated: 0,
    totalClicks: 0,
    manualClicks: 0,
    autoClicks: 0,
    totalBuildingsBought: 0,
    renaissances: 0,
    gradeIndex: 0,
    achievements: /** @type {Record<string, number>} */ ({}),
    bestTps: 0,
    playTime: 0,
    /** Horloge de simulation (s) : avance aussi hors ligne, sert aux durées d'effets. */
    clock: 0,
    exports: 0,

    // événements
    effects: /** @type {{ id: string, endsAt: number }[]} */ ([]),
    shieldUntil: 0,
    lossImmuneUntil: 0,
    firewallCharges: 0,
    nextEventAt: CONFIG.events.firstDelay,
    eventsSeen: 0,
    rareEventsSeen: 0,
    eventsBlocked: 0,

    // historique de progression
    history: /** @type {{ t: number, tps: number, total: number }[]} */ ([]),
    rebirthHistory: /** @type {{ n: number, generated: number, duration: number, at: number }[]} */ ([]),
    log: /** @type {{ t: number, kind: string, text: string }[]} */ ([]),

    settings: defaultSettings(),
  };
}

/** @typedef {ReturnType<typeof createInitialState>} GameState */

/**
 * Remet à zéro la partie en cours (renaissance). Ne touche jamais aux
 * statistiques historiques, grades, succès ni paramètres.
 * @param {GameState} s
 */
export function resetRun(s) {
  s.tokens = 0;
  s.runGenerated = 0;
  s.runClicks = 0;
  s.runBuildingsBought = 0;
  s.runTime = 0;
  s.buildings = {};
  s.upgrades = {};
  s.autoclickers = {};
  s.autoClickCarry = 0;
  s.effects = [];
  s.nextEventAt = s.clock + CONFIG.events.firstDelay;
}
