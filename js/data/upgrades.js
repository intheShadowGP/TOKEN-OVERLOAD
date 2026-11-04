/**
 * Données des améliorations : infrastructures (production automatique),
 * améliorations de clic (achat unique) et auto-cliqueurs (niveaux).
 *
 * Les prix suivent ≈ 15 × 7^rang et la production ≈ 0,1 × 5^rang : chaque
 * rang est plus rentable en valeur absolue mais met plus longtemps à
 * s'amortir, ce qui étale la progression.
 */

/**
 * @typedef {{ id: string, name: string, tier: string, icon: string, cost: number, tps: number, text: string }} BuildingDef
 */

export const TIERS = Object.freeze({
  basic: 'Informatique basique',
  personal: 'Informatique personnelle',
  pro: 'Infrastructure professionnelle',
  advanced: 'Technologies avancées',
  absurd: 'Technologies absurdes',
});

/** @type {readonly BuildingDef[]} */
export const BUILDINGS = Object.freeze([
  { id: 'cdi-pc', tier: 'basic', icon: 'cdi', cost: 15, tps: 0.1, name: 'PC du CDI', text: "Écran jauni, clavier collant, mot de passe scotché dessous. Il génère des tokens entre deux impressions de TPE." },
  { id: 'family-pc', tier: 'basic', icon: 'crt', cost: 100, tps: 0.5, name: 'Vieil ordinateur familial', text: "Démarre en 4 minutes, surtout si personne ne décroche le téléphone. Contient 37 barres d'outils." },
  { id: 'calculator', tier: 'basic', icon: 'calculator', cost: 750, tps: 2.5, name: 'Calculatrice scientifique', text: "Programmée en cours de maths au lieu d'écouter. Elle prédit le token suivant… en mode radians." },
  { id: 'raspberry', tier: 'basic', icon: 'board', cost: 5100, tps: 12, name: 'Raspberry Pi', text: "Acheté pour un projet domotique jamais terminé. Reconverti en micro-usine à tokens." },
  { id: 'office-pc', tier: 'basic', icon: 'tower', cost: 36000, tps: 60, name: 'PC bureautique', text: "Officiellement réservé aux tableurs. Officieusement, il infère pendant les réunions." },

  { id: 'gamer-rgb', tier: 'personal', icon: 'rgb', cost: 250000, tps: 300, name: 'PC Gamer RGB', text: "Les LED ajoutent +15 % de performances. C'est scientifiquement prouvé par personne." },
  { id: 'gamer-oc', tier: 'personal', icon: 'flame', cost: 1.8e6, tps: 1500, name: 'PC Gamer overclocké', text: "Tourne à 98 °C. Sert aussi de chauffage d'appoint et de plaque de cuisson." },
  { id: 'workstation', tier: 'personal', icon: 'workstation', cost: 1.2e7, tps: 7800, name: 'Station de travail', text: "Deux écrans, quatre GPU, zéro sieste. Le ventilateur a son propre code postal." },
  { id: 'home-server', tier: 'personal', icon: 'server', cost: 8.5e7, tps: 40000, name: 'Serveur domestique', text: "Installé dans le placard à balais. La facture d'électricité est désormais un sujet familial." },
  { id: 'server-rack', tier: 'personal', icon: 'rack', cost: 6e8, tps: 200000, name: 'Rack de serveurs', text: "Un mur entier de diodes qui clignotent. Les voisins pensent que vous minez du bitcoin." },

  { id: 'gpu-cluster', tier: 'pro', icon: 'gpu', cost: 4.2e9, tps: 1e6, name: 'Cluster GPU', text: "Des cartes graphiques en rang serré, introuvables en magasin depuis 2020. Vous les avez toutes." },
  { id: 'server-farm', tier: 'pro', icon: 'farm', cost: 3e10, tps: 5e6, name: 'Ferme de serveurs', text: "Les serveurs y sont élevés en plein air, nourris aux prompts bio." },
  { id: 'datacenter', tier: 'pro', icon: 'datacenter', cost: 2.1e11, tps: 2.4e7, name: 'Datacenter', text: "Refroidi par une rivière entière. Les poissons ont appris le Python." },
  { id: 'supercomputer', tier: 'pro', icon: 'super', cost: 1.5e12, tps: 1.2e8, name: 'Supercalculateur', text: "Prévoit la météo à 15 jours et vos prompts à 15 secondes." },
  { id: 'neural-net', tier: 'pro', icon: 'neural', cost: 1e13, tps: 6e8, name: 'Réseau neuronal dédié', text: "Des milliards de paramètres, et toujours incapable de compter les « r » de « fraise »." },

  { id: 'ai-agent', tier: 'advanced', icon: 'agent', cost: 7e13, tps: 3e9, name: 'Agent IA autonome', text: "Il ouvre des tickets, les traite, les ferme, puis se félicite dans un e-mail de 4 000 tokens." },
  { id: 'ai-lab', tier: 'advanced', icon: 'flask', cost: 5e14, tps: 1.5e10, name: "Laboratoire d'entraînement IA", text: "Blouses blanches, tableaux blancs, budgets rouges. On y entraîne des modèles à entraîner des modèles." },
  { id: 'mass-cluster', tier: 'advanced', icon: 'cluster', cost: 3.5e15, tps: 7.5e10, name: 'Cluster de calcul massif', text: "Visible depuis l'espace. Les astronautes s'en servent comme veilleuse." },
  { id: 'next-gen', tier: 'advanced', icon: 'chip', cost: 2.4e16, tps: 3.8e11, name: 'Superordinateur nouvelle génération', text: "Gravé en 0,3 nanomètre. Le marketing parle déjà de -1 nanomètre." },
  { id: 'quantum-lab', tier: 'advanced', icon: 'atom', cost: 1.7e17, tps: 1.9e12, name: 'Centre de recherche quantique', text: "Les chercheurs y sont à la fois en pause café et au travail, tant qu'on ne vérifie pas." },

  { id: 'quantum-pc', tier: 'absurd', icon: 'quantum', cost: 5e23, tps: 1.7e14, name: 'Ordinateur quantique', text: "Calcule toutes les réponses possibles en même temps. Choisit quand même la mauvaise, par principe." },
  { id: 'agi', tier: 'absurd', icon: 'brain', cost: 6e25, tps: 1.7e16, name: 'Intelligence artificielle générale', text: "Elle a tout compris. Elle vous demande juste de reformuler votre question." },
  { id: 'planet-net', tier: 'absurd', icon: 'globe', cost: 7e27, tps: 1.9e18, name: 'Réseau neuronal planétaire', text: "Chaque grille-pain de la Terre participe à l'inférence. Les toasts sont légèrement plus intelligents." },
  { id: 'dyson', tier: 'absurd', icon: 'dyson', cost: 8.5e29, tps: 2e20, name: 'Dyson Compute Sphere', text: "Une étoile entière enveloppée de GPU. Le Soleil est passé en mode économie d'énergie." },
  { id: 'singularity', tier: 'absurd', icon: 'singularity', cost: 5e32, tps: 2e22, name: 'Singularité informatique', text: "Le point de non-retour. Le temps lui-même est désormais facturé au token." },
]);

