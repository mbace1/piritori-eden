#!/usr/bin/env node
/**
 * Real land, from the real coastline. Public OSM data, no invented shapes.
 *
 *   node map/tools/land-from-coastline.mjs > /tmp/land.json
 *   LAND_DEBUG=1 node map/tools/land-from-coastline.mjs > /dev/null
 *   LAND_DUMP_RASTER=1 node map/tools/land-from-coastline.mjs > /tmp/land.pgm
 *
 * Reported directly, 2026-08-26, ending the previous attempt: "the map,
 * it's clearly not made from scratch since you can still see the squares
 * under" and then "just use public data to make the map look good and
 * useful. trying to fake it will show."
 *
 * Both are correct about the version this replaces. That one derived land
 * from a BUFFER AROUND REAL STREETS — plausible-looking, correctly aligned,
 * and structurally incapable of ever having a shoreline, because the real
 * coastline was only ever a decorative stroke and never cut anything. 182 of
 * its 850 rectangles sat flush against the derivation grid's own pad edge,
 * chopped off flat. That flat chop was the visible "square".
 *
 * ── WHY THE COASTLINE WORKS THIS TIME ──────────────────────────────────────
 *
 * Three earlier coastline flood-fills failed and their failures are recorded
 * at the bottom of this comment so they are not retried. All three failed on
 * the same missing thing: THEY HAD NO TRUSTWORTHY SEED. Each tried to guess
 * where the open sea was — from the grid border, or from OSM's "land is on
 * the way's LEFT" winding convention — and each guess was wrong somewhere.
 *
 * The seed was sitting in canon the whole time. `kallio-era1-2003-v1.json`
 * carries 14 board anchors, and every one of them is a real place in Kallio
 * standing on real ground. So:
 *
 *   BARRIER = the real coastline (chained), real island rings, real inland
 *             water rings.
 *   SEED    = the 14 canonical anchors, which are known land by authorship.
 *   LAND    = everything the flood reaches from them.
 *
 * Nothing is guessed. The flood cannot leak "into the sea" because the
 * coastline stops it, and it cannot start in the sea because it starts on
 * authored ground. Where Kallio's mainland genuinely continues past the
 * fetch box (the inland north and west, which have no coastline at all) the
 * flood reaches the grid edge and stops there, which is correct — that is a
 * map edge, not a shore, and it is drawn off-screen.
 *
 * The 27 `natural=coastline` ways chain cleanly: 25 of 27 join another way
 * head-to-tail, and the 2 loose tails both sit on the box's east edge, which
 * is where the data was cut. Chained, they resolve to two open coastal runs
 * plus three closed loops — and those three loops are real islands, filled
 * back in as land after the flood (the flood cannot reach them across water).
 *
 * ── WHAT FAILED BEFORE, DO NOT RETRY ───────────────────────────────────────
 *
 * (1) Seeding the flood from the grid's own border, on the assumption the
 *     border is open water. Wrong: Kallio's north has no coastline nearby, so
 *     the flood leaked across the whole inland region unopposed.
 * (2) Seeding from a point offset to the "sea side" of each coastline
 *     segment, per OSM's documented land-on-the-left convention. Wrong: real
 *     data is not consistent about winding, and ONE reversed way among 27 put
 *     a seed on land and flooded almost the entire grid.
 * (3) Treating each closed water area's outline as a barrier so a flood
 *     seeded inside it could not escape. Safe, but left no way to seed the
 *     open sea at all, so everything but the explicit bays read as land.
 *
 * Each was caught by dumping the raster and LOOKING at it. The cell counts
 * moved plausibly every time and were wrong twice. `LAND_DUMP_RASTER=1`
 * still exists for exactly that reason — use it before believing a number.
 *
 * Prints `{class:"land", cellSize, rects:[[x,y,w,h],...]}` to stdout.
 * Kept deliberately in sync BY HAND with `buildRealLand()` in
 * `godot/tools/build-map-geometry.mjs`; if one changes, change both.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const J = f => JSON.parse(readFileSync(path.join(root, f), 'utf8'));

const water = J('kallio-water-v1.json');
const board = J('kallio-era1-2003-v1.json');
const CS = board.coordinateSystem;
const toBoard = (lat, lon) => [
  CS.board.offsetX + (lon - CS.origin.lon) * CS.metresPerDegree.lon / CS.board.metresPerUnit,
  CS.board.offsetY - (lat - CS.origin.lat) * CS.metresPerDegree.lat / CS.board.metresPerUnit,
];

// ── chain the coastline ways into continuous runs ──────────────────────────
// OSM gives `natural=coastline` as many separate ways that share endpoints.
// Chained head-to-tail they become the actual shoreline; left loose they are
// 27 strokes with gaps a flood-fill pours straight through.
function chainCoastline(edges) {
  const key = p => p[0].toFixed(7) + ',' + p[1].toFixed(7);
  const byHead = new Map();
  edges.forEach((e, i) => byHead.set(key(e.shape[0]), i));
  const tails = new Set(edges.map(e => key(e.shape[e.shape.length - 1])));
  const used = new Set();
  const chains = [];

  const walk = (start) => {
    let pts = [], cur = start;
    while (cur !== undefined && !used.has(cur)) {
      used.add(cur);
      const s = edges[cur].shape;
      pts = pts.length ? pts.concat(s.slice(1)) : s.slice();
      cur = byHead.get(key(s[s.length - 1]));
    }
    return pts;
  };
  // open runs first: a chain START is a head that is nobody's tail
  edges.forEach((e, i) => {
    if (used.has(i) || tails.has(key(e.shape[0]))) return;
    chains.push({ closed: false, pts: walk(i) });
  });
  // whatever is left forms closed rings — real islands
  edges.forEach((e, i) => {
    if (used.has(i)) return;
    chains.push({ closed: true, pts: walk(i) });
  });
  return chains;
}

const chains = chainCoastline(water.edges || []).map(c => ({
  closed: c.closed,
  pts: c.pts.map(([lat, lon]) => toBoard(lat, lon)),
}));

// ── the grid spans the real data, not an arbitrary padded board ────────────
// A pad beyond the data is what let the old version chop the shape flat: the
// coastline ended at the fetch-box edge and the flood simply walked around
// its end through the empty pad. The grid IS the data box now, and every open
// chain's ends are extended to the nearest grid edge so the barrier seals.
let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
const seeChain = ([x, y]) => {
  bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x);
  by0 = Math.min(by0, y); by1 = Math.max(by1, y);
};
for (const c of chains) c.pts.forEach(seeChain);
for (const a of water.areas || []) a.shape.forEach(([lat, lon]) => seeChain(toBoard(lat, lon)));
for (const a of board.anchors || []) seeChain([a.board.x, a.board.y]);

const CELL = 1.2;                       // board units per cell — under 3 m
const cols = Math.ceil((bx1 - bx0) / CELL) + 1;
const rows = Math.ceil((by1 - by0) / CELL) + 1;
const cellOf = (x, y) => [Math.round((x - bx0) / CELL), Math.round((y - by0) / CELL)];
const at = (cx, cy) => cy * cols + cx;
const inGrid = (cx, cy) => cx >= 0 && cx < cols && cy >= 0 && cy < rows;

const barrier = new Uint8Array(cols * rows);
const land = new Uint8Array(cols * rows);

function stamp(gridArr, x, y, value) {
  const [cx, cy] = cellOf(x, y);
  // 2-cell brush: a 1-cell line leaks diagonally under 4-way flood
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    if (inGrid(cx + ox, cy + oy)) gridArr[at(cx + ox, cy + oy)] = value;
  }
}
function stampLine(gridArr, a, b, value) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const steps = Math.max(1, Math.ceil(L / (CELL * 0.5)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    stamp(gridArr, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, value);
  }
}
function stampPath(gridArr, pts, value, close) {
  for (let i = 1; i < pts.length; i++) stampLine(gridArr, pts[i - 1], pts[i], value);
  if (close && pts.length > 2) stampLine(gridArr, pts[pts.length - 1], pts[0], value);
}

/** Push an open chain's endpoint out to whichever grid edge it is nearest, so
 *  the shoreline seals against the frame instead of leaving a gap the flood
 *  walks around. */
