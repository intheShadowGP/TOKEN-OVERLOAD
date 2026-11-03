/** Tableau de bord : barre supérieure, compteurs, effets actifs, cartes de progression. */
import { el, icon, setBar, setDisabled, setText, toggleClass } from './dom.js';
import { formatDuration, formatMultiplier, formatNumber } from '../core/numbers.js';
import { currentGrade, nextGradeProgress } from '../core/progression.js';
import { rebirthPreview, rebirthProgress } from '../core/prestige.js';
import { EVENT_MAP } from '../data/events.js';

const $id = (id) => document.getElementById(id);

export function createHud(engine, fmt) {
  const n = {
    tokens: $id('tokens-value'),
    tokensFull: $id('tokens-full'),
    tps: $id('rate-tps'),
    click: $id('rate-click'),
    global: $id('rate-global'),
    gradeChip: $id('grade-chip'),
    gradeBadge: $id('grade-chip-badge'),
    gradeName: $id('grade-name'),
    rebirths: $id('top-rebirths'),
    mult: $id('top-mult'),
    hint: $id('core-hint'),
    effects: $id('effects'),
    nextGradeName: $id('next-grade-name'),
    nextGradeReqs: $id('next-grade-reqs'),
    rebirthCard: $id('rebirth-progress'),
    rebirthPreview: $id('rebirth-mult-preview'),
    rebirthBar: $id('rebirth-bar'),
    rebirthText: $id('rebirth-progress-text'),
    rebirthQuick: $id('btn-rebirth-quick'),
  };
  let gradeKey = '';
  let effectsKey = '';
  const effectNodes = new Map();
  const reqRows = new Map();
  const integer = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  function renderCounters() {
    const s = engine.state;
    const r = engine.rates;
    const f = fmt();
    // au-delà de 10, on affiche la partie entière : jamais plus que ce qu'on possède
    setText(n.tokens, formatNumber(s.tokens >= 10 ? Math.floor(s.tokens) : s.tokens, f));
    setText(n.tokensFull, s.tokens < 1e21 ? `${integer.format(Math.floor(s.tokens))} token${s.tokens >= 2 ? 's' : ''}` : `${s.tokens.toExponential(6)} tokens`);
    setText(n.tps, `${formatNumber(r.tps, f)}/s`);
    setText(n.click, formatNumber(r.click, f));
    setText(n.global, formatMultiplier(r.global, f));
    toggleClass(n.tps, 'is-boosted', r.eventProduction > 1);
    toggleClass(n.tps, 'is-nerfed', r.eventProduction < 1);
    toggleClass(n.click, 'is-boosted', r.eventClick > 1);
    toggleClass(n.click, 'is-nerfed', r.eventClick < 1);
  }

  function renderTopbar() {
    const s = engine.state;
    const g = currentGrade(s);
    if (gradeKey !== g.id) {
      gradeKey = g.id;
      n.gradeChip.style.setProperty('--grade-color', g.color);
      n.gradeBadge.replaceChildren(icon(g.icon));
      setText(n.gradeName, g.name);
    }
    setText(n.rebirths, formatNumber(s.renaissances));
    setText(n.mult, formatMultiplier(engine.rates.prestige, fmt()));
  }

  function renderHint() {
    const s = engine.state;
    const r = engine.rates;
    let hint = '';
    if (s.totalClicks === 0) hint = 'Cliquez sur le token pour générer vos premiers tokens.';
    else if (r.rawTps === 0) hint = s.tokens >= 15 ? 'Achetez un « PC du CDI » pour produire automatiquement.' : 'Encore quelques clics : un PC du CDI coûte 15 tokens.';
    else if (r.autoRate > 0) hint = `Auto-clics : ${formatNumber(r.autoRate)} par seconde.`;
    else if (engine.canRebirth()) hint = 'Renaissance disponible : multiplicateur ×4 à la clé.';
    else hint = 'Astuce : la production double à 25, 50, 100… exemplaires.';
    setText(n.hint, hint);
  }

  function renderEffects() {
    const s = engine.state;
    const active = s.effects.filter((fx) => fx.endsAt > s.clock);
    const key = active.map((fx) => fx.id).join(',');
    if (key !== effectsKey) {
      effectsKey = key;
      effectNodes.clear();
      n.effects.replaceChildren(
        ...active.map((fx) => {
          const def = EVENT_MAP.get(fx.id);
          const mult = def.effects.map((e) => `${e.target === 'click' ? 'clic ' : ''}×${String(e.mult).replace('.', ',')}`).join(' · ');
          const time = el('span', { class: 'effect-chip__time' });
          const bar = el('span', { class: 'effect-chip__bar' });
          const chip = el('span', { class: `effect-chip effect-chip--${def.kind}`, attrs: { title: def.text } }, [icon(def.icon), el('span', { text: def.name }), el('span', { class: 'effect-chip__mult', text: mult }), time, bar]);
          effectNodes.set(fx.id, { time, bar, duration: def.duration });
          return chip;
        }),
      );
    }
    for (const fx of active) {
      const refs = effectNodes.get(fx.id);
      if (!refs) continue;
      const left = fx.endsAt - s.clock;
      setText(refs.time, formatDuration(Math.ceil(left)));
      setBar(refs.bar, left / refs.duration);
    }
  }

  function renderProgress() {
    const s = engine.state;
    const f = fmt();
    const next = nextGradeProgress(s);
    if (!next) {
      setText(n.nextGradeName, 'Grade maximal atteint');
      n.nextGradeReqs.replaceChildren(el('p', { class: 'panel-sub', text: 'Omniscience : vous avez tout vu. Ou presque.' }));
      reqRows.clear();
    } else {
      setText(n.nextGradeName, next.grade.name);
      if (!reqRows.size || reqRows.get('grade') !== next.grade.id) {
        reqRows.clear();
        reqRows.set('grade', next.grade.id);
        n.nextGradeReqs.replaceChildren(
          ...next.items.map((item) => {
            const value = el('span', { class: 'req__value' });
            const fill = el('div', { class: 'bar__fill' });
            const row = el('div', { class: 'req' }, [el('span', { class: 'req__label', text: item.label }), value, el('div', { class: 'bar' }, [fill])]);
            reqRows.set(item.key, { row, value, fill });
            return row;
          }),
        );
      }
      for (const item of next.items) {
        const refs = reqRows.get(item.key);
        setText(refs.value, `${formatNumber(Math.min(item.have, item.need), f)} / ${formatNumber(item.need, f)}`);
        setBar(refs.fill, item.ratio);
        toggleClass(refs.row, 'is-done', item.ratio >= 1);
      }
    }

    const p = rebirthProgress(s);
    const prev = rebirthPreview(s);
    const ready = engine.canRebirth();
    setText(n.rebirthPreview, `${formatMultiplier(prev.current, f)} → ${formatMultiplier(prev.next, f)}`);
    setBar(n.rebirthBar, p.ratio);
    setText(n.rebirthText, `${formatNumber(p.have, f)} / ${formatNumber(p.need, f)} générés`);
    setDisabled(n.rebirthQuick, !ready);
    toggleClass(n.rebirthCard, 'is-ready', ready);
  }

  return {
    /** Compteurs principaux : ~15 fois par seconde. */
    fast() {
      renderCounters();
    },
    /** Le reste : ~4 fois par seconde. */
    slow() {
      renderTopbar();
      renderHint();
      renderEffects();
      renderProgress();
    },
  };
}
