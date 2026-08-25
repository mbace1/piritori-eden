import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, 'kallio-era1-2003-v1.json');
const map = JSON.parse(fs.readFileSync(file, 'utf8'));

const fail = (message) => {
  console.error(`MAP INVALID: ${message}`);
  process.exitCode = 1;
};

if (map.schemaVersion !== '1.0.0') fail('unexpected schemaVersion');
if (map.id !== 'kallio-era1-2003-v1') fail('unexpected map id');

const anchors = new Map();
for (const anchor of map.anchors) {
  if (anchors.has(anchor.id)) fail(`duplicate anchor ${anchor.id}`);
  anchors.set(anchor.id, anchor);

  const [lat, lon] = anchor.wgs84;
  const bounds = map.coordinateSystem.bounds;
  if (lat < bounds.south || lat > bounds.north ||
      lon < bounds.west || lon > bounds.east) {
    fail(`${anchor.id} lies outside production bounds`);
  }

  const xM = (lon - map.coordinateSystem.origin.lon) *
    map.coordinateSystem.metresPerDegree.lon;
  const yM = (lat - map.coordinateSystem.origin.lat) *
    map.coordinateSystem.metresPerDegree.lat;
  const x = map.coordinateSystem.board.offsetX +
    xM / map.coordinateSystem.board.metresPerUnit;
  const y = map.coordinateSystem.board.offsetY -
    yM / map.coordinateSystem.board.metresPerUnit;
  if (Math.abs(anchor.board.x - x) > 0.75 ||
      Math.abs(anchor.board.y - y) > 0.75) {
    fail(`${anchor.id} board coordinates drift from projection`);
  }
}

for (const site of map.sites) {
  if (!anchors.has(site.anchorId)) {
    fail(`site ${site.id} references missing anchor ${site.anchorId}`);
  }
  if (site.fictional && site.addressPrecision !== 'anchor-only') {
    fail(`fictional site ${site.id} must stay anchor-only`);
  }
}

for (const edge of map.edges) {
  if (!anchors.has(edge.from) || !anchors.has(edge.to)) {
    fail(`edge ${edge.id} references a missing anchor`);
  }
}

for (const service of map.periodServices) {
  for (const anchorId of service.anchorSequence) {
    if (!anchors.has(anchorId)) {
      fail(`service ${service.id} references missing anchor ${anchorId}`);
    }
  }
}

// A pinned count, not a rule about geography. It exists so an anchor cannot
// quietly become playable through a typo — opening one is a design decision and
// should require editing this line.
//
// 8 -> 9 on 2026-08-23: Sörnäinen opened by owner ruling. Kattilahalli, Suvilahti
// and Sörnäinen are places where fights and other dealings happen, and the arena
// for the boiler hall was already registered art with nowhere to be.
// 9 -> 10 on 2026-08-23: Suvilahti separated from the harbour. Kattilahalli is
// in the old gasworks and the docks are the waterfront — filing both under one
// anchor had merged two places. The real gasworks sit just EAST of the locked
// production boundary, so the anchor is placed at the frame edge and marked
// representative, exactly as the harbour already is.
// 10 -> 11 on 2026-08-25: Jaska's site moves off Torkkelinmäki to Scene Club, a
// new anchor at Mäkelänsilta — just north of Kurvi, past the bridge where
// Mäkelänkatu begins. Owner-placed geography, not invented: an art-and-LAN
// commune belongs at a real bridgehead, not folded into the residential
// district anchor it used to borrow.
const EXPECTED_ACTIVE_ANCHORS = 11;
const active = map.anchors.filter((anchor) => anchor.sliceState === 'active');
if (active.length !== EXPECTED_ACTIVE_ANCHORS) {
  fail(`expected ${EXPECTED_ACTIVE_ANCHORS} active slice anchors, found ${active.length}`);
}

const easternClusterSites = map.sites
  .filter((site) => site.anchorId === 'piritori')
  .map((site) => site.id);
for (const expected of ['piritori_first_buy', 'sornainen_metro']) {
  if (!easternClusterSites.includes(expected)) {
    fail(`Piritori cluster is missing ${expected}`);
  }
}

if (!process.exitCode) {
  console.log(
    `MAP OK: ${map.anchors.length} anchors, ` +
    `${map.sites.length} sites, ${map.edges.length} edges, ` +
    `${active.length} active slice anchors.`,
  );
}

