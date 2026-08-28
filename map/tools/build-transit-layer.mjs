#!/usr/bin/env node
/**
 * build-transit-layer.mjs — write the committed `web/`-facing transit
 * layer, `map/kallio-transit-layer-v1.json`.
 *
 * DESIGN_AUTHORITY.md's 2026-08-28 addendum: until `js` has feature/asset
 * parity with Godot, anything Godot already has flows Godot -> web.
 * `city_map.gd`'s L2 (`TRANSIT_LAYERS.md` §3) draws the real HSL tram/metro
 * network on the board; `web/`'s route map still drew two flat hand-placed
 * anchor dots and edges with none of it. `map/tools/transit-layer.mjs`
 * holds the one algorithm (real GTFS geometry, real colours, corridor
 * fanning) that already builds Godot's copy of this layer
 * (`godot/tools/build-map-geometry.mjs`'s `public-transit`); this script
 * calls the SAME function and commits the result as a static file, the
 * same way `map/kallio-rail-v1.json` and `map/kallio-corridors-v1.json`
 * are committed rather than generated at runtime — `web/` has no build
 * step (CLAUDE.md), so the derived layer has to already exist as a file a
 * plain `fetch()` can read.
 *
 *   node map/tools/build-transit-layer.mjs           write the file
 *   node map/tools/build-transit-layer.mjs --check   fail if it would change
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTransitLines, BOARD_JSON } from './transit-layer.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const mapRoot = resolve(here, '..');
const OUT = resolve(mapRoot, 'kallio-transit-layer-v1.json');

const board = JSON.parse(readFileSync(BOARD_JSON, 'utf8'));
const out = {
  schemaVersion: '1.0.0',
  id: 'kallio-transit-layer-v1',
  source: 'map/tools/transit-layer.mjs',
  space: 'board',
  boardExtent: { x: 0, y: 0, w: board.coordinateSystem.board.width, h: board.coordinateSystem.board.height },
  services: buildTransitLines(),
};

const json = JSON.stringify(out, null, 1);
const changed = !existsSync(OUT) || readFileSync(OUT, 'utf8') !== json;

if (process.argv.includes('--check')) {
  if (changed) {
    console.error('DRIFT: map/kallio-transit-layer-v1.json is stale. Run: node map/tools/build-transit-layer.mjs');
    process.exit(1);
  }
  console.log(`TRANSIT LAYER OK: ${out.services.length} services match map/kallio-rail-v1.json.`);
} else {
  writeFileSync(OUT, json);
  console.log(`wrote map/kallio-transit-layer-v1.json  (${(json.length / 1024).toFixed(1)} KB, ${out.services.length} services)`);
}
