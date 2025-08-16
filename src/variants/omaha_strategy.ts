import type { VariantStrategy } from '../engine/variant';
import type { Card } from '../core/card';
import { dealOmaha } from './omaha';
import { evaluateOmaha } from '../engine/omaha';
import { scoreToString } from '../engine/holdem';

export const OmahaStrategy: VariantStrategy = {
  name: 'Omaha (High)',
  holeCardsPerPlayer: 4,
  minPlayers: 2, maxPlayers: 6,
  deal(nPlayers: number) {
    return dealOmaha(nPlayers);
  },
  evaluate(hole: Card[][], board: Card[]) {
    return evaluateOmaha(hole, board) as unknown as {
      results: { index:number; bestFive: Card[]; score: number[] }[];
      winners: { index:number; bestFive: Card[]; score: number[] }[];
    };
  },
  prettyScore(score: number[]) {
    return scoreToString(score as any);
  }
};
