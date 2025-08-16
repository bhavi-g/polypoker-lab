// src/engine/table.ts
import readline from 'readline';
import type { Card } from '../core/card';
import type { VariantStrategy } from './variant';

// OPTIONAL telemetry (safe observers; no behavior changes)
import * as T from './telemetry';

type Action = 'fold'|'check'|'call'|'raise'|'bet'|'leave'|'allin';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q:string)=> new Promise<string>(res=> rl.question(q, res));
const pause = async ()=>{ await ask('↵ Enter to continue...'); };
const r2 = (n:number)=> Math.round(n*100)/100;

export interface PlayerState {
  id: string;
  name: string;
  stack: number;
  inHand: boolean;
  streetCommit: number;
  totalCommit: number;
  hole: Card[];
  leaving: boolean;
}

function cardStr(c: Card){ return String(c.rank) + String(c.suit); }
function cardsStr(cs: Card[]){ return cs.map(cardStr).join(' '); }
function totalPot(players:PlayerState[]) { return r2(players.reduce((s,p)=>s+p.totalCommit,0)); }
function post(p:PlayerState, amt:number){
  const use = Math.min(amt, p.stack);
  p.stack = r2(p.stack - use);
  p.streetCommit = r2(p.streetCommit + use);
  p.totalCommit = r2(p.totalCommit + use);
}
function leftOf(i:number, n:number){ return (i+1)%n; }
function rotateFrom(start:number, n:number){ return Array.from({length:n}, (_,k)=>(start+k)%n); }
function isAllIn(p:PlayerState){ return p.stack<=0; }

function blindsFor(dealer:number, n:number){
  if (n === 2){ const sb = dealer; const bb = 1 - dealer; return { sb, bb }; }
  const sb = (dealer + 1) % n;
  const bb = (dealer + 2) % n;
  return { sb, bb };
}

function buildSidePots(players: PlayerState[]): { amount: number, eligIdx: number[] }[] {
  const levels = Array.from(new Set(players.map(p=>p.totalCommit).filter(a=>a>0))).sort((a,b)=>a-b);
  if (levels.length === 0) return [];
  const pots: { amount:number, eligIdx:number[] }[] = [];
  let prev = 0;
  for (const lvl of levels){
    const layer = players.map((p,i)=>({
      i,
      pay: Math.max(0, Math.min(p.totalCommit, lvl) - prev),
      eligible: p.inHand && p.totalCommit >= lvl
    }));
    const amount = r2(layer.reduce((s,c)=> s + c.pay, 0));
    if (amount > 0){
      const eligIdx = layer.filter(c=>c.eligible).map(c=>c.i);
      pots.push({ amount, eligIdx });
    }
    prev = lvl;
  }
  return pots;
}

// compare two 6-tuple scores (your eval format)
function betterScore(a:number[], b:number[]){ for (let i=0;i<6;i++){ if (a[i]!==b[i]) return a[i]>b[i]; } return false; }

function distributeOddCents(amount:number, winners:number[], dealerIdx:number, players:PlayerState[]){
  let cents = Math.round(amount*100);
  if (cents<=0 || winners.length===0) return;
  const order: number[] = [];
  for (let step=1; step<=players.length; step++){
    const seat = (dealerIdx + step) % players.length;
    if (winners.includes(seat)) order.push(seat);
  }
  let ptr = 0;
  while (cents > 0){
    const seat = order[ptr % order.length];
    players[seat].stack = r2(players[seat].stack + 0.01);
    cents -= 1;
    ptr++;
  }
}

