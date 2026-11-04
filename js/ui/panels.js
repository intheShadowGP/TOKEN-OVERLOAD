/** Panneaux : grades, succès, renaissance, journal. */
import { el, icon, setBar, setDisabled, setText, toggleClass } from './dom.js';
import { formatDuration, formatMultiplier, formatNumber, formatPercent } from '../core/numbers.js';
import { gradeStats, REQ_LABELS } from '../core/progression.js';
import { rebirthPreview, rebirthProgress, superStatus } from '../core/prestige.js';
import { CONFIG } from '../core/config.js';
import { prestigeMultiplier } from '../core/economy.js';
import { GRADES } from '../data/levels.js';
import { ACHIEVEMENTS } from '../data/achievements.js';

// ───── grades ─────

export function createGradePanel(engine) {
  const root = document.getElementById('grade-list');
  const cards = GRADES.map((g, i) => {
    const reqs = el('div', { class: 'grade-card__reqs' });
    const pill = el('span', { class: 'status-pill' });
    const card = el('article', { class: 'grade-card' }, [
      el('div', { class: 'grade-card__badge' }, [icon(g.icon)]),
      el('div', {}, [
        el('div', { class: 'grade-card__name', text: `${i + 1}. ${g.name}` }),
        el('p', { class: 'grade-card__text', text: g.text }),
        reqs,
      ]),
      pill,
    ]);
    card.style.setProperty('--grade-color', g.color);
    root.append(card);
    return { g, i, card, reqs, pill, key: '' };
  });

  return {
    update() {
      const s = engine.state;
      const stats = gradeStats(s);
      for (const c of cards) {
        const reached = c.i <= s.gradeIndex;
        const current = c.i === s.gradeIndex;
        const record = !reached && c.i <= s.bestGradeIndex;
        const key = `${reached}|${current}|${record}|${Object.keys(c.g.req).map((k) => Math.min(stats[k], c.g.req[k])).join(',')}`;
        if (key === c.key) continue;
        c.key = key;
        toggleClass(c.card, 'is-current', current);
        toggleClass(c.card, 'is-locked', !reached);
        c.pill.className = `status-pill${current ? ' status-pill--current' : reached ? ' status-pill--done' : ''}`;
        setText(c.pill, current ? 'Actuel' : reached ? 'Débloqué' : record ? 'Déjà atteint' : 'Verrouillé');
        c.reqs.replaceChildren(
          ...Object.entries(c.g.req).map(([k, need]) => {
            const done = stats[k] >= need;
            return el('span', { class: done ? 'is-done' : '', text: `${REQ_LABELS[k]} ${formatNumber(Math.min(stats[k], need))}/${formatNumber(need)}` });
          }),
        );
      }
    },
  };
}

// ───── succès ─────

export function createAchievementPanel(engine) {
  const grid = document.getElementById('ach-grid');
  const summary = document.getElementById('ach-summary');
  const tabCount = document.getElementById('ach-count-tab');
  const filterGroup = document.getElementById('ach-filter');
  let filter = 'all';

  const cards = ACHIEVEMENTS.map((a) => {
    const node = el('article', { class: 'ach-card' }, [
      el('div', { class: 'ach-card__icon' }, [icon(a.icon)]),
      el('div', {}, [
        el('div', { class: 'ach-card__name', text: a.name }),
        el('p', { class: 'ach-card__text', text: a.text }),
        el('p', { class: 'ach-card__reward', text: `Récompense : ${formatPercent(a.reward)} de production` }),
      ]),
    ]);
    grid.append(node);
    return { a, node, unlocked: null };
  });

  function update() {
    const s = engine.state;
    let count = 0;
    let bonus = 0;
    for (const c of cards) {
      const unlocked = Object.hasOwn(s.achievements, c.a.id);
      if (unlocked) {
        count++;
        bonus += c.a.reward;
      }
      if (c.unlocked !== unlocked) {
        c.unlocked = unlocked;
        toggleClass(c.node, 'is-unlocked', unlocked);
        c.node.querySelector('.ach-card__icon').replaceChildren(icon(unlocked ? c.a.icon : 'lock'));
      }
      c.node.hidden = (filter === 'done' && !unlocked) || (filter === 'todo' && unlocked);
    }
    setText(summary, `${count} / ${ACHIEVEMENTS.length} débloqués · bonus permanent ${formatPercent(bonus)} de production`);
    setText(tabCount, String(count));
  }

  filterGroup.addEventListener('click', (e) => {
    const btn = /** @type {HTMLElement} */ (e.target).closest('button[data-filter]');
    if (!btn) return;
    filter = btn.dataset.filter;
    for (const b of filterGroup.querySelectorAll('button')) b.setAttribute('aria-checked', String(b === btn));
    update();
  });

  return { update };
}

// ───── renaissance ─────

