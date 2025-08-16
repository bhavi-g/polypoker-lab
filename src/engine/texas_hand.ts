import { dealTexas } from '../variants/texas';
import type { Card } from '../core/card';
import { evaluateHoldem } from './holdem';
import { buildSidePots } from './pot';
import { PlayerState, postBlind, resetStreet, runBettingRound, TableConfig } from './betting';

export interface HandResult {
  board: Card[];
  hole: Card[][];
  stacksAfter: number[];
  commits: number[];
  pots: { amount: number; eligible: number[] }[];
  winners: { players: number[]; amount: number }[];
}

export function playTexasHand(numPlayers: number, stacks: number[], btn: number, cfg: TableConfig, log: (s: string)=>void): HandResult {
  const deal = dealTexas(numPlayers);
  const hole = deal.players;
  const board = [...deal.board.flop, deal.board.turn!, deal.board.river!];

  // Init player states
  const ps: PlayerState[] = stacks.map(s => ({ stack: s, inHand: true, allIn: false, commit: 0, streetCommit: 0 }));

  // Antes (optional)
  if (cfg.ante && cfg.ante > 0) {
    hole.forEach((_, i) => {
      if (ps[i].stack > 0) {
        const a = Math.min(ps[i].stack, cfg.ante!);
        ps[i].stack -= a; ps[i].commit += a; ps[i].streetCommit += a;
      }
    });
  }

  const sbIdx = (btn + 1) % numPlayers;
  const bbIdx = (btn + 2) % numPlayers;

  // Post blinds
  postBlind(ps[sbIdx], cfg.sb);
  postBlind(ps[bbIdx], cfg.bb);
  log(`Posted blinds: SB P${sbIdx+1}=${cfg.sb}, BB P${bbIdx+1}=${cfg.bb}`);

  const startPreflop = (btn + 3) % numPlayers; // UTG

  // PRE-FLOP
  if (runBettingRound(ps, startPreflop, cfg, true)) {
    // everyone folded except one → award total commits to last player inHand
    const winner = ps.findIndex(p => p.inHand);
    const pot = ps.reduce((acc, p) => acc + p.commit, 0);
    ps[winner].stack += pot;
    log(`All fold preflop → P${winner+1} wins ${pot}`);
    return finish(ps, board, hole, []);
  }
  // FLOP
  resetStreet(ps);
  if (runBettingRound(ps, (btn + 1) % numPlayers, cfg, false)) {
    const winner = ps.findIndex(p => p.inHand);
    const pot = ps.reduce((acc, p) => acc + p.commit, 0);
    ps[winner].stack += pot;
    log(`All fold on flop → P${winner+1} wins ${pot}`);
    return finish(ps, board, hole, []);
  }
  // TURN
  resetStreet(ps);
  if (runBettingRound(ps, (btn + 1) % numPlayers, cfg, false)) {
    const winner = ps.findIndex(p => p.inHand);
    const pot = ps.reduce((acc, p) => acc + p.commit, 0);
    ps[winner].stack += pot;
    log(`All fold on turn → P${winner+1} wins ${pot}`);
    return finish(ps, board, hole, []);
  }
  // RIVER
  resetStreet(ps);
  if (runBettingRound(ps, (btn + 1) % numPlayers, cfg, false)) {
    const winner = ps.findIndex(p => p.inHand);
    const pot = ps.reduce((acc, p) => acc + p.commit, 0);
    ps[winner].stack += pot;
    log(`All fold on river → P${winner+1} wins ${pot}`);
    return finish(ps, board, hole, []);
  }

  // SHOWDOWN + SIDE POTS
  const active = new Set<number>(ps.map((p, i) => p.inHand ? i : -1).filter(i => i !== -1));
  const pots = buildSidePots(ps.map(p => p.commit), active);

  const winnersPayouts: { players: number[]; amount: number }[] = [];
  const showPlayers = Array.from(active);

  for (const pot of pots) {
    const elig = showPlayers.filter(i => pot.eligible.has(i));
    const { winners } = evaluateHoldem(elig.map(i => hole[i]), board);
    // winners[] are positions in 'elig'; map back to player indices
    const winnerIdxs = winners.map(w => elig[w.index]);
    const share = Math.floor(pot.amount / winnerIdxs.length);
    for (const i of winnerIdxs) ps[i].stack += share;
    winnersPayouts.push({ players: winnerIdxs, amount: pot.amount });
  }

  return finish(ps, board, hole, winnersPayouts, pots.map(p => ({ amount: p.amount, eligible: Array.from(p.eligible) })));
}

function finish(ps: PlayerState[], board: Card[], hole: Card[][], winners: { players: number[]; amount: number }[], rawPots?: { amount: number; eligible: number[] }[]): any {
  return {
    board,
    hole,
    stacksAfter: ps.map(p => p.stack),
    commits: ps.map(p => p.commit),
    pots: rawPots ?? [],
    winners,
  };
}
