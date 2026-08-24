#!/usr/bin/env node
/**
 * HSL GTFS  ->  the streets under the board, as far as the feed can see them.
 *
 *   node map/tools/corridors-extract.mjs <unzipped-gtfs-dir> [out.json]
 *
 * WHAT THIS IS, AND WHAT IT IS NOT. The plates draw six tram lines and a metro
 * in a void. They want a city under them. This is the nearest thing to a street
 * map that can be built from here, and the name says what it is: these are
 * CORRIDORS THAT CARRY PUBLIC TRANSPORT, not the street map.
 *
 * Every bus, tram, metro, train and ferry shape crossing the board is kept —
 * 392 of them — so the streets those services run on are drawn from real
 * geometry. In Kallio that is most of the grid that matters: Hämeentie,
 * Siltasaarenkatu, Helsinginkatu, Sturenkatu, Aleksis Kiven katu, Fleminginkatu,
 * Castreninkatu, Porvoonkatu, Sörnäisten rantatie, the linjat.
 *
 * WHAT IT MISSES, said plainly so nobody presents this as a basemap: any street
 * with no service on it. Torkkelinkatu, Agricolankatu, Wallininkatu, most of
 * the quiet residential grid on Torkkelinmäki. A player who knows Kallio will
 * see the holes.
 *
 * WHY NOT REAL OSM. Every source for it is unreachable from this environment —
 * overpass-api.de, api.openstreetmap.org, download.geofabrik.de, tile.
 * openstreetmap.org and cdn.digitransit.fi are all refused by the egress proxy;
 * raw.githubusercontent.com is the only host that answers, which is how the
 * GTFS itself got here. On a machine with ordinary network access a true
 * basemap is one Overpass query, and it should replace this the moment there is
 * one. `TRANSIT_LAYERS.md` §10.8 records that.
 *
 * WEIGHT IS THE POINT. Each corridor carries the number of trips that use it,
 * so a renderer can make a street's brightness mean how much service it takes.
 * That is why Hämeentie should read as a trunk and a bus diversion should not —
 * hierarchy from data rather than from a hand-drawn road classification nobody
 * here has.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const rad = d => d * Math.PI / 180;
const BOX = { s: 60.170, n: 60.200, w: 24.930, e: 24.980 };

const [dir, out = 'map/kallio-corridors-v1.json'] = process.argv.slice(2);
if (!dir) {
  console.error('usage: node map/tools/corridors-extract.mjs <unzipped-gtfs-dir> [out.json]');
  process.exit(1);
}

// Same quoted-CSV reader as gtfs-extract.mjs — route_long_name carries commas.
function split(line) {
  const out_ = []; let cur = '', q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out_.push(cur); cur = ''; }
    else cur += ch;
  }
  out_.push(cur.replace(/\r$/, ''));
  return out_;
}
function rows(file) {
  const lines = readFileSync(path.join(dir, file), 'utf8').split('\n');
  const head = split(lines[0].replace(/^﻿/, '').trim());
  const out_ = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i] || !lines[i].trim()) continue;
    const c = split(lines[i]);
    const r = {};
    for (let k = 0; k < head.length; k++) r[head[k]] = c[k];
    out_.push(r);
  }
  return out_;
}

// HSL uses the EXTENDED route types, not the basic ones, and getting this
// wrong is silent: `3` for bus matches nothing here, every bus falls through to
// 'other', and the first run of this tool reported 129 corridors of no
// particular mode and not a single bus. The feed's actual spread is
// 0/1/4/109/700/701/702/704.
const MODE = {
  0: 'tram', 1: 'metro', 2: 'rail', 3: 'bus', 4: 'ferry',
  109: 'rail',                                   // suburban rail
  700: 'bus', 701: 'bus', 702: 'bus', 704: 'bus', // regional / express / local coach
};

const routeMode = new Map(rows('routes.txt').map(r => [r.route_id, MODE[+r.route_type] || 'other']));

// shape -> {mode, trips}
const use = new Map();
for (const t of rows('trips.txt')) {
  if (!t.shape_id) continue;
  if (!use.has(t.shape_id)) use.set(t.shape_id, { mode: routeMode.get(t.route_id) || 'other', trips: 0 });
  use.get(t.shape_id).trips++;
}

// ── geometry, clipped ───────────────────────────────────────────────────────
// A shape is kept only where it is INSIDE the box. A bus that leaves and comes
// back therefore arrives as one polyline with a straight cheat across the gap,
// so the runs are split: a jump of more than 120 m between consecutive kept
// points is a hole in the data, not a road.
const pts = new Map();
for (const s of rows('shapes.txt')) {
  const lat = +s.shape_pt_lat, lon = +s.shape_pt_lon;
  if (lat < BOX.s || lat > BOX.n || lon < BOX.w || lon > BOX.e) continue;
  if (!use.has(s.shape_id)) continue;
  if (!pts.has(s.shape_id)) pts.set(s.shape_id, []);
  pts.get(s.shape_id).push([lat, lon, +s.shape_pt_sequence]);
}

const PHI = rad(60.185), R = 6371000;
const metres = (a, b) => Math.hypot(
  (rad(b[1]) - rad(a[1])) * Math.cos(PHI) * R,
  (rad(b[0]) - rad(a[0])) * R);

function simplify(line, tol) {
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

// ── dedupe ──────────────────────────────────────────────────────────────────
// 392 shapes over maybe 40 streets: dozens of bus routes trace Hämeentie point
// for point. Kept raw they are the same line drawn ninety times, which is both
// a fat JSON file and a renderer that cannot tell a trunk from a duplicate.
//
// So a run's IDENTITY is its path snapped to a ~10 m grid. Identical paths
// collapse to one corridor and their trips ADD UP, which is exactly the number
// a renderer wants. The drawn geometry is the first run seen, at full
// precision — snapping decides what is the same, it never moves what is drawn.
const GRID = 1e-4;                                   // ~11 m lat, ~5.5 m lon
const snap = p => `${Math.round(p[0] / GRID)},${Math.round(p[1] / GRID)}`;
const key = run => {
  const cells = [];
  for (const p of run) { const c = snap(p); if (cells[cells.length - 1] !== c) cells.push(c); }
  return cells.join(';');
};

const corridors = new Map();
let runsIn = 0;
for (const [id, raw] of pts) {
  raw.sort((a, b) => a[2] - b[2]);
  const u = use.get(id);
  let run = [];
  const flush = () => {
    if (run.length >= 2) {
      runsIn++;
      const line = simplify(run.map(p => [+p[0].toFixed(6), +p[1].toFixed(6)]), 5e-5);   // ~5 m
      const k = key(line);
      if (!corridors.has(k)) corridors.set(k, { mode: u.mode, trips: 0, shape: line });
      const c = corridors.get(k);
      c.trips += u.trips;
      // A tram sharing a street with fifty buses should still say "tram" — the
      // rarer mode is the more informative label for a corridor.
      const rank = { metro: 0, rail: 1, tram: 2, ferry: 3, bus: 4, other: 5 };
      if (rank[u.mode] < rank[c.mode]) c.mode = u.mode;
    }
    run = [];
  };
  for (const p of raw) {
    if (run.length && metres(run[run.length - 1], p) > 120) flush();
    run.push(p);
  }
  flush();
}

const list = [...corridors.values()].sort((a, b) => b.trips - a.trips);

const doc = {
  schemaVersion: 1,
  id: 'kallio-corridors-v1',
  title: 'Kallio street underlay — corridors that carry public transport',
  generatedBy: 'map/tools/corridors-extract.mjs',
  source: {
    feed: 'Helsingin seudun liikenne (HSL) GTFS',
    licence: 'CC BY 4.0',
    attribution: '© Helsingin seudun liikenne (HSL)',
    isNot: 'NOT A STREET MAP. These are the corridors along which HSL runs '
      + 'service, which in Kallio covers most of the grid that matters but omits '
      + 'every street with no route on it — Torkkelinkatu, Agricolankatu, '
      + 'Wallininkatu and most of the quiet Torkkelinmäki blocks are simply '
      + 'absent. Do not present it as a basemap. A real one is one Overpass '
      + 'query from a machine that can reach the internet; see TRANSIT_LAYERS.md §10.8.',
    weightMeans: 'trips = GTFS trips per week over that corridor, summed across '
      + 'every route that uses it. Brightness driven by this makes a trunk look '
      + 'like a trunk without anyone hand-classifying a road.',
  },
  boundingBox: BOX,
  coordinateSystem: 'WGS84 [lat, lon]',
  corridors: list,
};

writeFileSync(path.resolve(out), JSON.stringify(doc));
const pts_ = list.reduce((s, c) => s + c.shape.length, 0);
console.log(`→ ${out}  ${Math.round(JSON.stringify(doc).length / 1024)} KB`);
console.log(`  ${pts.size} shapes in box, ${runsIn} runs, ${list.length} distinct corridors, ${pts_} points`);
const byMode = {};
for (const c of list) byMode[c.mode] = (byMode[c.mode] || 0) + 1;
console.log('  ' + Object.entries(byMode).map(([k, v]) => `${k} ${v}`).join('  '));
console.log(`  busiest: ${list.slice(0, 3).map(c => c.trips).join(', ')} trips`);
