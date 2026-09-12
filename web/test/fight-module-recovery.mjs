import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSession,checkpoint,restoreSession} from '../fight-module/session.js';
import {renderProfile,pixelRatioFor} from '../fight-module/render-profile.js';
const content=JSON.parse(fs.readFileSync(new URL('../../content/era1-slice-v1.json',import.meta.url)));
for(const mode of ['mixed','melee','ranged']){
  const s=createSession(content,mode);
  s.command('select','f02');assert(s.command('item').ok);
  assert(s.command('move','2,3').ok);assert(s.command('end').ok);
  const saved=JSON.parse(JSON.stringify(checkpoint(s))),copy=restoreSession(content,saved);
  assert.deepEqual(copy.snapshot(),s.snapshot());assert.equal(copy.history.length,s.history.length);
  assert.equal(copy.battle.players[1].itemIds.length,0);
  assert(copy.command('withdraw').ok);assert.deepEqual(restoreSession(content,checkpoint(copy)).snapshot(),copy.snapshot());
  const bad=structuredClone(saved);bad.snapshot.units[0].hp=99;assert.throws(()=>restoreSession(content,bad));
  assert.throws(()=>restoreSession(content,{...saved,version:100}));
}
for(const [w,h,dpr] of [[412,720,2.625],[915,412,2.625],[834,1100,2],[1194,760,2]]){
 const p=renderProfile({touch:true}),ratio=pixelRatioFor(p,w,h,dpr);
 assert(ratio<=1);assert(w*h*ratio*ratio<=p.maxPixels+1);assert.equal(p.shadows,false);assert.equal(p.fps,30);
}
console.log('PASS: checkpoint preserves commands/items/results, rejects tampering; touch pixel and frame budgets');
