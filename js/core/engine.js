/**
 * Moteur de jeu : orchestre l'économie, les événements, la progression et la
 * renaissance. Aucune dépendance au DOM — l'interface s'abonne aux
 * notifications via on().
 *
 * Le temps est simulé par advance(dt) : la production est intégrée par
 * tranches, découpées aux échéances des effets temporaires, ce qui donne le
 * même résultat qu'on avance de 16 ms ou de 8 heures d'un coup.
 */
import { CONFIG } from './config.js';
import { clampValue, formatMultiplier } from './numbers.js';
import { autoclickerCost, boosterEffects, buildingCost, computeRates, maxAffordable, prestigeMultiplier } from './economy.js';
import { applyEvent, expireEffects, nextDelay, nextExpiry, pickEvent } from './events.js';
import { updateGrade } from './progression.js';
import { canRebirth, performRebirth, performSuperRebirth, superStatus } from './prestige.js';
import { checkAchievements } from './achievements.js';
import { sampleHistory } from './statistics.js';
import { AUTOCLICKER_MAP, BOOSTER_MAP, BUILDING_MAP, CLICK_UPGRADE_MAP } from '../data/upgrades.js';
import { EVENT_MAP } from '../data/events.js';

/** @typedef {1 | 10 | 25 | 'max'} BuyMode */

export class GameEngine {
  /**
   * @param {import('./state.js').GameState} state
   * @param {{ rng?: () => number }} [opts]
   */
  constructor(state, { rng = Math.random } = {}) {
    this.state = state;
    this.rng = rng;
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
    this.clickWindow = { start: -Infinity, count: 0 };
    /** @type {import('./economy.js').Rates | null} */
    this._rates = null;
    this.lastEvaluation = -Infinity;
  }

  // — notifications —

