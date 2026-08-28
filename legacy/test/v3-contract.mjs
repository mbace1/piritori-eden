import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// content/map/art paths are two levels up (test/ -> legacy/ -> repo root),
// one more than ../index.html etc. — fixed 2026-08-28, the same stale-depth
// bug as legacy/js/v3/content.js, left over from this file moving one
// directory shallower when the repo split out of Suds-Jack on 2026-08-21.
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [html, css, app, content, map, art] = await Promise.all([
  read('../index.html'),
  read('../v3.css'),
  read('../js/v3/app.js'),
  read('../../content/era1-slice-v1.json').then(JSON.parse),
  read('../../map/kallio-era1-2003-v1.json').then(JSON.parse),
  read('../../art/v3/manifest.json').then(JSON.parse),
]);

assert.equal([...html.matchAll(/data-mode-target="/g)].length, 5, 'five mode controls ship in the shell');
for (const mode of ['route', 'encounter', 'ledger', 'battle', 'news']) {
  assert(html.includes(`data-mode-target="${mode}"`), `${mode} is reachable`);
}
assert(html.includes('js/v3/app.js?v=2'));
assert.equal([...html.matchAll(/js\/v3\/app\.js\?v=/g)].length, 1, 'one app module token');
assert(css.includes('min-width: 44px') && css.includes('min-height: 44px'), '44px control floor is declared');
assert(!/smartphone|app grid/i.test(html), 'shell does not present the market as a smartphone app');
assert(app.includes('era1-slice-v1.json') === false, 'the app loads content through the content adapter');
assert(app.includes('ordinary journeys'), 'ordinary and hidden route capacity is visible');
assert(app.includes('weather-rain-fine-v01'), 'weather stays a separate runtime layer');
// 12/8 were stale: the board has grown since this test was written (the map
// was rebuilt from real OSM/HSL data this session — see MAP.md). Corrected
// against map/validate-map.mjs's own authoritative count, 2026-08-28.
assert.equal(map.anchors.length, 14);
assert.equal(map.anchors.filter(anchor => anchor.sliceState === 'active').length, 11);
assert.equal(content.schedule.length, 14);
assert.deepEqual(content.schedule.slice(0, 2).map(item => item.encounter_id),
  ['enc-first-purchase', 'enc-first-sale'], 'classic purchase-to-profit opening stays immediate');
// Stale for the same reason as the anchor counts — content/validate-slice.mjs
// already reports "2v2 + 3v3 + 3v3", a third battle since this was written.
assert.equal(content.battles.map(item => item.format).sort().join(','), '2v2,3v3,3v3');
assert(app.includes('FIRST ARBITRAGE') && app.includes('EMERGING SUPPLIER'),
  'map communicates the buyer-to-supplier growth ladder');

const ids = new Set();
for (const group of art.assets) {
  ids.add(group.id);
  for (const member of group.members ?? []) ids.add(member.id);
}
for (const id of ['scene-toko-noodles-prototype-v02', 'scene-karhupuisto-v01',
  // v02 -> v05: the asset was re-versioned since this test was written. The
  // other three ids in this list are still current; checked individually.
  'scene-courtyard-prototype-v05', 'formation-grid-3x3-v01']) {
  assert(ids.has(id), `${id} remains registered`);
}

console.log('V3 CONTRACT OK: five modes, 44px floor, 14-anchor map, 14 blocks and registered scene art.');
