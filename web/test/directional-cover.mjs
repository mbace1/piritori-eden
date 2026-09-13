import assert from 'node:assert/strict';
import fs from 'node:fs';
import {coverEdges,coverProtection,crossesCoverEdge,EDGES} from '../fight-module/cover-edges.js';
import {createSession,checkpoint,restoreSession} from '../fight-module/session.js';
import {forecast,routes,planView} from '../fight-module/tactics.js';
const content=JSON.parse(fs.readFileSync(new URL('../../content/era1-slice-v1.json',import.meta.url)));
const vectors=JSON.parse(fs.readFileSync(new URL('../../design/C11_PORT_VECTORS.json',import.meta.url)));
for(const v of vectors.shots){const b={cover:new Map([[vectors.wall.cell,{softBlock:true,edge:vectors.wall.edge}]])},p=coverProtection(b,v.from,v.to);assert.equal(p?.edge??null,v.edge);assert.deepEqual(p?.point??null,v.point);}
for(const [edge,[dx,dy]] of Object.entries(EDGES)){
 const b={cover:new Map([['2,3',{softBlock:true,edge}]])},to='2,3',front=`${2+dx*2},${3+dy*2}`,side=`${2+dy*2},${3-dx*2}`,rear=`${2-dx*2},${3-dy*2}`,neighbor=`${2+dx},${3+dy}`;
 assert.equal(coverProtection(b,front,to).edge,edge);assert.equal(coverProtection(b,side,to),null);assert.equal(coverProtection(b,rear,to),null);
 assert.ok(coverProtection(b,`${2+dx+dy},${3+dy-dx}`,to),'exact 45-degree edge is protected');
 assert.equal(crossesCoverEdge(b,to,neighbor),true);assert.equal(crossesCoverEdge(b,neighbor,to),true);
 assert.ok(coverEdges(b,neighbor).length,'opposite cell uses same physical wall');assert.ok(coverProtection(b,rear,neighbor));
 const s=createSession(content,'ranged','lab-2'),u=s.battle.players[0],t=s.battle.enemies[0];s.battle.cover=b.cover;t.cell=to;u.cell=front;
 assert.equal(forecast(s.battle,u,t).chance,65);u.cell=side;assert.equal(forecast(s.battle,u,t).chance,90);assert.equal(forecast(s.battle,u,t).flanked,true);
 u.cell=neighbor;const path=routes(s.battle,u).get(to);assert.equal(path,undefined,'occupied destination stays blocked');t.cell='5,7';
 const detour=routes(s.battle,u).get(to);assert.equal(detour.length,3,'walk around the low wall; do not phase through');
 const plan={id:u.id,type:'advance',path:[to],to};assert.equal(planView(s.battle,plan).reason,'Planned route blocked');
 u.equipment='baseball-bat';t.cell=to;assert.equal(forecast(s.battle,u,t).chance,100,'low walls do not give melee evasion');
}
// A natural 90%-accuracy miss must not be presented as a wall block. Rolls in
// the cover-only 65..90 band do hit the wall. Neither miss removes guard/HP.
for(const [rng,impact] of [[1,'body'],[1200,'cover'],[1800,'miss']]){
 const s=createSession(content,'ranged','lab-2'),b=s.battle,u=b.players[0],t=b.enemies[0];b.cover=new Map([['2,3',{softBlock:true,edge:'north'}]]);u.cell='2,5';t.cell='2,3';b.rng=rng;
 const before={hp:t.hp,guard:t.guard},e=s.command('attack',t.id).record.events[0];assert.equal(e.impact,impact);
 if(impact!=='body')assert.deepEqual({hp:t.hp,guard:t.guard},before);
}
{
 const s=createSession(content,'ranged','lab-6');s.command('move','1,3');s.command('end');assert.deepEqual(restoreSession(content,checkpoint(s)).snapshot(),s.snapshot());
 const old=checkpoint(s);old.version=3;assert.throws(()=>restoreSession(content,old),/Older laboratory/);
}
console.log('PASS: four wall orientations, both sides, flanks, corner rule, detours, plan invalidation, melee, resolved wall/miss impacts and replay');