  on(name, fn) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(fn);
    return () => this.listeners.get(name)?.delete(fn);
  }

  emit(name, payload) {
    for (const fn of this.listeners.get(name) ?? []) fn(payload);
  }

  log(kind, text) {
    const s = this.state;
    s.log.push({ t: Date.now(), kind, text });
    if (s.log.length > CONFIG.logSize) s.log.splice(0, s.log.length - CONFIG.logSize);
    this.emit('log', { kind, text });
  }

  // — valeurs dérivées (mises en cache, invalidées à chaque changement) —

  get rates() {
    if (!this._rates) this._rates = computeRates(this.state);
    return this._rates;
  }

  invalidate() {
    this._rates = null;
  }

  addTokens(n) {
    const s = this.state;
    const v = clampValue(n);
    if (v <= 0) return;
    s.tokens = clampValue(s.tokens + v);
    s.runGenerated = clampValue(s.runGenerated + v);
    s.totalGenerated = clampValue(s.totalGenerated + v);
  }

  // — clic manuel —

  /**
   * @param {number} [nowMs] horodatage pour la limitation anti-répétition
   * @returns {number} tokens gagnés (0 si le clic est ignoré)
   */
  click(nowMs = Date.now()) {
    const w = this.clickWindow;
    if (nowMs - w.start >= 1000 || nowMs < w.start) {
      w.start = nowMs;
      w.count = 0;
    }
    if (w.count >= CONFIG.maxManualClicksPerSecond) return 0;
    w.count += 1;

    const s = this.state;
    const gain = this.rates.click;
    this.addTokens(gain);
    s.totalClicks += 1;
    s.manualClicks += 1;
    s.runClicks += 1;
    this.emit('click', { gain });
    return gain;
  }

  // — achats —

  /** Devis d'achat pour l'interface. @param {string} id @param {BuyMode} mode */
  quoteBuilding(id, mode) {
    const def = BUILDING_MAP.get(id);
    if (!def) return null;
    const owned = this.state.buildings[id] ?? 0;
    // le Compresseur de contexte réduit tous les prix d'infrastructure
    const factor = this.rates.costFactor;
    let qty = mode === 'max' ? maxAffordable(def, owned, this.state.tokens / factor) : mode;
    const room = CONFIG.maxOwned - owned;
    const display = mode === 'max' ? Math.max(1, Math.min(qty, room)) : Math.min(qty, room);
    qty = Math.min(qty, room);
    const cost = Math.ceil(buildingCost(def, owned, display) * factor);
    return { def, owned, qty: display, cost, affordable: qty > 0 && display > 0 && cost <= this.state.tokens };
  }

  /** @param {string} id @param {BuyMode} mode */
  buyBuilding(id, mode = 1) {
    const quote = this.quoteBuilding(id, mode);
    if (!quote || !quote.affordable) return false;
    const s = this.state;
    s.tokens = clampValue(s.tokens - quote.cost);
    s.buildings[id] = quote.owned + quote.qty;
    s.totalBuildingsBought += quote.qty;
    s.runBuildingsBought += quote.qty;
    this.invalidate();
    this.emit('purchase', { kind: 'building', id, qty: quote.qty, cost: quote.cost });
    this.evaluateProgress();
    return true;
  }

  clickUpgradeStatus(id) {
    const def = CLICK_UPGRADE_MAP.get(id);
    if (!def) return null;
    const s = this.state;
    const owned = Boolean(s.upgrades[id]);
    const unlocked = !def.requires || Boolean(s.upgrades[def.requires]);
    return { def, owned, unlocked, affordable: !owned && unlocked && s.tokens >= def.cost };
  }

  buyClickUpgrade(id) {
    const st = this.clickUpgradeStatus(id);
    if (!st || !st.affordable) return false;
    const s = this.state;
    s.tokens = clampValue(s.tokens - st.def.cost);
    s.upgrades[id] = true;
    this.invalidate();
    this.emit('purchase', { kind: 'click', id, cost: st.def.cost });
    this.evaluateProgress();
    return true;
  }

  autoclickerStatus(id) {
    const def = AUTOCLICKER_MAP.get(id);
    if (!def) return null;
    const level = this.state.autoclickers[id] ?? 0;
    const maxed = level >= def.maxLevel;
    const cost = autoclickerCost(def, level);
    return { def, level, maxed, cost, affordable: !maxed && this.state.tokens >= cost };
  }

  buyAutoclicker(id) {
    const st = this.autoclickerStatus(id);
    if (!st || !st.affordable) return false;
    const s = this.state;
    s.tokens = clampValue(s.tokens - st.cost);
    s.autoclickers[id] = st.level + 1;
    this.invalidate();
    this.emit('purchase', { kind: 'autoclicker', id, cost: st.cost });
    this.evaluateProgress();
    return true;
  }

  boosterStatus(id) {
    const def = BOOSTER_MAP.get(id);
    if (!def) return null;
    const owned = Boolean(this.state.boosters[id]);
    return { def, owned, affordable: !owned && this.state.tokens >= def.cost };
  }

  buyBooster(id) {
    const st = this.boosterStatus(id);
    if (!st || !st.affordable) return false;
    const s = this.state;
    s.tokens = clampValue(s.tokens - st.def.cost);
    s.boosters[id] = true;
    this.invalidate();
    this.emit('purchase', { kind: 'booster', id, cost: st.def.cost });
    this.evaluateProgress();
    return true;
  }

  // — temps —

  /**
   * Fait avancer la simulation de dt secondes.
   * @param {number} dt
   * @param {{ offline?: boolean }} [opts] offline : jeu fermé (efficacité réduite, sans clics ni événements)
   * @returns {{ gained: number }}
   */
  advance(dt, { offline = false } = {}) {
    const s = this.state;
    if (!(dt > 0)) return { gained: 0 };
    dt = Math.min(dt, CONFIG.offline.maxSeconds);
    const factor = offline ? CONFIG.offline.efficiency : 1;
    const before = s.totalGenerated;
    let remaining = dt;

    while (remaining > 1e-9) {
      if (expireEffects(s).length) {
        this.invalidate();
        this.emit('effects', null);
      }
      const expiry = nextExpiry(s);
      const step = Math.min(remaining, expiry - s.clock);
      const r = this.rates;
      if (r.tps > 0) this.addTokens(r.tps * step * factor);
      if (!offline && r.autoRate > 0) {
        const clicks = s.autoClickCarry + r.autoRate * step;
        const whole = Math.floor(clicks);
        s.autoClickCarry = clicks - whole;
        if (whole > 0) {
          this.addTokens(r.click * whole);
          s.totalClicks += whole;
          s.autoClicks += whole;
          s.runClicks += whole;
        }
      }
      // se caler exactement sur l'échéance évite les micro-tranches d'arrondi
      s.clock = step === expiry - s.clock ? expiry : s.clock + step;
      remaining -= step;
    }
    if (expireEffects(s).length) {
      this.invalidate();
      this.emit('effects', null);
    }

    if (!offline) {
      s.playTime += dt;
      s.runTime += dt;
      this.maybeTriggerEvent();
      if (sampleHistory(s, this.rates)) this.emit('history', null);
    }
    if (this.rates.tps > s.bestTps) s.bestTps = this.rates.tps;
    // les conditions de succès sont vérifiées au plus 4 fois par seconde
    if (offline || s.clock - this.lastEvaluation >= 0.25 || s.clock < this.lastEvaluation) {
      this.lastEvaluation = s.clock;
      this.evaluateProgress();
    }
    return { gained: s.totalGenerated - before };
  }

  // — événements —

  maybeTriggerEvent() {
    const s = this.state;
    if (!s.settings.events || s.clock < s.nextEventAt) return;
    if (this.rates.rawTps <= 0) {
      s.nextEventAt = s.clock + 20; // rien à perturber tant qu'aucune infrastructure ne tourne
      return;
    }
    this.triggerEvent(pickEvent(s, this.rng));
    s.nextEventAt = s.clock + nextDelay(this.rng) / boosterEffects(s).events;
  }

  /** Déclenche un événement précis (aussi utilisé par les tests). */
  triggerEvent(def) {
    if (typeof def === 'string') def = EVENT_MAP.get(def);
    if (!def) return null;
    const result = applyEvent(this.state, def, this.rates, (n) => this.addTokens(n), boosterEffects(this.state));
    this.invalidate();
    if (result.blocked) {
      const by = { booster: 'le Bouclier neuronal', shield: 'le patch de sécurité', firewall: 'le firewall', immunity: 'la sauvegarde immuable' }[result.blocked];
      this.log('defense', `${def.name} neutralisé par ${by}.`);
      this.emit('event:blocked', result);
    } else {
      this.log(def.kind === 'negative' ? 'negative' : def.kind === 'defensive' ? 'defense' : 'event', def.name);
      this.emit('event', result);
      if (def.saveNow) this.emit('save-request', null);
    }
    this.evaluateProgress();
    return result;
  }

  // — progression —

  evaluateProgress() {
    const s = this.state;
    const grades = updateGrade(s);
    if (grades.length) {
      this.invalidate();
      for (const g of grades) {
        this.log('grade', `Nouveau grade : ${g.name}`);
        this.emit('grade', g);
      }
    }
    const unlocked = checkAchievements(s, this.rates);
    if (unlocked.length) {
      this.invalidate();
      for (const a of unlocked) {
        this.log('achievement', `Succès : ${a.name}`);
        this.emit('achievement', a);
      }
      this.emit('save-request', null);
    }
  }

  // — renaissance —

  canRebirth() {
    return canRebirth(this.state);
  }

  rebirth() {
    const record = performRebirth(this.state);
    if (!record) return null;
    this.invalidate();
    this.log('rebirth', `Renaissance n°${record.n} — multiplicateur permanent ${formatMultiplier(prestigeMultiplier(record.n, this.state.superRenaissances))}`);
    this.emit('rebirth', record);
    this.evaluateProgress();
    this.emit('save-request', null);
    return record;
  }

  // — Super Renaissance —

  superStatus() {
    return superStatus(this.state);
  }

  superRebirth() {
    const record = performSuperRebirth(this.state);
    if (!record) return null;
    this.invalidate();
    this.log('rebirth', `SUPER RENAISSANCE n°${record.n} — multiplicateur permanent ${formatMultiplier(this.rates.prestige)}`);
    this.emit('super-rebirth', record);
    this.evaluateProgress();
    this.emit('save-request', null);
    return record;
  }
}
