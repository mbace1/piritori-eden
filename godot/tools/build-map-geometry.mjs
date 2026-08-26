#!/usr/bin/env node
/**
 * build-map-geometry.mjs — turn the canonical structural SVG into layer data,
 * then REPLACE the public-transit layer with real HSL line geometry, and add
 * real land, real water and real streets alongside it.
 *
 * MAP.md §6 requires the map to be built from SEPARATE source groups
 * ("coastline, roads, rail, districts and labels are separate source groups",
 * "dynamic routes never bake into the relief artwork"), so the SVG cannot be
 * rasterised as one picture. This flattens its geometry into polylines in
 * BOARD coordinates, keeping each artLayer group and each style class intact.
 *
 * The inner coordinates of #map-geometry ARE board coordinates — node-siltasaari
 * sits at translate(439 835) and the JSON anchor is board (439.14, 834.73) — so
 * the group's own translate/scale is deliberately NOT applied.
 *
 * THE TRANSIT LINES ARE NOT FROM THE SVG. The hand-drawn `public-transit`
 * group carried three crude polylines and three number chips whose LABEL TEXT
 * this tool never even extracted (`collect()` reads path/circle/rect, never
 * `<text>`) — so even what existed here was invisible in play (reported
 * directly, 2026-08-27: "the map should look much closer to [a real HSL
 * network map]... you should have gotten the basics in a PR earlier"). The
 * real basics already exist: `map/kallio-rail-v1.json` is genuine GTFS
 * geometry for the seven services that actually serve Kallio
 * (`TRANSIT_LAYERS.md` §10.5), and `map/tools/master-plate.mjs` already
 * implements the fanning that separates them where they share a street. This
 * tool ports that algorithm (§9's Era I "printed" treatment: flat colour,
 * numbered paper chips) into BOARD space instead of plate-pixel space, so the
 * SAME real network the offline plates draw is what the game draws.
 *
 * THE LAND IS NOT FROM THE SVG EITHER, ANY MORE. Reported directly,
 * 2026-08-28: "the map is not aligned at all with real maps, start from
 * scratch with the PR layers and then add details." Overlaying the
 * hand-drawn `land-relief` "land" polygon against the real coastline showed
 * why: a rough rectangle that ignores every real bay, the island and the
 * harbour complexity, while everything drawn on top of it (streets, transit)
 * was already real and correctly positioned — sitting on a silhouette that
 * was not. `buildRealLand()` below derives the real shape from real streets
 * and real anchors instead (see that function's own comment for why not a
 * coastline trace, which was tried three different ways and is worth reading
 * before trying a fourth).
 *
 *   node tools/build-map-geometry.mjs           write data/map-geometry.json
 *   node tools/build-map-geometry.mjs --check   fail if it would change
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const godotRoot = resolve(here, '..');
const piritori = resolve(godotRoot, '..');
const SVG = resolve(piritori, 'map/kallio-era1-2003-v1.svg');
const RAIL = resolve(piritori, 'map/kallio-rail-v1.json');
const WATER = resolve(piritori, 'map/kallio-water-v1.json');
const STREETS = resolve(piritori, 'map/kallio-streets-v1.json');
const BOARD_JSON = resolve(piritori, 'map/kallio-era1-2003-v1.json');
const OUT = resolve(godotRoot, 'data/map-geometry.json');

/** Layer groups we lift, in MAP.md §6 back-to-front order. */
const LAYERS = [
  'land-relief',
  'minor-blocks',
  'rail-and-roads',
  'public-transit',
  'ordinary-flow',
];

const CURVE_STEPS = 14;

// ── tiny transform helpers ────────────────────────────────────────────────
const ident = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
const mul = (m, n) => ({
  a: m.a * n.a + m.c * n.b,
  b: m.b * n.a + m.d * n.b,
  c: m.a * n.c + m.c * n.d,
  d: m.b * n.c + m.d * n.d,
  e: m.a * n.e + m.c * n.f + m.e,
  f: m.b * n.e + m.d * n.f + m.f,
});
const apply = (m, x, y) => [
  +(m.a * x + m.c * y + m.e).toFixed(2),
  +(m.b * x + m.d * y + m.f).toFixed(2),
];

function parseTransform(str) {
  let m = ident();
  if (!str) return m;
  for (const t of str.matchAll(/(translate|scale|rotate)\s*\(([^)]*)\)/g)) {
    const n = t[2].trim().split(/[\s,]+/).map(Number);
    if (t[1] === 'translate') m = mul(m, { ...ident(), e: n[0] || 0, f: n[1] || 0 });
    else if (t[1] === 'scale') m = mul(m, { ...ident(), a: n[0] ?? 1, d: n[1] ?? n[0] ?? 1 });
    else if (t[1] === 'rotate') {
      const r = ((n[0] || 0) * Math.PI) / 180;
      m = mul(m, { a: Math.cos(r), b: Math.sin(r), c: -Math.sin(r), d: Math.cos(r), e: 0, f: 0 });
    }
  }
  return m;
}

