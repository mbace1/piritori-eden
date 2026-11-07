import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SOURCES, validateRows, selectRow, comparison, metricText, PROPOSALS } from './model.mjs';
const root = new URL('../../../', import.meta.url);
for (const source of Object.values(SOURCES)) {
  const rows = validateRows(JSON.parse(fs.readFileSync(new URL('design/evidence/scene-club-2026-11-07/' + source.file, root))));
  assert.equal(new Set(rows.map(row => row.fight)).size,15);
  for (const heat of [0,2,3]) for (const fight of new Set(rows.map(row => row.fight))) {
    const careful=selectRow(rows,fight,heat,'careful'),aggressive=selectRow(rows,fight,heat,'fight');assert(careful&&aggressive);
    assert.equal(comparison(rows,fight,heat).winPoints, +(careful.win-aggressive.win).toFixed(2));
    assert.equal(metricText(careful,'wallClock'),'Not measured');
  }
  assert.throws(()=>validateRows([...rows,rows[0]]),/Duplicate/);
  console.log('PASS preserved data',source.file,rows.length,'rows');
}
const baseline30=JSON.parse(fs.readFileSync(new URL('design/evidence/scene-club-2026-11-07/baseline-30.json',root)));
assert.equal(metricText(baseline30[0],'braces'),'Not measured');
assert.equal(PROPOSALS.length,5);
console.log('PASS missing telemetry stays missing; five source-backed proposals; no rule execution');
