#!/usr/bin/env node
/**
 * Real streets + real water -> real land, as merged rectangles in board space.
 *
 *   node map/tools/land-from-coastline.mjs > /tmp/land.json
 *
 * Reported directly, 2026-08-28: "the map is not aligned at all with real
 * maps, start from scratch with the PR layers and then add details."
 * Diagnosed by overlaying the hand-drawn `land-relief` "land" polygon
 * against the real coastline (`map/kallio-water-v1.json`) in the SAME board
 * space both already claim to share: the hand-drawn shape is a rough
 * rectangle that ignores the real bays, the island and the harbour
 * complexity entirely — real streets and transit lines were correctly
 * aligned to real coordinates, sitting on a silhouette that was not.
 *
 * THREE ATTEMPTS AT COASTLINE-ONLY FLOOD-FILL FAILED, in order, and the
 * failures are worth keeping because the next person will try the same
 * things: (1) seeding flood-fill from the grid's own border, wrong because
 * Kallio's north has no coastline nearby and the flood leaked across the
 * whole inland region unopposed; (2) seeding from a point offset to the
 * "sea side" of every coastline segment on the documented `natural=coastline`
 * convention that land is on the way's LEFT — wrong because real OSM data is
 * not perfectly consistent about winding direction, and one reversed way
 * among 27 flooded almost the entire grid from a seed that was actually on
 * land; (3) treating each closed water AREA's own outline as a barrier so a
 * flood seeded inside it could not escape onto surrounding land — safe, but
 * with no surviving way to seed the OPEN sea at all, "water" shrank to just
 * the explicit bay polygons and everything else, including real open water,
 * became "land". Three different, confident-looking wrong pictures, each
 * only caught by dumping the raster and looking at it rather than trusting
 * a cell count — worth naming because "the flood-fill count changed" was NOT
 * enough evidence on its own, twice.
 *
 * THE FIX IS A DIFFERENT SIGNAL, NOT A BETTER FLOOD-FILL. Real streets
 * (`map/kallio-streets-v1.json`) exist ONLY on land — no directionality to
 * get backwards, no open/closed distinction to reconcile. Land is:
 *
 *   1. within a buffer of a real street point, OR within a buffer of a real
 *      board anchor (parks, waterfronts and other real land the street
 *      layer under-samples still have an anchor sitting on them);
 *   2. AND NOT inside a real closed water area (the actual bays).
 *
 * The real coastline is drawn separately, as texture, in
 * `city_map.gd`'s `_draw_backing_and_water()` — it does not need to double
 * as the land mask too.
 *
 * Prints `{class:"land", cellSize, rects:[[x,y,w,h],...]}` to stdout.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const J = f => JSON.parse(readFileSync(path.join(root, f), 'utf8'));

const water = J('kallio-water-v1.json');
const streets = J('kallio-streets-v1.json');
const board = J('kallio-era1-2003-v1.json');
const CS = board.coordinateSystem;
const toBoard = (lat, lon) => [
  CS.board.offsetX + (lon - CS.origin.lon) * CS.metresPerDegree.lon / CS.board.metresPerUnit,
  CS.board.offsetY - (lat - CS.origin.lat) * CS.metresPerDegree.lat / CS.board.metresPerUnit,
];

const PAD = 60;
const gx0 = -PAD, gy0 = -PAD, gx1 = CS.board.width + PAD, gy1 = CS.board.height + PAD;
const CELL = 2.2; // board units per cell — ~5 m
const cols = Math.ceil((gx1 - gx0) / CELL), rows = Math.ceil((gy1 - gy0) / CELL);
const cell = (x, y) => [Math.round((x - gx0) / CELL), Math.round((y - gy0) / CELL)];
const at = (cx, cy) => cy * cols + cx;
const inGrid = (cx, cy) => cx >= 0 && cx < cols && cy >= 0 && cy < rows;

const land = new Uint8Array(cols * rows);

/** Paint a filled disc of radius `r` (board units) at every grid cell within
 *  it of (x,y) — used to buffer streets and anchors into "developed land". */
function stampDisc(x, y, r) {
  const rc = Math.ceil(r / CELL);
  const [cx, cy] = cell(x, y);
  for (let oy = -rc; oy <= rc; oy++) for (let ox = -rc; ox <= rc; ox++) {
    const gx = cx + ox, gy = cy + oy;
    if (!inGrid(gx, gy)) continue;
    if (ox * ox + oy * oy > rc * rc) continue;
    land[at(gx, gy)] = 1;
  }
}

function stampLine(a, b, r) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const steps = Math.max(1, Math.ceil(L / (CELL * 0.8)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    stampDisc(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r);
  }
}

// ── buffer real streets into land, wider for bigger roads (a motorway's own
// verge and the buildings that front it are more land than a footpath's) ───
const TIER_BUFFER = { major: 26, mid: 20, minor: 16 };
for (const r of streets.roads || []) {
  if (!r.shape || r.shape.length < 2) continue;
  const pts = r.shape.map(([lat, lon]) => toBoard(lat, lon));
  const buf = TIER_BUFFER[r.tier] || 16;
  for (let i = 1; i < pts.length; i++) stampLine(pts[i - 1], pts[i], buf);
}

