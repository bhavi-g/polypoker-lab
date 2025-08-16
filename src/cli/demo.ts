import { dealTexas } from '../variants/texas';
import { prettyDeal } from './pretty';
import { evaluateHoldem, scoreToString } from '../engine/holdem';

const players = Number(process.argv[2] ?? 4);
const deal = dealTexas(players);

console.log(prettyDeal(deal.players, deal.board));

const board5 = [...deal.board.flop, deal.board.turn!, deal.board.river!];
const { results, winners } = evaluateHoldem(deal.players, board5);

for (const r of results) {
  console.log(`Player ${r.index+1} best: ${scoreToString(r.score)}`);
}

if (winners.length === 1) {
  console.log(`\nWinner: Player ${winners[0].index+1} (${scoreToString(winners[0].score)})`);
} else {
  const ids = winners.map(w=>w.index+1).join(', ');
  console.log(`\nSplit pot between players: ${ids} (${scoreToString(winners[0].score)})`);
}
