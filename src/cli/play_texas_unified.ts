import { runTable } from '../engine/table';
import { setGlobalSeed } from '../engine/rng';
import { TexasStrategy } from '../variants/texas_strategy';

// Simple flag parser for --seed 123
const seedFlagIdx = process.argv.indexOf('--seed');
if (seedFlagIdx >= 0 && process.argv[seedFlagIdx + 1]) {
  setGlobalSeed(process.argv[seedFlagIdx + 1]);
} else if (process.env.SEED) {
  setGlobalSeed(process.env.SEED);
}

(async () => {
  await runTable(TexasStrategy);
})().catch(e => { console.error(e); process.exit(1); });
