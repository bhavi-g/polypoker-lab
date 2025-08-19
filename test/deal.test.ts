import { describe, it, expect } from 'vitest';
import { TexasStrategy } from '../src/variants/texas_strategy';
import type { Card } from '../src/core/card';

describe('deal (Texas)', () => {
  it('deals correct counts', () => {
    const s = TexasStrategy;
    const d = s.deal(3);
    expect(d.players).toHaveLength(3);
    d.players.forEach((h: Card[]) => expect(h).toHaveLength(2));
    expect(d.board.flop).toHaveLength(3);
    expect(d.board.turn).not.toBeNull();
    expect(d.board.river).not.toBeNull();
  });
});
