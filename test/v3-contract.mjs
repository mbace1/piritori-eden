import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [html, css, app, content, map, art] = await Promise.all([
  read('../index.html'),
  read('../v3.css'),
  read('../js/v3/app.js'),
  read('../content/era1-slice-v1.json').then(JSON.parse),
  read('../map/kallio-era1-2003-v1.json').then(JSON.parse),
  read('../art/v3/manifest.json').then(JSON.parse),
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
assert.equal(map.anchors.length, 12);
assert.equal(map.anchors.filter(anchor => anchor.sliceState === 'active').length, 8);
assert.equal(content.schedule.length, 14);
assert.deepEqual(content.schedule.slice(0, 2).map(item => item.encounter_id),
  ['enc-first-purchase', 'enc-first-sale'], 'classic purchase-to-profit opening stays immediate');
assert.equal(content.battles.map(item => item.format).sort().join(','), '2v2,3v3');
assert(app.includes('FIRST ARBITRAGE') && app.includes('EMERGING SUPPLIER'),
  'map communicates the buyer-to-supplier growth ladder');

const ids = new Set();
for (const group of art.assets) {
  ids.add(group.id);
  for (const member of group.members ?? []) ids.add(member.id);
}
for (const id of ['scene-toko-noodles-prototype-v02', 'scene-karhupuisto-v01',
  'scene-courtyard-prototype-v02', 'formation-grid-3x3-v01']) {
  assert(ids.has(id), `${id} remains registered`);
}

console.log('V3 CONTRACT OK: five modes, 44px floor, 12-anchor map, 14 blocks and registered scene art.');
