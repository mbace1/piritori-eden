import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const includeBrowser = process.argv.includes('--browser');

// This list assumed a repo shaped like SHARED_ENGINE.md's suggested seams —
// flow-core/, piritori/, toko-move/ as SIBLING folders — which is not the
// shape this repo actually took: piritori-eden became its own single-product
// repo with its content flat at the root, and flow-core/ went to the
// Suds-Jack repo instead (legacy/README.md). Every path below was still
// pointing at the old, unbuilt shape, so this gate has never run since
// v4.0 — a dead path always exits non-zero before check 2. `flow-core/`'s
// own check is dropped rather than repointed cross-repo: `legacy/` (its
// only caller here) is genuinely retired, not merely relocated.
const checks = [
  'map/validate-map.mjs',
  // --check: this script's default (no-arg) mode WRITES
  // map/kallio-transit-layer-v1.json; the gate must only ever read it, or a
  // stale commit would be silently "fixed" instead of failing the gate that
  // is supposed to catch it.
  'map/tools/build-transit-layer.mjs --check',
  'content/validate-slice.mjs',
  'web/test/v3-contract.mjs',
  'web/test/v3-state.mjs',
  'web/test/v3-battle.mjs',
  'missions/test/model.mjs',
  'market/test/model.mjs',
  // Found missing 2026-08-31: people/roster.mjs is wired into the live hiring
  // pool (crew: hiring pool, v4.21) with its own 23 passing checks, and had
  // never been added here -- the same "a gate that cannot fail is a finding"
  // shape as CLAUDE.md rule 10, just from omission rather than a dead path.
  'people/test/roster.mjs',
];

if (includeBrowser) checks.push('web/test/v3-playthrough.cjs');

for (const entry of checks) {
  const [script, ...args] = entry.split(' ');
  console.log(`\n▶ ${entry}`);
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`\nPIRITORI PROJECT OK: ${checks.length} checks passed${includeBrowser ? ', including browser playthrough' : ''}.`);
