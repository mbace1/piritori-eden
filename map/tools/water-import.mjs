#!/usr/bin/env node
/**
 * Overpass JSON  ->  the water layer the plates draw under everything else.
 *
 *   node map/tools/water-import.mjs <overpass.json> <out.json> [--box s,w,n,e]
 *
 * WHY THIS IS A SEPARATE STEP. The maps want water — Helsinki is a peninsula
 * and the coastline is what carries its silhouette — and the environment these
 * tools were written in cannot fetch it. Every OSM source is refused by the
 * egress policy: overpass-api.de and its mirrors, api.openstreetmap.org,
 * download.geofabrik.de, tile.openstreetmap.org, cdn.digitransit.fi,
 * osmdata.openstreetmap.de, and wikidata.org with them. `raw.githubusercontent.
 * com` is the only host that answers, which is how the GTFS arrived.
 *
 * So the fetch happens on a machine with ordinary network access and this tool
 * takes what comes back. `master-plate.mjs` draws the result the moment the file
 * exists and says NO WATER in its gaps column until then — nothing here invents
 * a coastline, and nothing pretends the layer is present when it is not.
 *
 * THE QUERY. Run this at https://overpass-turbo.eu or against any Overpass
 * instance, and save the raw JSON:
 *
 *   [out:json][timeout:120];
 *   (
 *     way ["natural"="water"](60.148,24.895,60.218,24.995);
 *     rel ["natural"="water"](60.148,24.895,60.218,24.995);
 *     way ["waterway"="riverbank"](60.148,24.895,60.218,24.995);
 *     way ["natural"="coastline"](60.148,24.895,60.218,24.995);
 *   );
 *   out geom;
 *
 * The Era I box is (60.170,24.930,60.200,24.980) — but running the Era II box
 * once and importing it twice is less work and the clip below handles it.
 *
 * THE ONE THING TO KNOW ABOUT OSM WATER. Inland water (Töölönlahti,
 * Eläintarhanlahti) is mapped as CLOSED WAYS tagged `natural=water`, and those
 * import cleanly. The open sea is NOT: it is mapped as `natural=coastline`,
 * which is a directed OPEN line with land on its left, and the sea itself is
 * implied rather than drawn. Closing a coastline way into a polygon produces
 * nonsense — a lid across the harbour mouth.
 *
 * So this tool keeps them apart. Closed rings become `areas` and are filled.
 * Coastline ways become `edges` and are drawn as a LINE. A coastline drawn as a
 * line already gives the board its silhouette, which was the point; filling the
 * sea properly needs the assembled water polygons from
 * osmdata.openstreetmap.de, clipped to the box, and that can be dropped in
 * later as more `areas` without changing anything that reads this file.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [src, out] = positional;
if (!src || !out) {
  console.error('usage: node map/tools/water-import.mjs <overpass.json> <out.json> [--box s,w,n,e]');
  process.exit(1);
}
const boxArg = flag('--box');
const BOX = boxArg
  ? (([s, w, n, e]) => ({ s: +s, w: +w, n: +n, e: +e }))(boxArg.split(','))
  : { s: 60.148, w: 24.895, n: 60.218, e: 24.995 };

const raw = JSON.parse(readFileSync(src, 'utf8'));
const els = raw.elements || [];
if (!els.length) {
  console.error('no elements in that file — is it Overpass JSON from `out geom;`?');
  process.exit(1);
}

const rad = d => d * Math.PI / 180;
const PHI = rad(60.185), R = 6371000;
const metres = (a, b) => Math.hypot(
  (rad(b[1]) - rad(a[1])) * Math.cos(PHI) * R, (rad(b[0]) - rad(a[0])) * R);

/** Douglas–Peucker at ~4 m. A bay traced at survey precision is thousands of
 *  points and the plates draw it 800 px wide; the simplification is invisible
 *  and the file is a tenth the size. */
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

const areas = [], edges = [];
let skipped = 0;

const push = (el, geom) => {
  if (!geom || geom.length < 2) return;
  const line = geom.map(g => [+(+g.lat).toFixed(6), +(+g.lon).toFixed(6)]);
  if (!touches(line)) { skipped++; return; }
  const t = el.tags || {};
  const closed = line.length > 3 && metres(line[0], line[line.length - 1]) < 1;
  const simp = simplify(line);
  const rec = {
    kind: t.natural === 'coastline' ? 'coastline' : (t.natural || t.waterway || 'water'),
    name: t.name || null,
    points: simp.length,
    shape: simp,
  };
  // Closed ring => a fillable body of water. Open coastline => a LINE. Mixing
  // them is the whole trap this importer exists to avoid.
  if (closed && rec.kind !== 'coastline') areas.push(rec);
  else edges.push(rec);
};

for (const el of els) {
  if (el.type === 'way') push(el, el.geometry);
  else if (el.type === 'relation') {
    // A multipolygon's outers are separate rings; inners are islands and are
    // kept as their own rings so a renderer can subtract them if it wants to.
    for (const m of el.members || []) if (m.geometry) push({ tags: el.tags }, m.geometry);
  }
}

const doc = {
  schemaVersion: 1,
  id: path.basename(out, '.json'),
  title: 'Water — filled bodies and coastline, clipped to the box',
  generatedBy: 'map/tools/water-import.mjs',
  source: {
    dataset: 'OpenStreetMap via Overpass',
    licence: 'ODbL 1.0',
    attribution: '© OpenStreetMap contributors',
    fetchedElsewhere: 'Overpass is refused by the egress policy of the environment '
      + 'these tools were written in, so the query is run on a networked machine and '
      + 'its JSON imported here. See the header of water-import.mjs for the query.',
    areasVsEdges: 'areas = closed rings, fillable (inland water: Töölönlahti, '
      + 'Eläintarhanlahti). edges = natural=coastline, which in OSM is a directed '
      + 'OPEN line with land on its left and the sea only implied — closing it into '
      + 'a polygon puts a lid across the harbour mouth, so it is drawn as a line. '
      + 'Filling the open sea properly needs the assembled water polygons from '
      + 'osmdata.openstreetmap.de clipped to the box; they can be added as more '
      + 'areas later without changing this schema.',
  },
  boundingBox: BOX,
  coordinateSystem: 'WGS84 [lat, lon]',
  areas,
  edges,
};

writeFileSync(path.resolve(out), JSON.stringify(doc));
console.log(`→ ${out}  ${Math.round(JSON.stringify(doc).length / 1024)} KB`);
console.log(`  ${areas.length} filled areas, ${edges.length} coastline runs, ${skipped} elements outside the box`);
if (!areas.length && !edges.length) console.warn('  ! nothing imported — check the query and the box');
