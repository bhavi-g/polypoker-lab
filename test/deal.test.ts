import { describe, it, expect } from 'vitest';
import { dealTexas } from '../src/variants/texas';
import { cardToString } from '../src/core/card';

describe('Texas dealing basics', () => {
  it('no duplicate cards in a deal', () => {
    const { players, board } = dealTexas(6);
    const all = [...players.flat(), ...board.flop, board.turn!, board.river!].map(cardToString);
    expect(new Set(all).size).toBe(all.length);
  });
  it('correct counts', () => {
    const n = 6;
    const { players, board } = dealTexas(n);
    expect(players.length).toBe(n);
    players.forEach(h => expect(h.length).toBe(2));
    expect(board.flop.length).toBe(3);
    expect(board.turn && board.river).toBeTruthy();
  });
});
