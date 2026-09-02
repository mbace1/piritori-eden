#!/usr/bin/env node
/**
 * rig-vectors.mjs — the gate that makes shared animation clips safe.
 *
 *   node port/rig-vectors.mjs           write port/vectors/rigs.json
 *   node port/rig-vectors.mjs --check   fail if the catalogue drifted
 *
 * WHY THIS EXISTS. `godot/scenes/battle_stage_3d.gd`'s `CLIPS` table plays
 * ONE body's four fight clips — the muscle's idle/attack/behit/dead — on
 * EVERY fighter, lifting the animation onto whatever rig was loaded. That is
 * a deliberate, sound choice (Meshy rigs come out near-identical, so buying
 * four clips per role would be paying repeatedly for the same motion), and
 * `web/js/v3/render3d.js` now does the same thing. But it was never checked:
 * nothing asserted the rigs actually match, it simply worked, and a single
 * mismatched skeleton would have produced a fighter frozen mid-T-pose while
 * everyone else moved — the kind of failure that reads as "the 3D is broken"
 * rather than "one asset regressed".
 *
 * Measured 2026-09-02: 13 of 14 cast bodies carry an IDENTICAL 24-joint
 * skeleton (`Hips`, `LeftUpLeg`, `LeftLeg`, `LeftFoot`, `LeftToeBase`, ...) —
 * so the shared-clip approach is safe by construction, not by luck. This
 * pins that fact so the next mesh PR cannot quietly break it.
 *
 * THE ONE EXCEPTION, and it is a real defect rather than a tolerance:
 * `parka-man-v01.glb` has NO SKIN AND NO SKELETON. It cannot be animated at
 * all. It is in `UNIT_VARIANTS["hired"]`, so roughly one hired crew member in
 * four currently gets a body that will stand still while the other three
 * fight. `PORTING.md` §6's intake list already requires "it is rigged, and
 * the skeleton is measurable" — this asset predates that check being applied.
 * Recorded in `QUEUE.md`; this gate names it explicitly rather than failing
 * on it, so the suite stays green while the fact stays visible.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const OUT = resolve(here, 'vectors/rigs.json');

/** The clip source every fighter borrows from — must match battle_stage_3d.gd's
 *  CLIPS table and render3d.js's CLIP_SOURCES. */
const CLIP_REF = 'art/v3/cast3d/clips/muscle-idle-v01.glb';

/** Known unrigged, and why. Listed rather than silently skipped. */
const UNRIGGED_KNOWN = {
  'parka-man': 'no skin/skeleton in the GLB; cannot be animated. In the live ' +
    'hired variant pool, so ~1 hired crew in 4 gets a body that will not move. ' +
    'Violates PORTING.md §6 "it is rigged, and the skeleton is measurable".',
};

function jointNames(relPath) {
  const d = readFileSync(resolve(root, relPath));
  const jsonLen = d.readUInt32LE(12);
  const gltf = JSON.parse(d.subarray(20, 20 + jsonLen).toString('utf8'));
  const skin = (gltf.skins ?? [])[0];
  if (!skin) return null;
  return (skin.joints ?? []).map(i => gltf.nodes[i]?.name ?? '?');
}

const CAST = [
  'driver', 'enforcer', 'fixer', 'hired-b', 'hired', 'jaska', 'local',
  'muscle', 'parka-man', 'runner', 'street-raver', 'suited-man', 'toko',
  'watcher',
];

const ref = jointNames(CLIP_REF);
if (!ref) {
  console.error(`FAIL: the clip source ${CLIP_REF} has no skeleton at all.`);
  process.exit(1);
}

const rigs = {};
const unrigged = [];
for (const name of CAST) {
  const names = jointNames(`art/v3/cast3d/${name}-v01.glb`);
  if (!names) { unrigged.push(name); continue; }
  rigs[name] = names.slice().sort();
}

const doc = {
  generated_by: 'port/rig-vectors.mjs',
  note: 'Joint names per cast body, sorted. Every rigged body must carry the ' +
    'SAME set as the shared clip source, or lifting that clip onto it plays ' +
    'nothing. See this file\'s generator for why shared clips are the design.',
  clip_source: CLIP_REF,
  clip_source_joints: ref.slice().sort(),
  unrigged_known: UNRIGGED_KNOWN,
  rigs,
};

const isCheck = process.argv.includes('--check');
const json = JSON.stringify(doc, null, 2) + '\n';

// The real assertion, run in BOTH modes — a fixture that only compares itself
// to itself proves nothing (people/roster.mjs's own header makes this point).
let failures = 0;
const refSet = new Set(ref);
for (const [name, names] of Object.entries(rigs)) {
  const missing = ref.filter(j => !names.includes(j));
  const extra = names.filter(j => !refSet.has(j));
  if (missing.length || extra.length) {
    failures += 1;
    console.error(`  FAIL ${name}: ${missing.length} joint(s) the clip needs ` +
      `and this rig lacks${missing.length ? ` (${missing.slice(0, 4).join(', ')})` : ''}` +
      `, ${extra.length} extra`);
  }
}
for (const name of unrigged) {
  if (UNRIGGED_KNOWN[name]) {
    console.log(`  note ${name}: unrigged, known — ${UNRIGGED_KNOWN[name].split('.')[0]}.`);
  } else {
    failures += 1;
    console.error(`  FAIL ${name}: no skeleton, and not in UNRIGGED_KNOWN. ` +
      `A new unrigged body cannot play the shared fight clips.`);
  }
}

if (failures) {
  console.error(`\nrig vectors: ${failures} body(s) cannot take the shared clips.`);
  process.exit(1);
}

if (isCheck) {
  if (!existsSync(OUT)) {
    console.error(`DRIFT: ${OUT} does not exist. Run: node port/rig-vectors.mjs`);
    process.exit(1);
  }
  if (readFileSync(OUT, 'utf8') !== json) {
    console.error('DRIFT: the cast\'s skeletons changed. Run: node port/rig-vectors.mjs');
    process.exit(1);
  }
  console.log(`rig vectors: ${Object.keys(rigs).length} rigged bodies all carry ` +
    `the clip source's ${ref.length} joints; ${unrigged.length} known unrigged.`);
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, json);
  console.log(`wrote ${basename(OUT)} — ${Object.keys(rigs).length} rigged bodies, ` +
    `${unrigged.length} unrigged, ${ref.length} joints each.`);
}
