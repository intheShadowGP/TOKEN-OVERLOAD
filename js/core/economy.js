/**
 * Calculs économiques purs : coûts, production, multiplicateurs.
 *
 * Chaîne de production (chaque multiplicateur appliqué exactement une fois) :
 *   brut       = Σ base × quantité × paliers
 *   global     = renaissance (2^n × super) × (1 + succès) × (1 + grades)
 *   TPS        = brut × global × événements(production) × boosters(production)
 *   clic       = (base de clic + part × brut) × global × événements(clic) × boosters(clic)
 */
import { CONFIG } from './config.js';
import { clampValue } from './numbers.js';
import { activeMultipliers } from './events.js';
import { ACHIEVEMENT_MAP } from '../data/achievements.js';
import { AUTOCLICKERS, BOOSTERS, BUILDINGS, CLICK_UPGRADES } from '../data/upgrades.js';

const g = CONFIG.costGrowth;

/** Coût de `qty` unités quand on en possède déjà `owned` (somme géométrique). */
export function buildingCost(def, owned, qty = 1) {
  if (qty <= 0) return 0;
  const first = def.cost * g ** owned;
  // arrondi à l'entier supérieur : un prix affiché est toujours un prix exact
  return clampValue(Math.ceil(first * (g ** qty - 1) / (g - 1)));
}

/** Nombre maximal d'unités achetables avec `budget`. */
export function maxAffordable(def, owned, budget) {
  const first = def.cost * g ** owned;
  if (!(budget >= first)) return 0;
  let k = Math.floor(Math.log((budget * (g - 1)) / first + 1) / Math.log(g));
  // corrige les erreurs d'arrondi flottant aux bornes
  while (k > 0 && buildingCost(def, owned, k) > budget) k--;
  while (buildingCost(def, owned, k + 1) <= budget) k++;
  return Math.min(k, CONFIG.maxOwned - owned);
}

/** Multiplicateur de paliers (×2 à 25, 50, 100… unités). */
export function milestoneMultiplier(owned) {
  let m = 1;
  for (const step of CONFIG.milestones) if (owned >= step) m *= CONFIG.milestoneFactor;
  return m;
}

export function nextMilestone(owned) {
  return CONFIG.milestones.find((step) => step > owned) ?? null;
}

/** Production brute (sans multiplicateurs globaux) d'un type d'infrastructure. */
export function buildingRawTps(def, owned) {
  if (owned <= 0) return 0;
  return def.tps * owned * milestoneMultiplier(owned);
}

export function rawTps(s) {
  let total = 0;
  for (const def of BUILDINGS) total += buildingRawTps(def, s.buildings[def.id] ?? 0);
  return clampValue(total);
}

/** Multiplicateur permanent : ×2 par renaissance, ×1 000 000 par Super Renaissance. */
export function prestigeMultiplier(renaissances, superRenaissances = 0) {
  return clampValue(CONFIG.prestige.multiplierBase ** renaissances * CONFIG.superRebirth.multiplier ** superRenaissances);
}

/** Effets cumulés des boosters achetés pendant la partie. */
export function boosterEffects(s) {
  const fx = { production: 1, click: 1, costFactor: 1, protection: false, events: 1 };
  for (const b of BOOSTERS) {
    if (!s.boosters[b.id]) continue;
    if (b.effect.production) fx.production *= b.effect.production;
    if (b.effect.click) fx.click *= b.effect.click;
    if (b.effect.costFactor) fx.costFactor *= b.effect.costFactor;
    if (b.effect.protection) fx.protection = true;
    if (b.effect.events) fx.events *= b.effect.events;
  }
  return fx;
}

export function achievementBonus(s) {
  let bonus = 0;
  for (const id of Object.keys(s.achievements)) bonus += ACHIEVEMENT_MAP.get(id)?.reward ?? 0;
  return bonus;
}

export function gradeBonus(s) {
  return s.gradeIndex * CONFIG.gradeBonus;
}

/** Multiplicateur global permanent (renaissance × succès × grades). */
export function globalMultiplier(s) {
  return clampValue(prestigeMultiplier(s.renaissances, s.superRenaissances) * (1 + achievementBonus(s)) * (1 + gradeBonus(s)));
}

/** Valeur de base d'un clic et part de production ajoutée. */
export function clickProfile(s) {
  let base = CONFIG.baseClick;
  let share = 0;
  for (const u of CLICK_UPGRADES) {
    if (!s.upgrades[u.id]) continue;
    if (u.effect.base) base = Math.max(base, u.effect.base);
    if (u.effect.share) share += u.effect.share;
  }
  return { base, share };
}

export function autoclickerCost(def, level) {
  return clampValue(Math.ceil(def.cost * def.growth ** level));
}

export function autoClickRate(s) {
  let rate = 0;
  for (const a of AUTOCLICKERS) rate += a.rate * (s.autoclickers[a.id] ?? 0);
  return rate;
}

/**
 * Toutes les valeurs dérivées dont le moteur et l'interface ont besoin.
 * @param {import('./state.js').GameState} s
 */
export function computeRates(s) {
  const raw = rawTps(s);
  const prestige = prestigeMultiplier(s.renaissances, s.superRenaissances);
  const boost = boosterEffects(s);
  const achievements = achievementBonus(s);
  const grades = gradeBonus(s);
  const global = clampValue(prestige * (1 + achievements) * (1 + grades));
  const events = activeMultipliers(s);
  const { base, share } = clickProfile(s);
  const tps = clampValue(raw * global * events.production * boost.production);
  const click = clampValue((base + share * raw) * global * events.click * boost.click);
  return {
    rawTps: raw,
    tps,
    click,
    clickBase: base,
    clickShare: share,
    autoRate: autoClickRate(s),
    global,
    prestige,
    achievements,
    grades,
    eventProduction: events.production,
    eventClick: events.click,
    boostProduction: boost.production,
    boostClick: boost.click,
    costFactor: boost.costFactor,
  };
}

/** @typedef {ReturnType<typeof computeRates>} Rates */
