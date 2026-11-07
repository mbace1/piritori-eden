import assert from 'node:assert/strict';
import fs from 'node:fs';
// Any accidental use of a real browser campaign storage API fails this test.
Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('Review fixture accessed browser campaign storage'); } });
const { CASES, indexData, createFixture, projectFixture, applyFixture, reloadFixture, summarize } = await import('./model.js');
const { transactOffer } = await import('../../../web/js/v3/state.js?v=13');
const read = path => JSON.parse(fs.readFileSync(new URL(`../../../${path}`, import.meta.url)));
const data = indexData(read('content/era1-slice-v1.json'), read('content/doors-v1.json'), read('content/places-v1.json'), read('art/v3/manifest.json'));
assert.equal(CASES.length, 9);
for (const definition of CASES) {
  assert(data.artManifest.assets.some(asset => asset.id === definition.scene && asset.file), `${definition.id}: registered existing plate`);
  const fixture = createFixture(data, definition.id), projection = projectFixture(data, definition.id), before = structuredClone(fixture.state);
  assert.equal(applyFixture(fixture, data).ok, true, definition.id);
  assert.deepEqual(fixture.state, projection.state, `${definition.id}: deterministic projected/committed fixture states`);
  assert.deepEqual(fixture.before, before, `${definition.id}: before remains intact`);
  if (fixture.receipt) {
    assert.equal(fixture.state.battleHistory.length, 1);
    assert.equal(fixture.state.flags.filter(f => f.startsWith('memory:c17-receipt:')).length, 1);
    assert.equal(fixture.state.flags.filter(f => f.startsWith('memory:outing-settled:')).length, 1);
    const settled = JSON.stringify(fixture.state);
    assert.equal(applyFixture(fixture, data).ok, false);
    assert.equal(JSON.stringify(fixture.state), settled, `${definition.id}: receipt replay changes nothing`);
    reloadFixture(fixture, data);
    const restored = JSON.stringify(fixture.state);
    assert.equal(applyFixture(fixture, data).ok, false);
    assert.equal(JSON.stringify(fixture.state), restored, `${definition.id}: JSON reload does not reopen settlement`);
    assert.equal(fixture.state.scheduleIndex, before.scheduleIndex + 1, 'one night block spent exactly once');
  }
  if (definition.id === 'trade') {
    assert.equal(fixture.state.cash, before.cash - 45); assert.equal(fixture.state.stock.piri, 1);
    const nextPurchase = transactOffer(fixture.state, fixture.offer);
    assert.equal(nextPurchase.ok, true, 'real trades may repeat per pack'); assert.equal(fixture.state.cash, before.cash - 90); assert.equal(fixture.state.stock.piri, 2);
  }
  if (definition.id === 'hire') {
    assert.equal(fixture.state.cash, before.cash - fixture.candidate.wage_eur);
    const hired = JSON.stringify(fixture.state); assert.equal(applyFixture(fixture, data).ok, false); assert.equal(JSON.stringify(fixture.state), hired);
  }
  if (definition.id === 'victory') {
    assert.equal(data.content.schedule[before.scheduleIndex].block, 'night', 'authored ledger door is night-only');
    assert.equal(fixture.state.cash, before.cash + 120 - 46, 'authored job reward less existing nightly wages'); assert.equal(fixture.state.debt, before.debt + 5, 'existing nightly debt interest'); assert.equal(fixture.state.crewStatus['crew-slot-runner'].condition, before.crewStatus['crew-slot-runner'].condition - 1);
    assert.equal(fixture.state.crewStatus['crew-slot-runner'].status, 'wounded'); assert(fixture.state.equipment.some(e => e.id === 'tire-iron'));
    assert.equal(fixture.state.chapterEarned, 0, 'job cash is not fence income');
  }
  if (definition.id === 'withdraw') { assert.equal(fixture.state.crewStatus['crew-slot-muscle'].status, 'missing'); assert.equal(fixture.state.crewStatus['crew-slot-muscle'].condition, 0); assert.equal(fixture.state.crewStatus.aatami.status, 'wounded'); }
  if (definition.id === 'police') { assert(fixture.state.arrestedCrew.includes('crew-slot-muscle')); assert(!fixture.state.recruited.includes('crew-slot-muscle')); }
  if (definition.id === 'rescue') { assert.equal(fixture.state.crewStatus['crew-slot-runner'].status, 'wounded'); assert.equal(fixture.state.crewStatus['crew-slot-runner'].condition, 1); }
  if (definition.id === 'treatment') { assert.equal(fixture.state.cash, before.cash - 80); assert.equal(fixture.state.crewStatus['crew-slot-muscle'].critical, false); assert.equal(fixture.state.crewStatus['crew-slot-muscle'].status, 'wounded'); assert.equal(fixture.state.crewStatus['crew-slot-muscle'].condition, 1); }
  if (definition.id === 'bail') { assert.equal(fixture.state.cash, before.cash - 120); assert.equal(fixture.state.arrestedCrew.length, 0); assert.equal(fixture.state.crewStatus['crew-slot-muscle'].status, 'available'); }
  if (definition.id === 'pressure') { assert.equal(fixture.state.pressure.torkkelinmaki, before.pressure.torkkelinmaki + 1); assert.equal(fixture.state.relationships.jade_lantern_network, (before.relationships.jade_lantern_network || 0) - 1); }
  assert(summarize(fixture.state, data).people.length >= 1);
  console.log(`PASS ${definition.id}: existing effects, deterministic before/after, isolated memory`);
}
console.log('Consequence workbench: 9 fixtures passed; 3 real-adapter receipts reject replays before/after JSON restore; no storage access.');
