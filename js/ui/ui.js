/**
 * Orchestration de l'interface : branche le moteur sur les composants,
 * gère les onglets, les notifications et la cadence de rafraîchissement.
 */
import { $, $$, hydrateIcons, icon, toggleClass } from './dom.js';
import { createAudio } from './audio.js';
import { createFloaters, createParticles } from './effects.js';
import { createToaster } from './toast.js';
import { createHud } from './hud.js';
import { createShop } from './shop.js';
import { createAchievementPanel, createGradePanel, createLogPanel, createRebirthPanel } from './panels.js';
import { createConfirm, createRebirthFlow, createSettingsDialog, createStatsDialog, showOffline, wireDialogs } from './dialogs.js';
import { createTutorial } from './tutorial.js';
import { formatMultiplier, formatNumber, formatPercent } from '../core/numbers.js';
import { EVENT_KINDS } from '../data/events.js';
import { CONFIG } from '../core/config.js';

const FAST_MS = 66;
const SLOW_MS = 250;

export function createUI(engine, { actions }) {
  const root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');
  hydrateIcons();

  const settings = () => engine.state.settings;
  const fmt = () => ({ mode: settings().numberFormat });
  const motionReduced = () => settings().reducedMotion === 'on' || (settings().reducedMotion === 'auto' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const audio = createAudio(settings);
  const toaster = createToaster($('#toasts'));
  const hud = createHud(engine, fmt);
  const confirm = createConfirm();
  wireDialogs();

  // ───── bouton token ─────

  const reactor = $('#reactor');
  const tokenBtn = $('#token-button');
  const particles = createParticles(/** @type {HTMLCanvasElement} */ ($('#fx-canvas')));
  const floaters = createFloaters($('#float-layer'));
  const counter = $('#tokens-value');

  tokenBtn.addEventListener('click', (e) => {
    audio.unlock();
    const gain = engine.click(performance.now());
    if (gain <= 0) return;
    audio.click();
    const rect = reactor.getBoundingClientRect();
    const keyboard = e.detail === 0;
    const x = keyboard ? rect.width / 2 : e.clientX - rect.left;
    const y = keyboard ? rect.height / 2 : e.clientY - rect.top;
    if (settings().floatingText) floaters.show(x - 20, y - 24, gain, { fmt: fmt(), kind: engine.rates.eventClick > 1 ? 'crit' : '' });
    if (settings().particles && !motionReduced()) particles.burst(x + 20, y + 20, 9, { speed: 220, size: 2.6, life: 0.7 });
    if (keyboard) {
      tokenBtn.classList.add('is-pressed');
      setTimeout(() => tokenBtn.classList.remove('is-pressed'), 90);
    }
  });

  // ───── onglets ─────

  const tabs = $$('.tab');
  let activeTab = 'infra';
  function selectTab(name, focus = false) {
    activeTab = name;
    for (const t of tabs) {
      const on = t.dataset.tab === name;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(`#panel-${t.dataset.tab}`).hidden = !on;
      if (on && focus) t.focus();
    }
    refreshPanels(true);
  }
  for (const t of tabs) t.addEventListener('click', () => selectTab(t.dataset.tab));
  $('.tabs').addEventListener('keydown', (e) => {
    const i = tabs.findIndex((t) => t.dataset.tab === activeTab);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next >= 0) {
      e.preventDefault();
      selectTab(tabs[next].dataset.tab, true);
    }
  });

  // ───── panneaux ─────

  const shop = createShop({
    engine,
    fmt,
    onBuy() {
      audio.buy();
    },
    onDenied() {
      audio.error();
    },
  });
  const gradePanel = createGradePanel(engine);
  const achPanel = createAchievementPanel(engine);
  const rebirthPanel = createRebirthPanel(engine, fmt);
  const logPanel = createLogPanel(engine);
  const stats = createStatsDialog(engine, fmt);
  const dotClick = $('#dot-click');
  const dotRebirth = $('#dot-rebirth');
  const dotBoosters = $('#dot-boosters');

  function refreshPanels(all = false) {
    shop.update();
    if (all || activeTab === 'grades') gradePanel.update();
    if (all || activeTab === 'achievements') achPanel.update();
    if (all || activeTab === 'rebirth') rebirthPanel.update();
    if (all || activeTab === 'log') logPanel.update();
    dotClick.hidden = activeTab === 'click' || !shop.hasAffordableClick();
    dotBoosters.hidden = activeTab === 'boosters' || !shop.hasAffordableBooster();
    dotRebirth.hidden = !engine.canRebirth() && !engine.superStatus().ready;
  }

  // ───── renaissance ─────

  const rebirth = createRebirthFlow({
    engine,
    fmt,
    audio,
    motionReduced,
    onDone(record) {
      toaster.show({ kind: 'rare', kicker: 'Renaissance', icon: 'rebirth', title: `Renaissance n°${record.n} accomplie`, text: `Multiplicateur permanent : ${formatMultiplier(engine.rates.prestige, fmt())}. Toute la production est multipliée.` });
      shop.refreshStructure();
      selectTab('infra');
      hud.fast();
      hud.slow();
    },
    onSuper(record) {
      audio.grade();
      toaster.show({ kind: 'achievement', kicker: 'Super Renaissance', icon: 'infinity', title: `Super Renaissance n°${record.n}`, text: `Je suis artificielle. Multiplicateur permanent : ${formatMultiplier(engine.rates.prestige, fmt())}. Les renaissances repartent de zéro.`, duration: 10000 });
      shop.refreshStructure();
      selectTab('infra');
      refreshPanels(true);
      hud.fast();
      hud.slow();
    },
  });
  for (const id of ['#btn-rebirth', '#btn-rebirth-quick']) {
    $(id).addEventListener('click', () => (engine.state.renaissances >= CONFIG.prestige.maxRenaissances ? selectTab('rebirth') : rebirth.open()));
  }
  $('#btn-super').addEventListener('click', async () => {
    if (!engine.superStatus().ready) return;
    const ok = await confirm({
      title: 'Déclencher la Super Renaissance ?',
      text: `Vos ${engine.state.renaissances} renaissances, votre partie en cours et votre grade repartent de zéro. En échange : multiplicateur permanent ×1 000 000 et le succès « Je suis artificielle ». Succès et statistiques sont conservés.`,
      confirmLabel: 'Devenir artificielle',
      requireCheck: 'Je comprends que mes 100 renaissances repartent de zéro.',
    });
    if (ok) rebirth.playSuper();
  });

  // ───── paramètres ─────

  const soundBtn = $('#btn-sound');
  function applySetting(key) {
    const s = settings();
    root.classList.toggle('motion-reduced', s.reducedMotion === 'on');
    root.classList.toggle('motion-full', s.reducedMotion === 'off');
    soundBtn.setAttribute('aria-pressed', String(!s.sound));
    soundBtn.setAttribute('aria-label', s.sound ? 'Couper le son' : 'Activer le son');
    soundBtn.replaceChildren(icon(s.sound ? 'volume' : 'mute'));
    if (key === 'numberFormat') {
      hud.fast();
      hud.slow();
      refreshPanels(true);
    }
    if (key === 'sound' && s.sound) audio.unlock();
    if (key) actions.saveSoon();
  }

  const tutorial = createTutorial({
    onFinish({ never, completed }) {
      const s = settings();
      if (completed) s.tutorialDone = true;
      s.showTutorial = !(completed || never);
      actions.saveSoon();
    },
  });

  const settingsDialog = createSettingsDialog({
    engine,
    apply: applySetting,
    actions: {
      ...actions,
      startTutorial: () => {
        selectTab('infra');
        tutorial.start();
      },
      wipe: async () => {
        const ok = await confirm({
          title: 'Réinitialiser complètement ?',
          text: "Toutes les données locales du jeu seront supprimées de ce navigateur : tokens, infrastructures, statistiques, grades, succès, renaissances et paramètres. Cette action est irréversible. Exportez d'abord votre sauvegarde si vous souhaitez la conserver.",
          confirmLabel: 'Tout supprimer',
          danger: true,
          requireCheck: 'Je comprends que ma progression sera définitivement perdue.',
        });
        if (ok) actions.wipe();
      },
    },
  });

  soundBtn.addEventListener('click', () => {
    settings().sound = !settings().sound;
    applySetting('sound');
  });
  $('#btn-settings').addEventListener('click', () => settingsDialog.open());
  $('#btn-privacy').addEventListener('click', () => settingsDialog.open('privacy'));
  $('#btn-stats').addEventListener('click', () => stats.open());
  $('#grade-chip').addEventListener('click', () => selectTab('grades'));
  $('#top-rebirths-btn').addEventListener('click', () => selectTab('rebirth'));

  // ───── notifications du moteur ─────

  engine.on('achievement', (a) => {
    audio.achievement();
    toaster.show({ kind: 'achievement', kicker: 'Succès débloqué', icon: a.icon, title: a.name, text: `${a.text} Bonus : ${formatPercent(a.reward)} de production.` });
    achPanel.update();
  });
  engine.on('grade', (g) => {
    audio.grade();
    toaster.show({ kind: 'grade', kicker: 'Nouveau grade', icon: g.icon, title: g.name, text: `${g.text} (+10 % de production)`, duration: 7000 });
    if (settings().particles && !motionReduced()) {
      const c = reactor.getBoundingClientRect();
      particles.burst(c.width / 2 + 20, c.height / 2 + 20, 50, { speed: 380, ring: true, life: 1.1 });
    }
    gradePanel.update();
  });
  engine.on('event', ({ def, amount }) => {
    const kind = def.kind;
    if (kind === 'negative') audio.negative();
    else if (kind === 'defensive') audio.defense();
    else audio.positive();
    const extra = def.reward ? ` +${formatNumber(amount, fmt())} tokens.` : def.loss ? ` -${formatNumber(amount, fmt())} tokens.` : '';
    toaster.show({ kind, kicker: `Événement · ${EVENT_KINDS[kind].label}`, icon: def.icon, title: def.name, text: def.text + extra, duration: 6500 });
    if (kind !== 'negative' && settings().particles && !motionReduced()) {
      const c = reactor.getBoundingClientRect();
      particles.burst(c.width / 2 + 20, c.height / 2 + 20, 24, { speed: 300, ring: kind === 'rare' });
    }
  });
  engine.on('event:blocked', ({ def }) => {
    audio.defense();
    toaster.show({ kind: 'defensive', kicker: 'Incident neutralisé', icon: 'shieldCheck', title: def.name, text: 'Vos protections ont bloqué cet incident. Aucun effet.' });
  });
  engine.on('purchase', ({ kind }) => {
    if (kind === 'click') shop.refreshStructure();
    refreshPanels();
    hud.fast();
    actions.saveSoon();
  });
  engine.on('history', () => stats.redrawChart());
  engine.on('save-request', () => actions.saveSoon());

  // ───── boucle de rendu ─────

  let lastFast = 0;
  let lastSlow = 0;
  let lastTitle = 0;
  let lastTokens = 0;

  function frame(now) {
    if (now - lastFast >= FAST_MS) {
      lastFast = now;
      hud.fast();
      const t = engine.state.tokens;
      // petite pulsation du compteur lors d'un gros gain d'un coup
      if (t > lastTokens * 1.5 && lastTokens > 0 && !motionReduced()) {
        counter.classList.remove('is-pop');
        void counter.offsetWidth;
        counter.classList.add('is-pop');
      }
      lastTokens = t;
    }
    if (now - lastSlow >= SLOW_MS) {
      lastSlow = now;
      hud.slow();
      refreshPanels();
      stats.update();
    }
    if (now - lastTitle >= 2000) {
      lastTitle = now;
      document.title = `${formatNumber(engine.state.tokens, fmt())} tokens · TOKEN OVERLOAD`;
    }
  }

  applySetting(null);
  selectTab('infra');
  hud.fast();
  hud.slow();
  logPanel.update(true);
  toggleClass(root, 'is-ready', true);

  return {
    frame,
    confirm,
    toast: (t) => toaster.show(t),
    showOffline: (seconds, gained) => showOffline(seconds, gained, fmt()),
    maybeStartTutorial() {
      if (settings().showTutorial) tutorial.start();
    },
    get busy() {
      return rebirth.running;
    },
  };
}
