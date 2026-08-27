#!/usr/bin/env node
/**
 * Overpass JSON  ->  the real street layer, classified by road size.
 *
 *   node map/tools/streets-import.mjs <overpass.json> <out.json> [--box s,w,n,e]
 *
 * Reported directly, 2026-08-28: "larger streets can be visible[,] cross
 * referenced to actual maps." `map/kallio-corridors-v1.json` (§10.8 of
 * `TRANSIT_LAYERS.md`) is NOT a street map — it is corridors that carry
 * public transit, and any street with no route on it is simply absent,
 * which is why the middle of the board has a hole in it. This is the real
 * thing: actual OSM ways, classified by `highway=`, clipped to the board.
 *
 * SAME PATTERN AS water-import.mjs, same reason: the query is run wherever
 * network access reaches Overpass and this tool takes what comes back.
 *
 *   [out:json][timeout:90];
 *   way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential
 *     |unclassified|living_street|pedestrian|service|track)$"]
 *     (60.170,24.930,60.200,24.980);
 *   out geom;
 *
 * `service` and `track` were added 2026-08-28, reported directly: "the grey
 * can continue on the right as well." The harbour/industrial side of the
 * board (Sörnäinen, Suvilahti) is real land with real ground, but is thin on
 * PUBLIC through-streets — its access roads are almost entirely
 * `highway=service`, 2020 of them in this box, none of which the original
 * query fetched. They feed the land shape (`buildRealLand()`'s street
 * buffer) at `minor` weight; they are real ways, not an invented fill.
 *
 * (The Era II box is 60.148,24.895,60.218,24.995 per TRANSIT_LAYERS.md §11.1,
 * same as water-import's default — run once, clip twice.)
 *
 * CLASSIFICATION, for weight in the drawing, not for filtering here — the
 * game decides which tiers to draw and how heavy, this file just carries
 * every real way and says what kind of way it is:
 *
 *   major  motorway, trunk, primary
 *   mid    secondary, tertiary
 *   minor  residential, unclassified, living_street, pedestrian, service, track
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [src, out] = positional;
if (!src || !out) {
  console.error('usage: node map/tools/streets-import.mjs <overpass.json> <out.json> [--box s,w,n,e]');
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

const TIER = {
  motorway: 'major', trunk: 'major', primary: 'major',
  secondary: 'mid', tertiary: 'mid',
  residential: 'minor', unclassified: 'minor', living_street: 'minor', pedestrian: 'minor',
  service: 'minor', track: 'minor',
};

/** Douglas–Peucker at ~4 m — see water-import.mjs, same reasoning: invisible
 *  at the width this draws, a tenth the file. */
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

const roads = [];
let skipped = 0;
for (const el of els) {
  if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) continue;
  const line = el.geometry.map(g => [+(+g.lat).toFixed(6), +(+g.lon).toFixed(6)]);
  if (!touches(line)) { skipped++; continue; }
  const t = el.tags || {};
  const cls = t.highway || 'unclassified';
  roads.push({
    class: cls,
    tier: TIER[cls] || 'minor',
    name: t.name || null,
    points: simplify(line).length,
    shape: simplify(line),
  });
}

const doc = {
  schemaVersion: 1,
  id: path.basename(out, '.json'),
  title: 'Real streets, classified by size, clipped to the box',
  generatedBy: 'map/tools/streets-import.mjs',
  source: {
    dataset: 'OpenStreetMap via Overpass',
    licence: 'ODbL 1.0',
    attribution: '© OpenStreetMap contributors',
  },
  boundingBox: BOX,
  coordinateSystem: 'WGS84 [lat, lon]',
  roads,
};

writeFileSync(path.resolve(out), JSON.stringify(doc));
const tiers = roads.reduce((m, r) => (m[r.tier] = (m[r.tier] || 0) + 1, m), {});
console.log(`→ ${out}  ${Math.round(JSON.stringify(doc).length / 1024)} KB`);
console.log(`  ${roads.length} roads (${Object.entries(tiers).map(([k, v]) => `${k} ${v}`).join(' · ')}), ${skipped} outside the box`);
if (!roads.length) console.warn('  ! nothing imported — check the query and the box');
