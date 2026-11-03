/**
 * TOKEN OVERLOAD — réglages d'équilibrage centralisés.
 * Toutes les constantes de gameplay vivent ici pour pouvoir être ajustées
 * sans toucher à la logique.
 */
export const CONFIG = Object.freeze({
  /** Plafond numérique : au-delà, les valeurs saturent au lieu de devenir Infinity. */
  maxValue: 1e300,

  /** Coût d'une infrastructure : prixDeBase × croissance ^ quantitéPossédée. */
  costGrowth: 1.15,
  /** Quantité maximale d'une même infrastructure (garde-fou anti-corruption). */
  maxOwned: 100000,
  /** Paliers de quantité qui doublent la production d'une infrastructure. */
  milestones: Object.freeze([25, 50, 100, 150, 200, 300, 400, 500, 750, 1000]),
  milestoneFactor: 2,

  /** Clics manuels : 1 token au départ, plafond anti-répétition clavier. */
  baseClick: 1,
  maxManualClicksPerSecond: 25,

  prestige: Object.freeze({
    /** Tokens à générer pendant la partie en cours pour la première renaissance. */
    baseThreshold: 1e6,
    /**
     * Le seuil suivant = seuil précédent × croissance. La croissance part de
     * growthStart, est multipliée par growthDecay à chaque renaissance et ne
     * descend jamais sous growthMin (1600, 960, 576… puis 5).
     * Pourquoi pas ×10 constant : le multiplicateur ×4 fait croître la
     * production bien plus vite que ×10 tant que de nouvelles infrastructures
     * se débloquent ; les parties tombaient à quelques secondes dès la 8e
     * renaissance (voir tests/token-overload/simulate.mjs). Pour retrouver
     * ×10 strict : growthStart 10, growthDecay 1, growthMin 10.
     */
    growthStart: 1600,
    growthDecay: 0.6,
    growthMin: 5,
    /** Multiplicateur permanent = base ^ renaissances. */
    multiplierBase: 4,
    /** Garde-fou : 4^400 ≈ 1e240, encore représentable. */
    maxRenaissances: 400,
  }),

  /** Bonus permanent de production par grade atteint (0,1 = +10 %). */
  gradeBonus: 0.1,

  offline: Object.freeze({
    /** Efficacité de la production pendant que le jeu est fermé. */
    efficiency: 0.5,
    /** Durée hors ligne maximale prise en compte (24 h). */
    maxSeconds: 86400,
    /** En dessous de ce délai, pas de fenêtre « pendant votre absence ». */
    reportAfterSeconds: 60,
  }),

  events: Object.freeze({
    firstDelay: 90,
    minDelay: 75,
    maxDelay: 200,
    /** Les malus n'apparaissent qu'une fois ce total de tokens généré. */
    negativeAfterGenerated: 5000,
    maxFirewallCharges: 3,
    /** Bornes du cumul de multiplicateurs d'événements. */
    minMultiplier: 0.05,
    maxMultiplier: 1000,
  }),

  save: Object.freeze({
    key: 'token-overload:save',
    backupKey: 'token-overload:save:backup',
    /** Sauvegarde illisible mise de côté au lieu d'être écrasée. */
    corruptedKey: 'token-overload:save:corrupted',
    autosaveSeconds: 15,
    /** Taille maximale d'une sauvegarde importée (octets). */
    maxImportBytes: 256 * 1024,
  }),

  history: Object.freeze({
    sampleSeconds: 60,
    maxPoints: 240,
  }),

  logSize: 50,
});
