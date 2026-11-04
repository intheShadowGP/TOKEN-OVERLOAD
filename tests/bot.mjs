// Joueur de référence pour l'équilibrage : clique 4 fois par seconde et achète
// toujours l'option la plus rentable (infrastructures, clic, auto-cliqueurs,
// boosters). Partagé par simulate.mjs et calibrate.mjs.
import { buildingRawTps } from '../js/core/economy.js';
import { AUTOCLICKERS, BOOSTERS, BUILDINGS, CLICK_UPGRADES } from '../js/data/upgrades.js';

export function createBot(engine, { clicksPerSecond = 4 } = {}) {
  let ms = 0;

  function bestPurchase() {
    const s = engine.state;
    const r = engine.rates;
    const tps = Math.max(r.tps, 1);
    let best = null;
    const consider = (cost, gainPerSecond, buy) => {
      if (!(gainPerSecond > 0)) return;
      const score = cost / gainPerSecond + cost / tps;
      if (!best || score < best.score) best = { score, cost, buy };
    };
    for (const def of BUILDINGS) {
      const q = engine.quoteBuilding(def.id, 1);
      if (!q.qty) continue;
      const owned = s.buildings[def.id] ?? 0;
      const delta = (buildingRawTps(def, owned + 1) - buildingRawTps(def, owned)) * r.global * r.boostProduction;
      consider(q.cost, delta, () => engine.buyBuilding(def.id, 1));
    }
    const clickRate = clicksPerSecond + r.autoRate;
    for (const u of CLICK_UPGRADES) {
      const st = engine.clickUpgradeStatus(u.id);
      if (st.owned || !st.unlocked) continue;
      const gain = (u.effect.base ? Math.max(0, u.effect.base - r.clickBase) : u.effect.share * r.rawTps) * r.global * r.boostClick * clickRate;
      consider(u.cost, gain, () => engine.buyClickUpgrade(u.id));
    }
    for (const a of AUTOCLICKERS) {
      const st = engine.autoclickerStatus(a.id);
      if (!st.maxed) consider(st.cost, a.rate * r.click, () => engine.buyAutoclicker(a.id));
    }
    for (const b of BOOSTERS) {
      const st = engine.boosterStatus(b.id);
      if (st.owned) continue;
      // valeur approchée de chaque booster, en tokens par seconde gagnés
      const e = b.effect;
      const gain = e.production ? r.tps * (e.production - 1) : e.click ? r.click * clickRate * (e.click - 1) : e.costFactor ? r.tps * 0.5 : r.tps * 0.05;
      consider(b.cost, gain, () => engine.buyBooster(b.id));
    }
    return best;
  }

  return {
    /** Joue dt secondes : production, clics manuels, achats. */
    step(dt) {
      engine.advance(dt);
      const clicks = Math.min(Math.round(clicksPerSecond * dt), 400);
      for (let i = 0; i < clicks; i++) engine.click((ms += 1000 / clicksPerSecond));
      for (let guard = 0; guard < 600; guard++) {
        const b = bestPurchase();
        if (!b || b.cost > engine.state.tokens || !b.buy()) break;
      }
    },
  };
}

/** Pas de temps adaptatif : précis en début de partie, rapide sur les longues parties. */
export function stepFor(runTime) {
  return Math.min(120, Math.max(1, runTime / 200));
}
