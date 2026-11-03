/**
 * Succès. Chaque succès débloqué accorde un bonus permanent de production
 * (reward, en fraction : 0,02 = +2 %), conservé après les renaissances.
 *
 * check(state, ctx) — ctx.tps : production actuelle par seconde.
 * Les conditions ne lisent que l'état : elles n'ont aucun effet de bord.
 */
const owned = (s, id) => s.buildings[id] ?? 0;

export const ACHIEVEMENTS = Object.freeze([
  // — tokens générés (historique) —
  { id: 'first-token', icon: 'token', reward: 0.01, name: 'Premier token', text: 'Générer votre tout premier token.', check: (s) => s.totalGenerated >= 1 },
  { id: 'tokens-100', icon: 'token', reward: 0.01, name: 'Centurion du prompt', text: 'Générer 100 tokens.', check: (s) => s.totalGenerated >= 100 },
  { id: 'tokens-1k', icon: 'token', reward: 0.01, name: 'Kilo-tokens', text: 'Générer 1 000 tokens.', check: (s) => s.totalGenerated >= 1e3 },
  { id: 'tokens-1m', icon: 'token', reward: 0.02, name: 'Millionnaire du contexte', text: 'Générer 1 million de tokens.', check: (s) => s.totalGenerated >= 1e6 },
  { id: 'tokens-1md', icon: 'token', reward: 0.02, name: 'Fenêtre de contexte XXL', text: 'Générer 1 milliard de tokens.', check: (s) => s.totalGenerated >= 1e9 },
  { id: 'tokens-1t', icon: 'token', reward: 0.03, name: 'Hallucination collective', text: 'Générer 1 T de tokens.', check: (s) => s.totalGenerated >= 1e12 },
  { id: 'tokens-1qa', icon: 'token', reward: 0.03, name: 'Facture cloud astronomique', text: 'Générer 1 Qa de tokens.', check: (s) => s.totalGenerated >= 1e15 },
  { id: 'tokens-1e18', icon: 'token', reward: 0.04, name: 'Tokenisation du littoral', text: 'Générer 1e18 tokens, plus que de grains de sable sur une plage.', check: (s) => s.totalGenerated >= 1e18 },
  { id: 'tokens-1e24', icon: 'token', reward: 0.05, name: 'Le modèle a lu Internet. Deux fois.', text: 'Générer 1e24 tokens.', check: (s) => s.totalGenerated >= 1e24 },
  { id: 'tokens-1e30', icon: 'token', reward: 0.05, name: 'Entropie maximale', text: 'Générer 1e30 tokens.', check: (s) => s.totalGenerated >= 1e30 },

  // — clics (historique) —
  { id: 'clicks-100', icon: 'cursor', reward: 0.01, name: 'Index échauffé', text: 'Cumuler 100 clics.', check: (s) => s.totalClicks >= 100 },
  { id: 'clicks-1k', icon: 'cursor', reward: 0.01, name: 'Tendinite précoce', text: 'Cumuler 1 000 clics.', check: (s) => s.totalClicks >= 1e3 },
  { id: 'clicks-10k', icon: 'mouse', reward: 0.02, name: 'Souris en titane', text: 'Cumuler 10 000 clics.', check: (s) => s.totalClicks >= 1e4 },
  { id: 'clicks-100k', icon: 'mouse', reward: 0.03, name: 'Clic stakhanoviste', text: 'Cumuler 100 000 clics.', check: (s) => s.totalClicks >= 1e5 },
  { id: 'clicks-1m', icon: 'hand', reward: 0.05, name: 'Le Doigt de Dieu', text: 'Cumuler 1 million de clics.', check: (s) => s.totalClicks >= 1e6 },

  // — infrastructures —
  { id: 'own-cdi', icon: 'cdi', reward: 0.01, name: 'Accès CDI autorisé', text: 'Acheter votre premier PC du CDI.', check: (s) => owned(s, 'cdi-pc') >= 1 },
  { id: 'own-server', icon: 'server', reward: 0.01, name: 'Premier serveur', text: 'Posséder un serveur domestique.', check: (s) => owned(s, 'home-server') >= 1 },
  { id: 'own-gpu-cluster', icon: 'gpu', reward: 0.02, name: 'Premier cluster GPU', text: 'Posséder un cluster GPU.', check: (s) => owned(s, 'gpu-cluster') >= 1 },
  { id: 'own-datacenter', icon: 'datacenter', reward: 0.02, name: 'Premier datacenter', text: 'Posséder un datacenter.', check: (s) => owned(s, 'datacenter') >= 1 },
  { id: 'own-quantum', icon: 'quantum', reward: 0.03, name: 'Premier ordinateur quantique', text: 'Posséder un ordinateur quantique.', check: (s) => owned(s, 'quantum-pc') >= 1 },
  { id: 'own-singularity', icon: 'singularity', reward: 0.05, name: 'Singularité atteinte', text: 'Posséder une singularité informatique.', check: (s) => owned(s, 'singularity') >= 1 },
  { id: 'own-50-cdi', icon: 'cdi', reward: 0.01, name: 'Réquisition du CDI', text: 'Posséder 50 PC du CDI en même temps.', check: (s) => owned(s, 'cdi-pc') >= 50 },
  { id: 'park-100', icon: 'farm', reward: 0.02, name: 'Parc informatique', text: 'Posséder 100 infrastructures en même temps.', check: (s) => Object.values(s.buildings).reduce((a, b) => a + b, 0) >= 100 },
  { id: 'park-500', icon: 'datacenter', reward: 0.03, name: 'Zone industrielle', text: 'Posséder 500 infrastructures en même temps.', check: (s) => Object.values(s.buildings).reduce((a, b) => a + b, 0) >= 500 },
  { id: 'all-types', icon: 'star', reward: 0.05, name: 'Collectionneur de silicium', text: 'Posséder au moins une infrastructure de chacun des 25 types.', check: (s, ctx) => ctx.buildingTypes > 0 && Object.values(s.buildings).filter((n) => n > 0).length >= ctx.buildingTypes },
  { id: 'clusters-1000', icon: 'cluster', reward: 0.03, name: 'Mille clusters', text: 'Acheter 1 000 infrastructures au total, renaissances comprises.', check: (s) => s.totalBuildingsBought >= 1000 },

  // — production —
  { id: 'tps-1k', icon: 'bolt', reward: 0.01, name: 'Débit respectable', text: 'Atteindre 1 000 tokens par seconde.', check: (s, ctx) => ctx.tps >= 1e3 },
  { id: 'tps-1m', icon: 'bolt', reward: 0.03, name: 'Premier million par seconde', text: 'Atteindre 1 million de tokens par seconde.', check: (s, ctx) => ctx.tps >= 1e6 },
  { id: 'tps-1md', icon: 'rocket', reward: 0.03, name: 'Bande passante divine', text: 'Atteindre 1 milliard de tokens par seconde.', check: (s, ctx) => ctx.tps >= 1e9 },
  { id: 'tps-1t', icon: 'rocket', reward: 0.04, name: "Inférence à l'échelle planétaire", text: 'Atteindre 1 T de tokens par seconde.', check: (s, ctx) => ctx.tps >= 1e12 },

  // — clic —
  { id: 'click-upgrade', icon: 'mouse', reward: 0.01, name: 'Équipement de pro', text: 'Acheter une amélioration de clic.', check: (s) => Object.keys(s.upgrades).length >= 1 },
  { id: 'all-click', icon: 'sparkles', reward: 0.03, name: 'Main bionique', text: 'Acheter toutes les améliorations de clic.', check: (s, ctx) => ctx.clickUpgradeCount > 0 && Object.keys(s.upgrades).length >= ctx.clickUpgradeCount },
  { id: 'autoclick', icon: 'macro', reward: 0.01, name: 'Je clique en dormant', text: 'Acheter un premier auto-cliqueur.', check: (s) => Object.values(s.autoclickers).some((n) => n > 0) },

  // — renaissances —
  { id: 'reb-1', icon: 'rebirth', reward: 0.03, name: 'Première renaissance', text: 'Effectuer une renaissance.', check: (s) => s.renaissances >= 1 },
  { id: 'reb-5', icon: 'rebirth', reward: 0.04, name: 'Cycle de vie du modèle', text: 'Effectuer 5 renaissances.', check: (s) => s.renaissances >= 5 },
  { id: 'reb-10', icon: 'rebirth', reward: 0.05, name: 'Réincarnation en série', text: 'Effectuer 10 renaissances.', check: (s) => s.renaissances >= 10 },
  { id: 'reb-20', icon: 'infinity', reward: 0.05, name: 'Éternel retour', text: 'Effectuer 20 renaissances.', check: (s) => s.renaissances >= 20 },
  { id: 'reb-30', icon: 'infinity', reward: 0.08, name: 'Ouroboros numérique', text: 'Effectuer 30 renaissances.', check: (s) => s.renaissances >= 30 },

  // — grades —
  { id: 'grade-vibe', icon: 'wave', reward: 0.01, name: 'Good vibes only', text: 'Atteindre le grade Vibe Codeur.', check: (s) => s.gradeIndex >= 2 },
  { id: 'grade-engineer', icon: 'code', reward: 0.02, name: 'Ingénieur certifié (par lui-même)', text: 'Atteindre le grade Prompt Engineer.', check: (s) => s.gradeIndex >= 4 },
  { id: 'grade-savoir', icon: 'globe', reward: 0.05, name: 'Atteindre Savoir du monde', text: 'Atteindre le grade Savoir du monde.', check: (s) => s.gradeIndex >= 9 },
  { id: 'grade-omni', icon: 'crown', reward: 0.1, name: 'Atteindre Omniscience', text: 'Atteindre le grade ultime.', check: (s) => s.gradeIndex >= 11 },

  // — événements —
  { id: 'event-1', icon: 'warning', reward: 0.01, name: 'Imprévu technique', text: 'Vivre votre premier événement aléatoire.', check: (s) => s.eventsSeen >= 1 },
  { id: 'event-25', icon: 'warning', reward: 0.02, name: 'Gestion de crise', text: 'Vivre 25 événements aléatoires.', check: (s) => s.eventsSeen >= 25 },
  { id: 'event-rare', icon: 'star', reward: 0.02, name: 'Chanceux statistiquement', text: 'Déclencher un événement rare.', check: (s) => s.rareEventsSeen >= 1 },
  { id: 'event-blocked', icon: 'shieldCheck', reward: 0.02, name: 'Défense en profondeur', text: 'Neutraliser un événement négatif.', check: (s) => s.eventsBlocked >= 1 },

  // — temps & divers —
  { id: 'play-1h', icon: 'clock', reward: 0.01, name: 'Une heure de calcul', text: 'Jouer 1 heure au total.', check: (s) => s.playTime >= 3600 },
  { id: 'play-10h', icon: 'clock', reward: 0.03, name: 'Sans pause café', text: 'Jouer 10 heures au total.', check: (s) => s.playTime >= 36000 },
  { id: 'export', icon: 'vault', reward: 0.01, name: 'Paranoïa saine', text: 'Exporter une sauvegarde. La règle du 3-2-1 vous salue.', check: (s) => s.exports >= 1 },
]);

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
