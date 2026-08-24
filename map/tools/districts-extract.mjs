#!/usr/bin/env node
/**
 * Helsinki sub-districts  ->  place labels for the Era II map.
 *
 *   node map/tools/districts-extract.mjs <osaalueet.geojson> [out.json] [--box s,w,n,e]
 *
 * WHY. The Era I sheet orients you with the board's own thirteen anchors. Era II
 * has no anchors yet — it is real geometry and nothing authored — so without
 * place names it is a beautiful tangle you cannot navigate. These are the CITY's
 * own names for its own areas, which is the least invented label available.
 *
 * SOURCE. Helsingin kaupunki's osa-alue (sub-district) division, 2015 edition,
 * fetched from a third-party mirror of the city's open geodata:
 *   https://raw.githubusercontent.com/dhh16/helsinki/master/osaalueet.geojson
 * 148 polygons, WGS84 (CRS84), carrying NIMI / NIMI_SE and the district
 * hierarchy. The mirror is recorded rather than hidden: the city's own host is
 * not reachable from this environment, and a name whose provenance is "a repo"
 * should say so.
 *
 * WHAT THESE POLYGONS ARE NOT: a coastline. They are ADMINISTRATIVE areas and
 * they include the sea — every water point tested (Eläintarhanlahti,
 * Töölönlahti, Sörnäistenselkä, Kruunuvuorenselkä, open sea) falls inside a
 * district. So the union of them is not land, and the complement is not water.
 * That was the first idea and it is wrong; see TRANSIT_LAYERS.md §11.3.
 *
 * Only the LABEL POINT is kept. The polygons themselves would put administrative
 * boundaries on a map that is about movement, and the sea problem above means
 * they would draw district lines out across open water.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [src, out = 'map/helsinki-districts-v1.json'] = positional;
if (!src) {
  console.error('usage: node map/tools/districts-extract.mjs <osaalueet.geojson> [out.json] [--box s,w,n,e]');
  process.exit(1);
}
const boxArg = flag('--box');
const BOX = boxArg
  ? (([s, w, n, e]) => ({ s: +s, w: +w, n: +n, e: +e }))(boxArg.split(','))
  : { s: 60.148, w: 24.895, n: 60.218, e: 24.995 };

const gj = JSON.parse(readFileSync(src, 'utf8'));

/** Area-weighted centroid of a ring, by the shoelace formula.
 *
 *  NOT the mean of the vertices: coastal districts have hundreds of points
 *  along a crenellated shoreline and three across the inland side, so a vertex
 *  mean drags the label out to sea. The shoelace centroid weights by AREA and
 *  ignores how finely an edge happens to be sampled. */
function centroid(ring) {
  let a = 0, x = 0, y = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += f;
    x += (ring[j][0] + ring[i][0]) * f;
    y += (ring[j][1] + ring[i][1]) * f;
  }
  a *= 0.5;
  if (!a) return null;
  return [y / (6 * a), x / (6 * a)];              // [lat, lon]
}
function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2);
}

const out_ = [];
for (const f of gj.features) {
  const p = f.properties || {};
  if (!p.NIMI) continue;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  // A district can be several islands. The label belongs on the BIGGEST piece,
  // not on the centroid of the whole multipolygon, which for an archipelago
  // district lands in open water between the islands.
  let bestRing = null, bestArea = 0;
  for (const poly of polys) {
    const a = ringArea(poly[0]);
    if (a > bestArea) { bestArea = a; bestRing = poly[0]; }
  }
  if (!bestRing) continue;
  const c = centroid(bestRing);
  if (!c) continue;
  if (c[0] < BOX.s || c[0] > BOX.n || c[1] < BOX.w || c[1] > BOX.e) continue;
  out_.push({
    name: p.NIMI,
    nameSe: p.NIMI_SE || null,
    district: p.PERUS_N_FI || null,
    at: [+c[0].toFixed(5), +c[1].toFixed(5)],
    areaRank: +bestArea.toExponential(3),
  });
}
out_.sort((a, b) => a.name.localeCompare(b.name, 'fi'));

const doc = {
  schemaVersion: 1,
  id: 'helsinki-districts-v1',
  title: 'Helsinki sub-district label points, clipped to the Era II extent',
  generatedBy: 'map/tools/districts-extract.mjs',
  source: {
    dataset: 'Helsingin kaupunki — osa-aluejako (sub-district division), 2015',
    via: 'https://raw.githubusercontent.com/dhh16/helsinki/master/osaalueet.geojson',
    note: 'Third-party mirror of the city\'s open geodata; the city\'s own host is '
      + 'not reachable from the environment this was generated in. Recorded so the '
      + 'provenance of a place name is never "it was just there".',
    isNot: 'NOT A COASTLINE. These are administrative areas that INCLUDE the sea — '
      + 'Eläintarhanlahti, Töölönlahti, Sörnäistenselkä and the open sea all fall '
      + 'inside a district polygon, so their union is not land and their complement '
      + 'is not water. Only label points are kept here.',
    labelPoint: 'Area-weighted (shoelace) centroid of the district\'s LARGEST ring. '
      + 'A vertex mean drags coastal labels out to sea, because a shoreline carries '
      + 'hundreds of points and the inland side carries three.',
  },
  boundingBox: BOX,
  coordinateSystem: 'WGS84 [lat, lon]',
  districts: out_,
};

writeFileSync(path.resolve(out), JSON.stringify(doc, null, 0));
console.log(`→ ${out}  ${Math.round(JSON.stringify(doc).length / 1024)} KB`);
console.log(`  ${out_.length} districts with a label point inside the box`);
console.log('  ' + out_.map(d => d.name).join(', '));
