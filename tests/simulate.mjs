// Simulation d'équilibrage : un joueur glouton qui clique 4 fois par seconde
// et achète toujours l'option la plus rentable. Affiche la durée de chaque
// partie jusqu'à la renaissance. Usage : node tests/simulate.mjs [renaissances]
import { GameEngine } from '../js/core/engine.js';
import { createInitialState } from '../js/core/state.js';
import { buildingRawTps } from '../js/core/economy.js';
import { formatDuration, formatNumber } from '../js/core/numbers.js';
import { BUILDINGS, CLICK_UPGRADES, AUTOCLICKERS } from '../js/data/upgrades.js';
import { GRADES } from '../js/data/levels.js';

export function simulate({ runs = 10, clicksPerSecond = 4, maxHoursPerRun = 48, quiet = false } = {}) {
  const state = createInitialState(0);
  state.settings.events = false;
  const engine = new GameEngine(state, { rng: () => 0.5 });
  const results = [];
  let ms = 0;

  function bestPurchase() {
    const s = engine.state;
    const r = engine.rates;
    let best = null;
    for (const def of BUILDINGS) {
      const q = engine.quoteBuilding(def.id, 1);
      const owned = s.buildings[def.id] ?? 0;
      const delta = (buildingRawTps(def, owned + 1) - buildingRawTps(def, owned)) * r.global;
      const score = q.cost / delta + q.cost / Math.max(r.tps, 1);
      if (!best || score < best.score) best = { score, buy: () => engine.buyBuilding(def.id, 1), cost: q.cost };
    }
    for (const u of CLICK_UPGRADES) {
      const st = engine.clickUpgradeStatus(u.id);
      if (st.owned || !st.unlocked) continue;
      const clickGain = (u.effect.base ? Math.max(0, u.effect.base - r.clickBase) : u.effect.share * r.rawTps) * r.global * (clicksPerSecond + r.autoRate);
      if (clickGain <= 0) continue;
      const score = u.cost / clickGain + u.cost / Math.max(r.tps, 1);
      if (score < best.score) best = { score, buy: () => engine.buyClickUpgrade(u.id), cost: u.cost };
    }
    for (const a of AUTOCLICKERS) {
      const st = engine.autoclickerStatus(a.id);
      if (st.maxed) continue;
      const gain = a.rate * r.click;
      const score = st.cost / gain + st.cost / Math.max(r.tps, 1);
      if (score < best.score) best = { score, buy: () => engine.buyAutoclicker(a.id), cost: st.cost };
    }
    return best;
  }

  for (let run = 0; run < runs; run++) {
    let t = 0;
    while (!engine.canRebirth() && t < maxHoursPerRun * 3600) {
      engine.advance(1);
      for (let i = 0; i < clicksPerSecond; i++) engine.click((ms += 250));
      for (let guard = 0; guard < 200; guard++) {
        const b = bestPurchase();
        if (!b || b.cost > engine.state.tokens || !b.buy()) break;
      }
      t++;
    }
    const s = engine.state;
    const owned = Object.values(s.buildings).reduce((a, b) => a + b, 0);
    const types = Object.keys(s.buildings).length;
    results.push({ run: run + 1, time: t, tps: engine.rates.tps, owned, types, grade: GRADES[s.gradeIndex].name, clicks: s.totalClicks, clusters: s.totalBuildingsBought });
    if (!quiet) console.log(`partie ${String(run + 1).padStart(2)} : ${formatDuration(t).padEnd(14)} TPS ${formatNumber(engine.rates.tps).padEnd(12)} infra ${String(owned).padStart(4)} (${types} types)  clics ${formatNumber(s.totalClicks).padEnd(10)} clusters ${String(s.totalBuildingsBought).padStart(5)}  grade ${GRADES[s.gradeIndex].name}`);
    if (!engine.canRebirth()) break;
    engine.rebirth();
  }
  return results;
}

if (import.meta.url === `file:///${process.argv[1].replaceAll('\\', '/')}` || process.argv[1]?.endsWith('simulate.mjs')) {
  const res = simulate({ runs: Number(process.argv[2] ?? 12) });
  const total = res.reduce((a, r) => a + r.time, 0);
  console.log(`total : ${formatDuration(total)}`);
}
