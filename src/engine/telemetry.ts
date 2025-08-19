// src/engine/telemetry.ts
import fs from 'fs';
import path from 'path';

const SNAPSHOT = process.env.SNAPSHOT === '1';
const HANDLOG  = process.env.HANDLOG  === '1';

function todayFile() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const dir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${yyyy}-${mm}-${dd}.handlog.jsonl`);
}

function write(line: any) {
  if (HANDLOG) fs.appendFileSync(todayFile(), JSON.stringify(line) + '\n');
}

function cardToStr(c: any): string {
  if (!c) return '';
  if (typeof c === 'string') return c;
  return String(c.rank) + String(c.suit);
}

function cardsToStr(cs: any[]): string[] {
  return (cs ?? []).map(cardToStr);
}

export function startHand(dealerName: string, sb: number, bb: number, ante: number) {
  const evt = { t: 'hand_start', dealerName, sb, bb, ante };
  if (SNAPSHOT) console.log(JSON.stringify(evt));
  write(evt);
}

export function postBlindOrAnte(player: string, amount: number, kind: 'sb'|'bb'|'ante') {
  const evt = { t: 'forced', player, kind, amount };
  if (SNAPSHOT) console.log(JSON.stringify(evt));
  write(evt);
}

export function street(name: 'preflop'|'flop'|'turn'|'river') {
  const evt = { t: 'street', name };
  if (SNAPSHOT) console.log(JSON.stringify(evt));
  write(evt);
}

export function boardFlop(cards: any[]) {
  const evt = { t: 'board', stage: 'flop', cards: cardsToStr(cards) };
  if (SNAPSHOT) console.log(JSON.stringify(evt));
  write(evt);
}

export function boardTurn(turn: any, flop: any[]) {
  const evt = { t: 'board', stage: 'turn', cards: [...cardsToStr(flop), cardToStr(turn)] };
  if (SNAPSHOT) console.log(JSON.stringify(evt));
  write(evt);
}

export function boardRiver(flop: any[], turn: any, river: any) {
  const evt = { t: 'board', stage: 'river', cards: [...cardsToStr(flop), cardToStr(turn), cardToStr(river)] };
  if (SNAPSHOT) console.log(JSON.stringify(evt));
  write(evt);
}

export function snapshot(
  variant: string,
  dealerName: string,
  players: any[],
  board: { flop: any[], turn?: any|null, river?: any|null },
  currentBet: number
) {
  const publicPlayers = players.map(p => ({
    name: p.name,
    stack: p.stack,
    inHand: p.inHand,
    streetCommit: p.streetCommit,
    totalCommit: p.totalCommit,
    isAllIn: (p.stack ?? 0) <= 0
  }));

  const evt = {
    t: 'snapshot',
    variant,
    dealerName,
    currentBet,
    totalPot: publicPlayers.reduce((s,p)=> s + (p.totalCommit||0), 0),
    players: publicPlayers,
    board: {
      flop: cardsToStr(board.flop || []),
      turn: board.turn == null ? null : cardToStr(board.turn),
      river: board.river == null ? null : cardToStr(board.river),
    }
  };
  if (SNAPSHOT) console.log(JSON.stringify(evt));
  write(evt);
}

export function showPlayer(player: string, bestFive: any[], category: string) {
  const evt = { t: 'show', player, best: cardsToStr(bestFive), category };
  if (SNAPSHOT) console.log(JSON.stringify(evt));
  write(evt);
}

export function awardPot(idx: number, amount: number, winners: string[]) {
  const evt = { t: 'pot', idx, amount, winners };
  if (SNAPSHOT) console.log(JSON.stringify(evt));
  write(evt);
}

export function endHand() {
  const evt = { t: 'hand_end' };
  if (SNAPSHOT) console.log(JSON.stringify(evt));
  write(evt);
}

// NEW: reveal hole cards at showdown
export function revealHole(player: string, hole: any[], reason: 'showdown'|'all-in'|'voluntary' = 'showdown') {
  const evt = { t: 'reveal', player, cards: cardsToStr(hole), reason };
  if (SNAPSHOT) console.log(JSON.stringify(evt));
  write(evt);
}
