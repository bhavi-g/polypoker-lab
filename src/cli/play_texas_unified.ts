import { runTable } from '../engine/table';
import { TexasStrategy } from '../variants/texas_strategy';

runTable(TexasStrategy).catch(e => { console.error(e); process.exit(1); });
