/**
 * Sauvegarde locale, export/import JSON, validation et migrations.
 *
 * Principe : toute donnée lue (localStorage ou fichier importé) est
 * considérée comme non fiable. Elle est reconstruite champ par champ à
 * partir d'un état par défaut, avec contrôle de type, de bornes et
 * d'identifiants. Aucune donnée n'est jamais exécutée ni injectée en HTML.
 */
import { CONFIG } from './config.js';
import { SAVE_VERSION, createInitialState } from './state.js';
import { sanitizeSettings } from './settings.js';
import { earnedGradeIndex, lifetimeGradeStats } from './progression.js';
import { ACHIEVEMENT_MAP } from '../data/achievements.js';
import { EVENT_MAP } from '../data/events.js';
import { AUTOCLICKER_MAP, BOOSTER_MAP, BUILDING_MAP, CLICK_UPGRADE_MAP } from '../data/upgrades.js';

export const SAVE_FORMAT = 'token-overload-save';
const MAX = CONFIG.maxValue;
const LOG_KINDS = new Set(['info', 'achievement', 'grade', 'event', 'negative', 'defense', 'rebirth', 'system']);

/** Empreinte FNV-1a 32 bits : détecte une sauvegarde tronquée ou altérée par erreur. */
export function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v, min, max, int) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && (!int || Number.isInteger(v));

/** Champs numériques simples : [min, max, entier]. */
const NUMERIC = {
  createdAt: [0, 8.64e15, false],
  lastSaved: [0, 8.64e15, false],
  tokens: [0, MAX, false],
  runGenerated: [0, MAX, false],
  runClicks: [0, 1e15, true],
  runBuildingsBought: [0, 1e9, true],
  runTime: [0, 1e10, false],
  autoClickCarry: [0, 1, false],
  totalGenerated: [0, MAX, false],
  totalClicks: [0, 1e15, true],
  manualClicks: [0, 1e15, true],
  autoClicks: [0, 1e15, true],
  totalBuildingsBought: [0, 1e9, true],
  renaissances: [0, CONFIG.prestige.maxRenaissances, true],
  superRenaissances: [0, CONFIG.superRebirth.max, true],
  gradeIndex: [0, 11, true],
  bestGradeIndex: [0, 11, true],
  bestTps: [0, MAX, false],
  playTime: [0, 1e10, false],
  clock: [0, 1e11, false],
  exports: [0, 1e9, true],
  shieldUntil: [0, 1e11, false],
  lossImmuneUntil: [0, 1e11, false],
  firewallCharges: [0, CONFIG.events.maxFirewallCharges, true],
  nextEventAt: [0, 1e11, false],
  eventsSeen: [0, 1e9, true],
  rareEventsSeen: [0, 1e9, true],
  eventsBlocked: [0, 1e9, true],
};
const REQUIRED = ['tokens', 'totalGenerated', 'totalClicks', 'renaissances'];

/** Nettoie un texte de journal : longueur bornée, sans caractères de contrôle. */
function cleanText(v) {
  let out = '';
  for (const ch of String(v).slice(0, 200)) {
    const code = ch.codePointAt(0);
    out += code < 0x20 || code === 0x7f || code === 0x2028 || code === 0x2029 ? ' ' : ch;
  }
  return out;
}

/** Valide une table {id: entier} contre un ensemble d'identifiants connus. */
function intMap(raw, known, maxFor, path, errors) {
  const out = {};
  if (raw === undefined) return out;
  if (!isObj(raw)) {
    errors.push(path);
    return out;
  }
  for (const key of Object.keys(raw)) {
    const v = raw[key];
    if (!known.has(key)) {
      errors.push(`${path}.${key.slice(0, 40)}`);
      continue;
    }
    if (!isNum(v, 0, maxFor(key), true)) {
      errors.push(`${path}.${key}`);
      continue;
    }
    if (v > 0) out[key] = v;
  }
  return out;
}