// ── path data -> array of polylines ───────────────────────────────────────
function parsePath(d) {
  const toks = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?[\d.]+(?:e-?\d+)?/g) || [];
  const subs = [];
  let cur = [];
  let x = 0, y = 0, sx = 0, sy = 0;
  let px = null, py = null;   // last control point, for S/T
  let cmd = '';
  let i = 0;

  const num = () => parseFloat(toks[i++]);
  const push = () => { if (cur.length > 1) subs.push(cur); cur = []; };

  const cubic = (x1, y1, x2, y2, ex, ey) => {
    for (let s = 1; s <= CURVE_STEPS; s++) {
      const t = s / CURVE_STEPS, u = 1 - t;
      cur.push([
        u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex,
        u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey,
      ]);
    }
    px = x2; py = y2; x = ex; y = ey;
  };
  const quad = (x1, y1, ex, ey) => {
    for (let s = 1; s <= CURVE_STEPS; s++) {
      const t = s / CURVE_STEPS, u = 1 - t;
      cur.push([u * u * x + 2 * u * t * x1 + t * t * ex, u * u * y + 2 * u * t * y1 + t * t * ey]);
    }
    px = x1; py = y1; x = ex; y = ey;
  };

  while (i < toks.length) {
    if (/[A-Za-z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();

    if (C === 'M') {
      push();
      const nx = num(), ny = num();
      x = rel ? x + nx : nx; y = rel ? y + ny : ny;
      sx = x; sy = y; cur = [[x, y]]; px = py = null;
      cmd = rel ? 'l' : 'L';
    } else if (C === 'L') {
      const nx = num(), ny = num();
      x = rel ? x + nx : nx; y = rel ? y + ny : ny;
      cur.push([x, y]); px = py = null;
    } else if (C === 'H') {
      const nx = num(); x = rel ? x + nx : nx; cur.push([x, y]); px = py = null;
    } else if (C === 'V') {
      const ny = num(); y = rel ? y + ny : ny; cur.push([x, y]); px = py = null;
    } else if (C === 'C') {
      const x1 = rel ? x + num() : num(), y1 = rel ? y + num() : num();
      const x2 = rel ? x + num() : num(), y2 = rel ? y + num() : num();
      const ex = rel ? x + num() : num(), ey = rel ? y + num() : num();
      cubic(x1, y1, x2, y2, ex, ey);
    } else if (C === 'S') {
      const rx = px === null ? x : 2 * x - px;
      const ry = py === null ? y : 2 * y - py;
      const x2 = rel ? x + num() : num(), y2 = rel ? y + num() : num();
      const ex = rel ? x + num() : num(), ey = rel ? y + num() : num();
      cubic(rx, ry, x2, y2, ex, ey);
    } else if (C === 'Q') {
      const x1 = rel ? x + num() : num(), y1 = rel ? y + num() : num();
      const ex = rel ? x + num() : num(), ey = rel ? y + num() : num();
      quad(x1, y1, ex, ey);
    } else if (C === 'T') {
      const rx = px === null ? x : 2 * x - px;
      const ry = py === null ? y : 2 * y - py;
      const ex = rel ? x + num() : num(), ey = rel ? y + num() : num();
      quad(rx, ry, ex, ey);
    } else if (C === 'Z') {
      if (cur.length > 1) { cur.push([sx, sy]); cur.closed = true; }
      push();
      x = sx; y = sy;
    } else {
      i++; // unsupported command: skip a token rather than spin
    }
  }
  push();
  return subs;
}

// ── walk the SVG ──────────────────────────────────────────────────────────
const svg = readFileSync(SVG, 'utf8');
const out = { source: 'map/kallio-era1-2003-v1.svg', space: 'board', layers: {} };

/** Extract the inner XML of a group by id, balancing nested <g>. */
function groupBody(src, id) {
  const open = src.indexOf(`<g id="${id}"`);
  if (open < 0) return null;
  const start = src.indexOf('>', open) + 1;
  let depth = 1, i = start;
  while (depth > 0 && i < src.length) {
    const ng = src.indexOf('<g', i);
    const cg = src.indexOf('</g>', i);
    if (cg < 0) break;
    if (ng >= 0 && ng < cg) { depth++; i = ng + 2; }
    else { depth--; i = cg + 4; }
  }
  return src.slice(start, i - 4);
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
}

/** Collect shapes from a chunk, honouring nested group transforms. */
function collect(chunk, base, items) {
  // nested groups first
  let rest = chunk;
  const nested = [];
  let guard = 0;
  while (guard++ < 500) {
    const gi = rest.indexOf('<g');
    if (gi < 0) break;
    const gEnd = rest.indexOf('>', gi);
    const tag = rest.slice(gi, gEnd + 1);
    // find matching close
    let depth = 1, i = gEnd + 1;
    while (depth > 0 && i < rest.length) {
      const ng = rest.indexOf('<g', i);
      const cg = rest.indexOf('</g>', i);
      if (cg < 0) break;
      if (ng >= 0 && ng < cg) { depth++; i = ng + 2; }
      else { depth--; i = cg + 4; }
    }
    nested.push([tag, rest.slice(gEnd + 1, i - 4)]);
    rest = rest.slice(0, gi) + rest.slice(i);
  }

  for (const tag of rest.match(/<path[^>]*\/?>/g) || []) {
    const d = attr(tag, 'd');
    if (!d) continue;
    const cls = attr(tag, 'class') || '';
    const fill = attr(tag, 'fill');
    const stroke = attr(tag, 'stroke');
    const op = attr(tag, 'opacity');
    for (const sub of parsePath(d)) {
      items.push({
        kind: 'poly',
        class: cls,
        closed: !!sub.closed,
        ...(fill ? { fill } : {}),
        ...(stroke ? { stroke } : {}),
        ...(op ? { opacity: +op } : {}),
        points: sub.map(([x, y]) => apply(base, x, y)).flat(),
      });
    }
  }

  for (const tag of rest.match(/<circle[^>]*\/?>/g) || []) {
    const [cx, cy, r] = ['cx', 'cy', 'r'].map((k) => parseFloat(attr(tag, k) || '0'));
    items.push({
      kind: 'circle', class: attr(tag, 'class') || '',
      ...(attr(tag, 'fill') ? { fill: attr(tag, 'fill') } : {}),
      pos: apply(base, cx, cy), r: +(r * Math.abs(base.a)).toFixed(2),
    });
  }

  for (const tag of rest.match(/<rect[^>]*\/?>/g) || []) {
    const x = parseFloat(attr(tag, 'x') || '0'), y = parseFloat(attr(tag, 'y') || '0');
    const w = parseFloat(attr(tag, 'width') || '0'), h = parseFloat(attr(tag, 'height') || '0');
    items.push({
      kind: 'rect', class: attr(tag, 'class') || '',
      ...(attr(tag, 'fill') ? { fill: attr(tag, 'fill') } : {}),
      pos: apply(base, x, y), size: [+(w * Math.abs(base.a)).toFixed(2), +(h * Math.abs(base.d)).toFixed(2)],
    });
  }

  for (const [tag, body] of nested) {
    collect(body, mul(base, parseTransform(attr(tag, 'transform'))), items);
  }
}

// ── real transit lines, ported from map/tools/master-plate.mjs's L2 ────────
//
// Same source, same colours, same fanning algorithm as the offline plates —
// just projected into BOARD units instead of plate pixels, so the picture
// the game draws is the same network the plates already prove out.

// 1/6/7 are Wikidata's published values; 3 is deepened off #007fc1 to clear
// line 1, which runs beside it down Helsinginkatu; 8 and 9 have no published
// colour anywhere. NOT HSL's own scheme — HSL draws every tram one green.
const LINE_HUE = {
  M: '#ff6319',
  1: '#00b4e5', 3: '#0b5299', 6: '#009757',
  7: '#d5007f', 8: '#8a5cf0', 9: '#b8d430',
};

function buildTransitLines() {
  const rail = JSON.parse(readFileSync(RAIL, 'utf8'));
  const board = JSON.parse(readFileSync(BOARD_JSON, 'utf8'));
  const CS = board.coordinateSystem;

  // wgs84 -> board. The inverse of the `fromBoard` this repo's plate tools
  // already use — checked against every anchor's own recorded (wgs84, board)
  // pair, which agree to two decimals.
  const toBoard = (lat, lon) => [
    CS.board.offsetX + (lon - CS.origin.lon) * CS.metresPerDegree.lon / CS.board.metresPerUnit,
    CS.board.offsetY - (lat - CS.origin.lat) * CS.metresPerDegree.lat / CS.board.metresPerUnit,
  ];

  // Same filter as master-plate.mjs's Era I sheet: direction 0 only (the
  // return leg is the same street drawn twice), and only lines that actually
  // pass a board anchor — TRANSIT_LAYERS.md §10.5's measured finding that
  // trams 2, 4, 5 and 10 reach the extract box but never enter Kallio.
  // Every metro branch (M1 toward Vuosaari, M2 toward Mellunmäki, ...) runs
  // the SAME physical tunnel through the Kallio band — `anchorSequence` is
  // identical for each. Keeping every branch would draw the same line N
  // times; one representative is the real geometry.
  // Reported directly, 2026-08-27: "the 1 and 1T stops look like way too
  // many, just take out 1T and see if the others are real" — a diagnostic
  // cut, not a data correction (1T IS a real HSL short working). Named
  // rather than silently dropped, so it is easy to reverse.
  const EXCLUDED_SERVICES = new Set(['1T']);
  const seenMetro = new Set();
  const served = rail.lines.filter((l) => {
    if (l.direction !== 0 || !l.anchorSequence.length) return false;
    if (EXCLUDED_SERVICES.has(l.service)) return false;
    if (l.mode !== 'metro') return true;
    if (seenMetro.has(l.mode)) return false;
    seenMetro.add(l.mode);
    return true;
  });
  const key = (l) => (l.mode === 'metro' ? 'M' : l.service);
  // A short working ("1T", "8T", "9N") is the same coloured service as its
  // base number, just a shortened run — the chip label keeps the letter, the
  // colour does not.
  const baseKey = (l) => (l.mode === 'metro' ? 'M' : l.service.replace(/[A-Za-z]+$/, ''));
  const px = (shape) => shape.map(([lat, lon]) => toBoard(lat, lon));

  // ── fan shared corridors into parallel strands (verbatim algorithm from
  // master-plate.mjs, recalibrated from plate pixels to board units) ──────
  const STEP = 6, GAP = 2.6, NEAR = 4.3, SMOOTH = 17;
  function resample(pts, step) {
    const out = [pts[0]];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const L = Math.hypot(x1 - x0, y1 - y0);
      if (!L) continue;
      for (let t = step - carry; t < L; t += step) out.push([x0 + (x1 - x0) * t / L, y0 + (y1 - y0) * t / L]);
      carry = (carry + L) % step;
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  const gridIndex = (pts) => {
    const g = new Map();
    for (const [x, y] of pts) {
      const k = `${Math.round(x / NEAR)},${Math.round(y / NEAR)}`;
      if (!g.has(k)) g.set(k, []);
      g.get(k).push([x, y]);
    }
    return g;
  };
  const hit = (g, x, y) => {
    const cx = Math.round(x / NEAR), cy = Math.round(y / NEAR);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++)
      for (const [qx, qy] of g.get(`${cx + a},${cy + b}`) || [])
        if (Math.hypot(qx - x, qy - y) <= NEAR) return true;
    return false;
  };
  function bundle(sampled) {
    const idx = new Map([...sampled].map(([k, p]) => [k, gridIndex(p)]));
    const keys = [...sampled.keys()], out = new Map();
    for (const k of keys) {
      const pts = sampled.get(k);
      const raw = pts.map(([x, y]) => {
        const set = keys.filter((o) => o === k || hit(idx.get(o), x, y));
        return (set.indexOf(k) - (set.length - 1) / 2) * GAP;
      });
      const off = raw.map((_, i) => {
        let a = 0, n = 0;
        for (let j = Math.max(0, i - SMOOTH); j <= Math.min(raw.length - 1, i + SMOOTH); j++) { a += raw[j]; n++; }
        return a / n;
      });
      out.set(k, pts.map(([x, y], i) => {
        const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)];
        const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
        return [x - dy / L * off[i], y + dx / L * off[i]];
      }));
    }
    return out;
  }

  // The metro is in a tunnel: it shares no street track, so fanning it into
  // the surface bundle would be a lie about the geometry (same reasoning as
  // master-plate.mjs). Drawn on its own, unfanned.
  const surface = served.filter((l) => l.mode !== 'metro');
  const metros = served.filter((l) => l.mode === 'metro');
  const strands = bundle(new Map(surface.map((l) => [l.id, resample(px(l.shape), STEP)])));
  const lineById = new Map(served.map((l) => [l.id, l]));

  // ── number chips, spaced along the arc and kept off anchors and each other
  const CHIP_EVERY = 90, CHIP_CLEAR = 22;
  const placedChips = board.anchors.map((a) => [a.board.x, a.board.y]);
  function chipsFor(pts) {
    const out = [];
    let arc = 0, next = 40;
    for (let i = 1; i < pts.length; i++) {
      arc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (arc < next) continue;
      const [x, y] = pts[i];
      if (!placedChips.some(([px_, py_]) => Math.hypot(px_ - x, py_ - y) < CHIP_CLEAR)) {
        placedChips.push([x, y]);
        out.push([+x.toFixed(2), +y.toFixed(2)]);
      }
      next = arc + CHIP_EVERY;
    }
    return out;
  }

  const items = [];
  for (const l of metros) {
    items.push({
      kind: 'transit-line', service: key(l), mode: l.mode, colour: LINE_HUE[baseKey(l)] || '#999',
      points: px(l.shape).flat().map((n) => +n.toFixed(2)),
      chips: chipsFor(px(l.shape)),
    });
  }
  for (const [id, pts] of strands) {
    const l = lineById.get(id);
    items.push({
      kind: 'transit-line', service: key(l), mode: l.mode, colour: LINE_HUE[baseKey(l)] || '#999',
      points: pts.flat().map((n) => +n.toFixed(2)),
      chips: chipsFor(pts),
    });
  }
  return items;
}