// ── buffer board anchors too — real land the street layer under-samples
// (a park, a waterfront promenade) still has an anchor standing on it ──────
for (const a of board.anchors || []) {
  stampDisc(a.board.x, a.board.y, 55);
}

// ── carve out real closed water bodies — these are unambiguous regardless
// of any street or anchor buffer that happens to reach across them ─────────
function fillPolygon(pts, target, value) {
  let miny = Infinity, maxy = -Infinity;
  for (const [, y] of pts) { miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  const [, rowMin] = cell(0, miny), [, rowMax] = cell(0, maxy);
  for (let ry = Math.max(0, rowMin); ry <= Math.min(rows - 1, rowMax); ry++) {
    const y = gy0 + ry * CELL;
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        xs.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const [cxA] = cell(xs[i], y), [cxB] = cell(xs[i + 1], y);
      for (let cx = Math.max(0, cxA); cx <= Math.min(cols - 1, cxB); cx++) target[at(cx, ry)] = value;
    }
  }
}
// ── fill enclosed holes first. Buffering streets alone leaves a "swiss
// cheese" pattern — a city block with no road running through its own
// middle reads as a hole even though it obviously is not water, and no
// buffer radius closes every such gap without also fattening the coastline
// itself past recognition. Any "not yet land" pocket that does NOT touch
// the grid's own border cannot be open sea (open sea always reaches the
// edge of this box, or is one of the real closed water areas carved out
// explicitly below) — so it is land. ────────────────────────────────────────
{
  const seen = new Uint8Array(cols * rows);
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const idx = at(cx, cy);
    if (land[idx] || seen[idx]) continue;
    const comp = [idx];
    seen[idx] = 1;
    let touchesBorder = (cx === 0 || cy === 0 || cx === cols - 1 || cy === rows - 1);
    let qi = 0;
    while (qi < comp.length) {
      const ci = comp[qi++];
      const ccx = ci % cols, ccy = (ci - ccx) / cols;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = ccx + dx, ny = ccy + dy;
        if (!inGrid(nx, ny)) continue;
        if (nx === 0 || ny === 0 || nx === cols - 1 || ny === rows - 1) touchesBorder = true;
        const nidx = at(nx, ny);
        if (land[nidx] || seen[nidx]) continue;
        seen[nidx] = 1;
        comp.push(nidx);
      }
    }
    if (!touchesBorder) for (const ci of comp) land[ci] = 1;
  }
}

// ── carve out real closed water bodies, AFTER hole-filling, so the actual
// bays survive it regardless of how the street buffer alone would have read
// them ───────────────────────────────────────────────────────────────────
for (const a of water.areas || []) {
  const pts = a.shape.map(([lat, lon]) => toBoard(lat, lon));
  fillPolygon(pts, land, 0);
}

// ── row-run merge, then vertical merge of matching runs — see the note in
// the module header: rectangles, not a traced outline, on purpose. ─────────
const rowRects = [];
for (let cy = 0; cy < rows; cy++) {
  let runStart = -1;
  for (let cx = 0; cx <= cols; cx++) {
    const isLand = cx < cols && land[at(cx, cy)];
    if (isLand && runStart < 0) runStart = cx;
    else if (!isLand && runStart >= 0) { rowRects.push([runStart, cy, cx - runStart, 1]); runStart = -1; }
  }
}
const byRow = new Map();
for (const r of rowRects) { if (!byRow.has(r[1])) byRow.set(r[1], []); byRow.get(r[1]).push(r); }
const merged = [];
const carry = new Map();
for (let cy = 0; cy < rows; cy++) {
  const here_ = byRow.get(cy) || [];
  const seen = new Set();
  for (const r of here_) {
    const key = `${r[0]},${r[2]}`;
    seen.add(key);
    if (carry.has(key)) { carry.get(key)[3] += 1; }
    else { const nr = [...r]; carry.set(key, nr); merged.push(nr); }
  }
  for (const key of [...carry.keys()]) if (!seen.has(key)) carry.delete(key);
}

const rects = merged.map(([cx, cy, cw, ch]) => [
  +(gx0 + cx * CELL).toFixed(1), +(gy0 + cy * CELL).toFixed(1),
  +(cw * CELL).toFixed(1), +(ch * CELL).toFixed(1),
]);

if (process.env.LAND_DEBUG) {
  let landCells = 0;
  for (let i = 0; i < land.length; i++) if (land[i]) landCells++;
  console.error(`grid ${cols}x${rows}  land cells ${landCells}  rects ${rects.length}`);
}
if (process.env.LAND_DUMP_RASTER) {
  const header = `P5\n${cols} ${rows}\n255\n`;
  const buf = Buffer.alloc(cols * rows);
  for (let i = 0; i < buf.length; i++) buf[i] = land[i] ? 200 : 40;
  process.stdout.write(Buffer.concat([Buffer.from(header), buf]));
  process.exit(0);
}

console.log(JSON.stringify({ class: 'land', cellSize: CELL, rects }));
