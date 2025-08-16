import { randomInt } from 'crypto';

export type Action = 'fold' | 'check' | 'call' | 'raise' | 'allin';

export interface TableConfig {
  sb: number;
  bb: number;
  ante?: number;
  maxRaisesPerStreet: number; // keep simple: 1
}

export interface PlayerState {
  stack: number;         // chips behind
  inHand: boolean;       // not folded
  allIn: boolean;
  commit: number;        // total committed this hand
  streetCommit: number;  // committed on current street
}

export interface BettingState {
  btn: number;
  current: number;       // index to act
  toCall: number;        // highest streetCommit among players (target to match)
  raisesUsed: number;
}

/** Advance index to next player who is still in hand and not already all-in with nothing to decide. */
function nextToAct(n: number, i: number, ps: PlayerState[]): number {
  for (let k = 1; k <= n; k++) {
    const j = (i + k) % n;
    const p = ps[j];
    if (p.inHand && !p.allIn) return j;
  }
  return i;
}

/** True if betting round is closed: either all but one folded, or every inHand player is all-in or has matched toCall and nobody wants to raise. */
function roundClosed(ps: PlayerState[], toCall: number, lastAggressor: number | null, current: number, n: number): boolean {
  const inHand = ps.filter(p => p.inHand).length;
  if (inHand <= 1) return true;
  // If everyone in hand is all-in, close.
  if (ps.filter(p => p.inHand && !p.allIn).length === 0) return true;
  // If action has returned to the player after the last aggressor (or there was no raise), and all have matched toCall, close.
  // As a simplification: if every non-all-in inHand player has streetCommit == toCall, close.
  const allMatched = ps.every(p => !p.inHand || p.allIn || p.streetCommit === toCall);
  return allMatched && lastAggressor === null;
}

export function resetStreet(ps: PlayerState[]) {
  for (const p of ps) p.streetCommit = 0;
}

export function postBlind(p: PlayerState, amt: number) {
  const pay = Math.min(amt, p.stack);
  p.stack -= pay;
  p.commit += pay;
  p.streetCommit += pay;
  if (p.stack === 0) p.allIn = true;
}

/** Very simple bot: if facing a bet, call if affordable; sometimes raise if raises remain. Else check often. */
export function botChooseAction(p: PlayerState, toCall: number, cfg: TableConfig, raisesLeft: number): { act: Action; size?: number } {
  const need = Math.max(0, toCall - p.streetCommit);
  if (!p.inHand || p.allIn) return { act: 'check' };

  if (need === 0) {
    // No bet to face: mostly check; tiny chance raise
    if (raisesLeft > 0 && p.stack > cfg.bb && randomInt(100) < 10) {
      const r = Math.min(p.stack, Math.max(cfg.bb * 2, cfg.bb * (2 + randomInt(3)))); // 2–4bb
      return { act: r === p.stack ? 'allin' : 'raise', size: r };
    }
    return { act: 'check' };
  } else {
    // Facing a bet
    if (need >= p.stack) return { act: 'allin' };
    // small fold chance when price is big
    if (need > cfg.bb * 4 && randomInt(100) < 25) return { act: 'fold' };
    // sometimes raise if room
    if (raisesLeft > 0 && p.stack > need + cfg.bb * 2 && randomInt(100) < 15) {
      const raiseTo = Math.min(p.stack + p.streetCommit, toCall + Math.max(cfg.bb * 2, cfg.bb * (2 + randomInt(3))));
      if (raiseTo >= p.stack + p.streetCommit) return { act: 'allin' };
      return { act: 'raise', size: raiseTo - p.streetCommit };
    }
    return { act: 'call' };
  }
}

/** Apply an action to player state; returns new toCall and whether this was an aggressive action (sets lastAggressor). */
export function applyAction(p: PlayerState, act: Action, cfg: TableConfig, toCall: number, size?: number): { toCall: number; aggressive: boolean } {
  switch (act) {
    case 'fold':
      p.inHand = false;
      return { toCall, aggressive: false };
    case 'check':
      return { toCall, aggressive: false };
    case 'call': {
      const need = Math.max(0, toCall - p.streetCommit);
      const pay = Math.min(need, p.stack);
      p.stack -= pay; p.commit += pay; p.streetCommit += pay;
      if (p.stack === 0) p.allIn = true;
      return { toCall, aggressive: false };
    }
    case 'allin': {
      // all-in is either a call or a raise depending on amount
      const pay = p.stack;
      p.stack = 0; p.commit += pay; p.streetCommit += pay; p.allIn = true;
      const newToCall = Math.max(toCall, p.streetCommit);
      const aggressive = newToCall > toCall;
      return { toCall: newToCall, aggressive };
    }
    case 'raise': {
      const need = Math.max(0, toCall - p.streetCommit);
      const add = (size ?? 0) + need;
      const pay = Math.min(add, p.stack);
      p.stack -= pay; p.commit += pay; p.streetCommit += pay;
      if (p.stack === 0) p.allIn = true;
      const newToCall = Math.max(toCall, p.streetCommit);
      const aggressive = newToCall > toCall;
      return { toCall: newToCall, aggressive };
    }
  }
}

/** Run one betting round. Returns true if hand ends early (everyone but one folded). */
export function runBettingRound(ps: PlayerState[], startIdx: number, cfg: TableConfig, preflop: boolean): boolean {
  const n = ps.length;
  let state: BettingState = { btn: -1, current: startIdx, toCall: 0, raisesUsed: 0 };
  let lastAggressor: number | null = null;

  // Loop until closed
  let safety = 1000;
  while (safety-- > 0) {
    const i = state.current;
    const p = ps[i];
    if (!(p.inHand && !p.allIn)) {
      state.current = nextToAct(n, i, ps);
      if (roundClosed(ps, state.toCall, lastAggressor, state.current, n)) break;
      continue;
    }
    // Decide
    const raisesLeft = Math.max(0, cfg.maxRaisesPerStreet - state.raisesUsed);
    const { act, size } = botChooseAction(p, state.toCall, cfg, raisesLeft);

    const { toCall: newToCall, aggressive } = applyAction(p, act, cfg, state.toCall, size);
    state.toCall = newToCall;
    if (act === 'fold') {
      if (ps.filter(x => x.inHand).length <= 1) return true; // hand ended
    }
    if (aggressive && state.raisesUsed < cfg.maxRaisesPerStreet) {
      state.raisesUsed++;
      lastAggressor = i;
    } else if (!aggressive && p.streetCommit === state.toCall && lastAggressor === i) {
      lastAggressor = null; // action closed for this loop
    }

    state.current = nextToAct(n, i, ps);
    if (roundClosed(ps, state.toCall, lastAggressor, state.current, n)) break;
  }
  return false;
}
