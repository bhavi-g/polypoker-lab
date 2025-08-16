import { runTable } from '../engine/table';
import { OmahaStrategy } from '../variants/omaha_strategy';

runTable(OmahaStrategy).catch(e => { console.error(e); process.exit(1); });
