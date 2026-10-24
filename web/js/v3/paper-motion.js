// Paper fights (Act I v4.72): the motion vocabulary.
//
// Owner, 2026-10-23: "3d might not be the future. Recent steps are using
// motion graphics." The fight is drawn the way Toko is drawn at his counter
// (v4.70): flat cut pieces turning on hidden pivots, posed on a rhythm rather
// than tweened smooth. This file is the vocabulary and nothing else: no DOM,
// no canvas, no clock, so bare node can hold it to its numbers.
//
// The rules, one per line:
//   - A pose is a handful of angles and offsets in the FIGURE's own terms:
//     degrees, and offsets in figure heights (one number reads the same on
//     a phone and a desktop). Positive is toward the way the figure faces.
//   - Poses step at RHYTHM a second, the cut-paper rhythm. Toko holds 10;
//     a fight is a little quicker.
//   - A strike LEANS AWAY before it commits. The anticipation is what makes a
//     lunge read as a lunge rather than a slide, and the commit is under half
//     a step so it never reads as the figure having MOVED. The recovery holds
//     the release for a beat before it settles (Slay Kallio's lesson: popping
//     straight back reads as a second, faster blow).
//   - Being hit BENDS the card: a shear anchored at the feet, the paper's
//     version of a flinch. A torn guard is a smaller one with the arms up.
//   - A fall is a TOPPLE about the feet, not a slide off the board: it starts
//     slow, accelerates, overshoots a little and lies.
//   - Beats play one after another, never at once. Whoever is hurt reacts at
//     the attacker's IMPACT, so cause and effect share a frame.
//   - Reduced motion: no breath, no anticipation, no topple. Every beat is
//     its end pose, held briefly, so the board still says what happened.

export const RHYTHM = 12;

/** How long each beat takes on the board, in seconds. */
export const DURATION = { strike: 0.78, mark: 0.5, step: 0.42, brace: 0.45, item: 0.45 };
/** When, inside a strike, the blow lands and the target reacts. */
export const IMPACT = 0.31;
/** How long a reaction plays from the impact. */
export const REACT = { hurt: 0.42, guard: 0.32, down: 0.62 };
/** Reduced motion still shows each beat, as its end pose, this long. */
export const STILL_HOLD = 0.3;

export const REST = Object.freeze({
  lean: 0, torso: 0, head: 0,
  fsh: 8, fel: 18, bsh: -6, bel: 12,
  fleg: 9, bleg: -8,
  dx: 0, dy: 0, squash: 1, shear: 0, down: 0,
});

/** A time snapped to the rhythm: the pose holds until the next step. */
export function stepped(t, rhythm = RHYTHM) {
  return Math.floor(t * rhythm + 1e-9) / rhythm;
}

const clamp01 = x => Math.max(0, Math.min(1, x));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = k => 1 - (1 - k) * (1 - k);
const easeIn = k => k * k;

/** Blend two poses key by key. */
export function mix(a, b, k) {
  const out = {};
  for (const key of Object.keys(REST)) out[key] = lerp(a[key] ?? REST[key], b[key] ?? REST[key], k);
  return out;
}

const pose = over => ({ ...REST, ...over });

/** Standing, breathing; `shaken` stoops (nerve at zero, a STATE not an event). */
export function idlePose(t, phase = 0, { shaken = false, still = false } = {}) {
  const base = shaken
    ? pose({ lean: -5, torso: -6, head: -14, fsh: 2, fel: 8, bsh: -2, bel: 6 })
    : pose({});
  if (still) return base;
  const breath = Math.sin((t + phase) * (shaken ? 1.4 : 2.0));
  return { ...base, squash: 1 + breath * 0.012, fsh: base.fsh + breath * 2, bsh: base.bsh - breath * 2 };
}

const RANGED = new Set(['first-handgun', 'lifted-handgun', 'handgun']);
export const isRanged = weapon => RANGED.has(weapon) || String(weapon ?? '').includes('handgun');

/** The attacker, `t` seconds into a strike. `reach` is how far toward the
 *  target the commit carries, in figure heights (kept under half a step). */
