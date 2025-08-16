import type { Card } from '../core/card';

const enabled = process.env.SNAPSHOT === '1' || String(process.env.SNAPSHOT).toLowerCase() === 'true';

function enc(c: Card){ return String(c.rank) + String(c.suit); }
function encArr(cs: Card[]){ return cs.map(enc); }

export function startHand(dealerName: string, sb: number, bb: number, ante: number){
  if (!enabled) return;
  console.log(JSON.stringify({ t:'hand_start', dealerName, sb, bb, ante }));
}

export function postBlindOrAnte(player: string, amount: number, kind: 'sb'|'bb'|'ante'){
  if (!enabled) return;
  console.log(JSON.stringify({ t:'forced', player, kind, amount }));
}

export function street(name: 'preflop'|'flop'|'turn'|'river'){
  if (!enabled) return;
  console.log(JSON.stringify({ t:'street', name }));
}

export function boardFlop(flop: Card[]){
  if (!enabled) return;
  console.log(JSON.stringify({ t:'board', stage:'flop', cards: encArr(flop) }));
}

export function boardTurn(turn: Card, flop: Card[]){
  if (!enabled) return;
  console.log(JSON.stringify({ t:'board', stage:'turn', cards: [...encArr(flop), enc(turn)] }));
}

export function boardRiver(flop: Card[], turn: Card, river: Card){
  if (!enabled) return;
  console.log(JSON.stringify({ t:'board', stage:'river', cards: [...encArr(flop), enc(turn), enc(river)] }));
}

/** Light snapshot of current table for frontends/logs */
export function snapshot(
  variant: string,
  dealerName: string,
  players: Array<{name:string, stack:number, inHand:boolean, streetCommit:number, totalCommit:number, hole: Card[]}>,
  board: { flop?: Card[], turn?: Card|null, river?: Card|null },
  currentBet: number
){
  if (!enabled) return;
  const snap = {
    t: 'snapshot',
    variant,
    dealerName,
    currentBet,
    totalPot: Number(players.reduce((s,p)=> s + (p.totalCommit||0), 0).toFixed(2)),
    players: players.map(p=>({
      name: p.name,
      stack: p.stack,
      inHand: p.inHand,
      streetCommit: p.streetCommit,
      totalCommit: p.totalCommit,
      isAllIn: p.stack <= 0,
      // hole intentionally omitted for privacy in shared terminals
    })),
    board: {
      flop: board.flop ? encArr(board.flop) : [],
      turn: board.turn ? enc(board.turn) : null,
      river: board.river ? enc(board.river) : null
    }
  };
  console.log(JSON.stringify(snap));
}

export function showPlayer(player: string, bestFive: Card[], catPretty: string){
  if (!enabled) return;
  console.log(JSON.stringify({ t:'show', player, best: encArr(bestFive), category: catPretty }));
}

export function awardPot(idx: number, amount: number, winners: string[]){
  if (!enabled) return;
  console.log(JSON.stringify({ t:'pot', idx, amount, winners }));
}

export function endHand(){
  if (!enabled) return;
  console.log(JSON.stringify({ t:'hand_end' }));
}
