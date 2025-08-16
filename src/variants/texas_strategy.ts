import type { VariantStrategy } from '../engine/variant';
import type { Card } from '../core/card';
import { dealTexas } from './texas';
import { evaluateHoldem, scoreToString } from '../engine/holdem';

export const TexasStrategy: VariantStrategy = {
  name: 'Texas Hold’em',
  holeCardsPerPlayer: 2,
  minPlayers: 2, maxPlayers: 6,
  deal(nPlayers: number) {
    return dealTexas(nPlayers);
  },
  evaluate(hole: Card[][], board: Card[]) {
    // Cast to the generic EvalResult shape the engine expects
    return evaluateHoldem(hole, board) as unknown as {
      results: { index:number; bestFive: Card[]; score: number[] }[];
      winners: { index:number; bestFive: Card[]; score: number[] }[];
    };
  },
  prettyScore(score: number[]) {
    return scoreToString(score as any);
  }
};