// ── real coastline, ported from map/tools/master-plate.mjs's L−1 water ─────
//
// Reported directly, 2026-08-27: "it looks like it's just water now around
// Kallio, make it more realistic" — the backing behind the board was one
// flat rect. `map/kallio-water-v1.json` is real OSM coastline for this exact
// box (§11.2), already proven on the offline plates; this projects it into
// board space the same way the transit lines were. This is texture only —
// `buildRealLand()` below, not this function, decides what counts as land.
function buildWaterOverlay() {
  if (!existsSync(WATER)) return [];
  const water = JSON.parse(readFileSync(WATER, 'utf8'));
  const board = JSON.parse(readFileSync(BOARD_JSON, 'utf8'));
  const CS = board.coordinateSystem;
  const toBoard = (lat, lon) => [
    CS.board.offsetX + (lon - CS.origin.lon) * CS.metresPerDegree.lon / CS.board.metresPerUnit,
    CS.board.offsetY - (lat - CS.origin.lat) * CS.metresPerDegree.lat / CS.board.metresPerUnit,
  ];
  const px = (shape) => shape.map(([lat, lon]) => toBoard(lat, lon)).flat().map((n) => +n.toFixed(2));

  // Godot's polygon fill triangulates every area — a shape with fewer than
  // three DISTINCT points after projection (a closed 3-point OSM way whose
  // first and last point round to the same board pixel, seen on a few of the
  // small decorative ponds/fountains this same fetch also picked up) has zero
  // area and fails triangulation every single frame it is drawn, spamming
  // "Invalid polygon data" — found running the gate suite, not asked for, so
  // named here rather than silently swept in with the fit-boundary fix.
  function hasArea(shape) {
    const pts = px(shape);
    const n = pts.length / 2;
    if (n < 3) return false;
    let area = 0;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = [pts[i * 2], pts[i * 2 + 1]];
      const j = (i + 1) % n;
      const [x2, y2] = [pts[j * 2], pts[j * 2 + 1]];
      area += x1 * y2 - x2 * y1;
    }
    return Math.abs(area) > 0.01;
  }
  // Two of the small unnamed ponds also failed triangulation with a positive
  // area — self-intersecting, not just degenerate. Whatever the raw OSM way
  // actually traces (worth a look some day, filed to QUEUE.md), it is not a
  // simple polygon and Godot's fill cannot triangulate it, so it is skipped
  // here on the same "do not ship what breaks every frame" basis as hasArea.
  function isSimple(shape) {
    const pts = px(shape);
    const n = pts.length / 2;
    const at = (i) => [pts[i * 2], pts[i * 2 + 1]];
    const ccw = (a, b, c) => (c[1] - a[1]) * (b[0] - a[0]) - (b[1] - a[1]) * (c[0] - a[0]);
    // Strict opposite-sign test only — a shared/touching vertex or a
    // collinear run (common and legitimate along a straightened OSM way)
    // scores a zero and must NOT count as a crossing, or almost every real
    // polygon gets flagged.
    const segCross = (a, b, c, d) => {
      const d1 = ccw(c, d, a), d2 = ccw(c, d, b), d3 = ccw(a, b, c), d4 = ccw(a, b, d);
      return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
    };
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
        if (segCross(at(i), at((i + 1) % n), at(j), at((j + 1) % n))) return false;
      }
    }
    return true;
  }

  const items = [];
  // Inland bays (Eläintarhanlahti, Töölönlahti) are closed ways — filled.
  for (const a of water.areas || []) {
    if (a.shape && a.shape.length >= 3 && hasArea(a.shape) && isSimple(a.shape)) {
      items.push({ kind: 'water-area', points: px(a.shape) });
    }
  }
  // The open sea is `natural=coastline` in OSM: a directed open way with land
  // on its left, not a closed polygon (closing it would lay a lid across the
  // harbour mouth) — stroked, the same choice the plates already made.
  for (const e of water.edges || []) {
    if (e.shape && e.shape.length >= 2) items.push({ kind: 'coastline', points: px(e.shape) });
  }
  return items;
}