async function bettingRound(
  players:PlayerState[],
  first:number,
  BB:number,
  raiseCap:number
): Promise<{ended:boolean, lastAgg:number|null, currentBet:number}> {
  const n = players.length;
  let currentBet = Math.max(...players.map(p=>p.streetCommit));
  let lastRaiseSize = BB;
  let raisesUsed = 0;
  const unlimited = raiseCap === 0;
  let lastAgg: number|null = null;

  const awaiting = new Set<number>();
  const aliveIdxs = players.map((p,i)=> p.inHand ? i : -1).filter(i=>i>=0);
  const addAwaitingAll = (except?:number)=>{
    awaiting.clear();
    for (const i of aliveIdxs) if (i!==except && !isAllIn(players[i])) awaiting.add(i);
  };
  if (currentBet===0) addAwaitingAll(); else {
    for (const i of aliveIdxs) if (!isAllIn(players[i]) && players[i].streetCommit<currentBet) awaiting.add(i);
  }
  const canRaiseNow = () => (unlimited || (raisesUsed < raiseCap));
  let order = rotateFrom(first, n);
  let ptr = 0;
  let safety = 8000;

  while (safety-- > 0) {
    const seat = order[ptr % n]; ptr++;
    if (!players[seat].inHand || isAllIn(players[seat])) { awaiting.delete(seat); if (awaiting.size===0) break; continue; }
    if (players.filter(p=>p.inHand).length===1) return { ended:true, lastAgg, currentBet };

    const me = players[seat];
    const need = r2(currentBet - me.streetCommit);
    if (awaiting.size===0) break;

    let head: Action[];
    if (need <= 0){
      head = (canRaiseNow() && me.stack > 0) ? (['check','bet','allin'] as Action[]) : (['check'] as Action[]);
    } else {
      if (me.stack > need){
        head = (canRaiseNow() && me.stack > need) ? (['fold','call','raise','allin'] as Action[]) : (['fold','call','allin'] as Action[]);
      } else if (Math.abs(me.stack - need) < 1e-9){
        head = ['fold','call','allin'] as Action[];
      } else {
        head = ['fold','allin'] as Action[];
      }
    }
    const opts: Action[] = [...head, 'leave'];
    const minRaiseTo = (currentBet===0? BB : r2(currentBet + Math.max(BB,lastRaiseSize)));

    console.log('\nTotal Pot: ' + totalPot(players));
    console.log('Stacks: ' + players.map((p)=> (p.inHand? `${p.name}=${p.stack}` : `${p.name}=—`)).join(' | '));
    console.log('This street: ' + players.map(p=> `${p.name}=${p.streetCommit}`).join(' | '));
    console.log(`Current bet: ${currentBet}  |  To call: ${need>0?need:0}  |  Min raise to: ${minRaiseTo}`);
    console.log(`Your turn: ${me.name}  |  Your cards: ${cardsStr(me.hole)}`);
    const raw = (await ask('Choose ['+opts.join('/')+'] (tip: "bet 40" / "raise 120"): ')).trim().toLowerCase();
    if (!raw){ ptr--; continue; }

    const parts = raw.split(/\s+/);
    const base = parts[0] as Action;
    const amtInline = parts[1] !== undefined ? Number(parts[1]) : NaN;
    if (!opts.includes(base)) { console.log('Invalid option.'); ptr--; continue; }

    const doFold = async ()=>{ me.inHand=false; awaiting.delete(seat); console.log(`${me.name} folds.`); await pause(); };
    const doCheck = async ()=>{ if (need>0){ console.log('Cannot check facing a bet.'); ptr--; return false; } console.log(`${me.name} checks.`); awaiting.delete(seat); await pause(); return true; };
    const doCall = async ()=>{
      const pay = Math.min(Math.max(0,currentBet - me.streetCommit), me.stack);
      if (pay <= 0) { console.log('Nothing to call.'); ptr--; return false; }
      post(me, pay);
      if (me.streetCommit < currentBet) console.log(`${me.name} calls all-in for ${r2(pay)} (short).`);
      else                               console.log(`${me.name} calls ${r2(pay)}.`);
      awaiting.delete(seat);
      await pause();
      return true;
    };
    const doAllIn = async ()=>{
      const target = r2(me.streetCommit + me.stack);
      const delta = r2(target - me.streetCommit);
      if (delta<=0){ console.log('You have no chips.'); ptr--; return false; }
      const wasRaise = target > currentBet;
      const raiseSize = r2(target - currentBet);
      post(me, delta);
      if (wasRaise){
        if (raiseSize >= Math.max(BB, lastRaiseSize)-1e-9){
          currentBet = target; lastRaiseSize = raiseSize; raisesUsed++; lastAgg = seat;
          const except = seat; awaiting.clear();
          for (const i of aliveIdxs) if (i!==except && !isAllIn(players[i])) awaiting.add(i);
          console.log(`${me.name} goes all-in to ${target} (FULL raise, size ${raiseSize}).`);
        } else {
          currentBet = target; awaiting.delete(seat);
          console.log(`${me.name} goes all-in to ${target} (NOT a full raise).`);
        }
      } else {
        awaiting.delete(seat);
        if (me.streetCommit < currentBet) console.log(`${me.name} calls all-in for ${delta} (short).`);
        else                               console.log(`${me.name} goes all-in (no raise).`);
      }
      await pause();
      return true;
    };

    const minOpen = (currentBet===0) ? BB : r2(currentBet + Math.max(BB, lastRaiseSize));

    if (base==='leave'){ await doFold(); (me as any).leaving = true; if (players.filter(p=>p.inHand).length===1) return {ended:true,lastAgg,currentBet}; continue; }
    if (base==='fold'){ await doFold(); if (players.filter(p=>p.inHand).length===1) return {ended:true,lastAgg,currentBet}; continue; }
    if (base==='check'){ await doCheck(); continue; }
    if (base==='call'){ await doCall(); continue; }
    if (base==='allin'){ await doAllIn(); continue; }

    if (base==='bet'){
      if (currentBet!==0){ console.log('Use raise, not bet.'); ptr--; continue; }
      let to:number = Number.isFinite(amtInline) ? Number(amtInline) : Number(await ask(`Enter bet amount (min ${minOpen}): `));
      if (!Number.isFinite(to) || to < minOpen-1e-9){ console.log(`Invalid. Min bet is ${minOpen}.`); ptr--; continue; }
      to = r2(to);
      const add = r2(to - me.streetCommit);
      if (add > me.stack+1e-9){ console.log('Not enough chips.'); ptr--; continue; }
      post(me, add);
      lastRaiseSize = to; currentBet = to; raisesUsed++; lastAgg = seat;
      const except = seat; awaiting.clear();
      for (const i of aliveIdxs) if (i!==except && !isAllIn(players[i])) awaiting.add(i);
      console.log(`${me.name} bets ${to}.`);
      await pause(); continue;
    }

    if (base==='raise'){
      if (currentBet===0){ console.log('Nothing to raise. Use bet.'); ptr--; continue; }
      let to:number = Number.isFinite(amtInline) ? Number(amtInline) : Number(await ask(`Enter raise amount (min ${minOpen}): `));
      if (!Number.isFinite(to) || to < minOpen-1e-9){ console.log(`Invalid. Min raise is to ${minOpen}.`); ptr--; continue; }
      to = r2(to);
      const add = r2(to - me.streetCommit);
      if (add <= 0){ console.log('Raise must increase your contribution.'); ptr--; continue; }
      if (add > me.stack+1e-9){ console.log('Not enough chips.'); ptr--; continue; }
      post(me, add);
      const raiseSize = r2(to - currentBet);
      lastRaiseSize = raiseSize; currentBet = to; raisesUsed++; lastAgg = seat;
      const except = seat; awaiting.clear();
      for (const i of aliveIdxs) if (i!==except && !isAllIn(players[i])) awaiting.add(i);
      console.log(`${me.name} raises to ${to} (raise size ${raiseSize}).`);
      await pause(); continue;
    }
  }

  return { ended:false, lastAgg, currentBet };
}

