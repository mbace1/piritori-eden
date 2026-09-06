/**
 * fight-motion.js — the four fight poses, authored as bone rotations rather
 * than imported as clips.
 *
 * WHY THIS REPLACED THE SHARED GLB CLIPS. Both builds used to play ONE body's
 * four baked clips on every fighter. Reported on sight, 2026-09-02: "the
 * models hips are janky... their hips are rotated almost 180 degrees."
 *
 * Measured, the reason is not fixable in a player:
 *
 *   - A glTF rotation channel is a node's LOCAL rotation, ABSOLUTE rather than
 *     a delta. Played on a rig whose REST orientation differs, it OVERWRITES
 *     that skeleton's rest with the source's.
 *   - `port/rig-vectors.mjs` now measures that drift and every one of the 13
 *     rigged bodies is over tolerance — runner 108 degrees at `Hips`, watcher
 *     103 and fixer 99 at `LeftUpLeg`, driver 159 at `Spine02`.
 *   - The root cause: `clips/muscle-idle-v01.glb` is not the same rig as
 *     `muscle-v01.glb`, THE BODY IT IS NAMED AFTER. There is no body in this
 *     repo whose skeleton those clips were authored against.
 *
 * Three fixes were attempted and all three reverted: two hand-rolled
 * retargets, then three.js's own `SkeletonUtils.retargetClip()` — the
 * canonical tool, wired correctly, no console errors — which crumpled the
 * fighters' legs into their torsos. A retargeter needs a source skeleton that
 * structurally corresponds to the target, and there is not one. `QUEUE.md`
 * carries the full record so a fourth attempt is not made.
 *
 * THE APPROACH HERE CANNOT HAVE THAT BUG. Every value below is a DELTA in a
 * bone's own local frame, composed onto whatever rest that particular body
 * happens to carry:
 *
 *     value(t) = restOf(bone) * delta(t)
 *
 * So a rig that sits 159 degrees from another animates correctly in its own
 * frame, and a new mesh with a fourth rest convention needs no intake step at
 * all. Mismatch is impossible by construction rather than gated against.
 *
 * WHAT IT COSTS. This is hand-authored motion, not mocap, and it would not
 * survive a close-up. It does not need to: a fighter is roughly 40px tall on
 * the battle board. At that size silhouette and timing carry everything and
 * fine joint detail carries nothing — which is the same reasoning
 * `art-src/meshy-input/enforce-texture-budget.mjs` used to put those bodies on
 * 512px textures.
 *
 * Owner decision, 2026-09-02, over Mixamo and over regenerating the cast
 * through Meshy: free, no new dependency, no new assets, and on screen today.
 */
import * as THREE from 'three';

/** Bone names, exactly as `port/rig-vectors.mjs` records them across all 13
 *  rigged bodies. Referenced by name rather than by index because index order
 *  is an export detail and these names are the thing that is actually stable. */
const B = {
  hips: 'Hips',
  spine: 'Spine', spine01: 'Spine01', spine02: 'Spine02',
  neck: 'neck', head: 'Head',
  lShoulder: 'LeftShoulder', lArm: 'LeftArm', lFore: 'LeftForeArm', lHand: 'LeftHand',
  rShoulder: 'RightShoulder', rArm: 'RightArm', rFore: 'RightForeArm', rHand: 'RightHand',
  lLegUp: 'LeftUpLeg', lLeg: 'LeftLeg', lFoot: 'LeftFoot',
  rLegUp: 'RightUpLeg', rLeg: 'RightLeg', rFoot: 'RightFoot',
};

const d = deg => (deg * Math.PI) / 180;

