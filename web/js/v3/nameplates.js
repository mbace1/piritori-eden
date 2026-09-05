/**
 * Screen-space nameplate collision — the missing half of `positionBattleDOM()`.
 *
 * Tokens are projected to cell centres. Labels then hang at a FIXED offset
 * under each token (`bottom: -22px` / phone `-17px`). That is enough when
 * units stand in different lanes. It is not enough for the 2v2 opening:
 * `defaultPlayerSlot()` puts both crew in the CENTRE lane at two depths
 * (`grid.js`), and the isometric camera maps same-lane depth mostly onto
 * screen Y, so "Reijo" and "Lan" land on top of each other. v4.28 already
 * named this as a remainder; QUEUE item 3 is this file.
 *
 * Godot has no on-board nameplates (names live on the console; the rim
 * carries side — `battle_stage_3d.gd` `_paint`). Web-only.
 *
 * Strategy: measure the rest boxes, then split each overlap — the higher
 * plate moves up, the lower one down — so the pair stays near the feet
 * instead of marching off the `overflow: hidden` stage. Horizontal split
 * only when the plates share more Y than X (adjacent-lane 3v3). Iterate
 * until stable. Pure function: no DOM, no THREE — `web/test/v3-nameplates.mjs`
 * is the gate.
 */

const DEFAULT_GAP = 4;
const MAX_ITERS = 12;

function extent(box) {
  return {
    x0: box.x + box.dx,
    y0: box.y + box.dy,
    x1: box.x + box.dx + box.w,
    y1: box.y + box.dy + box.h,
  };
}

function overlapOf(a, b, gap) {
  const A = extent(a);
  const B = extent(b);
  return {
    x: Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0),
    y: Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0),
    gap,
  };
}

function clampAxis(box, axis, bounds) {
  const size = axis === 'dx' ? box.w : box.h;
  const origin = axis === 'dx' ? box.x : box.y;
  const limit = axis === 'dx' ? bounds.width : bounds.height;
  if (!(limit > 0)) return;
  const pad = 2;
  const pos = origin + box[axis];
  if (pos < pad) box[axis] += pad - pos;
  const end = origin + box[axis] + size;
  if (end > limit - pad) box[axis] -= end - (limit - pad);
}

/** How far `box` can still move along `axis` (`'dx'`/`'dy'`) in `dir` (+1 / -1). */
function roomAlong(box, axis, dir, bounds) {
  const size = axis === 'dx' ? box.w : box.h;
  const origin = axis === 'dx' ? box.x : box.y;
  const limit = axis === 'dx' ? bounds.width : bounds.height;
  const pad = 2;
  const pos = origin + box[axis];
  if (!(limit > 0)) return Infinity;
  return dir < 0 ? pos - pad : (limit - pad) - (pos + size);
}

function splitAlong(first, second, axis, need, bounds) {
  // `first` moves negative, `second` positive. Leftover from a clamped
  // side transfers to the other so a pair sitting on the overflow:hidden
  // bottom still separates (the upper plate takes the whole lift).
  let a = need / 2;
  let b = need / 2;
  const aRoom = roomAlong(first, axis, -1, bounds);
  const bRoom = roomAlong(second, axis, 1, bounds);
  if (b > bRoom) {
    a += b - Math.max(0, bRoom);
    b = Math.max(0, bRoom);
  }
  if (a > aRoom) {
    b += a - Math.max(0, aRoom);
    a = Math.max(0, aRoom);
  }
  a = Math.min(a, Math.max(0, aRoom));
  b = Math.min(b, Math.max(0, bRoom));
  first[axis] -= a;
  second[axis] += b;
}

