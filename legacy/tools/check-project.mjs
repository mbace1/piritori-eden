import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const includeBrowser = process.argv.includes('--browser');

// Written for a three-repo sibling layout (flow-core/, piritori/, toko-move/)
// proposed in SHARED_ENGINE.md, which is explicitly "architecture intent, not
// an implementation order" — that shape never shipped. This repo flattened
// the old piritori/ folder to its own root, and flow-core/ went to Suds-Jack
// instead. Every path here was dead from the 2026-08-21 split onward; this
// script has not run since. Fixed 2026-08-28 by tracing each check to its
// real current location rather than repointing blindly.
const checks = [
  'map/validate-map.mjs',
  'content/validate-slice.mjs',
  'legacy/test/v3-contract.mjs',
  'legacy/test/v3-state.mjs',
  'legacy/test/v3-battle.mjs',
];

if (includeBrowser) checks.push('legacy/test/v3-playthrough.cjs');

// NOT restored: 'flow-core/test/contract.mjs', 'legacy/test/fight.mjs',
// 'legacy/test/market.mjs'.
//
// fight.mjs and market.mjs test legacy/js/{fight,market,heat,narrative,
// main,palette}.js — a SEPARATE, earlier prototype, not the live v3 game.
// The only page that loads those files is
// legacy/explorations/trading-prototype/index.html; legacy/index.html loads
// only js/v3/app.js. Both test files, and the code they test, import
// ../../flow-core/{city,graph,rng}.js, which this repo does not have and was
// never meant to vendor — flow-core/ is Suds-Jack's, per SHARED_ENGINE.md.
//
// This is not a decision to make quietly. If the trading-prototype
// exploration is still wanted, it needs flow-core vendored in or ported, and
// its own place in this checklist back — not a silent removal that reads as
// "these always passed".

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