// ── real land, from the REAL COASTLINE — public OSM data, nothing invented ─
//
// Reported directly, 2026-08-26: "the map, it's clearly not made from scratch
// since you can still see the squares under", then "just use public data to
// make the map look good and useful. trying to fake it will show."
//
// Both were right about the version this replaces, which derived land from a
// BUFFER AROUND REAL STREETS. That looked plausible and was correctly
// aligned, but could never have a shoreline: the real coastline was only a
// decorative stroke and never cut anything. 182 of its 850 rectangles sat
// flush against the derivation grid's own pad edge, chopped off flat — that
// flat chop was the visible "square".
//
// Three earlier coastline flood-fills failed, and all three failed on the
// same missing thing: NO TRUSTWORTHY SEED. Each guessed where open sea was —
// from the grid border, or from OSM's "land is on the way's LEFT" winding
// convention — and each guess was wrong somewhere. The seed was in canon all
// along: `kallio-era1-2003-v1.json`'s 14 board anchors are real places in
// Kallio standing on real ground. So:
//
//   BARRIER = real coastline (chained), real island rings, real inland water.
//   SEED    = the 14 canonical anchors, known land by authorship.
//   LAND    = everything the flood reaches from them.
//
// Nothing is guessed. The flood cannot leak into the sea (the coastline stops
// it) and cannot start in the sea (it starts on authored ground). Where the
// mainland genuinely continues past the fetch box — the inland north and
// west, which have no coastline at all — the flood reaches the grid edge and
// stops, which is correct: that is a map edge, not a shore, drawn off-screen.
//
// DO NOT RETRY, each already failed and cost a session:
//   (1) seeding from the grid border (Kallio's north has no coastline, so the
//       flood leaked across the whole inland region);
//   (2) seeding from the "sea side" of each segment per OSM's left-hand
//       convention (one reversed way among 27 seeded on land and flooded
//       almost the entire grid);
//   (3) using each water area's outline as a barrier with no open-sea seed
//       (everything but the explicit bays then read as land).
//
// `map/tools/land-from-coastline.mjs` is the standalone twin of this, with
// LAND_DEBUG=1 and LAND_DUMP_RASTER=1 for dumping the raster and LOOKING at
// it. Use it before believing a cell count — the counts moved plausibly
// during all three failures above, and during a fourth bug caught this round
// (a shore-reclaim pass that read and wrote one array in a single scan, so a
// single touching cell cascaded a 1-cell land thread out across open water).
// Keep the two files in sync BY HAND.
function buildRealLand() {
  const board = JSON.parse(readFileSync(BOARD_JSON, 'utf8'));
  const water = existsSync(WATER)
    ? JSON.parse(readFileSync(WATER, 'utf8'))
    : { edges: [], areas: [] };
  const CS = board.coordinateSystem;
  const toBoard = (lat, lon) => [
    CS.board.offsetX + (lon - CS.origin.lon) * CS.metresPerDegree.lon / CS.board.metresPerUnit,
    CS.board.offsetY - (lat - CS.origin.lat) * CS.metresPerDegree.lat / CS.board.metresPerUnit,
  ];

  // OSM serves `natural=coastline` as many separate ways sharing endpoints.
  // Chained head-to-tail they are the actual shoreline; left loose they are
  // 27 strokes with gaps a flood pours straight through. 25 of the 27 join
  // cleanly; the 2 loose tails are where the fetch box cut the data.
  const edges = water.edges || [];
  const keyOf = (p) => p[0].toFixed(7) + ',' + p[1].toFixed(7);
  const byHead = new Map();
  edges.forEach((e, i) => byHead.set(keyOf(e.shape[0]), i));
  const tailSet = new Set(edges.map((e) => keyOf(e.shape[e.shape.length - 1])));
  const usedWay = new Set();
  const walkFrom = (start) => {
    let pts = [];
    let cur = start;
    while (cur !== undefined && !usedWay.has(cur)) {
      usedWay.add(cur);
      const s = edges[cur].shape;
      pts = pts.length ? pts.concat(s.slice(1)) : s.slice();
      cur = byHead.get(keyOf(s[s.length - 1]));
    }
    return pts;
  };
  const chains = [];
  edges.forEach((e, i) => {
    if (usedWay.has(i) || tailSet.has(keyOf(e.shape[0]))) return;
    chains.push({ closed: false, pts: walkFrom(i) });
  });
  edges.forEach((e, i) => {          // leftovers are closed rings: real islands
    if (usedWay.has(i)) return;
    chains.push({ closed: true, pts: walkFrom(i) });
  });
  for (const c of chains) c.pts = c.pts.map(([lat, lon]) => toBoard(lat, lon));

  // The grid IS the real data box. A pad beyond the data is exactly what let
  // the previous version chop the shape flat — the coastline ended at the
  // fetch edge and the flood walked around its end through the empty pad.
  let gx0 = Infinity, gy0 = Infinity, gx1 = -Infinity, gy1 = -Infinity;
  const see = ([x, y]) => {
    gx0 = Math.min(gx0, x); gx1 = Math.max(gx1, x);
    gy0 = Math.min(gy0, y); gy1 = Math.max(gy1, y);
  };
  for (const c of chains) c.pts.forEach(see);
  for (const a of water.areas || []) a.shape.forEach(([lat, lon]) => see(toBoard(lat, lon)));
  for (const a of board.anchors || []) see([a.board.x, a.board.y]);

  const CELL = 1.2;                  // board units per cell — under 3 m
  const cols = Math.ceil((gx1 - gx0) / CELL) + 1;
  const rows = Math.ceil((gy1 - gy0) / CELL) + 1;
  const cellOf = (x, y) => [Math.round((x - gx0) / CELL), Math.round((y - gy0) / CELL)];
  const at = (cx, cy) => cy * cols + cx;
  const inGrid = (cx, cy) => cx >= 0 && cx < cols && cy >= 0 && cy < rows;

  const barrier = new Uint8Array(cols * rows);
  const land = new Uint8Array(cols * rows);

  const stamp = (arr, x, y, v) => {
    const [cx, cy] = cellOf(x, y);
    // 3x3 brush: a 1-cell line leaks diagonally under a 4-way flood
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (inGrid(cx + ox, cy + oy)) arr[at(cx + ox, cy + oy)] = v;
      }
    }
  };
  const stampLine = (arr, a, b, v) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.ceil(L / (CELL * 0.5)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      stamp(arr, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, v);
    }
  };
  const stampPath = (arr, pts, v, close) => {
    for (let i = 1; i < pts.length; i++) stampLine(arr, pts[i - 1], pts[i], v);
    if (close && pts.length > 2) stampLine(arr, pts[pts.length - 1], pts[0], v);
  };
  // Push an open chain's ends out to the nearest grid edge so the shoreline
  // seals against the frame instead of leaving a gap the flood walks around.
  const extendToEdge = ([x, y]) => {
    const d = [x - gx0, gx1 - x, y - gy0, gy1 - y];
    const m = Math.min(...d);
    if (m === d[0]) return [gx0 - CELL, y];
    if (m === d[1]) return [gx1 + CELL, y];
    if (m === d[2]) return [x, gy0 - CELL];
    return [x, gy1 + CELL];
  };

  for (const c of chains) {
    stampPath(barrier, c.pts, 1, c.closed);
    if (!c.closed) {
      stampLine(barrier, c.pts[0], extendToEdge(c.pts[0]), 1);
      stampLine(barrier, c.pts[c.pts.length - 1], extendToEdge(c.pts[c.pts.length - 1]), 1);
    }
  }
  for (const a of water.areas || []) {
    if (!a.shape || a.shape.length < 3) continue;
    stampPath(barrier, a.shape.map(([lat, lon]) => toBoard(lat, lon)), 1, true);
  }

  // flood from authored ground, not from a guess about where the sea is
  const queue = [];
  for (const a of board.anchors || []) {
    const [cx, cy] = cellOf(a.board.x, a.board.y);
    if (!inGrid(cx, cy)) continue;
    const i = at(cx, cy);
    if (barrier[i] || land[i]) continue;
    land[i] = 1;
    queue.push(i);
  }
  let qi = 0;
  while (qi < queue.length) {
    const ci = queue[qi++];
    const cx = ci % cols;
    const cy = (ci - cx) / cols;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!inGrid(nx, ny)) continue;
      const ni = at(nx, ny);
      if (barrier[ni] || land[ni]) continue;
      land[ni] = 1;
      queue.push(ni);
    }
  }

  const fillRing = (pts, target, v) => {
    let miny = Infinity, maxy = -Infinity;
    for (const [, y] of pts) { miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    const [, rowMin] = cellOf(0, miny);
    const [, rowMax] = cellOf(0, maxy);
    for (let ry = Math.max(0, rowMin); ry <= Math.min(rows - 1, rowMax); ry++) {
      const y = gy0 + ry * CELL;
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          xs.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const [cxA] = cellOf(xs[i], y);
        const [cxB] = cellOf(xs[i + 1], y);
        for (let cx = Math.max(0, cxA); cx <= Math.min(cols - 1, cxB); cx++) {
          target[at(cx, ry)] = v;
        }
      }
    }
  };

  // islands are land the mainland flood can never reach — fill them back in
  for (const c of chains) if (c.closed) fillRing(c.pts, land, 1);

  // The coastline is land's edge, not a moat: reclaim barrier cells touching
  // land, or every shore reads a brush-width thin. AGAINST A SNAPSHOT — doing
  // it in place lets a reclaimed cell qualify its own neighbour and cascade a
  // 1-cell land thread out across open water along any chain that touches
  // land once. That bug shipped invisibly until the raster was zoomed into.
  const shoreSnapshot = land.slice();
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const i = at(cx, cy);
      if (!barrier[i] || land[i]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (inGrid(cx + dx, cy + dy) && shoreSnapshot[at(cx + dx, cy + dy)]) {
          land[i] = 1;
          break;
        }
      }
    }
  }
  // real inland water carved last, so the bays survive everything above
  for (const a of water.areas || []) {
    if (!a.shape || a.shape.length < 3) continue;
    fillRing(a.shape.map(([lat, lon]) => toBoard(lat, lon)), land, 0);
  }

  // row runs, merged vertically
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
  for (const r of rowRects) {
    if (!byRow.has(r[1])) byRow.set(r[1], []);
    byRow.get(r[1]).push(r);
  }
  const merged = [];
  const carry = new Map();
  for (let cy = 0; cy < rows; cy++) {
    const seenKeys = new Set();
    for (const r of byRow.get(cy) || []) {
      const key = r[0] + ',' + r[2];
      seenKeys.add(key);
      if (carry.has(key)) carry.get(key)[3] += 1;
      else { const nr = [...r]; carry.set(key, nr); merged.push(nr); }
    }
    for (const key of [...carry.keys()]) if (!seenKeys.has(key)) carry.delete(key);
  }

  // A gate that cannot fail is not a gate: every authored anchor must end up
  // on land, or the barrier/seed logic is wrong and this must not ship.
  const total = (board.anchors || []).length;
  const onLand = (board.anchors || []).filter((a) => {
    const [cx, cy] = cellOf(a.board.x, a.board.y);
    return inGrid(cx, cy) && land[at(cx, cy)];
  }).length;
  if (onLand !== total) {
    throw new Error('land derivation put ' + (total - onLand) + ' anchor(s) in water — ' +
      'the coastline barrier or the seed set is wrong, do not ship this');
  }

  return merged.map(([cx, cy, cw, ch]) => ({
    kind: 'rect',
    pos: [+(gx0 + cx * CELL).toFixed(1), +(gy0 + cy * CELL).toFixed(1)],
    size: [+(cw * CELL).toFixed(1), +(ch * CELL).toFixed(1)],
  }));
}