function splitPair(a, b, ov, gap, room) {
  const needX = ov.x + gap;
  const needY = ov.y + gap;
  // More X overlap → same isometric column (2v2 centre-lane). Split in Y.
  // More Y overlap → adjacent lanes. Split in X so plates stay by their unit.
  if (ov.x >= ov.y) {
    const upper = (a.y + a.dy) <= (b.y + b.dy) ? a : b;
    const lower = upper === a ? b : a;
    splitAlong(upper, lower, 'dy', needY, room);
    const still = overlapOf(a, b, gap);
    if (still.x > -gap && still.y > -gap) {
      const left = (a.x + a.dx) <= (b.x + b.dx) ? a : b;
      const right = left === a ? b : a;
      splitAlong(left, right, 'dx', still.x + gap, room);
    }
  } else {
    const left = (a.x + a.dx) <= (b.x + b.dx) ? a : b;
    const right = left === a ? b : a;
    splitAlong(left, right, 'dx', needX, room);
    const still = overlapOf(a, b, gap);
    if (still.x > -gap && still.y > -gap) {
      const upper = (a.y + a.dy) <= (b.y + b.dy) ? a : b;
      const lower = upper === a ? b : a;
      splitAlong(upper, lower, 'dy', still.y + gap, room);
    }
  }
}

/**
 * @param {{id: string, x: number, y: number, w: number, h: number}[]} boxes
 *        rest-position label rects in stage pixels (top-left origin)
 * @param {{width?: number, height?: number}} [bounds] stage size for clamp
 * @param {number} [gap] extra pixels of air between plates
 * @returns {{id: string, dx: number, dy: number}[]}
 *        positive dy is DOWN the screen (applied as a more-negative `bottom`)
 */
export function resolveNameplateNudges(boxes, bounds = {}, gap = DEFAULT_GAP) {
  const items = boxes.map(b => ({
    id: b.id, x: b.x, y: b.y, w: b.w, h: b.h, dx: 0, dy: 0,
  }));
  const room = {
    width: Number(bounds.width) || 0,
    height: Number(bounds.height) || 0,
  };

  // Pull already-offstage rest boxes in first (phone labels hang below
  // the token and a front-rank plate can start a few px past the
  // overflow:hidden edge). Resolving against an overflowing rest box
  // and clamping after would just slide them back on top of each other.
  for (const item of items) {
    clampAxis(item, 'dx', room);
    clampAxis(item, 'dy', room);
  }

  for (let iter = 0; iter < MAX_ITERS; iter += 1) {
    let moved = false;
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        const ov = overlapOf(a, b, gap);
        if (ov.x <= -gap || ov.y <= -gap) continue;

        splitPair(a, b, ov, gap, room);
        moved = true;
      }
    }
    if (!moved) break;
  }

  for (const item of items) {
    clampAxis(item, 'dx', room);
    clampAxis(item, 'dy', room);
  }
  return items.map(({ id, dx, dy }) => ({ id, dx, dy }));
}

/** Apply resolved nudges onto live `.unit-label` nodes. Browser-only. */
export function applyNameplateNudges(stage, units) {
  if (!stage || !units?.length) return;
  const found = [];
  for (const unit of units) {
    const token = stage.querySelector(`.unit-token[data-unit="${CSS.escape(unit.id)}"]`);
    const label = token?.querySelector('.unit-label');
    if (!token || !label) continue;
    label.style.removeProperty('--label-nudge-x');
    label.style.removeProperty('--label-nudge-y');
    found.push({ unit, token, label });
  }
  if (!found.length) return;

  const stageBox = stage.getBoundingClientRect();
  if (!stageBox.width || !stageBox.height) return;
  const boxes = found.map(({ unit, label }) => {
    const r = label.getBoundingClientRect();
    return {
      id: unit.id,
      x: r.left - stageBox.left,
      y: r.top - stageBox.top,
      w: r.width,
      h: r.height,
    };
  });
  const nudges = resolveNameplateNudges(boxes, {
    width: stageBox.width,
    height: stageBox.height,
  });
  const byId = new Map(nudges.map(n => [n.id, n]));
  for (const { unit, token, label } of found) {
    const n = byId.get(unit.id);
    if (!n) continue;
    label.style.setProperty('--label-nudge-x', `${n.dx.toFixed(1)}px`);
    label.style.setProperty('--label-nudge-y', `${n.dy.toFixed(1)}px`);
    const box = boxes.find(b => b.id === unit.id);
    const paintY = box ? box.y + n.dy : 0;
    token.style.zIndex = String(8 + Math.max(0, Math.round(paintY)));
  }
}
