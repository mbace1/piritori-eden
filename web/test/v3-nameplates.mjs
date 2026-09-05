import assert from 'node:assert/strict';
import { resolveNameplateNudges } from '../js/v3/nameplates.js';

function moved(boxes, bounds) {
  const rest = new Map(boxes.map(b => [b.id, b]));
  return resolveNameplateNudges(boxes, bounds).map(n => {
    const b = rest.get(n.id);
    return { id: n.id, x: b.x + n.dx, y: b.y + n.dy, w: b.w, h: b.h, dx: n.dx, dy: n.dy };
  });
}

function overlap(a, b, gap = 4) {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ox > -gap && oy > -gap;
}

// 2v2 phone: Reijo + Lan, same centre lane, two depths. Measured-shape
// stand-in for a 411px Pixel stage — plates ~80×28, ~12px of Y between
// tops, almost full X overlap. This is the QUEUE capture.
const twoVtwo = [
  { id: 'reijo', x: 70, y: 310, w: 80, h: 28 },
  { id: 'lan', x: 78, y: 322, w: 80, h: 28 },
];
const stage = { width: 411, height: 480 };
const after2 = moved(twoVtwo, stage);
assert.equal(after2.length, 2);
assert(!overlap(after2[0], after2[1]), '2v2 centre-lane plates must not cover each other');
assert(after2.every(b => b.y >= 0 && b.y + b.h <= stage.height), '2v2 plates stay on the stage');
assert(after2.every(b => b.x >= 0 && b.x + b.w <= stage.width), '2v2 plates stay on the stage in X');
// First names stay near the original pair — we split, we do not exile.
const mid0 = (twoVtwo[0].y + twoVtwo[1].y) / 2;
const mid1 = (after2[0].y + after2[1].y) / 2;
assert(Math.abs(mid1 - mid0) < 20, 'stack stays centred on the original feet');

// Already clear — do not invent motion.
const clear = [
  { id: 'a', x: 40, y: 80, w: 70, h: 26 },
  { id: 'b', x: 200, y: 80, w: 70, h: 26 },
];
for (const n of resolveNameplateNudges(clear, stage)) {
  assert.equal(n.dx, 0, `${n.id} dx`);
  assert.equal(n.dy, 0, `${n.id} dy`);
}

// 3v3 adjacent-lane: same depth, plates overlapping in X.
const three = [
  { id: 'lan', x: 90, y: 300, w: 80, h: 28 },
  { id: 'reijo', x: 150, y: 308, w: 80, h: 28 },
  { id: 'sergei', x: 210, y: 316, w: 80, h: 28 },
];
const after3 = moved(three, stage);
for (let i = 0; i < after3.length; i += 1) {
  for (let j = i + 1; j < after3.length; j += 1) {
    assert(!overlap(after3[i], after3[j]), `${after3[i].id} vs ${after3[j].id} still overlap`);
  }
}

// Near the overflow:hidden bottom — do not clip off the stage.
const tight = [
  { id: 'front', x: 80, y: 448, w: 80, h: 28 },
  { id: 'back', x: 88, y: 454, w: 80, h: 28 },
];
const afterTight = moved(tight, { width: 411, height: 480 });
for (const b of afterTight) {
  assert(b.y + b.h <= 478, `${b.id} clipped off the bottom`);
  assert(b.y >= 2, `${b.id} clipped off the top`);
}
assert(!overlap(afterTight[0], afterTight[1]), 'tight-bottom pair still separates');

console.log('V3 NAMEPLATES OK: 2v2 stack, 3v3 lane, already-clear, and bottom clamp.');