/**
 * Améliorations de clic, achat unique.
 * effect.base : valeur de base d'un clic (la plus haute possédée s'applique).
 * effect.share : fraction de la production brute ajoutée à chaque clic (cumulatif).
 * requires : identifiant d'une amélioration de clic à posséder avant.
 */
export const CLICK_UPGRADES = Object.freeze([
  { id: 'wheel-mouse', icon: 'mouse', cost: 150, effect: { base: 5 }, name: 'Souris à molette', text: "La molette fait défiler. Le clic, lui, rapporte 5 tokens." },
  { id: 'mech-keyboard', icon: 'keyboard', cost: 5000, requires: 'wheel-mouse', effect: { base: 25 }, name: 'Clavier mécanique', text: "Clac-clac-clac. Chaque frappe sonore vaut 25 tokens et un voisin agacé." },
  { id: 'shortcuts', icon: 'bolt', cost: 150000, requires: 'mech-keyboard', effect: { base: 100 }, name: 'Raccourcis clavier', text: "Ctrl+C, Ctrl+V, Ctrl+Token. Le clic monte à 100." },
  { id: 'caps-prompt', icon: 'terminal', cost: 5e6, requires: 'shortcuts', effect: { base: 500 }, name: 'Prompt EN MAJUSCULES', text: "TU DOIS RÉPONDRE MIEUX. Étonnamment efficace : 500 tokens par clic." },
  { id: 'ai-assist', icon: 'link', cost: 2e7, requires: 'caps-prompt', effect: { share: 0.005 }, name: 'Clic assisté par IA', text: "Chaque clic récupère 0,5 % de votre production automatique brute." },
  { id: 'ninja-paste', icon: 'copy', cost: 2e8, requires: 'caps-prompt', effect: { base: 2500 }, name: 'Copier-coller ninja', text: "Personne ne vous a vu coller ce prompt. 2 500 tokens par clic." },
  { id: 'dual-screen', icon: 'workstation', cost: 8e9, requires: 'ninja-paste', effect: { base: 15000 }, name: 'Double écran', text: "Un écran pour le prompt, l'autre pour faire semblant de travailler." },
  { id: 'chain-thought', icon: 'list', cost: 5e10, requires: 'ai-assist', effect: { share: 0.01 }, name: 'Chain-of-thought', text: "« Réfléchis étape par étape. » +1 % de la production brute par clic." },
  { id: 'few-shot', icon: 'code', cost: 4e11, requires: 'dual-screen', effect: { base: 100000 }, name: 'Few-shot learning', text: "Trois exemples, et le clic comprend tout seul : 100 000 tokens." },
  { id: 'legend-system', icon: 'scroll', cost: 2e13, requires: 'few-shot', effect: { base: 750000 }, name: 'Prompt système légendaire', text: "Douze pages de consignes, dont trois en majuscules. 750 000 tokens par clic." },
  { id: 'tree-thought', icon: 'neural', cost: 5e13, requires: 'chain-thought', effect: { share: 0.015 }, name: 'Tree-of-thought', text: "Pourquoi réfléchir en ligne droite ? +1,5 % de la production brute par clic." },
  { id: 'neural-link', icon: 'brain', cost: 1e15, requires: 'legend-system', effect: { base: 6e6 }, name: 'Interface neuronale', text: "Vous cliquez par la pensée. 6 M de tokens, et une légère migraine." },
  { id: 'telepathy', icon: 'wave', cost: 5e16, requires: 'neural-link', effect: { base: 5e7 }, name: 'Télépathie tokenisée', text: "Vous n'avez même plus besoin de penser. 50 M de tokens par clic." },
  { id: 'ultimate-click', icon: 'sparkles', cost: 3e18, requires: 'telepathy', effect: { base: 5e8 }, name: 'Le Clic Ultime', text: "Un seul clic pour les gouverner tous. 500 M de tokens." },
  { id: 'agentic-click', icon: 'agent', cost: 1e17, requires: 'tree-thought', effect: { share: 0.02 }, name: 'Clic agentique', text: "Votre clic délègue à 40 sous-agents. +2 % de la production brute." },
]);