/**
 * THE BASE STANCE IS COMPUTED FROM THE RIG, NOT AUTHORED AS CONSTANTS.
 *
 * These bodies are generated in a T-POSE — measured, not assumed: every arm
 * bone's child sits at a pure local +Y offset (`LeftForeArm` is at
 * `(0, 23.64, 0)` from `LeftArm`), the Mixamo convention where local +Y runs
 * along the bone. `ART_BIBLE.md` says the same in words: "t-pose is always
 * direct to camera".
 *
 * A T-pose is a rigging pose, not a fighting one, and the poses below are
 * deliberately small — a few degrees of breath and weight. Small deltas from a
 * T-pose are still a T-pose, so the first render came out as six scarecrows.
 *
 * The obvious fix is a table of Euler offsets to swing the arms down. It was
 * tried, twice, and it cannot work here: mirrored signs dropped one arm and
 * left the other straight out, and identical signs dropped the OTHER arm. The
 * left and right arms on these rigs do not share an axis convention, and there
 * is no single constant that satisfies both — let alone across 13 bodies whose
 * rests already differ by up to 159 degrees.
 *
 * So the stance is SOLVED rather than authored. For a bone whose local +Y runs
 * along it, the local rotation that points it along a chosen world direction is
 *
 *     q = fromUnitVectors( +Y, inverse(parentWorldRotation) * worldTarget )
 *
 * which is exact, needs no per-body tuning, and is correct for any rest
 * convention — including a fourteenth body that arrives with a fifteenth one.
 * It is the same principle as the rest of this file: never copy an absolute
 * value between skeletons, always ask the skeleton in front of you.
 */

/** Where each aimed bone should point, in WORLD space. Only `y` and a
 *  "push away from the torso" factor are used, both of which survive the
 *  model's own Y rotation (`render3d.js` turns each fighter to face the other
 *  side), so these do not need to know which way a unit is facing. */
const AIM = {
  [B.lArm]: { down: 1, out: 0.30 },
  [B.rArm]: { down: 1, out: 0.30 },
  [B.lLegUp]: { down: 1, out: 0.06 },
  [B.rLegUp]: { down: 1, out: 0.06 },
};

/** Small local deltas applied AFTER aiming — the bend that stops a limb
 *  reading as a straight stick. These are safe as constants because they are
 *  relative to a bone whose direction has already been solved. */
const BASE_STANCE = {
  [B.lFore]: [-18, 0, 0],
  [B.rFore]: [-18, 0, 0],
  [B.lLeg]: [8, 0, 0],
  [B.rLeg]: [8, 0, 0],
  [B.spine]: [3, 0, 0],
  [B.head]: [-3, 0, 0],
};

const UP = new THREE.Vector3(0, 1, 0);

/** The local quaternion that aims `bone` (local +Y along its length) at a
 *  world direction derived from its own rest pose. */
function aimedLocalQuat(bone, aim, out) {
  const parentWorld = new THREE.Quaternion();
  if (bone.parent) bone.parent.getWorldQuaternion(parentWorld);

  // The bone's CURRENT world direction, used only for its horizontal part —
  // that is what pushes an arm away from the ribs rather than through them,
  // and it is read off this rig rather than assumed.
  const world = new THREE.Quaternion();
  bone.getWorldQuaternion(world);
  const dir = UP.clone().applyQuaternion(world);
  dir.y = 0;
  if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
  dir.normalize().multiplyScalar(aim.out);
  dir.y = -aim.down;
  dir.normalize();

  // Into the parent's frame, then the rotation from the bone's own axis to it.
  dir.applyQuaternion(parentWorld.invert());
  return out.setFromUnitVectors(UP, dir.normalize());
}

/**
 * The four poses. Each entry is `[time, [xDeg, yDeg, zDeg]]` — an Euler DELTA
 * from that bone's rest, in degrees because degrees are what a person can read
 * and adjust. Keyframes are sparse on purpose; three.js interpolates.
 *
 * Values are small. A fighter on this board is a silhouette that has to read
 * as ALIVE and as DOING something, at a size where a 20-degree shoulder turn
 * is already a large gesture.
 */
