/**
 * Fenêtres : confirmation, paramètres (dont sauvegarde et confidentialité),
 * statistiques, absence, renaissance et son animation.
 */
import { el, setText } from './dom.js';
import { drawProductionChart } from './charts.js';
import { createParticles } from './effects.js';
import { formatDuration, formatMultiplier, formatNumber } from '../core/numbers.js';
import { statisticsRows } from '../core/statistics.js';
import { rebirthPreview } from '../core/prestige.js';
import { CONFIG } from '../core/config.js';

const $id = (id) => document.getElementById(id);

/** Ouvre une fenêtre modale native ; Échap et les boutons [data-close] la ferment. */
export function openDialog(dialog) {
  if (!dialog.open) dialog.showModal();
}

export function wireDialogs() {
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('click', (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      if (target.closest('[data-close]')) dialog.close();
      // clic sur le fond (hors du contenu) : fermeture
      else if (target === dialog) {
        const r = dialog.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside && dialog.id !== 'dlg-confirm') dialog.close();
      }
    });
  }
}

// ───── confirmation générique ─────

export function createConfirm() {
  const dialog = /** @type {HTMLDialogElement} */ ($id('dlg-confirm'));
  const title = $id('confirm-title');
  const text = $id('confirm-text');
  const ok = /** @type {HTMLButtonElement} */ ($id('confirm-ok'));
  const cancel = $id('confirm-cancel');
  const checkWrap = $id('confirm-check-wrap');
  const check = /** @type {HTMLInputElement} */ ($id('confirm-check'));
  const checkLabel = $id('confirm-check-label');
  let resolver = null;

  function settle(value) {
    const r = resolver;
    resolver = null;
    if (dialog.open) dialog.close();
    r?.(value);
  }

  ok.addEventListener('click', () => settle(true));
  cancel.addEventListener('click', () => settle(false));
  dialog.addEventListener('close', () => settle(false));
  check.addEventListener('change', () => {
    ok.disabled = !check.checked;
  });

  /**
   * @param {{ title: string, text: string, confirmLabel?: string, danger?: boolean, requireCheck?: string }} opts
   * @returns {Promise<boolean>}
   */
  return function confirm({ title: t, text: body, confirmLabel = 'Confirmer', danger = false, requireCheck = '' }) {
    if (resolver) settle(false);
    setText(title, t);
    setText(text, body);
    ok.textContent = confirmLabel;
    ok.className = `btn${danger ? ' btn--danger' : ''}`;
    checkWrap.hidden = !requireCheck;
    check.checked = false;
    checkLabel.textContent = requireCheck;
    ok.disabled = Boolean(requireCheck);
    return new Promise((resolve) => {
      resolver = resolve;
      dialog.showModal();
      cancel.focus();
    });
  };
}

// ───── paramètres ─────

