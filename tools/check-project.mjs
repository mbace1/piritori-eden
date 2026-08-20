import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const includeBrowser = process.argv.includes('--browser');

const checks = [
  'flow-core/test/contract.mjs',
  'piritori/map/validate-map.mjs',
  'piritori/content/validate-slice.mjs',
  'piritori/test/v3-contract.mjs',
  'piritori/test/v3-state.mjs',
  'piritori/test/v3-battle.mjs',
  'piritori/test/fight.mjs',
  'piritori/test/market.mjs',
];

if (includeBrowser) checks.push('piritori/test/v3-playthrough.cjs');

for (const script of checks) {
  console.log(`\n▶ ${script}`);
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`\nPIRITORI PROJECT OK: ${checks.length} checks passed${includeBrowser ? ', including browser playthrough' : ''}.`);
