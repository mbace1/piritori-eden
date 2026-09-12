import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [html, css, js, manifest] = await Promise.all([
  read('../fighter-test.html'),
  read('../fighter-test.css'),
  read('../js/v3/fighter-test.js'),
  read('../../art/v3/manifest.json').then(JSON.parse),
]);

assert(html.includes('PLAYABLE TEST · v4.48'), 'test is visibly versioned');
assert(html.includes('provisional runtime candidates'), 'provisional status is visible');
assert(html.includes('NOT FINAL IN THIS TEST'), 'unavailable and non-final work is stated');
assert(html.includes('current arm proportions'), 'known provisional arm proportions are stated');
for (const pilot of ['f01', 'f02']) {
  assert.equal([...html.matchAll(new RegExp(`data-pilot="${pilot}"`, 'g'))].length, 2,
    `${pilot} has two independent controls`);
}
assert.equal([...html.matchAll(/data-motion="(?:alert-idle|casual-walk)"/g)].length, 4,
  'four locomotion controls ship');
assert(css.includes('min-height: 48px'), 'touch controls declare a 48px floor');
assert(js.includes("new THREE.AnimationMixer(model)"), 'each mixer roots at its own model');
assert(js.includes("clip.name"), 'clips are selected by explicit names');
assert(!js.includes('animations?.[0]'), 'the test never guesses clip zero');
assert(js.includes("body still contains a base clip"), 'base animation removal is asserted');
assert(js.includes("clip pack duplicates geometry"), 'clip geometry removal is asserted');

const expected = [
  'cast3d-f01-heavy-bruiser-v01',
  'cast3d-f01-heavy-bruiser-clips-v01',
  'cast3d-f02-wiry-skirmisher-v01',
  'cast3d-f02-wiry-skirmisher-clips-v01',
];
const byId = new Map(manifest.assets.map(asset => [asset.id, asset]));
for (const id of expected) {
  const asset = byId.get(id);
  assert(asset, `${id} is registered`);
  assert.equal(asset.production_status, 'playable-test-only', `${id} stays provisional`);
  assert.equal(asset.rig_version, 'v1', `${id} records its rig version`);
  assert.equal(typeof asset.bytes, 'number', `${id} records byte size`);
  assert.match(asset.sha256, /^[0-9a-f]{64}$/, `${id} records sha256`);
}
for (const id of expected.filter(id => id.includes('-clips-'))) {
  const asset = byId.get(id);
  assert.deepEqual(asset.clip_names, ['alert-idle', 'casual-walk'], `${id} declares exact clips`);
  assert(byId.has(asset.compatible_model_id), `${id} points at its own registered model`);
}

console.log('FIGHTER TEST CONTRACT OK: two provisional bodies, own-rig clips, independent touch controls.');
