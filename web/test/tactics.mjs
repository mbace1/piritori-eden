import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSession,checkpoint,restoreSession} from '../fight-module/session.js';
import {routes,forecast,threats,planView,sightCells,choosePlan} from '../fight-module/tactics.js';
const content=JSON.parse(fs.readFileSync(new URL('../../content/era1-slice-v1.json',import.meta.url)));
const make=()=>createSession(content,'ranged','lab-2');
for(const order of ['move-first','attack-first']){
 const s=make(),u=s.battle.players[0],t=s.battle.enemies[0];
 const move=()=>assert.ok(s.command('move','1,2').ok),attack=()=>assert.ok(s.command('attack',t.id).ok);
 if(order==='move-first'){move();assert.ok(!s.battle.acted.includes(u.id));attack();}else{attack();assert.ok(!s.battle.moved.includes(u.id));move();}
 assert.equal(s.command('move','1,1').ok,false);assert.equal(s.command('attack',t.id).ok,false);
 assert.deepEqual(restoreSession(content,checkpoint(s)).snapshot(),s.snapshot());
}
{
 const s=make(),u=s.battle.players[0];u.ammo=0;assert.ok(s.command('reload').ok);assert.equal(u.ammo,4);assert.ok(!s.battle.moved.includes(u.id));assert.ok(s.command('move','1,2').ok);assert.equal(s.command('brace').ok,false);
}
{
 const s=make(),b=s.battle,u=b.players[0],t=b.enemies[0],before=JSON.stringify(s.snapshot());
 for(let i=0;i<50;i++){forecast(b,u,t);routes(b,u);threats(b,{id:u.id,cell:'1,3'});}
 assert.equal(JSON.stringify(s.snapshot()),before,'previews have no RNG, budget or plan side effects');
 const path=routes(b,u).get('0,4');assert.ok(path?.length<=4);assert.ok(!path.includes('0,3'),'route goes around full cover');
 assert.ok(!routes(b,u).has(t.cell),'cannot walk through occupied cell');
 u.cell='0,2';t.cell='0,4';assert.equal(forecast(b,u,t).reason,'Line blocked');
 u.cell='1,2';t.cell='1,3';assert.equal(forecast(b,u,t).chance,90,'rear approach flanks north wall');u.cell='1,4';assert.equal(forecast(b,u,t).chance,65);b.cover.delete(t.cell);assert.equal(forecast(b,u,t).chance,90);
 assert.deepEqual(sightCells('0,0','1,1'),['1,0','0,1'],'touching walls cannot be shot through');
}
{
 const s=make(),b=s.battle,u=b.players[0],t=b.enemies[0],plan=structuredClone(b.plans[0]);
 assert.equal(planView(b,plan).to,plan.to,'intent destination is the firing position, not the target cell');
 const moved=threats(b,{id:u.id,cell:'1,2'}).views[0];assert.equal(moved.to,plan.to,'previewing a target move cannot relabel the committed destination');assert.equal(moved.aim,'1,2');
 assert.equal(plan.type,'attack');u.cell='5,0';const view=planView(b,plan);assert.equal(view.valid,false);assert.deepEqual(b.plans[0],plan,'no hidden replanning');
 s.command('end');assert.equal(u.hp,5,'invalid plan does not retarget');
}
{
 const s=make(),b=s.battle,u=b.players[0],t=b.enemies[0];
 const f=forecast(b,u,t);const result=s.command('attack',t.id);const e=result.record.events[0];assert.deepEqual(e.forecast,f);
 assert.equal(t.hp,5-(e.hit?f.hpDamage:0));assert.equal(t.guard,result.record.before.units.find(n=>n.id===t.id).guard-(e.hit?f.guardDamage:0));
 assert.equal(u.ammo,3);assert.deepEqual(restoreSession(content,checkpoint(s)).snapshot(),s.snapshot());
}
{
 const s=createSession(content,'ranged','lab-6'),b=s.battle,u=b.players[0];b.cover.clear();u.cell='2,2';b.players[1].cell='0,0';b.players[2].cell='5,0';
 b.enemies.forEach((t,i)=>{t.cell=`${i+1},5`;});
 b.plans=b.enemies.map(t=>({id:t.id,type:'attack',target:u.id,path:[],to:t.cell}));
 const v=threats(b);assert.equal(v.totals[u.id].attacks,3);assert.equal(v.totals[u.id].hp,5);assert.equal(v.totals[u.id].guard,u.guard);
}
{
 const s=createSession(content,'melee','lab-2'),b=s.battle,u=b.players[0];
 assert.ok(s.command('move','2,1').ok);const remaining=choosePlan(b,u,{canMove:false});assert.equal(remaining.type,'hold');assert.equal(remaining.path.length,0);
 const result=s.command('auto');assert.ok(result.record.events.some(e=>e.id===u.id&&e.type==='brace'),'Auto spends remaining Action on a real legal action');
 assert.ok(!result.record.events.some(e=>e.id===u.id&&e.type==='move'),'Auto does not spend Move twice');
 assert.deepEqual(restoreSession(content,checkpoint(s)).snapshot(),s.snapshot());
}
console.log('PASS: action order, independent budgets, reload, pure previews, obstacle routes, LOS corners, partial cover, fixed intent, forecast/resolution, combined threats, remaining-budget Auto and replay');
