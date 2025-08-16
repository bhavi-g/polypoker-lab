export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A'|'K'|'Q'|'J'|'10'|'9'|'8'|'7'|'6'|'5'|'4'|'3'|'2';

export interface Card { rank: Rank; suit: Suit; }

export const RANK_ORDER: Rank[] = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
export const SUITS: Suit[] = ['♠','♥','♦','♣'];

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of [...RANK_ORDER].reverse()) deck.push({ rank, suit });
  return deck;
}

export function cardToString(c: Card) { return `${c.rank}${c.suit}`; }
