import { Card, cardToString } from '../core/card';
export function prettyHand(cards: Card[]) { return cards.map(cardToString).join(' '); }
export function prettyDeal(players: Card[][], board: { flop: Card[], turn?: Card, river?: Card }) {
  const lines: string[] = [];
  players.forEach((h,i)=>lines.push(`Player ${i+1}: ${prettyHand(h)}`));
  lines.push(`Flop : ${board.flop.map(cardToString).join(' ')}`);
  if (board.turn)  lines.push(`Turn : ${cardToString(board.turn)}`);
  if (board.river) lines.push(`River: ${cardToString(board.river)}`);
  return lines.join('\n');
}