function resetStreet(players:PlayerState[]){ players.forEach(p=> p.streetCommit = 0); }

function awardByFold(players:PlayerState[]){
  const aliveIdx = players.findIndex(p=>p.inHand);
  const pot = totalPot(players);
  console.log(`\nEveryone folded. ${players[aliveIdx].name} wins ${pot}.`);
  players[aliveIdx].stack = r2(players[aliveIdx].stack + pot);
  console.log('Stacks:', players.map(p=>p.stack));
}

function showdownWithSidePots(
  board5: Card[],
  tablePlayers: PlayerState[],
  holes: Card[][],
  dealerIdx:number,
  riverAgg:number|null,
  strategy: VariantStrategy
) {
  const survivorsIdx = tablePlayers.map((p, i)=> p.inHand ? i : -1).filter(i=>i>=0);
  if (survivorsIdx.length === 0) return;
  const pots = buildSidePots(tablePlayers);
  if (pots.length === 0) return;

  // showdown order
  let showStartIdx: number;
  if (riverAgg!==null && tablePlayers[riverAgg]?.inHand){
    showStartIdx = riverAgg;
  } else {
    let idx = leftOf(dealerIdx, tablePlayers.length);
    while (!tablePlayers[idx].inHand) idx = leftOf(idx, tablePlayers.length);
    showStartIdx = idx;
  }
  const showOrder: number[] = [];
  for (let k=0;k<tablePlayers.length;k++){
    const seat = (showStartIdx + k) % tablePlayers.length;
    if (tablePlayers[seat].inHand) showOrder.push(seat);
  }

  const evalAll = strategy.evaluate(survivorsIdx.map(i=>holes[i]), board5);

  console.log('\n--- SHOWDOWN ---');
  console.log('Showdown order: ' + showOrder.map(i=>tablePlayers[i].name).join(' → '));
  for (const seat of showOrder){
    const posInEval = survivorsIdx.indexOf(seat);
    const res = evalAll.results[posInEval];
    console.log(`${tablePlayers[seat].name}: ${res.bestFive.map(cardStr).join(' ')}  → ${strategy.prettyScore(res.score)}`);
    // telemetry: reveal shown hand
    T.showPlayer(tablePlayers[seat].name, res.bestFive, strategy.prettyScore(res.score));
  }

  pots.forEach((pot, k)=>{
    const eligPositions = pot.eligIdx
      .map(tidx => ({ tableIdx: tidx, pos: survivorsIdx.indexOf(tidx) }))
      .filter(x => x.pos !== -1);

    if (eligPositions.length === 0 || pot.amount <= 0) return;

    let bestPos = [eligPositions[0].pos];
    let bestScore = evalAll.results[eligPositions[0].pos].score;
    for (const {pos} of eligPositions.slice(1)){
      const s = evalAll.results[pos].score;
      if (betterScore(s, bestScore)) { bestScore = s; bestPos = [pos]; }
      else if (!betterScore(bestScore, s)) { bestPos.push(pos); }
    }

    const winnerTableIdxs = bestPos.map(p => survivorsIdx[p]);
    const rawEach = pot.amount / winnerTableIdxs.length;
    const each = r2(Math.floor(rawEach*100)/100);
    const evenPaid = r2(each * winnerTableIdxs.length);
    const remainder = r2(pot.amount - evenPaid);

    if (winnerTableIdxs.length === 1) {
      console.log(`Pot ${k+1} (${pot.amount}) → ${tablePlayers[winnerTableIdxs[0]].name}`);
    } else {
      console.log(`Pot ${k+1} (${pot.amount}) split → ${winnerTableIdxs.map(i=>tablePlayers[i].name).join(' & ')} (${each} each, odd cents left of dealer)`);
    }
    for (const i of winnerTableIdxs) tablePlayers[i].stack = r2(tablePlayers[i].stack + each);
    if (remainder > 0) distributeOddCents(remainder, winnerTableIdxs, dealerIdx, tablePlayers);

    // telemetry: pot award
    T.awardPot(k+1, pot.amount, winnerTableIdxs.map(i=>tablePlayers[i].name));
  });

  console.log('Stacks:', tablePlayers.map(p=>p.stack));
}