export function createSettingsDialog({ engine, apply, actions }) {
  const dialog = /** @type {HTMLDialogElement} */ ($id('dlg-settings'));
  const s = () => engine.state.settings;
  const inputs = {
    sound: /** @type {HTMLInputElement} */ ($id('set-sound')),
    volume: /** @type {HTMLInputElement} */ ($id('set-volume')),
    particles: /** @type {HTMLInputElement} */ ($id('set-particles')),
    floatingText: /** @type {HTMLInputElement} */ ($id('set-floating')),
    reducedMotion: /** @type {HTMLSelectElement} */ ($id('set-motion')),
    rebirthCountdown: /** @type {HTMLInputElement} */ ($id('set-countdown')),
    numberFormat: /** @type {HTMLSelectElement} */ ($id('set-format')),
    events: /** @type {HTMLInputElement} */ ($id('set-events')),
    showTutorial: /** @type {HTMLInputElement} */ ($id('set-tutorial')),
  };

  function sync() {
    const v = s();
    inputs.sound.checked = v.sound;
    inputs.volume.value = String(Math.round(v.volume * 100));
    inputs.particles.checked = v.particles;
    inputs.floatingText.checked = v.floatingText;
    inputs.reducedMotion.value = v.reducedMotion;
    inputs.rebirthCountdown.checked = v.rebirthCountdown;
    inputs.numberFormat.value = v.numberFormat;
    inputs.events.checked = v.events;
    inputs.showTutorial.checked = v.showTutorial;
  }

  for (const [key, input] of Object.entries(inputs)) {
    input.addEventListener(input.type === 'range' ? 'input' : 'change', () => {
      const v = s();
      if (input.type === 'checkbox') v[key] = /** @type {HTMLInputElement} */ (input).checked;
      else if (input.type === 'range') v[key] = Math.max(0, Math.min(1, Number(input.value) / 100));
      else if ([...(/** @type {HTMLSelectElement} */ (input).options)].some((o) => o.value === input.value)) v[key] = input.value;
      apply(key);
    });
  }

  // sous-sections
  const tabs = [...dialog.querySelectorAll('.dialog-tab')];
  const sections = [...dialog.querySelectorAll('[data-section-panel]')];
  function showSection(name) {
    for (const t of tabs) t.setAttribute('aria-selected', String(t.dataset.section === name));
    for (const sec of sections) sec.hidden = sec.dataset.sectionPanel !== name;
  }
  for (const t of tabs) t.addEventListener('click', () => showSection(t.dataset.section));

  // sauvegarde
  const msg = $id('import-msg');
  const status = $id('save-status');
  const fileInput = /** @type {HTMLInputElement} */ ($id('import-file'));
  const textInput = /** @type {HTMLTextAreaElement} */ ($id('import-text'));
  const say = (text, kind) => {
    msg.textContent = text;
    msg.className = `form-msg${kind ? ` is-${kind}` : ''}`;
  };

  $id('btn-save-now').addEventListener('click', () => {
    const ok = actions.saveNow();
    say(ok ? 'Partie sauvegardée sur cet appareil.' : "Impossible d'écrire dans le stockage local (navigation privée ou quota plein ?).", ok ? 'ok' : 'error');
  });
  $id('btn-export').addEventListener('click', () => {
    actions.exportFile();
    say('Fichier de sauvegarde téléchargé.', 'ok');
  });
  $id('btn-copy-export').addEventListener('click', async () => {
    say((await actions.exportClipboard()) ? 'Sauvegarde copiée dans le presse-papiers.' : 'Copie impossible : utilisez « Exporter ».', 'ok');
  });
  $id('btn-import-file').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    if (file.size > CONFIG.save.maxImportBytes) return say('Fichier trop volumineux (256 Ko maximum).', 'error');
    try {
      const text = await file.text();
      const result = await actions.importText(text);
      if (result) say(result, 'error');
    } catch {
      say('Lecture du fichier impossible.', 'error');
    }
  });
  $id('btn-import-text').addEventListener('click', async () => {
    const result = await actions.importText(textInput.value.trim());
    if (result) say(result, 'error');
  });
  $id('btn-wipe').addEventListener('click', () => actions.wipe());
  $id('btn-tutorial-now').addEventListener('click', () => {
    dialog.close();
    actions.startTutorial();
  });

  return {
    open(section = 'general') {
      sync();
      say('', '');
      showSection(section);
      const last = engine.state.lastSaved;
      setText(status, `Sauvegarde automatique toutes les ${CONFIG.save.autosaveSeconds} s · dernière : ${new Date(last).toLocaleTimeString('fr-FR')}`);
      openDialog(dialog);
    },
    sync,
  };
}

// ───── statistiques ─────

export function createStatsDialog(engine, fmt) {
  const dialog = /** @type {HTMLDialogElement} */ ($id('dlg-stats'));
  const groups = $id('stats-groups');
  const canvas = /** @type {HTMLCanvasElement} */ ($id('stats-chart'));
  const legend = $id('chart-legend');
  const nodes = new Map();

  function render() {
    const rows = statisticsRows(engine.state, engine.rates, fmt());
    if (!nodes.size) {
      const byGroup = new Map();
      for (const row of rows) {
        if (!byGroup.has(row.group)) byGroup.set(row.group, []);
        const value = el('strong');
        nodes.set(row.label, value);
        byGroup.get(row.group).push(el('div', { class: 'stat-row' }, [el('span', { text: row.label }), value]));
      }
      groups.replaceChildren(...[...byGroup].map(([name, items]) => el('section', { class: 'stats-group' }, [el('h3', { text: name }), ...items])));
    }
    for (const row of rows) setText(nodes.get(row.label), row.value);
  }

  function chart() {
    setText(legend, drawProductionChart(canvas, engine.state.history, { fmt: fmt() }));
  }

  return {
    open() {
      render();
      openDialog(dialog);
      requestAnimationFrame(chart);
    },
    update() {
      if (dialog.open) render();
    },
    redrawChart() {
      if (dialog.open) chart();
    },
  };
}

// ───── absence ─────

export function showOffline(seconds, gained, fmt) {
  setText($id('offline-amount'), `+${formatNumber(gained, fmt)}`);
  setText(
    $id('offline-text'),
    `Vous avez été absent ${formatDuration(seconds)}. Vos infrastructures ont continué à tourner à ${Math.round(CONFIG.offline.efficiency * 100)} % d'efficacité (24 h maximum prises en compte).`,
  );
  openDialog(/** @type {HTMLDialogElement} */ ($id('dlg-offline')));
}

// ───── renaissance ─────

