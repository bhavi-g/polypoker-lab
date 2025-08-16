import type { Card } from '../core/card';
import { rank5, Score, cmpScore } from '../core/eval5';
import { chooseIndices } from '../core/ranks';

export interface OmahaResult {
  index: number;
  bestFive: Card[];
  score: Score;
}

export function evaluateOmaha(hole: Card[][], board: Card[]) {
  if (board.length < 3) throw new Error('Omaha needs at least flop (3 cards).');
  const results: OmahaResult[] = [];

  for (let i = 0; i < hole.length; i++) {
    const h = hole[i];
    if (!h || h.length !== 4) throw new Error(`Player ${i+1} must have 4 hole cards.`);

    let best: Score | null = null;
    let bestFive: Card[] = [];

    // choose 2 from 4 hole
    chooseIndices(4, 2, (hi) => {
      const two = [h[hi[0]], h[hi[1]]];
      // choose 3 from the board (if 3..5 provided)
      chooseIndices(board.length, 3, (bi) => {
        const three = [board[bi[0]], board[bi[1]], board[bi[2]]];
        const five = [...two, ...three];
        const s = rank5(five);
        if (!best || cmpScore(s, best) > 0) { best = s; bestFive = five; }
      });
    });

    results.push({ index: i, bestFive: bestFive, score: best! });
  }

  let bestScore = results[0].score;
  for (const r of results.slice(1)) if (cmpScore(r.score, bestScore) > 0) bestScore = r.score;
  const winners = results.filter(r => cmpScore(r.score, bestScore) === 0);

  return { results, winners };
}
