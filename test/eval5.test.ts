import { describe, it, expect } from 'vitest';
import { rank5, Cat } from '../src/core/eval5';
import type { Card } from '../src/core/card';

const C = (r:string,s:string): Card => ({ rank: r as any, suit: s as any });

describe('rank5 basics', () => {
  it('straight flush beats quads', () => {
    const sf = [C('9','♠'),C('8','♠'),C('7','♠'),C('6','♠'),C('5','♠')];
    const q  = [C('K','♥'),C('K','♦'),C('K','♣'),C('K','♠'),C('2','♣')];
    expect(rank5(sf)[0]).toBe(Cat.StraightFlush);
    expect(rank5(q)[0]).toBe(Cat.Quads);
  });
});
