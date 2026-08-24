#!/usr/bin/env node
/**
 * HSL GTFS  ->  the board's rail network, clipped to the production boundary.
 *
 *   node map/tools/gtfs-extract.mjs <unzipped-gtfs-dir> [out.json]
 *
 * WHAT THIS IS FOR. `TRANSIT_LAYERS.md` §10 records that the repository has
 * real coordinates for its anchors and real 2003 service PATTERNS, and no route
 * geometry at all — the board's tram lines were two hand-drawn polylines of
 * five and three points. This turns the published feed into the missing half:
 * the actual path the rails take, and the actual stops, in the actual box.
 *
 * WHAT IT DELIBERATELY DOES NOT READ. `stop_times.txt` is 472 MB and holds
 * every departure of every trip in the region. The board does not want a
 * timetable — §2's `period` source authors Era I headways, and Era II asks the
 * live feed. Reading it would cost half a gigabyte to answer a question nobody
 * is asking, so the extract is routes, trips, shapes and stops only, and the
 * whole run fits in a few hundred megabytes of memory.
 *
 * ERA NOTE. This is a MODERN feed, so it is Era II's geometry outright, and
 * Era I's under the argument in §2b: the metro through Kallio is unchanged, and
 * the trams inherit corridor geometry that survived the 2013 renumbering even
 * where the service number did not. The 2003 service pattern stays where it
 * already is — `periodServices` in the board JSON. This file never invents one.
 *
 * Licence: the feed is HSL's, CC BY 4.0. Attribution rides in the output.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const rad = d => d * Math.PI / 180;
import path from 'node:path';

// The production boundary of MAP.md §2, padded a little so a line that leaves
// the board and comes back does not get chopped into two fragments.
const BOX = { s: 60.170, n: 60.200, w: 24.930, e: 24.980 };

const [dir, out = 'map/kallio-rail-v1.json'] = process.argv.slice(2);
if (!dir) {
  console.error('usage: node map/tools/gtfs-extract.mjs <unzipped-gtfs-dir> [out.json]');
  process.exit(1);
}

// GTFS is CSV with quoted fields — route_long_name carries commas constantly
// ("Eira - Töölö - Sörnäinen (M) - Käpylä" is fine, but plenty are not), so a
// naive split on comma silently shifts every column after the first quoted one.
function rows(file) {
  const text = readFileSync(path.join(dir, file), 'utf8');
  const lines = text.split('\n');
  const head = split(lines[0].replace(/^﻿/, '').trim());
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l || !l.trim()) continue;
    const cells = split(l);
    const r = {};
    for (let k = 0; k < head.length; k++) r[head[k]] = cells[k];
    out.push(r);
  }
  return out;
}
function split(line) {
  const out = []; let cur = '', q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur.replace(/\r$/, ''));
  return out;
}

const inBox = (lat, lon) => lat >= BOX.s && lat <= BOX.n && lon >= BOX.w && lon <= BOX.e;

// ── routes: tram (0) and metro (1) only ──────────────────────────────────
// Buses are Era II's problem and there are hundreds of them (§9.1). The `H`
// and `S` suffixed variants are depot runs and short workings — real services,
// but not the line anybody names, so they are dropped from the drawn map.
const MODE = { 0: 'tram', 1: 'metro' };
const routes = rows('routes.txt')
  .filter(r => MODE[r.route_type])
  .filter(r => !/[HS]$/.test(r.route_short_name) || /^M/.test(r.route_short_name));
const routeById = new Map(routes.map(r => [r.route_id, r]));

// ── trips: one shape per route per direction ─────────────────────────────
// A route has thousands of trips and a handful of distinct shapes. The longest
// shape per (route, direction) is the full-length working — the short turns are
// genuinely shorter, so "longest" picks the line as a passenger thinks of it.
const shapeUse = new Map();          // shape_id -> {route, dir, n}
for (const t of rows('trips.txt')) {
  if (!routeById.has(t.route_id) || !t.shape_id) continue;
  const k = t.shape_id;
  if (!shapeUse.has(k)) shapeUse.set(k, { route: t.route_id, dir: t.direction_id, n: 0 });
  shapeUse.get(k).n++;
}

// ── shapes: the geometry, clipped ────────────────────────────────────────
const pts = new Map();               // shape_id -> [[lat,lon,seq]]
for (const s of rows('shapes.txt')) {
  if (!shapeUse.has(s.shape_id)) continue;
  const lat = +s.shape_pt_lat, lon = +s.shape_pt_lon;
  if (!inBox(lat, lon)) continue;
  if (!pts.has(s.shape_id)) pts.set(s.shape_id, []);
  pts.get(s.shape_id).push([lat, lon, +s.shape_pt_sequence]);
}

// pick the longest surviving shape per route+direction
const best = new Map();
for (const [id, list] of pts) {
  const u = shapeUse.get(id);
  const k = `${u.route}:${u.dir}`;
  if (!best.has(k) || list.length > pts.get(best.get(k)).length) best.set(k, id);
}

// Douglas–Peucker, so a 1,400-point shape ships as a few dozen without the
// corners moving. The tolerance is ~2 m, which is under the width the line is
// drawn at — the simplification is invisible at every zoom the board has.
function simplify(line, tol = 2e-5) {
  if (line.length < 3) return line;
  const d2 = (p, a, b) => {
    const x = p[1] - a[1], y = p[0] - a[0];
    const dx = b[1] - a[1], dy = b[0] - a[0];
    const L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, (x * dx + y * dy) / L)) : 0;
    const ex = x - t * dx, ey = y - t * dy;
    return ex * ex + ey * ey;
  };
  const keep = new Array(line.length).fill(false);
  keep[0] = keep[line.length - 1] = true;
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1, fd = tol * tol;
    for (let i = a + 1; i < b; i++) {
      const d = d2(line[i], line[a], line[b]);
      if (d > fd) { fd = d; far = i; }
    }
    if (far > 0) { keep[far] = true; stack.push([a, far], [far, b]); }
  }
  return line.filter((_, i) => keep[i]);
}

// ── which board anchors does each line actually pass, and in what order ──
// This is the bridge from geometry to game: the board thinks in anchors, and a
// polyline does not. 150 m is the tolerance, and it is generous on purpose —
// the anchors are "representative public area" positions, not stop positions.
//
// It is also the only honest way to compare a modern route against the board's
// inferred 2003 ones: `periodServices` in the board JSON is a sequence of
// anchors, so putting the modern lines in the same shape makes the two
// directly readable against each other.
const board = JSON.parse(readFileSync(path.join(path.dirname(out), 'kallio-era1-2003-v1.json'), 'utf8'));
const PHI = rad(60.185);
const xy = p => [rad(p[1]) * Math.cos(PHI) * 6371000, rad(p[0]) * 6371000];
function segDist(P, A, B) {
  const p = xy(P), a = xy(A), b = xy(B);
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function anchorsAlong(shape, tol = 150) {
  const hits = [];
  for (const a of board.anchors) {
    let best = Infinity, at = 0;
    for (let i = 1; i < shape.length; i++) {
      const d = segDist(a.wgs84, shape[i - 1], shape[i]);
      if (d < best) { best = d; at = i; }
    }
    if (best <= tol) hits.push({ anchor: a.id, at, m: Math.round(best) });
  }
  return hits.sort((x, y) => x.at - y.at).map(h => ({ anchor: h.anchor, m: h.m }));
}

const lines = [];
for (const [k, id] of best) {
  const u = shapeUse.get(id);
  const r = routeById.get(u.route);
  const raw = pts.get(id).sort((a, b) => a[2] - b[2]).map(p => [+p[0].toFixed(6), +p[1].toFixed(6)]);
  const simp = simplify(raw);
  lines.push({
    id: `${r.route_short_name}_${u.dir}`,
    service: r.route_short_name,
    mode: MODE[r.route_type],
    direction: +u.dir,
    name: r.route_long_name,
    trips: u.n,
    points: simp.length,
    droppedFrom: raw.length,
    anchorSequence: anchorsAlong(simp),
    shape: simp,
  });
}
lines.sort((a, b) => a.mode.localeCompare(b.mode) || a.service.localeCompare(b.service) || a.direction - b.direction);

// ── stops in the box ─────────────────────────────────────────────────────
// Every stop, not only the ones on these lines: §10.4's recommendation is to
// draw them all and make only anchors actionable, and a bus stop outside the
// rail network is still a real place on a real street.
const stops = rows('stops.txt')
  .filter(s => s.stop_lat && inBox(+s.stop_lat, +s.stop_lon))
  .map(s => ({
    id: s.stop_id,
    code: s.stop_code || undefined,
    name: s.stop_name,
    lat: +(+s.stop_lat).toFixed(6),
    lon: +(+s.stop_lon).toFixed(6),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'fi'));

const doc = {
  schemaVersion: 1,
  id: 'kallio-rail-v1',
  title: 'Kallio rail network — real geometry, clipped to the production boundary',
  generatedBy: 'map/tools/gtfs-extract.mjs',
  source: {
    feed: 'Helsingin seudun liikenne (HSL) GTFS',
    licence: 'CC BY 4.0',
    attribution: '© Helsingin seudun liikenne (HSL)',
    anchorSequenceMeans: 'PASSES WITHIN 150 m OF, not CALLS AT. For the metro the '
      + 'distinction is total: the tunnel runs under Karhupuisto, Torkkelinmäki and '
      + 'Kallion kirkko and stops at none of them — in the Kallio band it calls only at '
      + 'Hakaniemi and Sörnäinen. A game that lets you board at Karhupuisto is wrong.',
    note: 'Modern feed. Era II geometry outright; Era I under TRANSIT_LAYERS.md §2b — '
        + 'the Kallio metro is unchanged, and the trams inherit corridor geometry that '
        + 'survived the 2013 renumbering. The 2003 SERVICE pattern is periodServices in '
        + 'the board JSON and is not touched here.',
  },
  boundingBox: BOX,
  coordinateSystem: 'WGS84 [lat, lon]',
  lines,
  stops,
};

mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(doc, null, 1) + '\n');

const kb = (JSON.stringify(doc).length / 1024).toFixed(0);
console.log(`→ ${out}  ${kb} KB`);
console.log(`  ${lines.length} line directions, ${stops.length} stops in box`);
for (const m of ['metro', 'tram']) {
  const l = lines.filter(x => x.mode === m);
  const p = l.reduce((s, x) => s + x.points, 0), d = l.reduce((s, x) => s + x.droppedFrom, 0);
  if (l.length) console.log(`  ${m.padEnd(5)} ${String(l.length).padStart(2)} directions  ${p} points (from ${d})  ${[...new Set(l.map(x => x.service))].join(' ')}`);
}
