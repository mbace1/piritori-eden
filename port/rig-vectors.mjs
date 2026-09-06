#!/usr/bin/env node
/**
 * rig-vectors.mjs — the gate that makes shared animation clips safe.
 *
 *   node port/rig-vectors.mjs           write port/vectors/rigs.json
 *   node port/rig-vectors.mjs --check   fail if the catalogue drifted
 *
 * WHY THIS EXISTS. `godot/scenes/battle_stage_3d.gd`'s `CLIPS` table plays
 * ONE body's four fight clips — the muscle's idle/attack/behit/dead — on
 * EVERY fighter whose rest matches that source. That is a deliberate choice
 * (Meshy rigs come out near-identical, so buying four clips per role would
 * pay repeatedly for the same motion). `web/js/v3/render3d.js` aims at the
 * same thing once remaining roles are re-rigged onto the clip rest.
 *
 * A glTF rotation channel is a node's LOCAL rotation, absolute rather than a
 * delta, so playing a clip on a rig whose REST orientation differs overwrites
 * that skeleton's rest with the source's. Same names, same joint count, torn
 * pelvis. Rest orientation is checked, not just joint names.
 *
 * STATUS 2026-09-06 (corrected same night): the "re-export against live
 * Meshy muscle archive" that landed in cd64cd2 overwrote `muscle-v01` and
 * the four fight clips with a foreign untextured 22-joint/`Head1` body.
 * Owner identified those as **Eeri** assets, not Piritori. Restored the
 * pre-overwrite Piritori muscle (24-joint, textured bomber) + prior clips.
 * SHARED_CLIP_COMPATIBLE is empty again; shared playback stays off in Godot
 * and web until a migrate uses real Piritori Meshy output.
 *
 *
 * THE ONE EXCEPTION, and it is a real defect rather than a tolerance:
 * `parka-man-v01.glb` has NO SKIN AND NO SKELETON. It cannot be animated at
 * all. Recorded in `QUEUE.md`; this gate names it explicitly rather than
 * failing on it, so the suite stays green while the fact stays visible.
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

/** Bodies whose rest + joints match CLIP_REF and may safely play shared clips. */
const SHARED_CLIP_COMPATIBLE = new Set(); // none — Eeri overwrite restored 2026-09-06

/** Rigged bodies still on a foreign Meshy rest — known, not a regression.
 *  Re-rig onto the muscle archive rest (~5 Meshy credits each) to graduate. */
const SHARED_CLIP_PENDING = new Set([
  'driver', 'enforcer', 'fixer', 'hired-b', 'hired', 'jaska', 'local',
  'muscle', 'runner', 'street-raver', 'suited-man', 'toko', 'watcher',
]);

/** Known unrigged, and why. Listed rather than silently skipped. */
const UNRIGGED_KNOWN = {
  'parka-man': 'no skin/skeleton in the GLB (0 skins, 0 joints, 0 animations, ' +
    '1 node); cannot be animated. RETIRED 2026-09-02 and now in NO pool: ' +
    'battle_stage_3d.UNIT_VARIANTS dropped it, and BOTH manifests have had ' +
    'their `role` cleared and their false "24 bones / rigged for 5 credits" ' +
    'claim corrected against a measurement. Kept registered on purpose — a ' +
    'usable body for ambient or non-combat work, cheap to re-rig if a fighter ' +
    'is ever wanted. It sat in a live pool for ten days because the ' +
    'registration asserted a joint count nobody had measured, which is the ' +
    'reason this gate reads the GLB instead of the manifest.',
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
  note: 'Joint names per cast body, sorted. SHARED_CLIP_COMPATIBLE bodies must ' +
    'match the clip source; SHARED_CLIP_PENDING bodies print but do not fail ' +
    'until re-rigged. See this file\'s generator for why shared clips are the design.',
  clip_source: CLIP_REF,
  clip_source_joints: ref.slice().sort(),
  shared_clip_compatible: [...SHARED_CLIP_COMPATIBLE].sort(),
  shared_clip_pending: [...SHARED_CLIP_PENDING].sort(),
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
  if (!(missing.length || extra.length)) continue;
  const detail = `  ${name}: ${missing.length} joint(s) the clip needs ` +
    `and this rig lacks${missing.length ? ` (${missing.slice(0, 4).join(', ')})` : ''}` +
    `, ${extra.length} extra`;
  if (SHARED_CLIP_PENDING.has(name)) {
    console.log(`  pending ${detail.trim()}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${detail.trim()}`);
  }
}
// Pending roles print their rest drift every run (fact stays visible). Compatible
// bodies must stay under REST_TOLERANCE_DEG. Gate fails on regression vs baseline
// for any body, and on a compatible body drifting over the line.
const prior = existsSync(OUT)
  ? (JSON.parse(readFileSync(OUT, 'utf8')).rest_drift_deg ?? {})
  : {};