function extendToEdge(p) {
  const [x, y] = p;
  const d = [x - bx0, bx1 - x, y - by0, by1 - y];
  const m = Math.min(...d);
  if (m === d[0]) return [bx0 - CELL, y];
  if (m === d[1]) return [bx1 + CELL, y];
  if (m === d[2]) return [x, by0 - CELL];
  return [x, by1 + CELL];
}

for (const c of chains) {
  stampPath(barrier, c.pts, 1, c.closed);
  if (!c.closed) {
    stampLine(barrier, c.pts[0], extendToEdge(c.pts[0]), 1);
    stampLine(barrier, c.pts[c.pts.length - 1], extendToEdge(c.pts[c.pts.length - 1]), 1);
  }
}
// real inland water (Töölönlahti, Eläintarhanlahti, the Alppipuisto ponds)
for (const a of water.areas || []) {
  if (!a.shape || a.shape.length < 3) continue;
  stampPath(barrier, a.shape.map(([lat, lon]) => toBoard(lat, lon)), 1, true);
}

// ── flood from the anchors: authored ground, not a guess about the sea ─────
const queue = [];
let seeded = 0;
for (const a of board.anchors || []) {
  const [cx, cy] = cellOf(a.board.x, a.board.y);
  if (!inGrid(cx, cy)) continue;
  const idx = at(cx, cy);
  if (barrier[idx] || land[idx]) continue;   // an anchor sitting on the line itself
  land[idx] = 1; queue.push(idx); seeded++;
}
let qi = 0;
while (qi < queue.length) {
  const ci = queue[qi++];
  const cx = ci % cols, cy = (ci - cx) / cols;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = cx + dx, ny = cy + dy;
    if (!inGrid(nx, ny)) continue;
    const ni = at(nx, ny);
    if (barrier[ni] || land[ni]) continue;
    land[ni] = 1; queue.push(ni);
  }
}

