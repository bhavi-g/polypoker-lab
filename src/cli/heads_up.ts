import readline from 'readline';
import { dealTexas } from '../variants/texas';
import { evaluateHoldem, scoreToString } from '../engine/holdem';
import type { Card } from '../core/card';

type Action = 'fold'|'check'|'call'|'raise'|'bet'|'allin';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q:string)=> new Promise<string>(res=> rl.question(q, res));
const pause = async () => { await ask('↵ Enter to continue...'); };
function clear() { /* keep history visible */ }

interface P {
  name: string;
  stack: number;
  inHand: boolean;
  allIn: boolean;
  commit: number;        // total this hand
  streetCommit: number;  // this street only
  hole: Card[];
}

function cardStr(c: Card){ return String(c.rank) + String(c.suit); }
function cardsStr(cs: Card[]){ return cs.map(cardStr).join(' '); }
function totalPot(players:P[]) { return players[0].commit + players[1].commit; }
function post(p: P, amt: number) {
  const use = Math.min(amt, p.stack);
  p.stack -= use; p.commit += use; p.streetCommit += use;
  if (p.stack === 0) p.allIn = true;
}
function activeActors(players:P[]) { return players.filter(p => p.inHand && !p.allIn).length; }

const MIN_BET = 2;                  // simple minimum bet/raise size
const MAX_RAISES_PER_STREET = 1;    // keep flow simple

async function bettingRound(players: P[], toActFirst: number): Promise<boolean> {
  let toCall = Math.max(players[0].streetCommit, players[1].streetCommit);
  let raisesUsed = 0;
  let current = toActFirst;
  let idleChecks = 0;
  let safety = 200;

  while (safety-- > 0) {
    const me = players[current];
    const opp = players[1-current];
    if (!me.inHand || me.allIn) { current = 1-current; continue; }
    if (me.allIn && opp.allIn) break;

    clear();
    console.log('Total Pot: ' + totalPot(players));
    console.log('Stacks: ' + players[0].name + '=' + players[0].stack + ' | ' + players[1].name + '=' + players[1].stack);
    console.log('This street: ' + players[0].name + '=' + players[0].streetCommit + ' | ' + players[1].name + '=' + players[1].streetCommit);
    console.log('To call: ' + toCall);
    console.log('Your turn: ' + me.name);
    console.log('Your hole cards: ' + cardsStr(me.hole));

    const need = Math.max(0, toCall - me.streetCommit);
    let options: Action[] = [];
    if (need === 0) {
      options = (raisesUsed < MAX_RAISES_PER_STREET && me.stack > 0) ? ['check','bet','allin'] : ['check'];
    } else {
      if (me.stack <= need) options = ['fold','allin'];
      else options = (raisesUsed < MAX_RAISES_PER_STREET && me.stack > need) ? ['fold','call','raise','allin'] : ['fold','call','allin'];
    }

    const raw = (await ask('Choose [' + options.join('/') + '] : ')).trim().toLowerCase();
    if (!raw) continue;
    const parts = raw.split(/\s+/);
    const base = parts[0] as Action;
    let amtInline = parts[1] ? Number(parts[1]) : NaN;
    if (!options.includes(base)) continue;

    const pay = (amt:number) => post(me, amt);

    if (base === 'fold') {
      me.inHand = false;
      console.log(me.name + ' folds.');
      await pause();
      return true; // hand ends
    }

    if (base === 'check') {
      console.log(me.name + ' checks.');
      if (need === 0) {
        idleChecks++;
        if (idleChecks >= activeActors(players)) { await pause(); break; }
      }
    }

    if (base === 'call') {
      const needCall = Math.max(0, toCall - me.streetCommit);
      pay(needCall);
      console.log(me.name + ' calls ' + needCall + '.');
      if (needCall > 0 && players[0].streetCommit === toCall && players[1].streetCommit === toCall) {
        await pause(); break; // street closes on matching call
      }
      idleChecks = 0;
    }

    if (base === 'allin') {
      const needCall = Math.max(0, toCall - me.streetCommit);
      const shove = me.stack;
      pay(needCall + shove);
      toCall = Math.max(toCall, me.streetCommit);
      console.log(me.name + ' goes all-in (' + (needCall + shove) + ').');
      raisesUsed++; idleChecks = 0;
    }

    if (base === 'raise' || base === 'bet') {
      let toTotal: number;
      if (Number.isFinite(amtInline)) toTotal = amtInline!;
      else {
        while (true) {
          const min = base === 'bet' ? Math.max(MIN_BET, toCall + MIN_BET) : (toCall + MIN_BET);
          const label = base === 'bet' ? 'Bet to (>= ' : 'Raise to (>= ';
          const s = await ask(label + min + '): ');
          const v = Number(s);
          if (Number.isFinite(v) && v >= min) { toTotal = v; break; }
        }
      }
      const add = toTotal - me.streetCommit;
      pay(add);
      toCall = Math.max(toCall, me.streetCommit);
      console.log(me.name + ' ' + (base==='bet'?'bets':'raises') + ' to ' + toTotal + '.');
      raisesUsed++; idleChecks = 0;
    }

    await pause();
    current = 1-current;
  }
  return false;
}

