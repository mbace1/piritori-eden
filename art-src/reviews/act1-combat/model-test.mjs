import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { SOURCES, sourcePath, POLICY_NAMES, validateRows, selectRow, comparison, metricText, PROPOSALS } from './model.mjs';
const root = new URL('../../../', import.meta.url);
const read = path => JSON.parse(fs.readFileSync(new URL(path,root))), datasets = {};
for (const [id,source] of Object.entries(SOURCES)) {
  const rows = datasets[id] = validateRows(read(sourcePath(source)),id);
  assert.equal(new Set(rows.map(row => row.fight)).size,15);
  for (const heat of [0,2,3]) for (const fight of new Set(rows.map(row => row.fight))) {
    const careful=selectRow(rows,fight,heat,'careful'),aggressive=selectRow(rows,fight,heat,'fight');assert(careful&&aggressive);
    assert.equal(comparison(rows,fight,heat).winPoints, +(careful.win-aggressive.win).toFixed(2));
    assert.equal(metricText(careful,'wallClock'),'Not measured');
    if(id==='defensive30'){
      const defensive=selectRow(rows,fight,heat,'defensive'),delta=comparison(rows,fight,heat,'defensive');assert(defensive);
      assert.deepEqual(delta,{winPoints:+(defensive.win-aggressive.win).toFixed(2),hpSaved:+(aggressive.hpLost-defensive.hpLost).toFixed(2),extraRounds:+(defensive.rounds-aggressive.rounds).toFixed(2),policePoints:+(defensive.police-aggressive.police).toFixed(2),downedPoints:+(defensive.downed-aggressive.downed).toFixed(2)});
      assert.notEqual(metricText(defensive,'braceWithIncoming'),'Not measured');assert.equal(metricText(careful,'braceWithIncoming'),'Not measured');
    }else assert.equal(comparison(rows,fight,heat,'defensive'),null);
  }
  assert.throws(()=>validateRows([...rows,rows[0]],id),/Duplicate/);
  assert.throws(()=>validateRows(rows.slice(1),id),/Expected all 15/);
  const bad=structuredClone(rows);bad[0].policy='invented-policy';assert.throws(()=>validateRows(bad,id),/Unexpected policy matrix/);
  console.log('PASS preserved data',source.file,rows.length,'rows');
}
const baseline30=datasets.baseline30,defensive=datasets.defensive30,source=SOURCES.defensive30;
assert.equal(metricText(baseline30[0],'braces'),'Not measured');
assert.equal(SOURCES.baseline30.actions,false);assert.equal(POLICY_NAMES.defensive,'Defensive (opt-in)');
assert.throws(()=>validateRows(defensive),/147 rows/);assert.throws(()=>validateRows(defensive,'baseline30'),/147 rows/);assert.throws(()=>validateRows(baseline30,'defensive30'),/192 rows/);assert.throws(()=>validateRows(baseline30,'unregistered-source'),/Unknown/);
assert.deepEqual(Object.fromEntries([...new Set(defensive.map(r=>r.policy))].map(p=>[p,defensive.filter(r=>r.policy===p).length])),{run:12,fight:45,careful:45,escort:12,defensive:45,focused:33});
assert.deepEqual([...new Set(defensive.map(r=>r.fight))].sort(),[...new Set(baseline30.map(r=>r.fight))].sort());
const metadata=read(source.directory+'source.json'),report=read(source.directory+'comparison-30.json'),freshPeers=read(source.directory+'default-30.json');
assert.deepEqual(defensive.filter(row=>row.policy!=='defensive'),freshPeers);
assert.equal(metadata.historicalFieldsEqual,true);assert.equal(metadata.seedsPerRow,30);assert.equal(metadata.simulations,5760);assert.equal(metadata.stuckRows,0);
for(const row of baseline30){const peer=selectRow(freshPeers,row.fight,row.heat,row.policy);assert(peer);for(const key of metadata.historicalColumns)assert.equal(peer[key],row[key],row.fight+' '+row.heat+' '+row.policy+' '+key);assert.equal(row.braces,undefined);assert.notEqual(peer.braces,undefined);}
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(sourcePath(source),root))).digest('hex'),report.sources.find(s=>s.file===sourcePath(source)).sha256);
assert.equal(defensive.filter(row=>row.policy==='defensive').length,45);assert.equal(defensive.filter(row=>row.goal==='fight').length,132);assert.equal(defensive.filter(row=>row.goal==='getaway').length,60);
assert.equal(PROPOSALS.length,5);
console.log('PASS explicit 192-row source / 45 defensive rows; historical sources remain strict 147; matched peer equality and provenance hash');
console.log('PASS missing telemetry stays missing; exact per-scenario defensive deltas; five source-backed proposals; no rule execution');