// ── scanline fill, used to put the islands back and cut the lakes out ──────
function fillRing(pts, target, value) {
  let miny = Infinity, maxy = -Infinity;
  for (const [, y] of pts) { miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  const [, rowMin] = cellOf(0, miny), [, rowMax] = cellOf(0, maxy);
  for (let ry = Math.max(0, rowMin); ry <= Math.min(rows - 1, rowMax); ry++) {
    const y = by0 + ry * CELL;
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const [cxA] = cellOf(xs[i], y), [cxB] = cellOf(xs[i + 1], y);
      for (let cx = Math.max(0, cxA); cx <= Math.min(cols - 1, cxB); cx++) target[at(cx, ry)] = value;
    }
  }
}

// islands are land the mainland flood can never reach — fill them back in
let islands = 0;
for (const c of chains) {
  if (!c.closed) continue;
  fillRing(c.pts, land, 1);
  islands++;
}
// The coastline itself is land's edge, not a moat: reclaim the barrier cells
// that touch land, or every shore reads one brush-width too thin.
//
// AGAINST A SNAPSHOT, NOT IN PLACE. Reading and writing the same array in one
// scan lets a single reclaimed cell qualify its own neighbour, which cascades
// the length of any chain that touches land at even one point — it drew a
// 1-cell land thread straight out across open water, following a coastline
// the mainland flood had never reached. Caught by dumping the raster and
// zooming in, which is the third time that habit has paid for itself here.
const shoreOf = land.slice();
for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
  const i = at(cx, cy);
  if (!barrier[i] || land[i]) continue;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (inGrid(cx + dx, cy + dy) && shoreOf[at(cx + dx, cy + dy)]) { land[i] = 1; break; }
  }
}
// real inland water carved last, so it survives everything above
for (const a of water.areas || []) {
  if (!a.shape || a.shape.length < 3) continue;
  fillRing(a.shape.map(([lat, lon]) => toBoard(lat, lon)), land, 0);
}

// ── row runs, merged vertically ────────────────────────────────────────────
const rowRects = [];
for (let cy = 0; cy < rows; cy++) {
  let run = -1;
  for (let cx = 0; cx <= cols; cx++) {
    const isLand = cx < cols && land[at(cx, cy)];
    if (isLand && run < 0) run = cx;
    else if (!isLand && run >= 0) { rowRects.push([run, cy, cx - run, 1]); run = -1; }
  }
}
const byRow = new Map();
for (const r of rowRects) { if (!byRow.has(r[1])) byRow.set(r[1], []); byRow.get(r[1]).push(r); }
const merged = [];
const carry = new Map();
for (let cy = 0; cy < rows; cy++) {
  const seen = new Set();
  for (const r of byRow.get(cy) || []) {
    const k = `${r[0]},${r[2]}`;
    seen.add(k);
    if (carry.has(k)) carry.get(k)[3] += 1;
    else { const nr = [...r]; carry.set(k, nr); merged.push(nr); }
  }
  for (const k of [...carry.keys()]) if (!seen.has(k)) carry.delete(k);
}
const rects = merged.map(([cx, cy, cw, ch]) => [
  +(bx0 + cx * CELL).toFixed(1), +(by0 + cy * CELL).toFixed(1),
  +(cw * CELL).toFixed(1), +(ch * CELL).toFixed(1),
]);

if (process.env.LAND_DEBUG) {
  let n = 0;
  for (let i = 0; i < land.length; i++) if (land[i]) n++;
  const inside = (board.anchors || []).filter(a => {
    const [cx, cy] = cellOf(a.board.x, a.board.y);
    return inGrid(cx, cy) && land[at(cx, cy)];
  }).length;
  console.error(`grid ${cols}x${rows} cell ${CELL}`);
  console.error(`chains ${chains.length} (islands ${islands})  seeds ${seeded}`);
  console.error(`land cells ${n}/${cols * rows} (${(100 * n / (cols * rows)).toFixed(1)}%)  rects ${rects.length}`);
  console.error(`anchors on land ${inside}/${(board.anchors || []).length}`);
}
if (process.env.LAND_DUMP_RASTER) {
  const buf = Buffer.alloc(cols * rows);
  for (let i = 0; i < buf.length; i++) buf[i] = land[i] ? 200 : 40;
  process.stdout.write(Buffer.concat([Buffer.from(`P5\n${cols} ${rows}\n255\n`), buf]));
  process.exit(0);
}
console.log(JSON.stringify({ class: 'land', cellSize: CELL, rects }));
