import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compareDefensive } from '../tools/defensive-policy-report.mjs';
const baseline = [], optional = [];
for (let fight = 0; fight < 15; fight++) for (const heat of [0, 2, 3]) {
  const goal = fight < 11 ? 'fight' : 'getaway';
  for (const policy of goal === 'fight' ? ['fight', 'careful', 'focused'] : ['run', 'fight', 'careful', 'escort']) {
    const row = { fight: 'fixture:' + fight, goal, heat, policy, win: 50, withdraw: 50, loss: 0, rounds: '3.0',
      hpLost: '2.0', downs: '0.1', downed: 8, police: 20, braces: '0.0', moves: '4.0', attacks: '5.0', stuck: 0 };
    baseline.push(row); optional.push({ ...row });
  }
  optional.push({ ...baseline.at(-1), policy: 'defensive', win: 60, withdraw: 40, hpLost: '1.0', braces: '1.0',
    braceWithIncoming: '0.2', bracePreparing: '0.8', bracePredictedDownPrevented: '0.0' });
}
const report = compareDefensive(baseline, optional, 12, structuredClone(baseline));
assert.equal(report.matrix.defaultSimulations, 1764); assert.equal(report.matrix.addedPolicySimulations, 540);
assert.equal(report.matrix.optionalSimulations, 2304);assert.equal(report.groups.fight.matchedFightHeatCases, 33);
assert.equal(report.groups.getaway.matchedFightHeatCases, 12);
assert.equal(report.groups.fight.defensiveMinusPeer.fight.winPoints, 10);
assert.equal(report.groups.getaway.defensiveMinusPeer.escort.hpSaved, 1);
assert.equal(report.perCase.length, 45);
assert.throws(() => compareDefensive(baseline, [...optional, optional[0]], 12), /Duplicate/);
const changed = structuredClone(optional); changed[0].win = 49;
assert.throws(() => compareDefensive(baseline, changed, 12), /original policy row/);
const missing = structuredClone(optional); delete missing.find(row => row.policy === 'defensive').bracePreparing;
assert.throws(() => compareDefensive(baseline, missing, 12), /Missing defensive decision telemetry/);
missing.find(row => row.policy === 'defensive').bracePreparing = null;
assert.throws(() => compareDefensive(baseline, missing, 12), /Missing defensive decision telemetry/);
assert.throws(() => compareDefensive(baseline, optional, 0), /positive integer/);
assert.throws(() => compareDefensive(baseline, optional.filter(row => row.policy !== 'defensive'), 12), /192 rows/);
console.log('PASS defensive report: exact 147/192 matrix, matched 33/12 cohorts, fixture deltas, unchanged peers, duplicate/missing rows and sample validation');

// Preserve the historical evidence exactly. The new integrated run measures
// action counters too; absent historical counters must never be invented.
const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));
const prefix = '../../design/evidence/defensive-policy-2026-11-07/integrated-v497/';
const fresh = read(prefix + 'defensive-30.json'), peers = read(prefix + 'default-30.json');
const historical = read('../../design/evidence/scene-club-2026-11-07/baseline-30.json');
assert.equal(fresh.length, 192); assert.equal(peers.length, 147);
assert.deepEqual(fresh.filter(r => r.policy !== 'defensive'), peers);
const key = r => [r.fight, r.heat, r.policy].join('|');
const byKey = new Map(peers.map(r => [key(r), r]));
for (const old of historical) for (const [field, value] of Object.entries(old)) assert.deepEqual(byKey.get(key(old))?.[field], value, key(old) + ' / ' + field);
assert(historical.every(r => !Object.hasOwn(r, 'braces')));
assert(peers.every(r => Object.hasOwn(r, 'braces')));
assert(fresh.every(r => Number(r.stuck) === 0));
console.log('PASS integrated 30-seed evidence: 192 rows, 147 historical peers exact, new action counters separate, zero iteration guards');
