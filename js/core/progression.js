/** Grades : calcul du grade mérité et progression vers le suivant. */
import { GRADES } from '../data/levels.js';

/** Statistiques historiques utilisées par les conditions de grade. */
export function gradeStats(s) {
  return { clusters: s.totalBuildingsBought, clicks: s.totalClicks, renaissances: s.renaissances };
}

export function meetsGrade(s, grade) {
  const stats = gradeStats(s);
  return Object.entries(grade.req).every(([key, need]) => stats[key] >= need);
}

/** Plus haut grade dont toutes les conditions (et celles des précédents) sont remplies. */
export function earnedGradeIndex(s) {
  let index = 0;
  for (let i = 1; i < GRADES.length; i++) {
    if (!meetsGrade(s, GRADES[i])) break;
    index = i;
  }
  return index;
}

/**
 * Met à jour le grade (il ne redescend jamais) et renvoie les grades nouvellement atteints.
 * @param {import('./state.js').GameState} s
 */
export function updateGrade(s) {
  const earned = earnedGradeIndex(s);
  const reached = [];
  while (s.gradeIndex < earned) {
    s.gradeIndex += 1;
    reached.push(GRADES[s.gradeIndex]);
  }
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
