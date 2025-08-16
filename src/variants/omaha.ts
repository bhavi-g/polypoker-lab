import type { Card, Rank, Suit } from '../core/card';

const RANKS: Rank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS: Suit[] = ['♠','♥','♦','♣'];

function newDeck(): Card[] {
  const d: Card[] = [];
  for (const r of RANKS) for (const s of SUITS) d.push({ rank: r, suit: s });
  return d;
}
function shuffle<T>(a:T[]): T[] {
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

export interface OmahaDeal {
  players: Card[][];
  board: { flop: Card[]; turn?: Card; river?: Card };
}

export function dealOmaha(nPlayers:number): OmahaDeal {
  const deck = shuffle(newDeck());
  const players: Card[][] = Array.from({length:nPlayers}, ()=>[]);
  // 4 hole cards each
  for (let r=0;r<4;r++){
    for (let p=0;p<nPlayers;p++){
      players[p].push(deck.pop()!);
    }
  }
  const flop = [deck.pop()!, deck.pop()!, deck.pop()!];
  const turn = deck.pop()!;
  const river = deck.pop()!;
  return { players, board: { flop, turn, river } };
}
