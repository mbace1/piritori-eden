#!/usr/bin/env node
/**
 * Overpass JSON  ->  the real railway layer, classified by what the track is for.
 *
 *   node map/tools/railway-import.mjs <overpass.json> <out.json> [--box s,w,n,e]
 *
 * Reported directly, 2026-08-26: "just use public data to make the map look
 * good and useful. trying to fake it will show." After the land was rebuilt
 * from the real coastline and the hand-drawn road ribbons were removed, ONE
 * piece of invented geometry was left on the board — a single hand-drawn
 * `rail` + `railTie` pair in the structural SVG, the heavy black dashed line
 * running north-south. It happened to sit near where the real Helsinki main
 * line runs, which is exactly the kind of nearly-right that shows. This
 * replaces it with the real alignment.
 *
 * SAME PATTERN AS water-import.mjs and streets-import.mjs: the query is run
 * wherever network access reaches Overpass and this tool takes what comes
 * back, so the fetch and the transform stay separable and re-runnable.
 *
 *   [out:json][timeout:90];
 *   way["railway"~"^(rail|light_rail|narrow_gauge)$"]
 *     (60.170,24.930,60.200,24.980);
 *   out geom;
 *
 * `subway` and `tram` are deliberately NOT fetched. The metro and the trams
 * already come from real HSL GTFS geometry in `kallio-rail-v1.json` and are
 * drawn as coloured services by `buildTransitLines()`; fetching their track
 * again here would draw every one of them twice, in two different styles,
 * from two different sources that do not perfectly agree.
 *
 * CLASSIFICATION, for weight in the drawing rather than for filtering here:
 *
 *   main    usage=main with no `service` tag — the trunk line north out of
 *           Helsinki, the thing the hand-drawn line was gesturing at
 *   branch  other running lines: connections, freight curves, harbour spurs
 *   yard    service=yard|siding|crossover — depot and shunting track. Real,
 *           but it is dense scribble at this scale and the game draws it
 *           faint or not at all. Carried anyway: filtering belongs to the
 *           renderer, this file's job is to carry every real way and say
 *           what kind it is.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [src, out] = positional;
if (!src || !out) {
  console.error('usage: node map/tools/railway-import.mjs <overpass.json> <out.json> [--box s,w,n,e]');
  process.exit(1);
}
const boxArg = flag('--box');
const BOX = boxArg
  ? (([s, w, n, e]) => ({ s: +s, w: +w, n: +n, e: +e }))(boxArg.split(','))
  : { s: 60.170, w: 24.930, n: 60.200, e: 24.980 };

const raw = JSON.parse(readFileSync(src, 'utf8'));
const els = raw.elements || [];
if (!els.length) {
  console.error('no elements in that file — is it Overpass JSON from `out geom;`?');
  process.exit(1);
}

const YARD_SERVICE = new Set(['yard', 'siding', 'crossover', 'spur']);
function tierOf(t) {
  if (t.service && YARD_SERVICE.has(t.service)) return 'yard';
  if (t.usage === 'main') return 'main';
  return 'branch';
}

/** Douglas–Peucker at ~4 m — see water-import.mjs, same reasoning. */
function simplify(line, tol = 4e-5) {
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
      const dd = d2(line[i], line[a], line[b]);
      if (dd > fd) { fd = dd; far = i; }
    }
    if (far > 0) { keep[far] = true; stack.push([a, far], [far, b]); }
  }
  return line.filter((_, i) => keep[i]);
}

const touches = line => line.some(([lat, lon]) =>
  lat >= BOX.s && lat <= BOX.n && lon >= BOX.w && lon <= BOX.e);

const lines = [];
let skipped = 0;
for (const el of els) {
  if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) continue;
  const line = el.geometry.map(g => [+(+g.lat).toFixed(6), +(+g.lon).toFixed(6)]);
  if (!touches(line)) { skipped++; continue; }
  const t = el.tags || {};
  const shape = simplify(line);
  lines.push({
    class: t.railway || 'rail',
    tier: tierOf(t),
    name: t.name || null,
    electrified: t.electrified && t.electrified !== 'no' ? true : false,
    points: shape.length,
    shape,
  });
}

const doc = {
  schemaVersion: 1,
  id: path.basename(out, '.json'),
  title: 'Real railway alignment, classified by use, clipped to the box',
  generatedBy: 'map/tools/railway-import.mjs',
  source: {
    dataset: 'OpenStreetMap via Overpass',
    licence: 'ODbL 1.0',
    attribution: '© OpenStreetMap contributors',
    note: 'subway and tram excluded on purpose — those come from HSL GTFS in kallio-rail-v1.json',
  },
  boundingBox: BOX,
  coordinateSystem: 'WGS84 [lat, lon]',
  lines,
};

writeFileSync(path.resolve(out), JSON.stringify(doc));
const tiers = lines.reduce((m, r) => (m[r.tier] = (m[r.tier] || 0) + 1, m), {});
console.log(`→ ${out}  ${Math.round(JSON.stringify(doc).length / 1024)} KB`);
console.log(`  ${lines.length} ways (${Object.entries(tiers).map(([k, v]) => `${k} ${v}`).join(' · ')}), ${skipped} outside the box`);
if (!lines.length) console.warn('  ! nothing imported — check the query and the box');
