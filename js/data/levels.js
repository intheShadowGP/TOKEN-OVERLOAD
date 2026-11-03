/**
 * Grades. Les conditions sont cumulatives et historiques :
 * clusters = infrastructures achetées depuis le début du jeu (renaissances comprises),
 * clics = clics manuels + auto-clics depuis le début du jeu.
 */
export const GRADES = Object.freeze([
  { id: 'noobie', name: 'Noobie', icon: 'seed', color: '#929BAE', req: { clusters: 0, clicks: 0, renaissances: 0 }, text: "Vous pensez encore qu'un token est une pièce de fête foraine." },
  { id: 'prompt-beginner', name: 'Prompt Beginner', icon: 'cursor', color: '#8FA9D6', req: { clusters: 1, clicks: 100, renaissances: 0 }, text: "Vous avez découvert qu'on peut dire « s'il te plaît » à une IA." },
  { id: 'vibe-codeur', name: 'Vibe Codeur', icon: 'wave', color: '#5FC3E4', req: { clusters: 5, clicks: 500, renaissances: 0 }, text: "Le code marche. Personne ne sait pourquoi, surtout pas vous." },
  { id: 'script-kiddie', name: 'Script Kiddie', icon: 'terminal', color: '#4FB3C9', req: { clusters: 15, clicks: 2000, renaissances: 0 }, text: "Terminal en vert sur noir, capuche relevée, aucun sudo en vue." },
  { id: 'prompt-engineer', name: 'Prompt Engineer', icon: 'code', color: '#3987FF', req: { clusters: 30, clicks: 10000, renaissances: 1 }, text: "Votre titre LinkedIn est désormais plus long que vos prompts." },
  { id: 'ai-tinkerer', name: 'AI Tinkerer', icon: 'wrench', color: '#5B7CFF', req: { clusters: 60, clicks: 25000, renaissances: 2 }, text: "Vous démontez des modèles pour voir comment ils tiennent debout." },
  { id: 'neural-architect', name: 'Neural Architect', icon: 'neural', color: '#7A6CFF', req: { clusters: 100, clicks: 75000, renaissances: 3 }, text: "Vous dessinez des réseaux de neurones sur les nappes des restaurants." },
  { id: 'gpu-overlord', name: 'GPU Overlord', icon: 'gpu', color: '#9165FF', req: { clusters: 180, clicks: 200000, renaissances: 5 }, text: "Les fabricants de cartes graphiques vous envoient des cartes de vœux." },
  { id: 'singularity-researcher', name: 'Singularity Researcher', icon: 'singularity', color: '#B062F2', req: { clusters: 300, clicks: 500000, renaissances: 8 }, text: "Vous publiez des articles que seule votre IA comprend." },
  { id: 'savoir-du-monde', name: 'Savoir du monde', icon: 'globe', color: '#D377E0', req: { clusters: 500, clicks: 1000000, renaissances: 12 }, text: "Toute la connaissance humaine tient dans votre fenêtre de contexte." },
  { id: 'transcendance', name: 'Transcendance', icon: 'sun', color: '#F0B86E', req: { clusters: 800, clicks: 2500000, renaissances: 20 }, text: "Vous ne consommez plus de tokens : vous êtes les tokens." },
  { id: 'omniscience', name: 'Omniscience', icon: 'infinity', color: '#F3F5FA', req: { clusters: 1200, clicks: 5000000, renaissances: 30 }, text: "Vous connaissez la réponse avant la question. Et même le nombre de « r » dans « fraise »." },
]);
