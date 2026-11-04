/**
 * Événements aléatoires : tirage pondéré, multiplicateurs actifs, application.
 * Le hasard est injecté (rng) pour rendre le système testable et déterministe.
 */
import { CONFIG } from './config.js';
import { clampValue } from './numbers.js';
import { EVENTS, EVENT_MAP } from '../data/events.js';

const E = CONFIG.events;

/** Produit des multiplicateurs des effets encore actifs, borné. */
export function activeMultipliers(s) {
  let production = 1;
  let click = 1;
  for (const fx of s.effects) {
    if (fx.endsAt <= s.clock) continue;
    const def = EVENT_MAP.get(fx.id);
    if (!def?.effects) continue;
    for (const e of def.effects) {
      if (e.target === 'production') production *= e.mult;
      else if (e.target === 'click') click *= e.mult;
    }
  }
  const bound = (m) => Math.min(E.maxMultiplier, Math.max(E.minMultiplier, m));
  return { production: bound(production), click: bound(click) };
}

/** Prochaine échéance d'effet (horloge), ou Infinity. */
export function nextExpiry(s) {
  let t = Infinity;
  for (const fx of s.effects) if (fx.endsAt > s.clock && fx.endsAt < t) t = fx.endsAt;
  return t;
}

/** Retire les effets expirés ; renvoie leurs définitions. */
export function expireEffects(s) {
  const expired = [];
  s.effects = s.effects.filter((fx) => {
    if (fx.endsAt > s.clock) return true;
    const def = EVENT_MAP.get(fx.id);
    if (def) expired.push(def);
    return false;
  });
  return expired;
}

export function nextDelay(rng) {
  return E.minDelay + rng() * (E.maxDelay - E.minDelay);
}

/** Événements possibles dans l'état courant. */
export function eligibleEvents(s) {
  return EVENTS.filter((def) => {
    if (def.kind === 'negative' && s.totalGenerated < E.negativeAfterGenerated) return false;
    if (def.firewall && s.firewallCharges >= E.maxFirewallCharges) return false;
    return true;
  });
}

/** Tirage pondéré. */
export function pickEvent(s, rng) {
  const pool = eligibleEvents(s);
  const total = pool.reduce((sum, def) => sum + def.weight, 0);
  let roll = rng() * total;
  for (const def of pool) {
    roll -= def.weight;
    if (roll < 0) return def;
  }
  return pool[pool.length - 1];
}

/**
 * Applique un événement. Ne modifie que les champs d'événement et les tokens ;
 * les gains passent par addTokens pour être comptés dans les statistiques.
 * @param {import('./state.js').GameState} s
 * @param {object} def
 * @param {{ tps: number, click: number }} rates
 * @param {(n: number) => void} addTokens
 * @param {{ protection?: boolean, events?: number }} [boost] effets des boosters
 * @returns {{ def: object, blocked?: 'booster' | 'shield' | 'firewall' | 'immunity', amount: number }}
 */
export function applyEvent(s, def, rates, addTokens, boost = {}) {
  if (def.kind === 'negative') {
    let blocked = null;
    if (boost.protection) blocked = 'booster';
    else if (s.clock < s.shieldUntil) blocked = 'shield';
    else if (def.loss && s.clock < s.lossImmuneUntil) blocked = 'immunity';
    else if (s.firewallCharges > 0) {
      s.firewallCharges -= 1;
      blocked = 'firewall';
    }
    if (blocked) {
      s.eventsSeen += 1;
      s.eventsBlocked += 1;
      return { def, blocked, amount: 0 };
    }
  }

  let amount = 0;
  if (def.reward) {
    amount = clampValue(Math.max(def.reward.minTokens ?? 0, rates.tps * def.reward.tpsSeconds + rates.click * def.reward.clicks));
    addTokens(amount);
  }
  if (def.loss) {
    amount = clampValue(Math.min(s.tokens * def.loss.fraction, rates.tps * def.loss.tpsSeconds));
    s.tokens = clampValue(s.tokens - amount);
  }
  if (def.effects && def.duration) {
    const endsAt = s.clock + def.duration * (def.kind === 'negative' ? 1 : boost.events ?? 1);
    const existing = s.effects.find((fx) => fx.id === def.id);
    if (existing) existing.endsAt = Math.max(existing.endsAt, endsAt);
    else s.effects.push({ id: def.id, endsAt });
  }
  if (def.shield) s.shieldUntil = Math.max(s.shieldUntil, s.clock + def.shield);
  if (def.lossImmunity) s.lossImmuneUntil = Math.max(s.lossImmuneUntil, s.clock + def.lossImmunity);
  if (def.firewall) s.firewallCharges = Math.min(E.maxFirewallCharges, s.firewallCharges + def.firewall);

  s.eventsSeen += 1;
  if (def.kind === 'rare') s.rareEventsSeen += 1;
  return { def, amount };
}
