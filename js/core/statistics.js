/** Statistiques : échantillonnage de l'historique et tableau récapitulatif. */
import { CONFIG } from './config.js';
import { formatDuration, formatMultiplier, formatNumber } from './numbers.js';
import { bestGrade, currentGrade } from './progression.js';
import { achievementCount } from './achievements.js';
import { ACHIEVEMENTS } from '../data/achievements.js';

const H = CONFIG.history;

/**
 * Ajoute un point d'historique toutes les H.sampleSeconds de jeu.
 * Au-delà de H.maxPoints, l'historique est sous-échantillonné (un point sur
 * deux) : il couvre toujours toute la partie, avec moins de détail.
 */
export function sampleHistory(s, rates) {
  const last = s.history[s.history.length - 1];
  if (last && s.playTime - last.t < H.sampleSeconds) return false;
  s.history.push({ t: s.playTime, tps: rates.tps, total: s.totalGenerated });
  if (s.history.length > H.maxPoints) s.history = s.history.filter((_, i) => i % 2 === 0 || i === s.history.length - 1);
  return true;
}

export function ownedBuildings(s) {
  return Object.values(s.buildings).reduce((a, b) => a + b, 0);
}

/** Lignes du panneau de statistiques. */
export function statisticsRows(s, rates, fmt = {}) {
  const n = (v) => formatNumber(v, fmt);
  return [
    { group: 'Partie en cours', label: 'Tokens possédés', value: n(s.tokens) },
    { group: 'Partie en cours', label: 'Tokens générés (partie)', value: n(s.runGenerated) },
    { group: 'Partie en cours', label: 'Production par seconde', value: `${n(rates.tps)}/s` },
    { group: 'Partie en cours', label: 'Puissance par clic', value: n(rates.click) },
    { group: 'Partie en cours', label: 'Auto-clics par seconde', value: formatNumber(rates.autoRate) },
    { group: 'Partie en cours', label: 'Infrastructures possédées', value: n(ownedBuildings(s)) },
    { group: 'Partie en cours', label: 'Améliorations de clic', value: n(Object.keys(s.upgrades).length) },
    { group: 'Partie en cours', label: 'Durée de la partie', value: formatDuration(s.runTime) },
    { group: 'Historique', label: 'Tokens générés (total)', value: n(s.totalGenerated) },
    { group: 'Historique', label: 'Clics (total)', value: n(s.totalClicks) },
    { group: 'Historique', label: 'dont clics manuels', value: n(s.manualClicks) },
    { group: 'Historique', label: 'dont auto-clics', value: n(s.autoClicks) },
    { group: 'Historique', label: 'Clusters achetés (total)', value: n(s.totalBuildingsBought) },
    { group: 'Historique', label: 'Meilleure production', value: `${n(s.bestTps)}/s` },
    { group: 'Historique', label: 'Temps de jeu total', value: formatDuration(s.playTime) },
    { group: 'Historique', label: 'Événements vécus', value: n(s.eventsSeen) },
    { group: 'Progression', label: 'Grade actuel', value: currentGrade(s).name },
    { group: 'Progression', label: 'Meilleur grade atteint', value: bestGrade(s).name },
    { group: 'Progression', label: 'Renaissances', value: n(s.renaissances) },
    { group: 'Progression', label: 'Multiplicateur de renaissance', value: formatMultiplier(rates.prestige, fmt) },
    { group: 'Progression', label: 'Multiplicateur global', value: formatMultiplier(rates.global, fmt) },
    { group: 'Progression', label: 'Succès', value: `${achievementCount(s)} / ${ACHIEVEMENTS.length}` },
  ];
}
