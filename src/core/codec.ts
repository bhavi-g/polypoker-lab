import type { Card } from './card';

const RANK_MAP: Record<string,string> = { '10':'T','T':'T','J':'J','Q':'Q','K':'K','A':'A','9':'9','8':'8','7':'7','6':'6','5':'5','4':'4','3':'3','2':'2' };
const SUIT_MAP: Record<string,string> = { '♠':'s','♣':'c','♦':'d','♥':'h','s':'s','c':'c','d':'d','h':'h' };

export type CardCode = string; // e.g. "As", "Td", "7h"

export function encodeCard(c: Card): CardCode {
  const r = RANK_MAP[String(c.rank)];
  const s = SUIT_MAP[String(c.suit)];
  if (!r || !s) throw new Error('Bad card: '+JSON.stringify(c));
  return r + s;
}

export function encodeCards(cs: Card[]): CardCode[] {
  return cs.map(encodeCard);
}