export function strikePose(t, { ranged = false, reach = 0.22 } = {}) {
  const windup = ranged
    ? pose({ lean: -2, torso: -3, fsh: 70, fel: 10, bsh: -10, fleg: 10, bleg: -10 })
    : pose({ lean: -9, torso: -10, fsh: -150, fel: 40, bsh: 25, bel: 30, fleg: 14, bleg: -14 });
  const release = ranged
    ? pose({ lean: -4, torso: -2, fsh: 92, fel: 0, bsh: -12, dx: -0.03, fleg: 10, bleg: -10 })
    : pose({ lean: 11, torso: 12, fsh: 70, fel: 10, bsh: -34, bel: 10, dx: reach, fleg: 22, bleg: -20 });
  if (t <= 0) return pose({});
  if (t < 0.2) return mix(REST, windup, easeOut(t / 0.2));
  if (t < IMPACT) return mix(windup, release, easeIn((t - 0.2) / (IMPACT - 0.2)));
  if (t < IMPACT + 0.12) return release;                        // hold the release
  return mix(release, REST, clamp01((t - IMPACT - 0.12) / (DURATION.strike - IMPACT - 0.12)));
}

/** The target, `t` seconds after the impact. */
export function reactPose(effect, t) {
  if (effect === 'down') return downPose(t);
  if (t < 0) return pose({});
  const length = REACT[effect] ?? REACT.hurt;
  const k = clamp01(t / length);
  const back = 1 - easeOut(k);
  if (effect === 'guard') {
    return pose({ lean: -6 * back, torso: -4 * back, fsh: lerp(110, REST.fsh, k), fel: lerp(70, REST.fel, k), bsh: lerp(80, REST.bsh, k), shear: -0.08 * back, dx: -0.03 * back });
  }
  return pose({ lean: -13 * back, torso: -10 * back, head: -18 * back, fsh: lerp(-30, REST.fsh, k), bsh: lerp(-40, REST.bsh, k), shear: -0.24 * back, squash: 1 - 0.06 * back, dx: -0.09 * back });
}

/** A topple about the feet: 0 standing → 1 lying. Slow start, a small
 *  overshoot, then still. */
export function downProgress(t) {
  if (t <= 0) return 0;
  const fall = 0.42;
  if (t < fall) return easeIn(t / fall) * 1.06;
  const settle = clamp01((t - fall) / (REACT.down - fall));
  return lerp(1.06, 1, easeOut(settle));
}

export function downPose(t) {
  const d = downProgress(t);
  return pose({ down: d, lean: -4 * Math.min(1, d * 3), head: -10 * Math.min(1, d), fsh: lerp(REST.fsh, -60, Math.min(1, d)), bsh: lerp(REST.bsh, -80, Math.min(1, d)) });
}

/** Lying where they fell, for the rest of the fight. */
export const LYING = Object.freeze(downPose(10));

/** Cells apart, from two `lane,depth` keys. */
export function cellDistance(a, b) {
  const [al, ad] = String(a).split(',').map(Number);
  const [bl, bd] = String(b).split(',').map(Number);
  return Math.hypot(al - bl, ad - bd) || 0;
}

/** How long a hop takes: a reposition can cross the board, and a long one
 *  in the time of a short one reads as a slide. */
export function stepLength(beat) {
  return DURATION.step * Math.min(3, Math.max(1, cellDistance(beat.from, beat.to) * 0.55));
}

/** A hop from one cell to another: `k` 0..1 across, and the arc's lift.
 *  Longer hops arc higher, up to a point. */
export function stepPose(t, length = DURATION.step) {
  const k = clamp01(t / length);
  const lift = 0.12 * Math.min(2, length / DURATION.step);
  return { k: easeOut(k), pose: pose({ dy: -lift * Math.sin(Math.PI * k), lean: 6 * Math.sin(Math.PI * k), fleg: 20 * Math.sin(Math.PI * k), bleg: -20 * Math.sin(Math.PI * k) }) };
}

export function bracePose(t) {
  const k = Math.sin(Math.PI * clamp01(t / DURATION.brace));
  return pose({ squash: 1 - 0.07 * k, lean: -3 * k, fsh: lerp(REST.fsh, 120, k), fel: lerp(REST.fel, 80, k), bsh: lerp(REST.bsh, 95, k), bel: lerp(REST.bel, 70, k) });
}

