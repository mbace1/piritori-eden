import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSession,checkpoint,restoreSession} from '../fight-module/session.js?v=11';
const content=JSON.parse(fs.readFileSync(new URL('../../content/era1-slice-v1.json',import.meta.url)));
const park=createSession(content,'mixed','bear-path');
for(const count of [2,6,12])for(const mode of ['mixed','melee','ranged']){
  const session=createSession(content,mode,'lab-'+count),units=session.snapshot().units;
  assert.equal(units.length,count);assert.equal(new Set(units.map(u=>u.cell)).size,count);assert.equal(new Set(units.map(u=>u.label)).size,count);
  assert.equal(session.battle.tactical,true);
  assert.equal(park.battle.tactical,undefined,'campaign keeps its authored rules');
  assert.ok([...session.battle.cover.values()].some(v=>v.hardBlock));
  assert.equal(session.result().training,true);assert.deepEqual(session.result().campaign_effects,[]);
  for(let i=0;i<70&&session.battle.status==='active';i++){assert.ok(session.command('auto').ok);assert.deepEqual(restoreSession(content,checkpoint(session)).snapshot(),session.snapshot());}
  assert.notEqual(session.battle.status,'active',JSON.stringify({count,mode,units:session.snapshot().units,log:session.snapshot().log}));assert.deepEqual(session.result().campaign_effects,[]);
}
assert.throws(()=>createSession(content,'mixed','lab-100'));
console.log('PASS: 2/6/12 people × 3 loadouts, unique slots/labels, separate campaign rules, deterministic replay, terminal outcomes, zero campaign effects');
