// Regression for the C.19 bot-policy report: fixture input, no game rules changed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'c19-report-'));
try {
  const rows=[];
  for(const heat of [0,2,3]) for(const [fight,goal] of [['door:test','fight'],['door:escape','getaway']]) {
    for(const policy of (goal==='fight'?['fight','careful','focused']:['fight','careful','run','escort'])) {
      rows.push({fight,goal,heat,policy,win:policy==='careful'?80:60,rounds:3,hpLost:policy==='careful'?1:3,stuck:0});
    }
  }
  const file=path.join(dir,'results.json');
  fs.writeFileSync(file,JSON.stringify(rows));
  const run=(args)=>spawnSync(process.execPath,['web/tools/c19-policy-report.mjs',...args],{encoding:'utf8'});
  const good=run([file]);
  assert.equal(good.status,0,good.stderr);
  const parsed=JSON.parse(good.stdout);
  assert.equal(parsed.baseline.fightCount,2);
  assert.equal(parsed.baseline.compared,6);
  assert.equal(parsed.baseline.groups.fight.carefulWinAdvantagePp,20);
  assert.equal(parsed.baseline.groups.fight.carefulHpSaved,2);
  assert.equal(parsed.baseline.groups.getaway.pairs,3);
  assert.equal(parsed.baseline.weakCarefulFights.length,0);
  assert.equal(run([file,file]).status,0);
  rows.push({...rows[0]});
  fs.writeFileSync(file,JSON.stringify(rows));
  assert.notEqual(run([file]).status,0,'duplicate evidence rejected');
  console.log('C19 policy report: fixture, grouping, comparison, duplicate rejection passed');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