export function createRebirthFlow({ engine, fmt, audio, motionReduced, onDone, onSuper }) {
  const dialog = /** @type {HTMLDialogElement} */ ($id('dlg-rebirth'));
  const check = /** @type {HTMLInputElement} */ ($id('dlg-rb-check'));
  const confirmBtn = /** @type {HTMLButtonElement} */ ($id('dlg-rb-confirm'));
  const fx = $id('rebirth-fx');
  const count = $id('rebirth-count');
  const fxTitle = $id('rebirth-fx-title');
  const fxMult = $id('rebirth-fx-mult');
  const app = $id('app');
  const particles = createParticles(/** @type {HTMLCanvasElement} */ ($id('rebirth-canvas')), { fullScreen: true });
  let running = false;

  check.addEventListener('change', () => {
    confirmBtn.disabled = !check.checked || !engine.canRebirth();
  });

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /**
   * Animation commune : compte à rebours, distorsion, action, titre, particules.
   * @param {{ can: () => boolean, act: () => any, title: (r: any) => string, subtitle: string | ((r: any) => string), epic?: boolean }} o
   */
  async function animate({ can, act, title, subtitle, epic = false }) {
    if (running || !can()) return null;
    running = true;
    const reduced = motionReduced();
    const countdown = engine.state.settings.rebirthCountdown && !reduced;

    fx.hidden = false;
    fx.classList.toggle('is-super', epic);
    setText(fxTitle, '');
    setText(fxMult, '');
    fxTitle.classList.remove('is-in');
    if (!reduced) app.classList.add('is-distorting');

    if (countdown) {
      for (const n of epic ? ['5', '4', '3', '2', '1'] : ['3', '2', '1']) {
        count.classList.remove('is-tick');
        void count.offsetWidth;
        setText(count, n);
        count.classList.add('is-tick');
        audio.tick();
        if (engine.state.settings.particles) particles.burst(window.innerWidth / 2, window.innerHeight / 2, epic ? 90 : 40, { speed: epic ? 450 : 300, ring: true });
        await wait(900);
      }
    } else if (!reduced) await wait(600);

    const record = act();
    setText(count, '');
    if (!record) {
      fx.hidden = true;
      app.classList.remove('is-distorting');
      running = false;
      return null;
    }
    audio.rebirth();
    setText(fxTitle, title(record));
    setText(fxMult, typeof subtitle === 'function' ? subtitle(record) : subtitle);
    fxTitle.classList.add('is-in');
    app.classList.remove('is-distorting');
    if (engine.state.settings.particles && !reduced) {
      for (let i = 0; i < (epic ? 12 : 4); i++) {
        particles.burst(window.innerWidth / 2, window.innerHeight / 2, epic ? 120 : 60, { speed: 520 + i * 120, size: 3.5, life: 1.4, ring: i % 3 === 0 });
        await wait(140);
      }
    }
    await wait(reduced ? 1200 : epic ? 4000 : 2200);
    fx.hidden = true;
    particles.clear();
    running = false;
    return record;
  }

  async function play() {
    dialog.close();
    const f = fmt();
    const before = rebirthPreview(engine.state);
    const record = await animate({
      can: () => engine.canRebirth(),
      act: () => engine.rebirth(),
      title: (r) => `RENAISSANCE N°${r.n}`,
      subtitle: `Multiplicateur ${formatMultiplier(before.current, f)} → ${formatMultiplier(before.next, f)}`,
    });
    if (record) onDone(record);
  }

  confirmBtn.addEventListener('click', play);

  return {
    open() {
      if (!engine.canRebirth()) return;
      const p = rebirthPreview(engine.state);
      const f = fmt();
      setText($id('dlg-rb-n'), String(engine.state.renaissances + 1));
      setText($id('dlg-rb-current'), formatMultiplier(p.current, f));
      setText($id('dlg-rb-next'), formatMultiplier(p.next, f));
      setText($id('dlg-rb-tokens'), formatNumber(engine.state.tokens, f));
      setText($id('dlg-rb-nextthreshold'), `Prochain seuil de renaissance : ${formatNumber(p.nextThreshold, f)} tokens générés.`);
      check.checked = false;
      confirmBtn.disabled = true;
      openDialog(dialog);
    },
    /** Super Renaissance (confirmation déjà obtenue). */
    async playSuper() {
      const record = await animate({
        can: () => engine.superStatus().ready,
        act: () => engine.superRebirth(),
        title: (r) => `SUPER RENAISSANCE N°${r.n}`,
        subtitle: () => `Je suis artificielle. Multiplicateur permanent ${formatMultiplier(engine.rates.prestige, fmt())}`,
        epic: true,
      });
      if (record) onSuper(record);
    },
    get running() {
      return running;
    },
  };
}
