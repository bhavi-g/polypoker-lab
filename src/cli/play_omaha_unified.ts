import { runTable } from '../engine/table';
import { setGlobalSeed } from '../engine/rng';
import { OmahaStrategy } from '../variants/omaha_strategy';

const seedFlagIdx = process.argv.indexOf('--seed');
if (seedFlagIdx >= 0 && process.argv[seedFlagIdx + 1]) {
  setGlobalSeed(process.argv[seedFlagIdx + 1]);
} else if (process.env.SEED) {
  setGlobalSeed(process.env.SEED);
}

runTable(OmahaStrategy).catch(e => { console.error(e); process.exit(1); });