/** Point-in-any-rect — land is real rectangles now, not one hand-drawn shape. */
function pointOnLand(x, y, rects) {
  for (const r of rects) {
    if (x >= r.pos[0] && x <= r.pos[0] + r.size[0] && y >= r.pos[1] && y <= r.pos[1] + r.size[1]) return true;
  }
  return false;
}

/** Split a flat [x0,y0,x1,y1,...] polyline into runs that stay on real land,
 *  dropping the parts that do not. Reported directly, 2026-08-28, from the
 *  first render of real streets: they were fetched by lat/lon BOUNDING BOX,
 *  not by any real landmass shape, so anything between the box and the
 *  actual coastline floated in open water. This is the fix — a street is
 *  still one continuous line where it is actually on real land, and simply
 *  absent past its edge, rather than sailing off it. */
function clipRunsToLand(flat, landRects) {
  const pts = [];
  for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
  const runs = [];
  let cur = [];
  for (const p of pts) {
    if (pointOnLand(p[0], p[1], landRects)) {
      cur.push(p);
    } else if (cur.length) {
      if (cur.length >= 2) runs.push(cur);
      cur = [];
    }
  }
  if (cur.length >= 2) runs.push(cur);
  return runs.map((r) => r.flat());
}

// ── real streets, cross-referenced to actual OSM geometry ──────────────────
//
// Reported directly, 2026-08-28: "larger streets can be visible on cross
// referenced to actual maps." `map/kallio-corridors-v1.json` is NOT a street
// map (TRANSIT_LAYERS.md §10.8) — it is corridors that carry public transit,
// and any street with no route on it is absent, which is the hole in the
// middle of that underlay. This is real OSM geometry instead
// (`map/tools/streets-import.mjs`, `map/kallio-streets-v1.json`), classified
// major/mid/minor by `highway=`. Drawn BEHIND the board's own locked "major
// road cuts" (`rail-and-roads`) and the transit lines, so the canonical,
// hand-placed geometry stays the loudest thing on the board — this is
// texture and orientation, not a replacement for it.
function buildRealStreets(landRects) {
  if (!existsSync(STREETS)) return [];
  const streets = JSON.parse(readFileSync(STREETS, 'utf8'));
  const board = JSON.parse(readFileSync(BOARD_JSON, 'utf8'));
  const CS = board.coordinateSystem;
  const toBoard = (lat, lon) => [
    CS.board.offsetX + (lon - CS.origin.lon) * CS.metresPerDegree.lon / CS.board.metresPerUnit,
    CS.board.offsetY - (lat - CS.origin.lat) * CS.metresPerDegree.lat / CS.board.metresPerUnit,
  ];
  const px = (shape) => shape.map(([lat, lon]) => toBoard(lat, lon)).flat().map((n) => +n.toFixed(2));

  const items = [];
  for (const r of streets.roads || []) {
    if (!r.shape || r.shape.length < 2) continue;
    const runs = landRects ? clipRunsToLand(px(r.shape), landRects) : [px(r.shape)];
    for (const run of runs) {
      if (run.length >= 4) items.push({ kind: 'road', tier: r.tier, points: run });
    }
  }
  return items;
}


