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

// ── real land, from real streets and real anchors — NOT from the coastline ─
//
// Reported directly, 2026-08-28: "the map is not aligned at all with real
// maps, start from scratch with the PR layers and then add details."
//
// THREE ATTEMPTS AT COASTLINE-ONLY FLOOD-FILL FAILED, in order, and the
// failures are worth keeping here because the next person will try the same
// things: (1) seeding flood-fill from the grid's own border, wrong because
// Kallio's north has no coastline nearby and the flood leaked across the
// whole inland region unopposed; (2) seeding from a point offset to the
// "sea side" of every coastline segment on the documented `natural=coastline`
// convention that land is on the way's LEFT — wrong because real OSM data is
// not perfectly consistent about winding direction, and one reversed way
// among 27 flooded almost the entire grid from a seed that was actually on
// land; (3) treating each closed water AREA's own outline as a barrier so a
// flood seeded inside it could not escape onto surrounding land — safe, but
// with no surviving way to seed the OPEN sea at all, "water" shrank to just
// the explicit bay polygons and everything else, including real open water,
// became "land". Three different, confident-looking wrong pictures, each
// only caught by dumping the raster and looking at it rather than trusting a
// cell count — worth naming because "the flood-fill count changed" was NOT
// enough evidence on its own, twice.
//
// THE FIX IS A DIFFERENT SIGNAL, NOT A BETTER FLOOD-FILL. Real streets
// (`map/kallio-streets-v1.json`) exist ONLY on land — no directionality to
// get backwards, no open/closed distinction to reconcile. Land is:
//
//   1. within a buffer of a real street point, OR within a buffer of a real
//      board anchor (parks, waterfronts and other real land the street layer
//      under-samples still have an anchor sitting on them);
//   2. with enclosed gaps filled — a city block with no street through its
//      own middle is not water, and no buffer radius closes every such gap
//      without also fattening the coastline past recognition; any "not yet
//      land" pocket that does not touch the grid's own border cannot be open
//      sea, so it is land;
//   3. AND NOT inside a real closed water area (the actual bays) — carved
//      out last, so the real bays survive regardless of what the street
//      buffer alone would have read there.
//
// Emits merged rectangles rather than a smooth traced outline. A first
// version of this traced one (Moore-neighbour boundary tracing); two real
// bugs in that tracer (a broken hand-derived marching-squares table, then a
// trace that silently stopped at a one-cell-wide pinch between the mainland
// and what the raster read as a near-island) cost more time than the payoff
// is worth for what is fundamentally a backdrop — every functional layer
// (anchors, streets, transit) is already real and already aligned; this
// shape only has to look like solid ground under them. Row-run rectangles at
// ~5 m resolution are visually indistinguishable from a smooth coastline at
// the zoom this board is ever viewed at, need no contour algorithm, and
// cannot silently drop part of the shape the way a single traced ring can.
//
// Kept in sync BY HAND with the standalone `map/tools/land-from-coastline.mjs`
// (same algorithm, run manually to inspect a raster dump while tuning it —
// see that file's own `LAND_DEBUG`/`LAND_DUMP_RASTER` env vars). If this
// drifts from that file, that file is the one to re-derive it from.
function buildRealLand() {
  const board = JSON.parse(readFileSync(BOARD_JSON, 'utf8'));
  const CS = board.coordinateSystem;
  const toBoard = (lat, lon) => [
    CS.board.offsetX + (lon - CS.origin.lon) * CS.metresPerDegree.lon / CS.board.metresPerUnit,
    CS.board.offsetY - (lat - CS.origin.lat) * CS.metresPerDegree.lat / CS.board.metresPerUnit,
  ];

  const PAD = 60;
  const gx0 = -PAD, gy0 = -PAD, gx1 = CS.board.width + PAD, gy1 = CS.board.height + PAD;
  const CELL = 2.2;
  const cols = Math.ceil((gx1 - gx0) / CELL), rows = Math.ceil((gy1 - gy0) / CELL);
  const cellOf = (x, y) => [Math.round((x - gx0) / CELL), Math.round((y - gy0) / CELL)];
  const at = (cx, cy) => cy * cols + cx;
  const inGrid = (cx, cy) => cx >= 0 && cx < cols && cy >= 0 && cy < rows;
  const land = new Uint8Array(cols * rows);

  function stampDisc(x, y, r) {
    const rc = Math.ceil(r / CELL);
    const [cx, cy] = cellOf(x, y);
    for (let oy = -rc; oy <= rc; oy++) for (let ox = -rc; ox <= rc; ox++) {
      const gx = cx + ox, gy = cy + oy;
      if (!inGrid(gx, gy) || ox * ox + oy * oy > rc * rc) continue;
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

  const TIER_BUFFER = { major: 26, mid: 20, minor: 16 };
  if (existsSync(STREETS)) {
    const streets = JSON.parse(readFileSync(STREETS, 'utf8'));
    for (const r of streets.roads || []) {
      if (!r.shape || r.shape.length < 2) continue;
      const pts = r.shape.map(([lat, lon]) => toBoard(lat, lon));
      const buf = TIER_BUFFER[r.tier] || 16;
      for (let i = 1; i < pts.length; i++) stampLine(pts[i - 1], pts[i], buf);
    }
  }
  for (const a of board.anchors || []) stampDisc(a.board.x, a.board.y, 55);

  function fillPolygon(pts, target, value) {
    let miny = Infinity, maxy = -Infinity;
    for (const [, y] of pts) { miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    const [, rowMin] = cellOf(0, miny), [, rowMax] = cellOf(0, maxy);
    for (let ry = Math.max(0, rowMin); ry <= Math.min(rows - 1, rowMax); ry++) {
      const y = gy0 + ry * CELL;
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

  // Fill enclosed holes before carving the real bays out.
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

  if (existsSync(WATER)) {
    const water = JSON.parse(readFileSync(WATER, 'utf8'));
    for (const a of water.areas || []) {
      fillPolygon(a.shape.map(([lat, lon]) => toBoard(lat, lon)), land, 0);
    }
  }

  // Row-run merge, then vertical merge of matching runs.
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
    const seenKeys = new Set();
    for (const r of here_) {
      const key = `${r[0]},${r[2]}`;
      seenKeys.add(key);
      if (carry.has(key)) carry.get(key)[3] += 1;
      else { const nr = [...r]; carry.set(key, nr); merged.push(nr); }
    }
    for (const key of [...carry.keys()]) if (!seenKeys.has(key)) carry.delete(key);
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
