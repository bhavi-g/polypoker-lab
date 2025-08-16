export type HandEvent =
  | { t:'hand_start', handNo:number, dealer:string, sb:number, bb:number, ante:number }
  | { t:'post', player:string, amount:number, kind:'ante'|'sb'|'bb' }
  | { t:'deal', player:string, cards:number } // hole count, not showing values unless debug
  | { t:'action', player:string, act:'fold'|'check'|'call'|'bet'|'raise'|'allin', to?:number, add?:number }
  | { t:'street', name:'preflop'|'flop'|'turn'|'river' }
  | { t:'board', cards:string[] }
  | { t:'show', player:string, best:string, cat:string }
  | { t:'pot', idx:number, amount:number, winners:string[] }
  | { t:'hand_end', handNo:number };

export function newHistory(): HandEvent[] { return []; }
export function push(history: HandEvent[], e: HandEvent){ history.push(e); }
