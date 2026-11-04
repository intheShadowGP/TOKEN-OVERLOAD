/**
 * Boutique : infrastructures, améliorations de clic, auto-cliqueurs.
 * Les cartes sont créées une seule fois ; update() ne modifie que les
 * textes et états qui ont changé.
 */
import { el, icon, setBar, setDisabled, setText, toggleClass } from './dom.js';
import { buildingRawTps, milestoneMultiplier, nextMilestone } from '../core/economy.js';
import { formatDuration, formatNumber, formatPercent } from '../core/numbers.js';
import { AUTOCLICKERS, BOOSTERS, BUILDINGS, CLICK_UPGRADES, CLICK_UPGRADE_MAP, TIERS } from '../data/upgrades.js';

export function createShop({ engine, fmt, onBuy, onDenied }) {
  const buildingRoot = document.getElementById('shop-buildings');
  const clickRoot = document.getElementById('shop-clicks');
  const autoRoot = document.getElementById('shop-auto');
  /** @type {import('../core/engine.js').BuyMode} */
  let mode = 1;

  // ───── infrastructures ─────

  const tierLabels = new Map();
  const cards = BUILDINGS.map((def, index) => {
    if (!tierLabels.has(def.tier)) {
      const label = el('div', { class: 'tier-label', text: TIERS[def.tier] });
      tierLabels.set(def.tier, label);
      buildingRoot.append(label);
    }
    const refs = {
      def,
      index,
      name: el('span', { class: 'shop-item__name', text: def.name }),
      owned: el('span', { class: 'shop-item__owned num' }),
      text: el('p', { class: 'shop-item__text', text: def.text }),
      each: el('strong'),
      total: el('strong'),
      payback: el('strong'),
      milestone: el('strong'),
      qty: el('span', { class: 'buy-btn__qty' }),
      cost: el('span', { class: 'buy-btn__cost' }),
      progress: el('span'),
      iconBox: el('div', { class: 'shop-item__icon' }, [icon(def.icon)]),
      mysteryIcon: icon('lock'),
    };
    refs.btn = el('button', { class: 'buy-btn', attrs: { type: 'button' } }, [refs.qty, refs.cost]);
    refs.btn.addEventListener('click', () => {
      if (engine.buyBuilding(def.id, mode)) onBuy(refs.btn);
      else onDenied();
    });
    refs.meta = el('div', { class: 'shop-item__meta' }, [
      el('span', {}, ['Chacun : ', refs.each]),
      el('span', {}, ['Total : ', refs.total]),
      el('span', {}, ['Amorti : ', refs.payback]),
      el('span', {}, ['Palier : ', refs.milestone]),
    ]);
    refs.root = el('article', { class: 'shop-item', attrs: { 'data-id': def.id } }, [
      refs.iconBox,
      el('div', { class: 'shop-item__body' }, [el('div', { class: 'shop-item__title' }, [refs.name, refs.owned]), refs.text, refs.meta]),
      el('div', { class: 'shop-item__buy' }, [refs.btn, el('div', { class: 'buy-progress', attrs: { 'aria-hidden': 'true' } }, [refs.progress])]),
    ]);
    refs.root.hidden = true;
    refs.state = 'hidden';
    buildingRoot.append(refs.root);
    return refs;
  });

  function visibility(s) {
    let highest = -1;
    for (const c of cards) if ((s.buildings[c.def.id] ?? 0) > 0) highest = c.index;
    let lastVisible = Math.max(highest + 1, 0);
    for (const c of cards) if (s.tokens >= c.def.cost * 0.3) lastVisible = Math.max(lastVisible, c.index);
    return { lastVisible, mystery: lastVisible + 1 };
  }

  function setCardState(c, state) {
    if (c.state === state) return;
    const wasHidden = c.state === 'hidden';
    c.state = state;
    c.root.hidden = state === 'hidden';
    toggleClass(c.root, 'is-mystery', state === 'mystery');
    if (state === 'mystery') {
      setText(c.name, '??? — infrastructure inconnue');
      setText(c.text, 'Continuez à produire pour la découvrir.');
      c.meta.hidden = true;
      c.iconBox.replaceChildren(c.mysteryIcon);
    } else if (state === 'visible') {
      setText(c.name, c.def.name);
      setText(c.text, c.def.text);
      c.meta.hidden = false;
      c.iconBox.replaceChildren(icon(c.def.icon));
      if (wasHidden) {
        c.root.classList.add('is-new');
        setTimeout(() => c.root.classList.remove('is-new'), 500);
      }
    }
  }

  function updateBuildings() {
    const s = engine.state;
    const r = engine.rates;
    const f = fmt();
    const { lastVisible, mystery } = visibility(s);
    const tierVisible = new Map();
    for (const c of cards) {
      const state = c.index <= lastVisible ? 'visible' : c.index === mystery ? 'mystery' : 'hidden';
      setCardState(c, state);
      if (state !== 'hidden') tierVisible.set(c.def.tier, true);
      if (state === 'hidden') continue;

      const owned = s.buildings[c.def.id] ?? 0;
      const q = engine.quoteBuilding(c.def.id, mode);
      setText(c.owned, owned ? `×${formatNumber(owned)}` : '');
      setText(c.qty, mode === 'max' ? `Max (×${q.qty})` : `Acheter ×${q.qty}`);
      setText(c.cost, formatNumber(q.cost, f));
      setDisabled(c.btn, !q.affordable || state === 'mystery');
      toggleClass(c.root, 'is-affordable', q.affordable && state === 'visible');
      setBar(c.progress, q.cost > 0 ? s.tokens / q.cost : 0);
      if (state === 'mystery') continue;

      const each = c.def.tps * milestoneMultiplier(owned) * r.global;
      const total = buildingRawTps(c.def, owned) * r.global;
      const delta = (buildingRawTps(c.def, owned + q.qty) - buildingRawTps(c.def, owned)) * r.global * r.eventProduction;
      setText(c.each, `${formatNumber(each, f)}/s`);
      setText(c.total, owned ? `${formatNumber(total, f)}/s (${formatPercent(r.rawTps > 0 ? buildingRawTps(c.def, owned) / r.rawTps : 0, { signed: false })})` : '—');
      setText(c.payback, delta > 0 ? formatDuration(q.cost / delta) : '—');
      const next = nextMilestone(owned);
      setText(c.milestone, next ? `${next} → ×2` : 'max');
    }
    for (const [tier, label] of tierLabels) label.hidden = !tierVisible.get(tier);
  }

  // ───── améliorations de clic ─────

  const clickCards = CLICK_UPGRADES.map((def) => {
    const refs = {
      def,
      cost: el('span', { class: 'buy-btn__cost', text: formatNumber(def.cost) }),
      req: el('p', { class: 'shop-item__meta' }),
      progress: el('span'),
    };
    refs.btn = el('button', { class: 'buy-btn', attrs: { type: 'button' } }, [el('span', { class: 'buy-btn__qty', text: 'Acheter' }), refs.cost]);
    refs.btn.addEventListener('click', () => {
      if (engine.buyClickUpgrade(def.id)) onBuy(refs.btn);
      else onDenied();
    });
    refs.badge = el('span', { class: 'owned-badge' }, [icon('check'), 'Acquise']);
    refs.buyBox = el('div', { class: 'shop-item__buy' }, [refs.btn, el('div', { class: 'buy-progress', attrs: { 'aria-hidden': 'true' } }, [refs.progress])]);
    const effect = def.effect.base ? `Clic de base : ${formatNumber(def.effect.base)}` : `+${formatPercent(def.effect.share, { signed: false })} de la production brute par clic`;
    refs.root = el('article', { class: 'shop-item' }, [
      el('div', { class: 'shop-item__icon' }, [icon(def.icon)]),
      el('div', { class: 'shop-item__body' }, [
        el('div', { class: 'shop-item__title' }, [el('span', { class: 'shop-item__name', text: def.name })]),
        el('p', { class: 'shop-item__text', text: def.text }),
        el('p', { class: 'shop-item__meta' }, [el('strong', { text: effect })]),
        refs.req,
      ]),
      refs.buyBox,
    ]);
    refs.root.hidden = true;
    refs.status = '';
    return refs;
  });
  const clickEmpty = el('p', { class: 'empty', text: 'Toutes les améliorations de clic disponibles sont acquises.' });

  function orderClickCards() {
    const s = engine.state;
    const rank = (c) => (s.upgrades[c.def.id] ? 2 : !c.def.requires || s.upgrades[c.def.requires] ? 0 : 1);
    const sorted = [...clickCards].sort((a, b) => rank(a) - rank(b) || a.def.cost - b.def.cost);
    let lockedShown = 0;
    const nodes = [];
    for (const c of sorted) {
      const r = rank(c);
      let status = r === 2 ? 'owned' : r === 0 ? 'available' : lockedShown++ < 2 ? 'locked' : 'hidden';
      c.status = status;
      c.root.hidden = status === 'hidden';
      toggleClass(c.root, 'is-owned-upgrade', status === 'owned');
      toggleClass(c.root, 'is-mystery', status === 'locked');
      c.buyBox.replaceChildren(...(status === 'owned' ? [c.badge] : [c.btn, c.progress.parentElement]));
      setText(c.req, status === 'locked' ? `Nécessite : ${CLICK_UPGRADE_MAP.get(c.def.requires).name}` : '');
      c.req.hidden = status !== 'locked';
      nodes.push(c.root);
    }
    clickRoot.replaceChildren(...nodes, clickEmpty);
    clickEmpty.hidden = sorted.some((c) => c.status === 'available' || c.status === 'locked');
  }

  function updateClicks() {
    const s = engine.state;
    for (const c of clickCards) {
      if (c.status !== 'available' && c.status !== 'locked') continue;
      const st = engine.clickUpgradeStatus(c.def.id);
      setText(c.cost, formatNumber(c.def.cost, fmt()));
      setDisabled(c.btn, !st.affordable);
      toggleClass(c.root, 'is-affordable', st.affordable);
      setBar(c.progress, s.tokens / c.def.cost);
    }
  }

  // ───── auto-cliqueurs ─────

  const autoCards = AUTOCLICKERS.map((def) => {
    const refs = {
      def,
      level: el('span', { class: 'shop-item__owned num' }),
      rate: el('strong'),
      cost: el('span', { class: 'buy-btn__cost' }),
      qty: el('span', { class: 'buy-btn__qty', text: 'Niveau +1' }),
      pips: el('div', { class: 'level-pips', attrs: { 'aria-hidden': 'true' } }, Array.from({ length: def.maxLevel }, () => el('span'))),
      progress: el('span'),
    };
    refs.btn = el('button', { class: 'buy-btn', attrs: { type: 'button' } }, [refs.qty, refs.cost]);
    refs.btn.addEventListener('click', () => {
      if (engine.buyAutoclicker(def.id)) onBuy(refs.btn);
      else onDenied();
    });
    refs.root = el('article', { class: 'shop-item' }, [
      el('div', { class: 'shop-item__icon' }, [icon(def.icon)]),
      el('div', { class: 'shop-item__body' }, [
        el('div', { class: 'shop-item__title' }, [el('span', { class: 'shop-item__name', text: def.name }), refs.level]),
        el('p', { class: 'shop-item__text', text: def.text }),
        el('p', { class: 'shop-item__meta' }, [el('span', {}, ['Cadence actuelle : ', refs.rate])]),
        refs.pips,
      ]),
      el('div', { class: 'shop-item__buy' }, [refs.btn, el('div', { class: 'buy-progress', attrs: { 'aria-hidden': 'true' } }, [refs.progress])]),
    ]);
    autoRoot.append(refs.root);
    return refs;
  });

  function updateAuto() {
    const s = engine.state;
    autoCards.forEach((c) => {
      const st = engine.autoclickerStatus(c.def.id);
      setText(c.level, `Niv. ${st.level}/${c.def.maxLevel}`);
      setText(c.rate, `${formatNumber(st.level * c.def.rate)} clic/s`);
      setText(c.qty, st.maxed ? 'Niveau max' : 'Niveau +1');
      setText(c.cost, st.maxed ? '—' : formatNumber(st.cost, fmt()));
      setDisabled(c.btn, !st.affordable);
      toggleClass(c.root, 'is-affordable', st.affordable);
      setBar(c.progress, st.maxed ? 1 : s.tokens / st.cost);
      [...c.pips.children].forEach((pip, i) => toggleClass(pip, 'is-on', i < st.level));
    });
  }

  // ───── boosters ─────

  const boosterRoot = document.getElementById('shop-boosters');
  const boosterCards = BOOSTERS.map((def) => {
    const refs = {
      def,
      cost: el('span', { class: 'buy-btn__cost' }),
      progress: el('span'),
      owned: null,
    };
    refs.btn = el('button', { class: 'buy-btn', attrs: { type: 'button' } }, [el('span', { class: 'buy-btn__qty', text: 'Activer' }), refs.cost]);
    refs.btn.addEventListener('click', () => {
      if (engine.buyBooster(def.id)) onBuy(refs.btn);
      else onDenied();
    });
    refs.badge = el('span', { class: 'owned-badge' }, [icon('check'), 'Actif']);
    refs.buyProgress = el('div', { class: 'buy-progress', attrs: { 'aria-hidden': 'true' } }, [refs.progress]);
    refs.buyBox = el('div', { class: 'shop-item__buy' }, [refs.btn, refs.buyProgress]);
    refs.root = el('article', { class: 'shop-item' }, [
      el('div', { class: 'shop-item__icon' }, [icon(def.icon)]),
      el('div', { class: 'shop-item__body' }, [
        el('div', { class: 'shop-item__title' }, [el('span', { class: 'shop-item__name', text: def.name })]),
        el('p', { class: 'shop-item__text', text: def.text }),
      ]),
      refs.buyBox,
    ]);
    boosterRoot.append(refs.root);
    return refs;
  });

  function updateBoosters() {
    const s = engine.state;
    for (const c of boosterCards) {
      const st = engine.boosterStatus(c.def.id);
      if (c.owned !== st.owned) {
        c.owned = st.owned;
        c.buyBox.replaceChildren(...(st.owned ? [c.badge] : [c.btn, c.buyProgress]));
      }
      toggleClass(c.root, 'is-affordable', st.affordable);
      if (st.owned) continue;
      setText(c.cost, formatNumber(c.def.cost, fmt()));
      setDisabled(c.btn, !st.affordable);
      setBar(c.progress, s.tokens / c.def.cost);
    }
  }

  // ───── mode d'achat ─────

  const modeGroup = document.getElementById('buy-mode');
  modeGroup.addEventListener('click', (e) => {
    const btn = /** @type {HTMLElement} */ (e.target).closest('button[data-mode]');
    if (!btn) return;
    mode = btn.dataset.mode === 'max' ? 'max' : /** @type {1|10|25} */ (Number(btn.dataset.mode));
    for (const b of modeGroup.querySelectorAll('button')) b.setAttribute('aria-checked', String(b === btn));
    updateBuildings();
  });

  orderClickCards();

  return {
    update() {
      updateBuildings();
      updateClicks();
      updateAuto();
      updateBoosters();
    },
    refreshStructure() {
      orderClickCards();
    },
    /** Indique si une amélioration de clic est achetable (pastille d'onglet). */
    hasAffordableBooster() {
      return boosterCards.some((c) => engine.boosterStatus(c.def.id).affordable);
    },
    hasAffordableClick() {
      const s = engine.state;
      return clickCards.some((c) => c.status === 'available' && s.tokens >= c.def.cost) || autoCards.some((c) => engine.autoclickerStatus(c.def.id).affordable);
    },
  };
}
