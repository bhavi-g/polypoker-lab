import type { Card } from '../core/card';

export type EvalResult = {
  index: number;
  bestFive: Card[];
  // mirrors Score tuple shape ([Cat, k1..k5]) but as number[]
  score: number[];
};

export interface VariantStrategy {
  name: string;
  holeCardsPerPlayer: number;
  minPlayers: number; maxPlayers: number;

  deal(nPlayers: number): { players: Card[][]; board: { flop: Card[]; turn?: Card; river?: Card } };

  evaluate(hole: Card[][], board: Card[]): { results: EvalResult[]; winners: EvalResult[] };

  prettyScore(score: number[]): string;
}