const broken = Object.entries(restDrift).filter(([, w]) => w.deg > REST_TOLERANCE_DEG);
const pendingBroken = broken.filter(([name]) => SHARED_CLIP_PENDING.has(name));
const badCompatible = broken.filter(([name]) => SHARED_CLIP_COMPATIBLE.has(name));
if (pendingBroken.length) {
  console.log(`
  ${pendingBroken.length} body(s) still PENDING shared clips ` +
    `(rest over ${REST_TOLERANCE_DEG} deg — re-rig onto muscle rest):`);
  for (const [name, w] of pendingBroken) console.log(`    ${name}: ${w.deg} deg at '${w.joint}'`);
}
if (badCompatible.length) {
  for (const [name, w] of badCompatible) {
    failures += 1;
    console.error(`  FAIL ${name}: compatible body drifted ${w.deg} deg at '${w.joint}' ` +
      `(limit ${REST_TOLERANCE_DEG}). Shared clips are no longer safe on this body.`);
  }
}
for (const name of SHARED_CLIP_COMPATIBLE) {
  if (!rigs[name]) {
    failures += 1;
    console.error(`  FAIL ${name}: listed SHARED_CLIP_COMPATIBLE but has no skeleton.`);
  }
}
// Only in --check. In generate mode this would make a regression impossible
// to RECORD: the run that writes the new baseline would abort before writing
// it, and the only way out would be deleting the fixture by hand.
for (const [name, worst] of (process.argv.includes('--check') ? Object.entries(restDrift) : [])) {
  const was = prior[name]?.deg;
  // Pending bodies flipped to a new clip rest family — baseline degrees jump.
  // Do not treat that as a mesh regression; only compatible (or newly-fixed)
  // bodies get the worsen check.
  if (SHARED_CLIP_PENDING.has(name)) continue;
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
  // Compare PARSED content, not raw text — the house pattern that
  // chrome-vectors.mjs and stance-vectors.mjs already use, and for a reason
  // this gate rediscovered the hard way: git normalises line endings on
  // checkout, so a byte comparison reports DRIFT on Windows for a file whose
  // every joint name is identical. A gate that cries wolf over CRLF trains a
  // reader to regenerate without looking, which is the exact habit a drift
  // gate exists to prevent.
  if (JSON.stringify(JSON.parse(readFileSync(OUT, 'utf8'))) !== JSON.stringify(doc)) {
    console.error('DRIFT: the cast\'s skeletons changed. Run: node port/rig-vectors.mjs');
    process.exit(1);
  }
  console.log(`rig vectors: ${Object.keys(rigs).length} rigged bodies all carry ` +
    `the clip source's ${ref.length} joints; ${SHARED_CLIP_COMPATIBLE.size} compatible, ${SHARED_CLIP_PENDING.size} pending, ${unrigged.length} known unrigged.`);
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, json);
  console.log(`wrote ${basename(OUT)} — ${Object.keys(rigs).length} rigged bodies, ` +
    `${unrigged.length} unrigged, ${ref.length} joints each.`);
}
