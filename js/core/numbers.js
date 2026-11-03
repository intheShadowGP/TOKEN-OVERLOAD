/**
 * Arithmétique bornée et formatage des grands nombres.
 *
 * Le jeu manipule des flottants IEEE-754 (jusqu'à ~1.8e308) : c'est suffisant
 * pour toute la progression (valeurs de fin de partie de l'ordre de 1e60 à
 * 1e120). Toutes les écritures passent par clampValue() pour qu'aucune
 * valeur ne devienne jamais NaN, négative ou Infinity, même avec une
 * sauvegarde importée hostile.
 */
import { CONFIG } from './config.js';

const NBSP = ' '; // espace fine insécable (séparateur de milliers français)

/** Ramène n dans [0, maxValue] ; NaN devient 0. */
export function clampValue(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  if (n <= 0) return 0;
  if (n > CONFIG.maxValue) return CONFIG.maxValue;
  return n;
}

/** Addition saturante. */
export function addValue(a, b) {
  return clampValue(a + b);
}

const UNITS = [
  [1e15, 'Qa'],
  [1e12, 'T'],
  [1e9, 'Md'],
  [1e6, 'M'],
];

function groupThousands(intString) {
  return intString.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

function fixedTrim(n, decimals) {
  let s = n.toFixed(decimals);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('.', ',');
}

function scientific(n, decimals = 2) {
  const [mantissa, exponent] = n.toExponential(decimals).split('e');
  return `${fixedTrim(Number(mantissa), decimals)}e${Number(exponent)}`;
}

/**
 * Formate un nombre pour l'affichage.
 * - < 1 000 : jusqu'à 1 décimale (0,1 ; 12,5 ; 999)
 * - < 1 M : entier groupé (12 345)
 * - < 1e18 : unité courte (1,25 M ; 3,4 Md ; 7 T ; 2 Qa)
 * - au-delà : notation scientifique (1,23e21)
 * @param {number} n
 * @param {{ mode?: 'short' | 'sci', decimals?: number }} [opts]
 */
export function formatNumber(n, { mode = 'short', decimals = 2 } = {}) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0';
  if (!Number.isFinite(n)) return '∞';
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a < 1000) {
    if (a === 0) return '0';
    if (a < 100 && !Number.isInteger(a)) return sign + fixedTrim(Math.floor(a * 10 + 1e-9) / 10, 1);
    return sign + String(Math.floor(a));
  }
  if (mode === 'sci' && a >= 1e6) return sign + scientific(a, decimals);
  if (a < 1e6) return sign + groupThousands(String(Math.floor(a)));
  if (a >= 1e18) return sign + scientific(a, decimals);
  for (const [value, unit] of UNITS) {
    if (a >= value) {
      // floor (et non arrondi) pour ne jamais afficher plus que ce qu'on possède
      const scaled = Math.floor((a / value) * 10 ** decimals + 1e-9) / 10 ** decimals;
      return `${sign}${fixedTrim(scaled, decimals)}${NBSP}${unit}`;
    }
  }
  return sign + String(a);
}

/** Formate un multiplicateur : ×1, ×4, ×1,5, ×1,1e12. */
export function formatMultiplier(n, opts) {
  if (n < 1000 && !Number.isInteger(n)) return `×${fixedTrim(n, 2)}`;
  return `×${formatNumber(n, opts)}`;
}

/** Formate un pourcentage : +12 %. */
export function formatPercent(fraction, { signed = true } = {}) {
  const v = fraction * 100;
  const s = Math.abs(v) < 10 && !Number.isInteger(v) ? fixedTrim(v, 1) : String(Math.round(v));
  return `${signed && v > 0 ? '+' : ''}${s}${NBSP}%`;
}

/** Formate une durée en secondes : 45 s, 3 min 05 s, 2 h 04 min, 3 j 4 h. */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '∞';
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}${NBSP}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}${NBSP}min ${String(s % 60).padStart(2, '0')}${NBSP}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${NBSP}h ${String(m % 60).padStart(2, '0')}${NBSP}min`;
  const d = Math.floor(h / 24);
  if (d < 365) return `${d}${NBSP}j ${h % 24}${NBSP}h`;
  return `${formatNumber(Math.floor(d / 365))}${NBSP}ans`;
}
