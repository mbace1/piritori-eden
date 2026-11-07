#!/usr/bin/env node
// Compare matched fight/heat cohorts; never average unlike policy matrices.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const key = row => [row.fight, row.heat, row.policy].join('|');
const measured = value => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value));
const metrics = ['win', 'withdraw', 'loss', 'rounds', 'hpLost', 'downs', 'downed', 'police', 'braces', 'moves', 'attacks', 'stuck'];
function validate(rows) {
  assert(Array.isArray(rows) && rows.length, 'Expected nonempty measurement rows');
  const keys = new Set();
  for (const row of rows) {
    assert(!keys.has(key(row)), 'Duplicate row ' + key(row)); keys.add(key(row));
    assert(['fight', 'getaway'].includes(row.goal) && [0, 2, 3].includes(row.heat), 'Unexpected goal/heat');
    for (const metric of metrics) assert(measured(row[metric]), 'Missing/invalid measured field ' + metric);
    if (row.policy === 'defensive') for (const metric of ['braceWithIncoming', 'bracePreparing', 'bracePredictedDownPrevented']) {
      assert(measured(row[metric]), 'Missing defensive decision telemetry ' + metric);
    }
  }
  return rows;
}
const average = (rows, metric) => +(rows.reduce((sum, row) => sum + Number(row[metric]), 0) / rows.length).toFixed(3);
const averages = rows => Object.fromEntries(metrics.map(metric => [metric, average(rows, metric)]));

export function compareDefensive(defaultRows, optionalRows, seeds, historicRows = null) {
  validate(defaultRows); validate(optionalRows);
  assert(Number.isInteger(seeds) && seeds > 0, 'Seeds must be an explicit positive integer');
  assert.equal(defaultRows.length, 147, 'Default matrix must retain 147 rows');
  assert.equal(optionalRows.length, 192, 'Opt-in matrix must have 192 rows');
  assert.equal(new Set(defaultRows.map(row => row.fight)).size, 15);
  assert.deepEqual(optionalRows.filter(row => row.policy !== 'defensive'), defaultRows,
    'Every original policy row must remain identical in the opt-in run');
  if (historicRows) assert.deepEqual(defaultRows, historicRows, 'Fresh default differs from historical preserved baseline');
  const defensive = optionalRows.filter(row => row.policy === 'defensive');
  assert.equal(defensive.length, 45, 'Exactly one new policy for each of 15 fights × 3 heats');
  const lookup = new Map(optionalRows.map(row => [key(row), row]));
  const groups = {};
  for (const goal of ['fight', 'getaway']) {
    const selected = defensive.filter(row => row.goal === goal), names = goal === 'fight'
      ? ['fight', 'careful', 'focused'] : ['fight', 'careful', 'run', 'escort'];
    assert.equal(selected.length, goal === 'fight' ? 33 : 12);
    const policies = { defensive: averages(selected) }, deltas = {};
    for (const name of names) {
      const matched = selected.map(row => lookup.get([row.fight, row.heat, name].join('|')));
      assert(matched.every(Boolean), 'Missing matched peer policy ' + name);
      policies[name] = averages(matched);
      deltas[name] = {
        winPoints: +(policies.defensive.win - policies[name].win).toFixed(3),
        hpSaved: +(policies[name].hpLost - policies.defensive.hpLost).toFixed(3),
        extraRounds: +(policies.defensive.rounds - policies[name].rounds).toFixed(3),
        policePoints: +(policies.defensive.police - policies[name].police).toFixed(3),
        downedPoints: +(policies.defensive.downed - policies[name].downed).toFixed(3),
      };
    }
    groups[goal] = { matchedFightHeatCases: selected.length, seedsPerCase: seeds,
      simulatedRunsPerPolicy: selected.length * seeds, policies, defensiveMinusPeer: deltas,
      casesWithSuccessfulBrace: selected.filter(row => Number(row.braces) > 0).length,
      braceDecisionAverages: Object.fromEntries(['braceWithIncoming', 'bracePreparing', 'bracePredictedDownPrevented']
        .map(metric => [metric, average(selected, metric)])) };
  }
  return {
    matrix: { defaultRows: 147, defaultFightRows: 99, defaultGetawayRows: 48, addedDefensiveRows: 45,
      optionalRows: 192, seedsPerRow: seeds, defaultSimulations: 147 * seeds,
      addedPolicySimulations: 45 * seeds, optionalSimulations: 192 * seeds,
      originalRowsIdentical: true, historicalBaselineIdentical: historicRows ? true : null },
    groups,
    perCase: defensive.map(row => ({ fight: row.fight, heat: row.heat, goal: row.goal, defensive: row,
      peers: optionalRows.filter(peer => peer.fight === row.fight && peer.heat === row.heat && peer.policy !== 'defensive') })),
    limits: [
      'Groups compare the same fight/heat cases with the same deterministic seeds; unlike 147/192-row matrices are never averaged together.',
      'Averages use rounded per-row measurements. Successful command components may not sum exactly after source rounding.',
      'bracePredictedDownPrevented counts chosen forecast conditions, not measured saved lives or a counterfactual outcome.',
      'The score uses conservative intent forecasts with chance weighting; it is a bot heuristic, not an exact stochastic solver.',
      'Constrained fixtures prove legal semantics; they do not establish campaign win advantage. No rule, device, recovery or owner acceptance is implied.',
    ],
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [baseline, optional, count, historic, ...extra] = process.argv.slice(2);
  if (!baseline || !optional || !count || extra.length) {
    console.error('Usage: node web/tools/defensive-policy-report.mjs default.json optional.json seeds [historical-default.json]');
    process.exitCode = 2;
  } else {
    try {
      const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
      const output = compareDefensive(read(baseline), read(optional), Number(count), historic ? read(historic) : null);
      output.sources = [baseline, optional, ...(historic ? [historic] : [])].map(file => ({ file,
        sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') }));
      console.log(JSON.stringify(output, null, 2));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