const MOTION = {
  /** Weight shifting, breath, a slow head turn. Loops. */
  idle: {
    duration: 3.2,
    tracks: {
      [B.hips]: [[0, [0, 0, 0]], [1.6, [1.5, 2, 0]], [3.2, [0, 0, 0]]],
      [B.spine]: [[0, [0, 0, 0]], [1.6, [-2, -1.5, 0]], [3.2, [0, 0, 0]]],
      [B.spine02]: [[0, [0, 0, 0]], [1.6, [-1.5, 0, 0]], [3.2, [0, 0, 0]]],
      [B.head]: [[0, [0, 4, 0]], [1.2, [0, -3, 0]], [2.4, [0, 2, 0]], [3.2, [0, 4, 0]]],
      [B.lArm]: [[0, [0, 0, 4]], [1.6, [0, 0, 7]], [3.2, [0, 0, 4]]],
      [B.rArm]: [[0, [0, 0, -4]], [1.6, [0, 0, -7]], [3.2, [0, 0, -4]]],
      [B.lFore]: [[0, [0, 0, 6]], [1.6, [0, 0, 10]], [3.2, [0, 0, 6]]],
      [B.rFore]: [[0, [0, 0, -6]], [1.6, [0, 0, -10]], [3.2, [0, 0, -6]]],
    },
  },

  /** Wind up, drive through, recover. Loops, so a fighter held on `attack`
   *  keeps threatening rather than freezing mid-swing. */
  attack: {
    duration: 1.5,
    tracks: {
      [B.hips]: [[0, [0, 0, 0]], [0.35, [0, -14, 0]], [0.7, [0, 18, 0]], [1.5, [0, 0, 0]]],
      [B.spine]: [[0, [0, 0, 0]], [0.35, [-6, -12, 0]], [0.7, [8, 16, 0]], [1.5, [0, 0, 0]]],
      [B.spine02]: [[0, [0, 0, 0]], [0.35, [-4, -8, 0]], [0.7, [6, 12, 0]], [1.5, [0, 0, 0]]],
      [B.rShoulder]: [[0, [0, 0, 0]], [0.35, [0, -14, 0]], [0.7, [0, 22, 0]], [1.5, [0, 0, 0]]],
      [B.rArm]: [[0, [0, 0, -6]], [0.35, [-20, -18, -14]], [0.7, [26, 24, -4]], [1.5, [0, 0, -6]]],
      [B.rFore]: [[0, [0, 0, -8]], [0.35, [0, 0, -46]], [0.7, [0, 0, -10]], [1.5, [0, 0, -8]]],
      [B.lArm]: [[0, [0, 0, 6]], [0.35, [0, 10, 12]], [0.7, [0, -12, 16]], [1.5, [0, 0, 6]]],
      [B.lFore]: [[0, [0, 0, 8]], [0.35, [0, 0, 26]], [0.7, [0, 0, 34]], [1.5, [0, 0, 8]]],
      [B.rLegUp]: [[0, [0, 0, 0]], [0.35, [8, 0, 0]], [0.7, [-12, 0, 0]], [1.5, [0, 0, 0]]],
      [B.lLegUp]: [[0, [0, 0, 0]], [0.35, [-8, 0, 0]], [0.7, [10, 0, 0]], [1.5, [0, 0, 0]]],
      [B.head]: [[0, [0, 0, 0]], [0.7, [4, 10, 0]], [1.5, [0, 0, 0]]],
    },
  },

  /** Snapped backwards, guard dropped, recovering but not recovered. Loops
   *  slowly — this is a STATE (nerve at zero), not an event. */
  hit: {
    duration: 2.0,
    tracks: {
      [B.hips]: [[0, [-8, 0, 0]], [1.0, [-11, 0, 2]], [2.0, [-8, 0, 0]]],
      [B.spine]: [[0, [-10, 0, 0]], [1.0, [-13, 0, -2]], [2.0, [-10, 0, 0]]],
      [B.spine02]: [[0, [-8, 0, 0]], [1.0, [-10, 0, 0]], [2.0, [-8, 0, 0]]],
      [B.head]: [[0, [-14, 0, 0]], [1.0, [-18, -6, 0]], [2.0, [-14, 0, 0]]],
      [B.lArm]: [[0, [0, 0, 16]], [1.0, [0, 0, 20]], [2.0, [0, 0, 16]]],
      [B.rArm]: [[0, [0, 0, -16]], [1.0, [0, 0, -20]], [2.0, [0, 0, -16]]],
      [B.lLegUp]: [[0, [6, 0, 0]], [2.0, [6, 0, 0]]],
      [B.rLegUp]: [[0, [4, 0, 0]], [2.0, [4, 0, 0]]],
    },
  },

  /** Folds and goes down. Played once and CLAMPED by the caller, so the last
   *  frame is the pose a downed fighter holds for the rest of the fight. */
  dead: {
    duration: 1.1,
    tracks: {
      [B.hips]: [[0, [0, 0, 0]], [0.45, [-18, 0, 6]], [1.1, [-74, 0, 12]]],
      [B.spine]: [[0, [0, 0, 0]], [0.45, [22, 0, -4]], [1.1, [40, 0, -8]]],
      [B.spine02]: [[0, [0, 0, 0]], [1.1, [26, 0, 0]]],
      [B.head]: [[0, [0, 0, 0]], [0.45, [10, 0, 0]], [1.1, [28, 8, 0]]],
      [B.lLegUp]: [[0, [0, 0, 0]], [1.1, [58, 0, 10]]],
      [B.rLegUp]: [[0, [0, 0, 0]], [1.1, [46, 0, -8]]],
      [B.lLeg]: [[0, [0, 0, 0]], [1.1, [-64, 0, 0]]],
      [B.rLeg]: [[0, [0, 0, 0]], [1.1, [-52, 0, 0]]],
      [B.lArm]: [[0, [0, 0, 0]], [1.1, [0, 0, 30]]],
      [B.rArm]: [[0, [0, 0, 0]], [1.1, [0, 0, -34]]],
    },
  },
};

