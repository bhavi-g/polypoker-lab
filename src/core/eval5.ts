import type { Card } from './card';
import { cardVals, sortRanksDesc } from './ranks';

/** Hand categories (higher is better) */
export enum Cat {
  HighCard=1,
  OnePair,
  TwoPair,
  Trips,
  Straight,
  Flush,
  FullHouse,
  Quads,
  StraightFlush
}
export type Score = [Cat, number, number, number, number, number];
export const CatName: Record<Cat,string> = {
  [Cat.HighCard]: 'High Card',
  [Cat.OnePair]: 'One Pair',
  [Cat.TwoPair]: 'Two Pair',
  [Cat.Trips]: 'Three of a Kind',
  [Cat.Straight]: 'Straight',
  [Cat.Flush]: 'Flush',
  [Cat.FullHouse]: 'Full House',
  [Cat.Quads]: 'Four of a Kind',
  [Cat.StraightFlush]: 'Straight Flush',
};

function isStraight(vals: number[]): number | null {
  const s = Array.from(new Set(vals)).sort((a,b)=>b-a);
  if (s.length < 5) return null;
  for (let i=0;i<=s.length-5;i++){
    const a=s[i];
    if (s[i+1]===a-1 && s[i+2]===a-2 && s[i+3]===a-3 && s[i+4]===a-4) return a;
  }
  const hasA = s.includes(14);
  const need = [5,4,3,2].every(v=>s.includes(v));
  if (hasA && need) return 5; // 5-high straight (A-2-3-4-5)
  return null;
}

export function rank5(cards: Card[]): Score {
  const vals = cardVals(cards);

  const suitCounts = new Map<string, number>();
  for (const c of cards) suitCounts.set(c.suit, (suitCounts.get(c.suit)||0)+1);
  const isFlushHand = suitCounts.size===1;

  const counts = new Map<number, number>();
  for (const v of vals) counts.set(v, (counts.get(v)||0)+1);
  const groups = Array.from(counts.entries())
    .map(([rank,cnt])=>[cnt,rank] as const)
    .sort((a,b)=> b[0]-a[0] || b[1]-a[1]);

  const straightTop = isStraight(vals);

  const cat =
    (isFlushHand && straightTop) ? Cat.StraightFlush :
    (groups[0][0]===4) ? Cat.Quads :
    (groups[0][0]===3 && groups[1]?.[0]===2) ? Cat.FullHouse :
    isFlushHand ? Cat.Flush :
    straightTop ? Cat.Straight :
    (groups[0][0]===3) ? Cat.Trips :
    (groups[0][0]===2 && groups[1]?.[0]===2) ? Cat.TwoPair :
    (groups[0][0]===2) ? Cat.OnePair : Cat.HighCard;

  switch(cat){
    case Cat.StraightFlush:
    case Cat.Straight: {
      const top = straightTop ?? 0;
      return [cat, top, 0,0,0,0];
    }
    case Cat.Quads: {
      const quadRank = groups[0][1];
      const kicker = groups.find(g=>g[1]!==quadRank)![1];
      return [cat, quadRank, kicker, 0,0,0];
    }
    case Cat.FullHouse: {
      const trips = groups[0][1];
      const pair = groups[1][1];
      return [cat, trips, pair, 0,0,0];
    }
    case Cat.Flush: {
      const sorted = sortRanksDesc(vals);
      return [cat, sorted[0], sorted[1], sorted[2], sorted[3], sorted[4]];
    }
    case Cat.Trips: {
      const t = groups[0][1];
      const kick = groups.filter(g=>g[1]!==t).map(g=>g[1]).sort((a,b)=>b-a);
      return [cat, t, kick[0], kick[1], 0,0];
    }
    case Cat.TwoPair: {
      const p1 = groups[0][1], p2 = groups[1][1];
      const hi = Math.max(p1,p2), lo = Math.min(p1,p2);
      const kick = groups.find(g=>g[0]===1 && g[1]!==hi && g[1]!==lo)![1];
      return [cat, hi, lo, kick, 0,0];
    }
    case Cat.OnePair: {
      const pr = groups[0][1];
      const kick = groups.filter(g=>g[0]===1).map(g=>g[1]).sort((a,b)=>b-a);
      return [cat, pr, kick[0], kick[1], kick[2], 0];
    }
    case Cat.HighCard: {
      const sorted = sortRanksDesc(vals);
      return [cat, sorted[0], sorted[1], sorted[2], sorted[3], sorted[4]];
    }
  }
}

export function cmpScore(a: Score, b: Score): number {
  for (let i=0;i<6;i++){
    if (a[i]!==b[i]) return (a[i] as number) - (b[i] as number);
  }
  return 0;
}
