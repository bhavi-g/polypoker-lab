// src/cli/play_variant.ts
import { runTable } from '../engine/table';
import { TexasStrategy } from '../variants/texas_strategy';
import { OmahaStrategy } from '../variants/omaha_strategy';

async function main() {
  // Choose via CLI arg only, default to Texas.
  // Examples:
  //   npm run play:variant -- 1    -> Texas
  //   npm run play:variant -- 2    -> Omaha
  // If no arg, default to '1' (Texas).
  const arg = (process.argv[2] || '1').trim();
  const choice = arg[0] === '2' ? '2' : '1';

  if (choice === '2') {
    console.log('\nStarting Omaha (High)…\n');
    await runTable(OmahaStrategy);
  } else {
    console.log('\nStarting Texas Hold’em…\n');
    await runTable(TexasStrategy);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