function arrayOf(raw, maxLen, path, errors, mapItem) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    errors.push(path);
    return [];
  }
  if (raw.length > maxLen) errors.push(`${path} (trop long)`);
  const out = [];
  for (const item of raw.slice(-maxLen)) {
    const v = isObj(item) ? mapItem(item) : null;
    if (v) out.push(v);
    else errors.push(`${path}[]`);
  }
  return out;
}

/**
 * Reconstruit un état de jeu sûr à partir de données brutes.
 * @param {unknown} data
 * @returns {{ state: import('./state.js').GameState, errors: string[] }}
 */
export function sanitizeState(data) {
  const errors = [];
  const s = createInitialState(0);
  if (!isObj(data)) return { state: createInitialState(), errors: ['racine'] };
  const d = /** @type {Record<string, any>} */ (data);

  for (const key of REQUIRED) if (!Object.hasOwn(d, key)) errors.push(`${key} (manquant)`);
  for (const [key, [min, max, int]] of Object.entries(NUMERIC)) {
    if (!Object.hasOwn(d, key)) continue;
    if (isNum(d[key], min, max, int)) s[key] = d[key];
    else errors.push(key);
  }

  s.buildings = intMap(d.buildings, BUILDING_MAP, () => CONFIG.maxOwned, 'buildings', errors);
  s.autoclickers = intMap(d.autoclickers, AUTOCLICKER_MAP, (id) => AUTOCLICKER_MAP.get(id).maxLevel, 'autoclickers', errors);

  if (d.upgrades !== undefined) {
    if (!isObj(d.upgrades)) errors.push('upgrades');
    else {
      for (const key of Object.keys(d.upgrades)) {
        if (CLICK_UPGRADE_MAP.has(key) && d.upgrades[key] === true) s.upgrades[key] = true;
        else errors.push(`upgrades.${key.slice(0, 40)}`);
      }
    }
  }

  if (d.boosters !== undefined) {
    if (!isObj(d.boosters)) errors.push('boosters');
    else {
      for (const key of Object.keys(d.boosters)) {
        if (BOOSTER_MAP.has(key) && d.boosters[key] === true) s.boosters[key] = true;
        else errors.push(`boosters.${key.slice(0, 40)}`);
      }
    }
  }

  if (d.achievements !== undefined) {
    if (!isObj(d.achievements)) errors.push('achievements');
    else {
      for (const key of Object.keys(d.achievements)) {
        if (ACHIEVEMENT_MAP.has(key) && isNum(d.achievements[key], 0, 1e10, false)) s.achievements[key] = d.achievements[key];
        else errors.push(`achievements.${key.slice(0, 40)}`);
      }
    }
  }

  // Les effets ne stockent qu'un identifiant et une échéance : leur
  // multiplicateur vient toujours des données du jeu, jamais de la sauvegarde.
  s.effects = arrayOf(d.effects, 20, 'effects', errors, (fx) => {
    const def = EVENT_MAP.get(fx.id);
    if (!def?.effects || !isNum(fx.endsAt, 0, 1e11, false)) return null;
    return { id: def.id, endsAt: fx.endsAt };
  });
  s.history = arrayOf(d.history, CONFIG.history.maxPoints + 1, 'history', errors, (p) =>
    isNum(p.t, 0, 1e10, false) && isNum(p.tps, 0, MAX, false) && isNum(p.total, 0, MAX, false) ? { t: p.t, tps: p.tps, total: p.total } : null,
  );
  s.rebirthHistory = arrayOf(d.rebirthHistory, 500, 'rebirthHistory', errors, (r) =>
    isNum(r.n, 1, CONFIG.prestige.maxRenaissances, true) && isNum(r.generated, 0, MAX, false) && isNum(r.duration, 0, 1e10, false) && isNum(r.at, 0, 1e10, false)
      ? { n: r.n, generated: r.generated, duration: r.duration, at: r.at }
      : null,
  );
  s.superHistory = arrayOf(d.superHistory, CONFIG.superRebirth.max, 'superHistory', errors, (r) =>
    isNum(r.n, 1, CONFIG.superRebirth.max, true) && isNum(r.generated, 0, MAX, false) && isNum(r.at, 0, 1e10, false) ? { n: r.n, generated: r.generated, at: r.at } : null,
  );
  s.log = arrayOf(d.log, CONFIG.logSize, 'log', errors, (e) =>
    isNum(e.t, 0, 8.64e15, false) && typeof e.kind === 'string' && LOG_KINDS.has(e.kind) && typeof e.text === 'string'
      ? { t: e.t, kind: e.kind, text: cleanText(e.text) }
      : null,
  );
  s.settings = sanitizeSettings(d.settings, errors);

  // — cohérence entre champs —
  if (s.runGenerated > s.totalGenerated) errors.push('runGenerated > totalGenerated');
  if (s.tokens > s.totalGenerated * (1 + 1e-9) + 1) errors.push('tokens > totalGenerated');
  if (s.manualClicks + s.autoClicks > s.totalClicks) errors.push('clics incohérents');
  const owned = Object.values(s.buildings).reduce((a, b) => a + b, 0);
  if (owned > s.totalBuildingsBought) errors.push('infrastructures > clusters achetés');
  for (const [id, done] of Object.entries(s.upgrades)) {
    const req = CLICK_UPGRADE_MAP.get(id).requires;
    if (done && req && !s.upgrades[req]) errors.push(`upgrades.${id} (prérequis)`);
  }
  if (s.rebirthHistory.length > s.renaissances) errors.push('rebirthHistory');
  if (s.superHistory.length > s.superRenaissances) errors.push('superHistory');

  // Un grade se mérite : il est recalculé à partir des statistiques.
  s.gradeIndex = Math.min(s.gradeIndex, earnedGradeIndex(s));
  s.bestGradeIndex = Math.max(s.gradeIndex, Math.min(s.bestGradeIndex, earnedGradeIndex(s, lifetimeGradeStats(s))));
  if (s.effects.some((fx) => fx.endsAt > s.clock + 3600)) errors.push('effects (durée)');

  // corrections douces pour une sauvegarde locale partiellement abîmée
  s.runGenerated = Math.min(s.runGenerated, s.totalGenerated);
  s.tokens = Math.min(s.tokens, s.totalGenerated);
  s.totalBuildingsBought = Math.max(s.totalBuildingsBought, owned);
  s.totalClicks = Math.max(s.totalClicks, s.manualClicks + s.autoClicks);
  s.effects = s.effects.filter((fx) => fx.endsAt <= s.clock + 3600);
  for (const id of Object.keys(s.upgrades)) {
    const req = CLICK_UPGRADE_MAP.get(id).requires;
    if (req && !s.upgrades[req]) delete s.upgrades[id];
  }
  if (s.rebirthHistory.length > s.renaissances) s.rebirthHistory = s.rebirthHistory.slice(-s.renaissances || s.rebirthHistory.length);
  if (s.renaissances === 0) s.rebirthHistory = [];
  s.superHistory = s.superHistory.slice(-s.superRenaissances || s.superHistory.length).slice(0, s.superRenaissances);

  s.v = SAVE_VERSION;
  return { state: s, errors };
}