export function createRebirthPanel(engine, fmt) {
  const current = document.getElementById('rb-current');
  const next = document.getElementById('rb-next');
  const bar = document.getElementById('rb-bar');
  const text = document.getElementById('rb-text');
  const btn = document.getElementById('btn-rebirth');
  const tbody = document.querySelector('#rb-history tbody');
  const empty = document.getElementById('rb-history-empty');
  const table = document.getElementById('rb-history');
  const superCard = document.getElementById('super-card');
  const superBtn = document.getElementById('btn-super');
  const superMissing = document.getElementById('super-missing');
  const superRows = ['renaissances', 'tokens', 'achievements'].map((key) => {
    const value = el('span', { class: 'req__value' });
    const fill = el('div', { class: 'bar__fill' });
    const label = { renaissances: 'Renaissances', tokens: 'Tokens générés dans la partie (+5 000 %)', achievements: 'Succès (sauf « Je suis artificielle »)' }[key];
    const row = el('div', { class: 'req' }, [el('span', { class: 'req__label', text: label }), value, el('div', { class: 'bar' }, [fill])]);
    return { key, row, value, fill };
  });
  document.getElementById('super-reqs').replaceChildren(...superRows.map((r) => r.row));
  let historyKey = -1;

  return {
    update() {
      const s = engine.state;
      const f = fmt();
      const p = rebirthProgress(s);
      const prev = rebirthPreview(s);
      setText(current, formatMultiplier(prev.current, f));
      setText(next, formatMultiplier(prev.next, f));
      setBar(bar, p.ratio);
      const ready = engine.canRebirth();
      const maxed = s.renaissances >= CONFIG.prestige.maxRenaissances;
      if (maxed) setText(next, '—');
      setText(
        text,
        maxed
          ? `Maximum de ${CONFIG.prestige.maxRenaissances} renaissances atteint : place à la Super Renaissance.`
          : ready
          ? `Seuil atteint : ${formatNumber(p.have, f)} tokens générés pendant cette partie. Vous pouvez renaître quand vous le souhaitez — rien ne se déclenche automatiquement.`
          : `Générez ${formatNumber(p.need, f)} tokens pendant cette partie (${formatNumber(p.have, f)} pour l'instant, ${formatPercent(p.ratio, { signed: false })}).`,
      );
      setDisabled(btn, !ready);

      const st = superStatus(s);
      for (const r of superRows) {
        const item = st[r.key];
        const fmtv = (v) => (r.key === 'tokens' ? formatNumber(v, f) : String(v));
        setText(r.value, `${fmtv(Math.min(item.have, item.need))} / ${fmtv(item.need)}`);
        setBar(r.fill, item.need > 0 ? item.have / item.need : 1);
        toggleClass(r.row, 'is-done', item.ok);
      }
      const missing = st.achievements.missing;
      setText(superMissing, missing.length ? `Succès manquants : ${missing.slice(0, 6).map((a) => a.name).join(', ')}${missing.length > 6 ? ` et ${missing.length - 6} autres` : ''}.` : 'Tous les succès requis sont obtenus.');
      setDisabled(superBtn, !st.ready);
      toggleClass(superCard, 'is-ready', st.ready);

      if (historyKey !== s.rebirthHistory.length) {
        historyKey = s.rebirthHistory.length;
        const rows = [...s.rebirthHistory].reverse().slice(0, 50).map((r) =>
          el('tr', {}, [
            el('td', { text: String(r.n) }),
            el('td', { text: formatNumber(r.generated, f) }),
            el('td', { text: formatDuration(r.duration) }),
            el('td', { text: formatMultiplier(prestigeMultiplier(r.n), f) }),
          ]),
        );
        tbody.replaceChildren(...rows);
        table.parentElement.hidden = rows.length === 0;
        empty.hidden = rows.length > 0;
      }
    },
  };
}

// ───── journal ─────

const LOG_ICONS = { achievement: 'trophy', grade: 'crown', event: 'sparkles', negative: 'warning', defense: 'shield', rebirth: 'rebirth', system: 'info', info: 'info' };
const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function createLogPanel(engine) {
  const list = document.getElementById('log-list');
  const empty = document.getElementById('log-empty');
  const shield = document.getElementById('shield-status');
  let rendered = -1;
  let lastFirst = 0;
  let shieldKey = '';

  return {
    update(force = false) {
      const s = engine.state;
      const first = s.log[0]?.t ?? 0;
      if (force || rendered !== s.log.length || first !== lastFirst) {
        rendered = s.log.length;
        lastFirst = first;
        list.replaceChildren(
          ...[...s.log].reverse().map((e) =>
            el('li', { class: `log-item log-item--${e.kind}` }, [icon(LOG_ICONS[e.kind] ?? 'info'), el('span', { text: e.text }), el('time', { class: 'log-item__time', text: timeFormat.format(e.t) })]),
          ),
        );
        empty.hidden = s.log.length > 0;
      }
      const parts = [];
      if (s.shieldUntil > s.clock) parts.push(['shield', `Patch de sécurité : ${formatDuration(s.shieldUntil - s.clock)}`]);
      if (s.lossImmuneUntil > s.clock) parts.push(['vault', `Sauvegarde immuable : ${formatDuration(s.lossImmuneUntil - s.clock)}`]);
      if (s.firewallCharges > 0) parts.push(['firewall', `Firewall : ${s.firewallCharges} charge${s.firewallCharges > 1 ? 's' : ''}`]);
      const key = parts.map((p) => p[1]).join('|');
      if (key !== shieldKey) {
        shieldKey = key;
        shield.replaceChildren(...parts.map(([ic, label]) => el('span', { class: 'shield-pill' }, [icon(ic), label])));
      }
    },
  };
}
