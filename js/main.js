/**
 * TOKEN OVERLOAD — point d'entrée : chargement de la sauvegarde, gains hors
 * ligne, boucle de jeu en temps réel (delta time) et sauvegardes.
 */
import { CONFIG } from './core/config.js';
import { GameEngine } from './core/engine.js';
import { SaveError, deserialize, loadGame, safeStorage, saveGame, serialize, wipeGame } from './core/storage.js';
import { formatNumber } from './core/numbers.js';
import { createUI } from './ui/ui.js';

let backend = null;
try {
  backend = window.localStorage;
} catch {
  // stockage bloqué par le navigateur : le jeu reste jouable sans sauvegarde
}
const store = safeStorage(backend);
const storageAvailable = store.available;

const loaded = loadGame(store);
if (loaded.source === 'corrupted') {
  // on conserve la sauvegarde illisible à part plutôt que de l'écraser en silence
  const raw = store.get(CONFIG.save.key);
  if (raw) store.set(CONFIG.save.corruptedKey, raw);
}
const engine = new GameEngine(loaded.state);

// ───── sauvegarde ─────

let saveEnabled = true;
let saveTimer = 0;

function saveNow() {
  if (!saveEnabled || !storageAvailable) return false;
  clearTimeout(saveTimer);
  saveTimer = 0;
  return saveGame(store, engine.state);
}

function saveSoon() {
  if (!saveTimer) saveTimer = setTimeout(saveNow, 1000);
}

function exportText() {
  engine.state.exports += 1;
  engine.evaluateProgress();
  return serialize(engine.state);
}

function exportFile() {
  const text = exportText();
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const a = document.createElement('a');
  a.href = url;
  a.download = `token-overload-${stamp}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  saveSoon();
}

async function exportClipboard() {
  try {
    await navigator.clipboard.writeText(exportText());
    saveSoon();
    return true;
  } catch {
    return false;
  }
}

/** @returns {Promise<string>} message d'erreur, ou '' si la page est rechargée */
async function importText(text) {
  let result;
  try {
    result = deserialize(text, { strict: true });
  } catch (e) {
    return e instanceof SaveError ? e.message : 'Import impossible.';
  }
  const st = result.state;
  const ok = await ui.confirm({
    title: 'Remplacer la partie actuelle ?',
    text: `La sauvegarde importée (${formatNumber(st.totalGenerated)} tokens générés, ${st.renaissances} renaissance${st.renaissances > 1 ? 's' : ''}) remplacera la partie en cours sur cet appareil. Exportez d'abord la partie actuelle si vous voulez la garder.`,
    confirmLabel: 'Importer',
    danger: true,
  });
  if (!ok) return 'Import annulé.';
  // pas de gains « hors ligne » pour le temps écoulé depuis l'export
  st.lastSaved = Date.now();
  saveEnabled = false;
  if (!store.set(CONFIG.save.key, serialize(st))) {
    saveEnabled = true;
    return "Impossible d'écrire la sauvegarde dans le stockage local.";
  }
  window.location.reload();
  return '';
}

function wipe() {
  saveEnabled = false;
  clearTimeout(saveTimer);
  wipeGame(store);
  window.location.reload();
}

const ui = createUI(engine, { actions: { saveNow, saveSoon, exportFile, exportClipboard, importText, wipe } });

// ───── retour après absence ─────

function catchUp(seconds) {
  const away = Math.min(seconds, CONFIG.offline.maxSeconds);
  const { gained } = engine.advance(away, { offline: true });
  if (seconds >= CONFIG.offline.reportAfterSeconds && gained > 0) ui.showOffline(away, gained);
}

if (loaded.source !== 'new') {
  const away = (Date.now() - engine.state.lastSaved) / 1000;
  if (away > 1) catchUp(away);
}

if (!storageAvailable) {
  ui.toast({ kind: 'error', kicker: 'Sauvegarde', icon: 'warning', title: 'Stockage local indisponible', text: 'Votre navigateur bloque le stockage local : la progression ne sera pas conservée. Pensez à exporter votre partie.', duration: 10000 });
} else if (loaded.source === 'backup') {
  ui.toast({ kind: 'defensive', kicker: 'Sauvegarde', icon: 'vault', title: 'Copie de secours restaurée', text: 'La sauvegarde principale était illisible ; la copie de secours a été chargée.', duration: 8000 });
} else if (loaded.source === 'corrupted') {
  ui.toast({ kind: 'error', kicker: 'Sauvegarde', icon: 'warning', title: 'Sauvegarde illisible', text: 'Une nouvelle partie a commencé. Les données illisibles ont été mises de côté sur cet appareil.', duration: 10000 });
}

// ───── boucle de jeu ─────
// Le temps simulé suit l'horloge réelle : la production ne dépend ni de la
// fréquence d'images ni des intervalles des minuteurs.

/** Au-delà de cet écart (veille, onglet gelé), on applique les règles hors ligne. */
const SUSPEND_SECONDS = 300;
let last = Date.now();

function step() {
  const now = Date.now();
  const dt = (now - last) / 1000;
  last = now;
  if (dt <= 0) return; // horloge système reculée : on ignore
  if (dt > SUSPEND_SECONDS) catchUp(dt);
  else engine.advance(dt);
}

function frame(t) {
  step();
  ui.frame(t);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
// les onglets en arrière-plan ne reçoivent plus requestAnimationFrame
setInterval(step, 1000);
setInterval(saveNow, CONFIG.save.autosaveSeconds * 1000);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveNow();
  else step();
});
window.addEventListener('pagehide', saveNow);
window.addEventListener('beforeunload', saveNow);

saveNow();
ui.maybeStartTutorial();
