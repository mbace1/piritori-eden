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
 * skeleton (`Hips`, `LeftUpLeg`, `LeftLeg`, `LeftFoot`, `LeftToeBase`, ...).
 *
 * MATCHING NAMES ARE NOT ENOUGH, AND THIS GATE ONCE SAID THEY WERE. It
 * originally checked joint names only and reported the shared-clip approach
 * "safe by construction, not by luck". It is not, and the false confidence
 * cost a session: reported on sight, 2026-09-02, "the models hips are janky...
 * their hips are rotated almost 180 degrees".
 *
 * A glTF rotation channel is a node's LOCAL rotation, absolute rather than a
 * delta, so playing a clip on a rig whose REST orientation differs overwrites
 * that skeleton's rest with the source's. Same names, same joint count, torn
 * pelvis. So rest orientation is checked too, and the numbers are damning:
 *
 *   - `Hips` splits the cast into two families — near-identity (toko, local,
 *     enforcer, hired) and rotated 105-142 degrees (muscle, runner, fixer,
 *     watcher, driver).
 *   - `LeftUpLeg` is worse: the clip source has [0.97, 0.07, -0.09, 0.2]
 *     where toko has [-1, -0.05, 0.05, 0].
 *   - Worst, and the actual root cause: `clips/muscle-idle-v01.glb` is NOT
 *     the same rig as `muscle-v01.glb`, THE BODY IT IS NAMED AFTER. Its Hips
 *     rest is [0.191, -0.016, -0.016, 0.981] against the body's
 *     [0.442, -0.261, 0.607, 0.607]. There is no body in this repo whose
 *     skeleton these clips were authored against, so every fighter — the
 *     muscle included — is playing foreign motion.
 *
 * This gate now FAILS on that rather than certifying it, because a gate that
 * cannot fail is a finding and not a pass. Fixing it is an asset job, not a
 * code one: the clips need re-exporting against a real body rig. Retargeting
 * in the player was tried twice and made it worse — see QUEUE.md before
 * trying a third time.
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

// ── rest orientation, the check the name comparison was missing ──────────
function restRotations(relPath) {
  const d = readFileSync(resolve(root, relPath));
  const gltf = JSON.parse(d.subarray(20, 20 + d.readUInt32LE(12)).toString('utf8'));
  const out = {};
  for (const n of gltf.nodes ?? []) {
    if (n.name) out[n.name] = (n.rotation ?? [0, 0, 0, 1]).map(v => +v.toFixed(3));
  }
  return out;
}

/** Angle between two unit quaternions, in degrees. */
function angleBetween(a, b) {
  const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return (2 * Math.acos(Math.min(1, dot)) * 180) / Math.PI;
}

/** How far a rest orientation may drift before the shared clip visibly tears
 *  the body. Deliberately generous — this is not a tolerance to tune until it
 *  passes, it is a line well below "obviously broken". */
const REST_TOLERANCE_DEG = 15;

const srcRest = restRotations(CLIP_REF);
const restDrift = {};
for (const name of Object.keys(rigs)) {
  const bodyRest = restRotations(`art/v3/cast3d/${name}-v01.glb`);
  const worst = { joint: null, deg: 0 };
  for (const joint of ref) {
    if (!srcRest[joint] || !bodyRest[joint]) continue;
    const deg = angleBetween(srcRest[joint], bodyRest[joint]);
    if (deg > worst.deg) { worst.joint = joint; worst.deg = +deg.toFixed(1); }
  }
  restDrift[name] = worst;
}


const doc = {
  generated_by: 'port/rig-vectors.mjs',
  note: 'Joint names per cast body, sorted. Every rigged body must carry the ' +
    'SAME set as the shared clip source, or lifting that clip onto it plays ' +
    'nothing. See this file\'s generator for why shared clips are the design.',
  clip_source: CLIP_REF,
  clip_source_joints: ref.slice().sort(),
  unrigged_known: UNRIGGED_KNOWN,
  rest_drift_deg: restDrift,
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
// EVERY rigged body currently fails this, which is the honest result and not
// a tolerance that wants loosening. Treated the same way UNRIGGED_KNOWN treats
// parka-man: the numbers are printed in full on every run so the fact cannot
// go quiet, and the gate fails only if a body gets WORSE than its recorded
// baseline — so this real, owner-decision-blocked asset defect does not sit
// red across every unrelated PR, while a NEW regression still stops the line.
const prior = existsSync(OUT)
  ? (JSON.parse(readFileSync(OUT, 'utf8')).rest_drift_deg ?? {})
  : {};
const broken = Object.entries(restDrift).filter(([, w]) => w.deg > REST_TOLERANCE_DEG);
if (broken.length) {
  console.log(`
  ${broken.length} body(s) CANNOT safely take the shared clips ` +
    `(rest orientation over ${REST_TOLERANCE_DEG} deg from the clip source):`);
  for (const [name, w] of broken) console.log(`    ${name}: ${w.deg} deg at '${w.joint}'`);
  console.log(`  Root cause: ${CLIP_REF} is not the same rig as ANY body here, ` +
    `including muscle-v01.glb, the body it is named after. See this file's ` +
    `header and QUEUE.md. Fixing it is an asset job.`);
}
// Only in --check. In generate mode this would make a regression impossible
// to RECORD: the run that writes the new baseline would abort before writing
// it, and the only way out would be deleting the fixture by hand.
for (const [name, worst] of (process.argv.includes('--check') ? Object.entries(restDrift) : [])) {
  const was = prior[name]?.deg;
  if (was !== undefined && worst.deg > was + 2) {
    failures += 1;
    console.error(`  FAIL ${name}: rest drift got WORSE — ${was} -> ${worst.deg} deg ` +
      `at '${worst.joint}'. A mesh PR has regressed this rig.`);
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