/** A spotter marks a lane: the arm points, and holds. */
export function markPose(t) {
  const k = Math.sin(Math.PI * clamp01(t / DURATION.mark));
  return pose({ fsh: lerp(REST.fsh, 88, k), fel: lerp(REST.fel, 0, k), lean: 4 * k, head: 6 * k });
}

export function itemPose(t) {
  const k = Math.sin(Math.PI * clamp01(t / DURATION.item));
  return pose({ fsh: lerp(REST.fsh, 50, k), fel: lerp(REST.fel, 110, k), head: -8 * k });
}

/**
 * When each new beat plays. `beats` are the battle's own (`battle.beats`,
 * oldest first); everything after `played` is laid one after another from
 * `startAt` (seconds on the caller's clock). Returns [{ beat, start, end }].
 */
export function schedule(beats, played, startAt, { reduced = false } = {}) {
  const out = [];
  let at = startAt;
  for (const beat of beats ?? []) {
    if (beat.seq <= played) continue;
    const length = reduced ? STILL_HOLD : (beat.kind === 'strike'
      ? Math.max(DURATION.strike, IMPACT + (REACT[beat.effect] ?? 0))
      : beat.kind === 'step' ? stepLength(beat) : DURATION[beat.kind] ?? 0.4);
    out.push({ beat, start: at, end: at + length });
    at += length;
  }
  return out;
}

/**
 * What a unit looks like at time `now`, given the scheduled beats still to
 * finish. A unit the battle already has DOWN stands until its fall plays; a
 * unit that already MOVED stands where it was until its hop plays. Returns
 * { pose, cell, from, to, k, standing, face } — `from`/`to`/`k` only during
 * a hop; `face` is who it turns to: a striker its target, the struck its
 * striker, so a blow always crosses between the two it is about.
 */
export function figureAt(unit, now, plan, { phase = 0, reduced = false } = {}) {
  const mine = plan.filter(p => p.beat.actor === unit.id || p.beat.target === unit.id);
  // Where it stands: before a hop that has not finished, the hop's `from`.
  let cell = unit.cell;
  const hop = mine.find(p => p.beat.kind === 'step' && p.beat.actor === unit.id && now < p.end);
  if (hop && now < hop.start) cell = hop.beat.from;
  // Whether it is down yet: only once a fall that names it has started.
  const fall = mine.find(p => p.beat.kind === 'strike' && p.beat.target === unit.id && p.beat.effect === 'down');
  const fallen = !unit.alive && (!fall || now >= fall.start + (reduced ? 0 : IMPACT));
  for (const p of mine) {
    if (now < p.start || now >= p.end) continue;
    const t = now - p.start;
    const b = p.beat;
    if (b.kind === 'step' && b.actor === unit.id) {
      if (reduced) return { pose: idlePose(0, 0, { still: true }), cell: b.to, standing: true };
      const s = stepPose(t, p.end - p.start);
      return { pose: s.pose, cell: b.to, from: b.from, to: b.to, k: s.k, standing: true };
    }
    if (b.kind === 'strike' && b.target === unit.id && t >= (reduced ? 0 : IMPACT)) {
      const rt = reduced ? (b.effect === 'down' ? 10 : 0.6) : t - IMPACT;
      return { pose: reactPose(b.effect, rt), cell, standing: b.effect !== 'down', target: true, face: b.actor };
    }
    if (b.actor === unit.id) {
      const tt = reduced ? (b.kind === 'strike' ? IMPACT + 0.05 : DURATION[b.kind] / 2) : t;
      const p2 = b.kind === 'strike' ? strikePose(tt, { ranged: isRanged(b.weapon) })
        : b.kind === 'brace' ? bracePose(tt)
          : b.kind === 'mark' ? markPose(tt)
            : itemPose(tt);
      return { pose: p2, cell, standing: true, acting: b, face: b.target ?? null };
    }
  }
  if (fallen) return { pose: LYING, cell, standing: false };
  return { pose: idlePose(stepped(now), phase, { shaken: unit.nerve === 0, still: reduced }), cell, standing: true };
}
