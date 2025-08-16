import { Card, makeDeck } from '../core/card';
import { shuffleInPlace } from '../core/shuffle';

export interface TexasDeal {
  players: Card[][];
  board: { flop: Card[]; turn?: Card; river?: Card };
  burn: Card[];
}

export function dealTexas(numPlayers: number): TexasDeal {
  if (numPlayers < 2 || numPlayers > 9) throw new Error('Texas: players must be between 2 and 9');
  const deck = makeDeck(); shuffleInPlace(deck);
  const players: Card[][] = Array.from({ length: numPlayers }, () => []);
  for (let r = 0; r < 2; r++) for (let p = 0; p < numPlayers; p++) players[p].push(deck.pop()!);
  const burn: Card[] = [];
  burn.push(deck.pop()!); const flop = [deck.pop()!, deck.pop()!, deck.pop()!];
  burn.push(deck.pop()!); const turn = deck.pop()!;
  burn.push(deck.pop()!); const river = deck.pop()!;
  return { players, board: { flop, turn, river }, burn };
}
