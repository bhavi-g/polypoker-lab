import type { Card } from '../core/card';
import { Cat, CatName, Score, cmpScore } from '../core/eval5';
import { best5FromN } from '../core/best5';

export interface PlayerResult {
  index: number;
  bestFive: Card[];
  score: Score;
  category: Cat;
}

export function evaluateHoldem(hole: Card[][], board: Card[]): {
  results: PlayerResult[];
  winners: PlayerResult[];
} {
  const results: PlayerResult[] = hole.map((h, i) => {
    const seven = [...h, ...board];
    const { score, five } = best5FromN(seven);
    return { index: i, bestFive: five, score, category: score[0] };
  });
  let best = results[0].score;
  for (const r of results.slice(1)) if (cmpScore(r.score, best) > 0) best = r.score;
  const winners = results.filter(r => cmpScore(r.score, best) === 0);
  return { results, winners };
}

export function scoreToString(score: Score): string {
  const cat = CatName[score[0]];
  const kickers = score.slice(1).filter(n=>n>0).join(',');
  return `${cat}${kickers ? ' ['+kickers+']' : ''}`;
}
