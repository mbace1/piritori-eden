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

const active = map.anchors.filter((anchor) => anchor.sliceState === 'active');
if (active.length !== 8) {
  fail(`expected 8 active slice anchors, found ${active.length}`);
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

