import { prettyDeal } from './pretty';
import { playTexasHand } from '../engine/texas_hand';
import { dealTexas } from '../variants/texas';
import { evaluateHoldem, scoreToString } from '../engine/holdem';

const players = Number(process.argv[2] ?? 6);
const stacksStart = Array.from({length: players}, () => 100); // 100-chip stacks
const btn = 0;
const cfg = { sb: 1, bb: 2, maxRaisesPerStreet: 1 };

function logger(s: string){ console.log(s); }

const d = dealTexas(players);
console.log(prettyDeal(d.players, d.board));
const board5 = [...d.board.flop, d.board.turn!, d.board.river!];
const { results } = evaluateHoldem(d.players, board5);
for (const r of results) console.log(`Eval P${r.index+1}: ${scoreToString(r.score)}`);
console.log('--- Playing hand with betting & payouts ---');

const res = playTexasHand(players, stacksStart, btn, cfg, logger);
console.log('\nStacks after:', res.stacksAfter);
if (res.pots.length) {
  console.log('Pots:', res.pots);
}
if (res.winners.length) {
  for (const w of res.winners) {
    console.log(`Pot ${w.amount} → winners P${w.players.map(i=>i+1).join(', ')}`);
  }
}
