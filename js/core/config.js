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
    /**
     * Seuils de renaissance : table calibrée par simulation dans
     * js/data/prestige.js (voir tests/calibrate.mjs).
     * Chaque renaissance multiplie la production par multiplierBase.
     */
    multiplierBase: 2,
    /** Nombre maximal de renaissances : la suite passe par la Super Renaissance. */
    maxRenaissances: 100,
  }),

  superRebirth: Object.freeze({
    /** Renaissances nécessaires. */
    renaissances: 100,
    /** Tokens à générer dans la partie : seuil de la 100e renaissance × tokenFactor (51 = +5 000 %). */
    tokenFactor: 51,
    /** Succès exclu de la condition « tous les succès » (il récompense la Super Renaissance). */
    finalAchievement: 'i-am-artificial',
    /** Multiplicateur permanent accordé par chaque Super Renaissance. */
    multiplier: 1e6,
    max: 40,
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
