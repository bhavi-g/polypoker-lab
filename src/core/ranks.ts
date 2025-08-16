import type { Rank, Card } from './card';

export const RANK_TO_VAL: Record<Rank, number> = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14
};

export const VAL_TO_RANK: Record<number, Rank> = Object.fromEntries(
  Object.entries(RANK_TO_VAL).map(([k,v]) => [v, k as Rank])
) as Record<number, Rank>;

export function byDesc(a:number,b:number){ return b-a; }
export function sortRanksDesc(vals:number[]): number[] { return vals.slice().sort(byDesc); }

/** Choose k indices from [0..n-1] in lexicographic order; calls cb with an array of indices. */
export function chooseIndices(n:number, k:number, cb:(idx:number[])=>void){
  const idx = Array.from({length:k}, (_,i)=>i);
  const last = k-1;
  const use = () => cb(idx.slice());
  use();
  while(true){
    let i=last;
    while(i>=0 && idx[i]===i+n-k) i--;
    if(i<0) return;
    idx[i]++;
    for(let j=i+1;j<k;j++) idx[j]=idx[j-1]+1;
    use();
  }
}

/** Get numeric ranks from cards, high Ace=14. */
export function cardVals(cs: Card[]): number[] { return cs.map(c=>RANK_TO_VAL[c.rank]); }
