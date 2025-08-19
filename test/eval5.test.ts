import { describe, it, expect } from 'vitest';
import { TexasStrategy } from '../src/variants/texas_strategy';
import type { Card } from '../src/core/card';

const C = (r: Card['rank'], s: Card['suit']): Card => ({ rank: r, suit: s });

describe('evaluate (Texas)', () => {
  it('identifies a pair (without relying on numeric category)', () => {
    const board = [C('A','♦'), C('J','♠'), C('5','♥'), C('3','♦'), C('2','♠')];
    const holes = [[C('A','♣'), C('K','♦')]]; // Pair of Aces
    const ev = TexasStrategy.evaluate(holes, board);
    const pretty = TexasStrategy.prettyScore(ev.results[0].score).toLowerCase();
    expect(pretty).toContain('pair');
  });

  it('pair beats high card', () => {
    const board = [C('A','♦'), C('J','♠'), C('5','♥'), C('3','♦'), C('2','♠')];
    const holes = [
      [C('A','♣'), C('K','♦')], // Pair of Aces
      [C('Q','♣'), C('9','♦')], // High card only
    ];
    const ev = TexasStrategy.evaluate(holes, board);
    const s0 = ev.results[0].score;
    const s1 = ev.results[1].score;
    const better = (a: number[], b: number[]) => { for (let i=0;i<6;i++){ if (a[i]!==b[i]) return a[i] > b[i]; } return false; };
    expect(better(s0, s1)).toBe(true);
  });
});
