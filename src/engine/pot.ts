export interface Pot {
  amount: number;
  eligible: Set<number>; // player indexes eligible to win this pot
}

/**
 * Build side pots from each player's committed chips this street/hand.
 * commits[i] = total chips that player i has pushed this hand (preflop..river).
 * active = players who haven't folded (they might be all-in).
 */
export function buildSidePots(commits: number[], active: Set<number>): Pot[] {
  const entries = commits
    .map((c, i) => ({ i, c }))
    .filter(e => e.c > 0)
    .sort((a, b) => a.c - b.c);

  const pots: Pot[] = [];
  let prev = 0;
  for (let k = 0; k < entries.length; k++) {
    const level = entries[k].c;
    if (level === prev) continue;
    const participants = new Set<number>();
    for (const e of entries) {
      if (e.c >= level && active.has(e.i)) participants.add(e.i);
    }
    // Everyone who has commit >= level contributes (level - prev)
    const contributors = entries.filter(e => e.c >= level);
    const layer = level - prev;
    const amount = layer * contributors.length;
    pots.push({ amount, eligible: participants });
    prev = level;
  }
  // Merge adjacent pots with identical eligible (rare but cleaner output)
  const merged: Pot[] = [];
  for (const p of pots) {
    const last = merged[merged.length - 1];
    if (last && sameSet(last.eligible, p.eligible)) last.amount += p.amount;
    else merged.push(p);
  }
  return merged;
}

function sameSet(a: Set<number>, b: Set<number>) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}