for (const id of LAYERS) {
  const body = groupBody(svg, id);
  if (body === null) { console.error(`missing group: ${id}`); continue; }
  const items = [];
  collect(body, ident(), items);
  out.layers[id] = items;
}

const landRects = buildRealLand();

// The view fits to THIS, not to the land's own extent. Real land now runs the
// full width of the coastline data, which is deliberately wider than the
// playable board — fitting to it would shrink Kallio to a patch in the middle
// and waste the screen on off-board water. The board's own declared extent is
// the honest frame; land simply continues past it and is clipped, the way a
// city map continues past its own edge.
{
  const b = JSON.parse(readFileSync(BOARD_JSON, 'utf8')).coordinateSystem.board;
  out.boardExtent = { x: 0, y: 0, w: b.width, h: b.height };
}

out.layers['land-real'] = landRects;
out.layers['public-transit'] = buildTransitLines();
out.layers['water-real'] = buildWaterOverlay();
out.layers['streets-real'] = buildRealStreets(landRects);

const json = JSON.stringify(out);
const changed = !existsSync(OUT) || readFileSync(OUT, 'utf8') !== json;

if (process.argv.includes('--check')) {
  if (changed) {
    console.error('DRIFT: data/map-geometry.json is stale (SVG or real map data changed). Run: node tools/build-map-geometry.mjs');
    process.exit(1);
  }
  console.log('MAP GEOMETRY OK: derived layers match the structural SVG and the real map data.');
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, json);
  const counts = LAYERS.map((l) => `${l} ${(out.layers[l] || []).length}`).join(' · ');
  console.log(`wrote data/map-geometry.json  (${(json.length / 1024).toFixed(1)} KB)`);
  console.log(`  ${counts}  ·  land-real ${landRects.length}`);
}