function sanitizeName(existing:PlayerState[], base:string){
  let name = base.trim() || 'Player';
  const names = new Set(existing.map(p=>p.name));
  if (!names.has(name)) return name;
  let i=2; while (names.has(`${name} ${i}`)) i++; return `${name} ${i}`;
}

export async function runTable(strategy: VariantStrategy){
  // setup
  let nPlayers = 0;
  while (nPlayers < strategy.minPlayers || nPlayers > strategy.maxPlayers) {
    const s = await ask(`Enter number of players (${strategy.minPlayers}–${strategy.maxPlayers}): `);
    nPlayers = Number(s);
  }
  const buyInStr = await ask('Table buy-in (default 100): ');
  const tableBuyIn = Number(buyInStr) > 0 ? Number(buyInStr) : 100;
  const sbStr = await ask('Small Blind amount (default 1): ');
  const bbStr = await ask('Big Blind amount (default 2): ');
  const anteStr = await ask('Ante amount per player (0 = none, default 0): ');
  const capStr = await ask('Max raises per street (0 = unlimited, default 0): ');

  const SB = Number(sbStr) > 0 ? Number(sbStr) : 1;
  const BB = Number(bbStr) > 0 ? Number(bbStr) : 2;
  const ANTE = Number(anteStr) >= 0 ? Number(anteStr) : 0;
  const raiseCap = Number(capStr) >= 0 ? Number(capStr) : 0;

  let players: PlayerState[] = Array.from({length:nPlayers}, (_,i)=>({
    id: 'P'+Math.random().toString(36).slice(2,8),
    name: 'Player ' + (i+1),
    stack: tableBuyIn,
    inHand: true,
    streetCommit: 0,
    totalCommit: 0,
    hole: [],
    leaving: false
  }));

  console.log(`\nTable Mode: ${strategy.name}`);
  console.log(`Table buy-in: ${tableBuyIn} | Ante=${ANTE} | SB=${SB} | BB=${BB} | Raise cap=${raiseCap===0?'unlimited':raiseCap}`);
  console.log('House rules: NLHE min-raise, short all-ins don’t reopen, side pots, showdown order, join/leave, rebuys.\n');

  let dealerRef = { idx: 0 };

  while (true) {
    if (players.filter(p=>p.stack>0).length < 2 && players.length >= 2) {
      console.log('\nGame stops (not enough chips in play).');
      break;
    }

    // prepare a hand
    players.forEach(p=>{ p.inHand = p.stack>0; p.streetCommit=0; p.totalCommit=0; p.leaving = p.leaving || false; });

    const n = players.length;
    const { sb, bb } = blindsFor(dealerRef.idx, n);
    const deal = strategy.deal(n);
    for (let i=0;i<n;i++) players[i].hole = deal.players[i];

    console.log('\n========================================');
    console.log(`New hand. Dealer: ${players[dealerRef.idx].name}  (Antes + Blinds posted)`);
    console.log('========================================');

    // telemetry: start hand
    T.startHand(players[dealerRef.idx].name, SB, BB, ANTE);

    if (ANTE > 0){
      for (const p of players) if (p.stack>0) { post(p, ANTE); T.postBlindOrAnte(p.name, ANTE, 'ante'); }
      console.log(`Antes: ${ANTE} from each`);
    }
    post(players[sb], Math.min(SB, players[sb].stack)); T.postBlindOrAnte(players[sb].name, SB, 'sb');
    post(players[bb], Math.min(BB, players[bb].stack)); T.postBlindOrAnte(players[bb].name, BB, 'bb');
    console.log(`Forced bets: ${players[sb].name}=${SB}, ${players[bb].name}=${BB}`);
    await pause();

    const firstPre  = (n===2) ? dealerRef.idx : leftOf(bb, n);
    const firstPost = leftOf(dealerRef.idx, n);

    // PREFLOP
    T.street('preflop');
    T.snapshot(strategy.name, players[dealerRef.idx].name, players, { flop: [] }, 0);
    let br = await bettingRound(players, firstPre, BB, raiseCap);
    if (br.ended) { awardByFold(players); T.endHand(); await betweenHands(); continue; }

    // FLOP
    resetStreet(players);
    console.log('\n--- FLOP ---');
    console.log(deal.board.flop.map(cardStr).join(' '));
    T.street('flop'); T.boardFlop(deal.board.flop);
    T.snapshot(strategy.name, players[dealerRef.idx].name, players, { flop: deal.board.flop }, br.currentBet);
    br = await bettingRound(players, firstPost, BB, raiseCap);
    if (br.ended) { awardByFold(players); T.endHand(); await betweenHands(); continue; }

    // TURN
    resetStreet(players);
    console.log('\n--- TURN ---');
    const boardTurn = [...deal.board.flop, deal.board.turn!];
    console.log(boardTurn.map(cardStr).join(' '));
    T.street('turn'); T.boardTurn(deal.board.turn!, deal.board.flop);
    T.snapshot(strategy.name, players[dealerRef.idx].name, players, { flop: deal.board.flop, turn: deal.board.turn }, br.currentBet);
    br = await bettingRound(players, firstPost, BB, raiseCap);
    if (br.ended) { awardByFold(players); T.endHand(); await betweenHands(); continue; }

    // RIVER
    resetStreet(players);
    console.log('\n--- RIVER ---');
    const board5 = [...deal.board.flop, deal.board.turn!, deal.board.river!];
    console.log(board5.map(cardStr).join(' '));
    T.street('river'); T.boardRiver(deal.board.flop, deal.board.turn!, deal.board.river!);
    const riverBR = await bettingRound(players, firstPost, BB, raiseCap);
    T.snapshot(strategy.name, players[dealerRef.idx].name, players, { flop: deal.board.flop, turn: deal.board.turn, river: deal.board.river }, riverBR.currentBet);

    // SHOWDOWN
    showdownWithSidePots(board5, players, deal.players, dealerRef.idx, riverBR.lastAgg, strategy);
    T.endHand();

    await betweenHands();

    // post-hand lobby
    const lobby = await postHandLobby(players, dealerRef, tableBuyIn);
    players = lobby.table;
    if (!lobby.continue) break;

    dealerRef.idx = leftOf(dealerRef.idx, players.length);
  }

  console.log('\nSession complete. Final stacks:', players.map(p=>`${p.name}=${p.stack}`));
  rl.close();

  async function betweenHands(){}

  async function postHandLobby(players0: PlayerState[], dealerRef0:{idx:number}, tableBuyIn:number){
    let table = players0.filter(p=>!p.leaving);
    console.log('\n--- Between hands ---');
    console.log('Current players: ' + table.map(p=>`${p.name}(${p.stack})`).join(', '));
    console.log(`Table buy-in for new players & rebuys: ${tableBuyIn}`);

    const leaveAns = (await ask('Anyone leaving? (names comma-separated, Enter=none): ')).trim();
    if (leaveAns){
      const names = leaveAns.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
      table = table.filter(p => !names.includes(p.name.toLowerCase()));
    }
    for (const p of table){
      if (p.stack <= 0){
        const rb = (await ask(`Rebuy for ${p.name}? (y/N): `)).trim().toLowerCase();
        if (rb==='y' || rb==='yes'){ p.stack = tableBuyIn; console.log(`  -> ${p.name} rebuys for ${tableBuyIn}`); }
      }
    }
    const canAdd = Math.max(0, 6 - table.length);
    if (canAdd>0){
      const j = (await ask(`How many joining? (0-${canAdd}): `)).trim();
      let nJoin = Number(j); if (!Number.isFinite(nJoin)||nJoin<0) nJoin=0; if (nJoin>canAdd) nJoin=canAdd;
      for (let k=0; k<nJoin; k++){
        let name = (await ask(`  Name for new player ${k+1}: `));
        name = sanitizeName(table, name);
        table.push({ id:'P'+Math.random().toString(36).slice(2,8), name, stack: tableBuyIn, inHand:true, streetCommit:0, totalCommit:0, hole:[], leaving:false });
        console.log(`  -> ${name} joins with ${tableBuyIn}`);
      }
    }
    if (table.length < 2){ console.log('\nNot enough players. Game ends.'); return { table, continue:false }; }

    const oldDealer = players0[dealerRef0.idx]?.name;
    let newDealer = table.findIndex(p=>p.name===oldDealer);
    if (newDealer===-1) newDealer = Math.min(dealerRef0.idx, table.length-1);
    dealerRef0.idx = newDealer;

    return { table, continue:true };
  }
}
