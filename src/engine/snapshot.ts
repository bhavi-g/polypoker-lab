import type { Card } from '../core/card';
import { encodeCard, encodeCards } from '../core/codec';

export type SnapshotPlayer = {
  id: string;
  name: string;
  stack: number;
  inHand: boolean;
  streetCommit: number;
  totalCommit: number;
  hole?: string[]; // include only if you want to reveal; default omitted
  isAllIn: boolean;
};

export type SnapshotPot = {
  amount: number;
  eligible: string[]; // player ids eligible for this pot
};

export type SnapshotBoard = {
  flop: string[];
  turn?: string;
  river?: string;
};

export type SnapshotState = {
  variant: string;
  players: SnapshotPlayer[];
  board: SnapshotBoard;
  pots: SnapshotPot[];
  dealerName: string;
  currentBet: number;
  toActPlayerId?: string;
  minRaiseTo?: number;
  legalActions?: string[]; // e.g., ['fold','call','raise','allin','check']
  totalPot: number;
  handNo?: number;
};

export function makeBoardSnapshot(board: { flop: Card[]; turn?: Card; river?: Card }): SnapshotBoard {
  return {
    flop: encodeCards(board.flop),
    ...(board.turn ? { turn: encodeCard(board.turn) } : {}),
    ...(board.river ? { river: encodeCard(board.river) } : {})
  };
}