/**
 * Migrations : chaque entrée transforme une version N en N+1.
 */
const MIGRATIONS = {
  // v2 : grades remis à zéro à chaque renaissance ; l'ancien grade devient le record
  1: (d) => ({ ...d, v: 2, bestGradeIndex: d.gradeIndex }),
  // v3 : boosters et Super Renaissance ; les renaissances sont plafonnées à 100
  2: (d) => ({
    ...d,
    v: 3,
    boosters: {},
    superRenaissances: 0,
    superHistory: [],
    renaissances: typeof d.renaissances === 'number' ? Math.min(d.renaissances, CONFIG.prestige.maxRenaissances) : d.renaissances,
    rebirthHistory: Array.isArray(d.rebirthHistory) ? d.rebirthHistory.filter((r) => !(r?.n > CONFIG.prestige.maxRenaissances)) : d.rebirthHistory,
  }),
};

export function migrate(data) {
  if (!isObj(data)) throw new SaveError('Format de sauvegarde invalide.');
  let d = data;
  if (!isNum(d.v, 1, 1e6, true)) throw new SaveError('Version de sauvegarde absente ou invalide.');
  if (d.v > SAVE_VERSION) throw new SaveError("Cette sauvegarde provient d'une version plus récente du jeu.");
  while (d.v < SAVE_VERSION) {
    const step = MIGRATIONS[d.v];
    if (!step) throw new SaveError(`Aucune migration depuis la version ${d.v}.`);
    d = step(d);
  }
  return d;
}

