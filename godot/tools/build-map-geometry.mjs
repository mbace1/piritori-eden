#!/usr/bin/env node
/**
 * build-map-geometry.mjs — turn the canonical structural SVG into layer data.
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

for (const id of LAYERS) {
  const body = groupBody(svg, id);
  if (body === null) { console.error(`missing group: ${id}`); continue; }
  const items = [];
  collect(body, ident(), items);
  out.layers[id] = items;
}

const json = JSON.stringify(out);
const changed = !existsSync(OUT) || readFileSync(OUT, 'utf8') !== json;

if (process.argv.includes('--check')) {
  if (changed) {
    console.error('DRIFT: data/map-geometry.json is stale. Run: node tools/build-map-geometry.mjs');
    process.exit(1);
  }
  console.log('MAP GEOMETRY OK: derived layers match the structural SVG.');
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, json);
  const counts = LAYERS.map((l) => `${l} ${(out.layers[l] || []).length}`).join(' · ');
  console.log(`wrote data/map-geometry.json  (${(json.length / 1024).toFixed(1)} KB)`);
  console.log(`  ${counts}`);
}
