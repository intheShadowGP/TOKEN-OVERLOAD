/** Paramètres joueur : valeurs par défaut et validation stricte. */

export const DEFAULT_SETTINGS = Object.freeze({
  sound: true,
  volume: 0.5,
  particles: true,
  floatingText: true,
  /** 'auto' suit prefers-reduced-motion ; 'on' réduit ; 'off' anime tout. */
  reducedMotion: 'auto',
  numberFormat: 'short',
  events: true,
  tutorialDone: false,
  /** Afficher le tutoriel au démarrage tant qu'il n'est pas terminé. */
  showTutorial: true,
  rebirthCountdown: true,
});

const ENUMS = {
  reducedMotion: ['auto', 'on', 'off'],
  numberFormat: ['short', 'sci'],
};

export function defaultSettings() {
  return { ...DEFAULT_SETTINGS };
}

/**
 * Ne conserve que les clés connues, du bon type.
 * @param {unknown} raw
 * @param {string[]} [errors] reçoit la liste des champs rejetés
 */
export function sanitizeSettings(raw, errors) {
  const out = defaultSettings();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    if (raw !== undefined) errors?.push('settings');
    return out;
  }
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (!Object.hasOwn(raw, key)) continue;
    const v = /** @type {Record<string, unknown>} */ (raw)[key];
    if (typeof def === 'boolean') {
      if (typeof v === 'boolean') out[key] = v;
      else errors?.push(`settings.${key}`);
    } else if (typeof def === 'number') {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1) out[key] = v;
      else errors?.push(`settings.${key}`);
    } else if (ENUMS[key]) {
      if (typeof v === 'string' && ENUMS[key].includes(v)) out[key] = v;
      else errors?.push(`settings.${key}`);
    }
  }
  return out;
}