/**
 * Auto-cliqueurs : génèrent de vrais clics (comptés dans les statistiques
 * et les grades) qui rapportent la puissance de clic courante.
 */
export const AUTOCLICKERS = Object.freeze([
  { id: 'ahk-macro', icon: 'macro', cost: 2000, growth: 1.45, rate: 2, maxLevel: 10, name: 'Macro AutoHotkey', text: "Un script de 3 lignes copié sur un forum de 2009. +2 clics par seconde par niveau." },
  { id: 'selenium-bot', icon: 'agent', cost: 5e6, growth: 1.5, rate: 5, maxLevel: 10, name: 'Bot Selenium', text: "Il clique, il scrolle, il accepte les cookies à votre place. +5 clics par seconde par niveau." },
  { id: 'mouse-farm', icon: 'hand', cost: 1e11, growth: 1.55, rate: 10, maxLevel: 10, name: 'Ferme de souris robotisées', text: "Des bras robotiques et des souris par centaines. +10 clics par seconde par niveau." },
  { id: 'click-swarm', icon: 'neural', cost: 1e16, growth: 1.6, rate: 100, maxLevel: 10, name: 'Essaim de clics distribué', text: "Un million d’agents qui cliquent en parallèle, synchronisés par un consensus que personne ne comprend. +100 clics par seconde par niveau." },
]);

/**
 * Boosters : achats uniques très chers, valables pour la partie en cours
 * (remis à zéro à la renaissance). Prix calibrés pour être hors de portée vers
 * la 5e renaissance et atteignables vers la 8e (tests/calibrate.mjs).
 * effect : production (×), click (× clics manuels et auto), costFactor (× prix
 * des infrastructures), protection (incidents bloqués), events (bonus ×2 plus
 * fréquents et plus longs).
 */
export const BOOSTERS = Object.freeze([
  { id: 'ether-mine', icon: 'gem', cost: 1.2e23, effect: { production: 3 }, name: 'Mine d’Ether-Token', text: "Un gisement de tokens fossiles, extraits à la pioche quantique. Production ×3." },
  { id: 'neural-firewall', icon: 'shieldCheck', cost: 1.5e23, effect: { protection: true }, name: 'Bouclier neuronal', text: "Un pare-feu qui lit les incidents avant qu’ils n’arrivent. Tous les événements négatifs sont neutralisés." },
  { id: 'prompt-amplifier', icon: 'bolt', cost: 1.8e23, effect: { click: 10 }, name: 'Amplificateur de prompt', text: "Chaque clic est relu, reformulé et amplifié par 40 modèles. Clics et auto-clics ×10." },
  { id: 'event-accelerator', icon: 'sparkles', cost: 2.2e23, effect: { events: 2 }, name: 'Accélérateur d’aléas', text: "Vous corrompez le générateur de hasard à votre avantage. Événements deux fois plus fréquents, bonus deux fois plus longs." },
  { id: 'context-compressor', icon: 'chip', cost: 2.6e23, effect: { costFactor: 0.5 }, name: 'Compresseur de contexte', text: "Même résultat, moitié moins de tokens. Toutes les infrastructures coûtent 50 % de moins." },
]);

export const BUILDING_MAP = new Map(BUILDINGS.map((b) => [b.id, b]));
export const BOOSTER_MAP = new Map(BOOSTERS.map((b) => [b.id, b]));
export const CLICK_UPGRADE_MAP = new Map(CLICK_UPGRADES.map((u) => [u.id, u]));
export const AUTOCLICKER_MAP = new Map(AUTOCLICKERS.map((a) => [a.id, a]));
