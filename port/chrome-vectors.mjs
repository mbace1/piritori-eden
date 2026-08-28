#!/usr/bin/env node
/**
 * Chrome vectors — the reverse direction from `port/vectors.mjs`.
 *
 * Every other vector in this repo travels JS -> Godot: the JS model is
 * canonical, and the Godot side re-implements it. Chrome runs backwards —
 * `godot/ui/chrome.gd` is the source, and `web/js/v3/chrome.js` is the port
 * (owner ruling 2026-08-28, `PORTING.md` §3.3 exception) — but the reason
 * for a fixture is identical: a re-implementation is exactly where two
 * builds silently stop agreeing, and Godot's UI is still WIP. `chrome.gd`
 * has moved three times in three commits already; nothing stops a fourth.
 *
 *   node godot/tools/chrome-dump.gd    (via headless Godot — regenerates the fixture)
 *   node port/chrome-vectors.mjs --check    fail if chrome.js has drifted from it
 *
 * This does NOT catch chrome.gd changing without a re-dump — that half still
 * needs a human (or a future CI step) to notice `godot/ui/chrome.gd` moved
 * and re-run `godot/tools/chrome-dump.gd`. What this catches is chrome.js
 * drifting from whatever the fixture currently says, which is the half that
 * silently rotted twice already (the 64-bit hash, the float-space rounding,
 * the floor-not-round quantisation) before anything checked it at all.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { paintPixels } from '../web/js/v3/chrome.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, 'vectors', 'chrome.json');
const check = process.argv.includes('--check');

const CARD = '#12181b';
const CARTON = '#cfc4ab';

// Same (kind, base, accent, tornTop, tornBottom) tuples chrome-dump.gd feeds
// PiritoriChrome._paint() with — keep the two lists in sync by hand; there is
// no way to share them across GDScript and JS.
const KINDS = [
  { label: 'panel', kind: 'panel', base: CARD, accent: '#a62bff', tt: true, tb: true },
  { label: 'btn', kind: 'btn', base: CARD, accent: '#9a4e34', tt: false, tb: false },
  { label: 'bar', kind: 'bar', base: CARD, accent: '#8a7355', tt: true, tb: false },
  { label: 'plate', kind: 'plate', base: CARTON, accent: '#16191b', tt: true, tb: true },
  { label: 'plateBtn', kind: 'plateBtn', base: CARTON, accent: '#4f7fa0', tt: false, tb: true },
];

function toHex(data) {
  let out = '';
  for (let i = 0; i < data.length; i++) out += data[i].toString(16).padStart(2, '0');
  return out;
}

function diffFirst(a, b) {
  for (let i = 0; i < a.length; i += 2) {
    if (a.slice(i, i + 2) !== b.slice(i, i + 2)) {
      const px = Math.floor(i / 2 / 4);
      const x = px % 64, y = Math.floor(px / 64);
      return { x, y, expected: a.slice(i, i + 2), got: b.slice(i, i + 2) };
    }
  }
  return null;
}

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
let failed = 0;
for (const spec of KINDS) {
  const { data } = paintPixels(spec.kind, spec.base, spec.accent, spec.tt, spec.tb);
  const got = toHex(data);
  const expected = fixture.kinds[spec.label];
  if (!expected) {
    console.log(`  MISSING  ${spec.label}  no row in port/vectors/chrome.json`);
    failed++;
    continue;
  }
  if (got !== expected) {
    const d = diffFirst(expected, got);
    console.log(`  DRIFT    ${spec.label}  first mismatch at (${d.x},${d.y}): fixture=${d.expected} chrome.js=${d.got}`);
    failed++;
  } else {
    console.log(`  ok       ${spec.label}  4096 px identical`);
  }
}

if (failed) {
  console.log(`\nchrome vectors: ${failed} of ${KINDS.length} kinds drifted from port/vectors/chrome.json.`);
  console.log('Either web/js/v3/chrome.js needs fixing, or chrome.gd changed and the');
  console.log('fixture is stale — re-run godot/tools/chrome-dump.gd and look at what moved');
  console.log('before assuming chrome.js is wrong.');
  process.exit(1);
} else {
  console.log(`\nchrome vectors: all ${KINDS.length} kinds match port/vectors/chrome.json.`);
  if (!check) console.log('(run with --check in CI/gates; this run already checked)');
}
