/** Grades : calcul du grade mérité et progression vers le suivant. */
import { GRADES } from '../data/levels.js';

/**
 * Statistiques utilisées par les conditions de grade. Le grade repart de
 * Noobie à chaque renaissance : clusters et clics sont comptés depuis la
 * dernière renaissance, seul le nombre de renaissances est cumulé.
 */
export function gradeStats(s) {
  return { clusters: s.runBuildingsBought, clicks: s.runClicks, renaissances: s.renaissances };
}

/** Mêmes statistiques sur toute la partie : borne le meilleur grade jamais atteint. */
export function lifetimeGradeStats(s) {
  return { clusters: s.totalBuildingsBought, clicks: s.totalClicks, renaissances: s.renaissances };
}

export function meetsGrade(stats, grade) {
  return Object.entries(grade.req).every(([key, need]) => stats[key] >= need);
}

/** Plus haut grade dont toutes les conditions (et celles des précédents) sont remplies. */
export function earnedGradeIndex(s, stats = gradeStats(s)) {
  let index = 0;
  for (let i = 1; i < GRADES.length; i++) {
    if (!meetsGrade(stats, GRADES[i])) break;
    index = i;
  }
  return index;
}

/**
 * Met à jour le grade (il ne redescend pas avant la prochaine renaissance)
 * et le record, puis renvoie les grades nouvellement atteints.
 * @param {import('./state.js').GameState} s
 */
export function updateGrade(s) {
  const earned = earnedGradeIndex(s);
  const reached = [];
  while (s.gradeIndex < earned) {
    s.gradeIndex += 1;
    reached.push(GRADES[s.gradeIndex]);
  }
  if (s.gradeIndex > s.bestGradeIndex) s.bestGradeIndex = s.gradeIndex;
  return reached;
}

export const REQ_LABELS = Object.freeze({
  clusters: 'Clusters',
  clicks: 'Clics',
  renaissances: 'Renaissances',
});

/** Progression vers le grade suivant (null si grade maximal). */
export function nextGradeProgress(s) {
  const next = GRADES[s.gradeIndex + 1];
  if (!next) return null;
  const stats = gradeStats(s);
  const items = Object.entries(next.req).map(([key, need]) => ({
    key,
    label: REQ_LABELS[key],
    have: stats[key],
    need,
    ratio: need <= 0 ? 1 : Math.min(1, stats[key] / need),
  }));
  return { grade: next, items };
}

export function currentGrade(s) {
  return GRADES[s.gradeIndex] ?? GRADES[0];
}

export function bestGrade(s) {
  return GRADES[s.bestGradeIndex] ?? GRADES[0];
}
