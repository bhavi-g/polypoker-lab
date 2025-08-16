export type ActionType = 'fold'|'check'|'call'|'bet'|'raise'|'allin'|'leave';

export type PlayerAction =
  | { type:'fold' }
  | { type:'check' }
  | { type:'call' }
  | { type:'bet', amount:number }     // total this street
  | { type:'raise', amount:number }   // total this street
  | { type:'allin' }
  | { type:'leave' };

export function parseActionInput(input: string): PlayerAction | null {
  const t = input.trim().toLowerCase();
  if (!t) return null;
  const [word, num] = t.split(/\s+/);
  if (word==='fold'||word==='check'||word==='call'||word==='allin'||word==='leave') return { type: word as any };
  if ((word==='bet'||word==='raise') && num && isFinite(Number(num))) {
    return { type: word as any, amount: Number(num) };
  }
  return null;
}
