/**
 * Événements aléatoires, 100 % locaux et fictifs : aucun ne touche au réseau
 * ni au système. Les malus restent temporaires et limités.
 *
 * kind     : positive | negative | rare | defensive
 * weight   : poids relatif dans le tirage
 * duration : durée en secondes des effets temporaires
 * effects  : [{ target: 'production' | 'click', mult }]
 * reward   : gain immédiat = tps × tpsSeconds + clic × clicks (au moins minTokens)
 * loss     : perte immédiate = min(tokens × fraction, tps × tpsSeconds)
 * shield / lossImmunity : protections (secondes) ; firewall : charges ajoutées
 */
export const EVENT_KINDS = Object.freeze({
  positive: { label: 'Bonus', icon: 'sparkles' },
  negative: { label: 'Incident', icon: 'warning' },
  rare: { label: 'Rare', icon: 'star' },
  defensive: { label: 'Défense', icon: 'shield' },
});

export const EVENTS = Object.freeze([
  // — positifs —
  { id: 'nvidia-delivery', kind: 'positive', weight: 12, icon: 'truck', duration: 60, effects: [{ target: 'production', mult: 2 }], name: 'Livraison NVIDIA', text: 'Une palette de GPU est arrivée par erreur à votre adresse. Production ×2 pendant 60 s.' },
  { id: 'perfect-prompt', kind: 'positive', weight: 12, icon: 'sparkles', duration: 45, effects: [{ target: 'click', mult: 3 }], name: 'Prompt parfait', text: 'Vous avez enfin trouvé la formulation idéale. Clics ×3 pendant 45 s.' },
  { id: 'new-gpu-cluster', kind: 'positive', weight: 10, icon: 'gpu', reward: { tpsSeconds: 60, clicks: 30, minTokens: 50 }, name: 'Nouveau cluster GPU', text: 'Un cluster tout neuf vient de démarrer et vous offre sa première fournée.' },
  { id: 'cdi-mining', kind: 'positive', weight: 7, icon: 'cdi', duration: 90, effects: [{ target: 'production', mult: 3 }], name: 'Mining clandestin au CDI', text: 'Les PC du CDI tournent la nuit pour vous. Production ×3 pendant 90 s.' },
  { id: 'ciso-approval', kind: 'positive', weight: 5, icon: 'shieldCheck', reward: { tpsSeconds: 300, clicks: 100, minTokens: 200 }, name: 'Le RSSI valide le projet', text: "Miracle : le RSSI a signé sans demander d'analyse de risques. Prime exceptionnelle !" },
  { id: 'optimized-patch', kind: 'positive', weight: 10, icon: 'wrench', duration: 120, effects: [{ target: 'production', mult: 1.5 }], name: 'Patch optimisé', text: 'Une mise à jour qui accélère au lieu de tout casser. Production ×1,5 pendant 120 s.' },

  // — négatifs (temporaires et plafonnés) —
  { id: 'datacenter-outage', kind: 'negative', weight: 6, icon: 'plug', duration: 30, effects: [{ target: 'production', mult: 0.5 }], name: 'Panne du datacenter', text: "Quelqu'un a débranché la climatisation pour charger son téléphone. Production -50 % pendant 30 s." },
  { id: 'vram-leak', kind: 'negative', weight: 6, icon: 'drop', duration: 45, effects: [{ target: 'production', mult: 0.7 }], name: 'Fuite de VRAM', text: 'La mémoire vidéo fuit goutte à goutte. Production -30 % pendant 45 s.' },
  { id: 'fake-ddos', kind: 'negative', weight: 5, icon: 'wave', duration: 30, effects: [{ target: 'production', mult: 0.6 }, { target: 'click', mult: 0.5 }], name: 'Attaque DDoS (fictive)', text: 'Un afflux de requêtes imaginaires sature vos tuyaux. Production -40 % et clics -50 % pendant 30 s.' },
  { id: 'intern-deleted', kind: 'negative', weight: 4, icon: 'trash', loss: { fraction: 0.05, tpsSeconds: 120 }, name: 'Le stagiaire a supprimé le serveur', text: 'rm -rf en production, un vendredi. Vous perdez une petite partie de vos tokens.' },
  { id: 'neural-overload', kind: 'negative', weight: 5, icon: 'brain', duration: 60, effects: [{ target: 'production', mult: 0.75 }], name: 'Surcharge du réseau neuronal', text: 'Trop de paramètres, pas assez de café. Production -25 % pendant 60 s.' },

  // — rares —
  { id: 'zero-day', kind: 'rare', weight: 1.2, icon: 'bug', reward: { tpsSeconds: 900, clicks: 300, minTokens: 1000 }, name: 'Exploit zero-day (bug bounty)', text: 'Vous avez signalé une faille de façon responsable. La prime est conséquente.' },
  { id: 'quantum-breakthrough', kind: 'rare', weight: 1, icon: 'atom', duration: 30, effects: [{ target: 'production', mult: 10 }], name: 'Percée quantique', text: 'Les qubits sont enfin d’accord entre eux. Production ×10 pendant 30 s.' },
  { id: 'imminent-singularity', kind: 'rare', weight: 0.5, icon: 'singularity', duration: 60, effects: [{ target: 'production', mult: 7 }, { target: 'click', mult: 7 }], reward: { tpsSeconds: 1800, clicks: 500, minTokens: 5000 }, name: 'Singularité imminente', text: "L'univers entier retient son souffle. Récompense massive, puis production et clics ×7 pendant 60 s." },
  { id: 'forgotten-prompt', kind: 'rare', weight: 1.2, icon: 'scroll', reward: { tpsSeconds: 600, clicks: 200, minTokens: 800 }, name: "Découverte d'un prompt oublié", text: "Un prompt légendaire retrouvé au fond d'un vieux disque dur. Gros bonus de tokens." },
  { id: 'autonomous-net', kind: 'rare', weight: 0.8, icon: 'neural', duration: 120, effects: [{ target: 'production', mult: 5 }], name: 'Réseau neuronal autonome', text: "Votre réseau s'auto-optimise sans rien demander. Production ×5 pendant 120 s." },

  // — défensifs —
  { id: 'security-patch', kind: 'defensive', weight: 5, icon: 'shield', shield: 120, name: 'Patch de sécurité', text: 'Correctifs appliqués : aucun incident ne peut vous toucher pendant 120 s.' },
  { id: 'firewall', kind: 'defensive', weight: 5, icon: 'firewall', firewall: 1, name: 'Firewall renforcé', text: 'Une règle de filtrage en plus : le prochain incident sera neutralisé.' },
  { id: 'security-audit', kind: 'defensive', weight: 4, icon: 'eye', reward: { tpsSeconds: 180, clicks: 60, minTokens: 100 }, name: 'Audit de sécurité réussi', text: "Zéro non-conformité ! L'auditeur repart impressionné et vous laisse une récompense." },
  { id: 'immutable-backup', kind: 'defensive', weight: 3, icon: 'vault', lossImmunity: 300, saveNow: true, name: 'Sauvegarde immuable', text: 'Sauvegarde verrouillée : vos tokens sont protégés de toute perte pendant 300 s.' },
]);

export const EVENT_MAP = new Map(EVENTS.map((e) => [e.id, e]));