function resetStreet(players:P[]) { for (const p of players) p.streetCommit = 0; }

async function main() {
  // NOTE: No blinds, no BTN/SB labels; simple to read.
  const players: P[] = [
    { name: 'Player 1', stack: 100, inHand: true, allIn: false, commit: 0, streetCommit: 0, hole: [] },
    { name: 'Player 2', stack: 100, inHand: true, allIn: false, commit: 0, streetCommit: 0, hole: [] },
  ];

  const deal = dealTexas(2);
  players[0].hole = deal.players[0];
  players[1].hole = deal.players[1];

  console.log('Heads-up Texas Hold’em — Simple Mode (no blinds)');
  console.log('(Stacks start at 100 chips each)');
  console.log('--- Hole cards have been dealt. ---\n');

  // PREFLOP — Player 1 acts first
  if (await bettingRound(players, 0)) return showdown([], deal.players, players);

  // FLOP — Player 2 acts first (common heads-up convention)
  resetStreet(players);
  console.log('--- FLOP ---');
  console.log(cardsStr(deal.board.flop));
  if (await bettingRound(players, 1)) return showdown(deal.board.flop, deal.players, players);

  // TURN — Player 2 acts first
  resetStreet(players);
  console.log('--- TURN ---');
  console.log(cardsStr(deal.board.flop) + '  ' + cardStr(deal.board.turn!));
  if (await bettingRound(players, 1)) return showdown(deal.board.flop.concat([deal.board.turn!]), deal.players, players);

  // RIVER — Player 2 acts first
  resetStreet(players);
  console.log('--- RIVER ---');
  const board5 = deal.board.flop.concat([deal.board.turn!, deal.board.river!]);
  console.log(cardsStr(board5));
  await bettingRound(players, 1);

  // SHOWDOWN
  return showdown(board5, deal.players, players);
}

function showdown(board: Card[], hole: Card[][], players: P[]) {
  console.log('--- SHOWDOWN (Pot ' + (players[0].commit + players[1].commit) + ') ---');
  const { results, winners } = evaluateHoldem(hole, board);
  results.forEach(r=>{
    console.log(players[r.index].name + ': ' + cardsStr(r.bestFive) + '  → ' + scoreToString(r.score));
  });
  const winnerIdxs = winners.map(w=>w.index);
  if (winnerIdxs.length === 1) {
    console.log('Winner: ' + players[winnerIdxs[0]].name + ' wins ' + (players[0].commit + players[1].commit));
    players[winnerIdxs[0]].stack += (players[0].commit + players[1].commit);
  } else {
    const pot = players[0].commit + players[1].commit;
    const each = Math.floor(pot / winnerIdxs.length);
    console.log('Split pot: ' + winnerIdxs.map(i=>players[i].name).join(' & ') + ' win ' + each + ' each');
    for (const i of winnerIdxs) players[i].stack += each;
  }
  console.log('\nFinal stacks:', players.map(p=>p.stack));
  rl.close();
}

main().catch(e=>{ console.error(e); rl.close(); });
