import type { Card } from './card';
import { chooseIndices } from './ranks';
import { rank5, Score, cmpScore } from './eval5';

/** From N cards (e.g., 7), pick the best 5-card poker hand. */
export function best5FromN(cards: Card[]): { score: Score, five: Card[] } {
  let best: Score | null = null;
  let bestFive: Card[] = [];
  chooseIndices(cards.length, 5, (idx)=>{
    const five = idx.map(i=>cards[i]);
    const s = rank5(five);
    if (!best || cmpScore(s, best) > 0) { best = s; bestFive = five; }
  });
  return { score: best!, five: bestFive };
}