export const POSES = Object.keys(MOTION);

/** Every bone in a model, by name. */
function bonesOf(model) {
  const bones = new Map();
  model.traverse(n => { if (n.isBone && !bones.has(n.name)) bones.set(n.name, n); });
  return bones;
}

/**
 * Build one pose as an AnimationClip against THIS model's own rest pose.
 *
 * Returns null when the model has no skeleton at all — `parka-man-v01.glb` is
 * the known case, recorded in `rig-vectors.mjs`. A body that cannot be
 * animated stands still rather than throwing.
 */
export function buildFightClip(model, pose) {
  const motion = MOTION[pose] ?? MOTION.idle;
  const bones = bonesOf(model);
  if (!bones.size) return null;

  // World matrices must be current before any bone can be aimed — the solve
  // reads each bone's parent world rotation.
  model.updateMatrixWorld(true);

  const tracks = [];
  const delta = new THREE.Quaternion();
  const stanceQ = new THREE.Quaternion();
  const aimQ = new THREE.Quaternion();
  const euler = new THREE.Euler();

  // Every bone the stance touches needs a track, even one the pose ignores —
  // otherwise an arm the pose does not animate stays out at T-pose while the
  // rest of the body stands correctly.
  const names = new Set([
    ...Object.keys(motion.tracks),
    ...Object.keys(BASE_STANCE),
    ...Object.keys(AIM),
  ]);

  for (const name of names) {
    const keys = motion.tracks[name] ?? [[0, [0, 0, 0]]];
    const bone = bones.get(name);
    // A rig missing one bone still animates with the rest. Skipping is right:
    // it degrades a gesture rather than dropping the whole fighter.
    if (!bone) continue;

    const times = new Float32Array(keys.length);
    const values = new Float32Array(keys.length * 4);
    for (let i = 0; i < keys.length; i += 1) {
      const [t, [rx, ry, rz]] = keys[i];
      times[i] = t;
      euler.set(d(rx), d(ry), d(rz));
      delta.setFromEuler(euler);
      const [sx, sy, sz] = BASE_STANCE[name] ?? [0, 0, 0];
      euler.set(d(sx), d(sy), d(sz));
      stanceQ.setFromEuler(euler);
      // An AIMED bone replaces its rest outright — the solve already produced
      // the local rotation that points it correctly. Everything else composes
      // onto its own rest. Either way the value is derived from THIS skeleton
      // and never copied from another one.
      const base = AIM[name]
        ? aimedLocalQuat(bone, AIM[name], aimQ).clone()
        : bone.quaternion.clone();
      const q = base.multiply(stanceQ).multiply(delta);
      values[i * 4] = q.x;
      values[i * 4 + 1] = q.y;
      values[i * 4 + 2] = q.z;
      values[i * 4 + 3] = q.w;
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values));
  }

  if (!tracks.length) return null;
  return new THREE.AnimationClip(`fight-${pose}`, motion.duration, tracks);
}
