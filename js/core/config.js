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
     * Le seuil suivant = seuil précédent × le facteur suivant de cette liste,
     * parcourue en boucle : 1 M, 100 M, 1 Md, 100 Md, 1 T, 100 T, 1 Qa…
     */
    thresholdSteps: Object.freeze([100, 10]),
    /**
     * À partir de la renaissance n° lateThresholdFrom, son seuil vaut celui de
     * la renaissance précédente × lateThresholdGrowth (36 = +3 500 %).
     */
    lateThresholdFrom: 15,
    lateThresholdGrowth: 36,
    /** Chaque renaissance multiplie la production par multiplierBase… */
    multiplierBase: 4,
    /** …puis par lateMultiplierBase à partir de la renaissance n° lateMultiplierFrom. */
    lateMultiplierFrom: 10,
    lateMultiplierBase: 2,
    /** Garde-fou : le multiplicateur et les seuils restent représentables. */
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