export class SaveError extends Error {}

/** Données persistées (copie JSON-compatible de l'état). */
export function snapshot(s) {
  return JSON.parse(JSON.stringify(s));
}

/** Enveloppe versionnée avec empreinte, utilisée pour l'export et le stockage local. */
export function serialize(s, now = Date.now()) {
  const data = snapshot(s);
  const body = JSON.stringify(data);
  return JSON.stringify({ format: SAVE_FORMAT, version: SAVE_VERSION, exportedAt: new Date(now).toISOString(), checksum: checksum(body), data });
}

/**
 * Lit une enveloppe. strict = import utilisateur : toute anomalie est refusée.
 * @param {string} text
 * @param {{ strict?: boolean }} [opts]
 */
export function deserialize(text, { strict = true } = {}) {
  if (typeof text !== 'string' || text.length === 0) throw new SaveError('Sauvegarde vide.');
  if (text.length > CONFIG.save.maxImportBytes) throw new SaveError('Fichier trop volumineux (256 Ko maximum).');
  let env;
  try {
    env = JSON.parse(text);
  } catch {
    throw new SaveError("Le fichier n'est pas un JSON valide.");
  }
  if (!isObj(env) || env.format !== SAVE_FORMAT || !isObj(env.data)) throw new SaveError("Ce fichier n'est pas une sauvegarde TOKEN OVERLOAD.");
  if (typeof env.checksum !== 'string' || env.checksum !== checksum(JSON.stringify(env.data))) {
    throw new SaveError("Empreinte d'intégrité incorrecte : la sauvegarde est corrompue ou a été modifiée.");
  }
  const migrated = migrate(env.data);
  const { state, errors } = sanitizeState(migrated);
  if (strict && errors.length) {
    throw new SaveError(`Données invalides : ${errors.slice(0, 5).join(', ')}${errors.length > 5 ? '…' : ''}`);
  }
  return { state, errors };
}

/** Accès au stockage protégé (navigation privée, quota, stockage désactivé). */
export function safeStorage(backend) {
  return {
    get(key) {
      try {
        return backend?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        backend?.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        backend?.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
    get available() {
      try {
        const k = '__token-overload-probe__';
        backend.setItem(k, '1');
        backend.removeItem(k);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Charge la partie : sauvegarde principale, sinon copie de secours, sinon nouvelle partie.
 * @param {ReturnType<typeof safeStorage>} store
 */
export function loadGame(store) {
  for (const [key, source] of [[CONFIG.save.key, 'save'], [CONFIG.save.backupKey, 'backup']]) {
    const text = store.get(key);
    if (!text) continue;
    try {
      const { state, errors } = deserialize(text, { strict: false });
      return { state, source, errors };
    } catch {
      // illisible : on tente la copie de secours
    }
  }
  const hadData = Boolean(store.get(CONFIG.save.key) || store.get(CONFIG.save.backupKey));
  return { state: createInitialState(), source: hadData ? 'corrupted' : 'new', errors: [] };
}

/** Écrit la partie ; l'ancienne sauvegarde devient la copie de secours. */
export function saveGame(store, s, now = Date.now()) {
  s.lastSaved = now;
  const text = serialize(s, now);
  const previous = store.get(CONFIG.save.key);
  if (previous && previous !== text) store.set(CONFIG.save.backupKey, previous);
  return store.set(CONFIG.save.key, text);
}

/** Supprime toutes les données locales du jeu. */
export function wipeGame(store) {
  const keys = [CONFIG.save.key, CONFIG.save.backupKey, CONFIG.save.corruptedKey];
  for (const key of keys) store.remove(key);
  return keys.every((key) => store.get(key) === null);
}
