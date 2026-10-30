import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [indexHtml, html, css, js] = await Promise.all([
  read('../index.html'),
  read('../fighter-test.html'),
  read('../fighter-test.css'),
  read('../js/v3/fighter-test.js'),
]);

assert(indexHtml.includes('fighter-test.html?v=449'), 'splash link cache-busts the v4.49 fighter page');
assert(html.includes('PLAYABLE TEST · v4.49'), 'test is visibly versioned');
assert(html.includes('fighter-test.css?v=3'), 'changed fighter stylesheet has a fresh cache token');
assert(html.includes('fighter-test.js?v=3'), 'changed fighter runtime has a fresh cache token');
assert(html.includes('provisional Piritori'), 'provisional status is visible');
assert(html.includes('UPDATED IN v3'), 'the finger-capable rig update is visible');
assert(html.includes('NOT FINAL IN THIS TEST'), 'unavailable and non-final work is stated');
assert(!html.includes('current arm proportions'), 'the corrected v2 arms are no longer listed as unfinished');
for (const pilot of ['f01', 'f02']) {
  assert.equal([...html.matchAll(new RegExp(`data-pilot="${pilot}"`, 'g'))].length, 6,
    `${pilot} has two motion and four hand-pose controls`);
}
assert.equal([...html.matchAll(/data-motion="(?:alert-idle|casual-walk)"/g)].length, 4,
  'four locomotion controls ship');
for (const pose of ['hands-open', 'hands-relaxed', 'hands-fist', 'hands-prop-grip']) {
  assert.equal([...html.matchAll(new RegExp(`data-hand-pose="${pose}"`, 'g'))].length, 2,
    `${pose} ships once for each fighter`);
}
assert.equal([...html.matchAll(/data-hand-pose="hands-relaxed" aria-pressed="true"/g)].length, 2,
  'both fighters visibly default to relaxed hands');
assert(css.includes('min-height: 48px'), 'touch controls declare a 48px floor');
assert(css.includes('touch-action: pan-y pinch-zoom'), 'the canvas preserves vertical touch scrolling');
assert(js.includes("new THREE.AnimationMixer(model)"), 'each mixer roots at its own model');
assert(js.includes("clip.name"), 'clips are selected by explicit names');
assert(!js.includes('animations?.[0]'), 'the test never guesses clip zero');
assert(js.includes("'hands-open', 'hands-relaxed', 'hands-fist', 'hands-prop-grip'"),
  'runtime requires all four agreed hand-pose clips');
assert(js.includes('bodyActions') && js.includes('handActions'), 'body and hand actions use separate layers');
assert(js.includes('body and hand clips target overlapping bones'), 'runtime rejects non-disjoint animation layers');
assert(js.includes("targetsForClip(pilotId, clip, boneNames, 'quaternion')"),
  'runtime restricts hand-pose tracks to quaternion rotation');
assert(js.includes('expected one quaternion track per finger bone'),
  'runtime requires exactly one rotation track for each finger bone');
assert(js.includes('expected ${expectedBoneCount} from manifest'), 'body bone count is validated against manifest metadata');
assert(!js.includes('skeleton.bones.length !== 24'), 'runtime has no hardcoded total skeleton count');
assert(js.includes("body still contains a base clip"), 'base animation removal is asserted');
assert(js.includes("clip pack duplicates geometry"), 'clip geometry removal is asserted');
assert(js.includes('setFromObject(model, true)'), 'visibility checks use precise deformed skinned bounds');
assert(!js.includes('skeleton.pose()'), 'runtime preserves the GLB armature rest locals');
assert(js.includes("matchMedia('(prefers-reduced-motion: reduce)')"), 'reduced motion controls playback');
assert(js.includes('event.persisted'), 'page lifecycle distinguishes BFCache suspension from disposal');

console.log('FIGHTER TEST CONTRACT OK: two provisional finger rigs, layered clips, independent accessible controls.');
