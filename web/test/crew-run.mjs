import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newRun,launch,makeMission,missionCheckpoint,restoreMission,settle,continueRun,available,waitNight,loadRun,configure,callReserve} from '../crew-run/run.js';
import {routes,threats} from '../fight-module/tactics.js';
const content=JSON.parse(fs.readFileSync(new URL('../../content/era1-slice-v1.json',import.meta.url)));
const start=()=>{const state=newRun(),config=launch(state);return {state,config,s:makeMission(content,config)};};
{
 const {state,config,s}=start(),before=s.snapshot();assert.equal(s.battle.players.length,4);assert.equal(s.battle.enemies.filter(p=>p.alive).length,2);
 for(let i=0;i<10;i++)threats(s.battle);assert.deepEqual(s.snapshot(),before);
 const p=s.battle.players[0];s.command('move','1,2');s.command('sprint');assert.equal(s.battle.moved.includes(p.id),false);assert.equal(s.battle.acted.includes(p.id),true);assert.ok(s.command('move','2,3').ok);assert.equal(s.command('sprint').ok,false);
 assert.deepEqual(restoreMission(content,config,missionCheckpoint(s)).snapshot(),s.snapshot());
 state.active.checkpoint=missionCheckpoint(s);assert.equal(JSON.stringify(loadRun(JSON.stringify(state),content)),JSON.stringify(state));
 assert.equal(configure(state,p.id,{equipment:'first-handgun'}),false,'cannot change committed loadout');
}
{
 const {state,s}=start(),b=s.battle,u=b.players[1],target=b.players.at(-1);u.cell='3,4';s.command('select',u.id);assert.ok(s.command('help',target.id).ok);assert.equal(target.hp,3);assert.ok(target.alive);assert.ok(b.acted.includes(target.id));assert.ok(!b.moved.includes(target.id));
 s.command('select',target.id);assert.equal(s.command('extract').ok,false,'cannot extract far from exit');target.cell='3,0';b.acted=[];assert.ok(s.command('extract').ok);assert.ok(!target.alive&&target.evacuated);assert.equal(s.command('extract').ok,false);
 s.command('withdraw');assert.ok(settle(state,s));assert.equal(state.last.success,true);assert.equal(state.night,2);assert.equal(state.ledger.length,1);assert.equal(settle(state,s),false,'settlement exactly once');
 continueRun(state);assert.ok(!available(state).some(p=>p.id===target.id),'wounded rest next outing');waitNight(state);assert.ok(available(state).some(p=>p.id===target.id),'wounded return after rest');
}
{
 const {state,s}=start(),b=s.battle;for(const p of b.players)p.alive=false;s.command('end');assert.equal(b.status,'complete');assert.ok(settle(state,s));continueRun(state);while(available(state).length<2)assert.ok(callReserve(state));assert.ok(available(state).length>=2,'no roster dead end');
}
{
 const {s}=start(),b=s.battle;for(const p of b.enemies)p.alive=false;s.command('brace');assert.equal(b.status,'active','clearing enemies is not the rescue objective');
 b.mission.heat=5;s.command('end');assert.ok(b.mission.arrival);assert.ok(!b.mission.arrived,'arrival announced first');const round=b.round;s.command('end');assert.ok(b.mission.arrived);assert.equal(b.round,round+1);assert.equal(b.enemies.filter(p=>p.alive).length,2);assert.equal(s.history.at(-1).events.filter(e=>e.type==='attack').length,0,'no attack on arrival');assert.equal(b.plans.length,2);
}
{
 const {s,config}=start();s.command('withdraw');const cp=missionCheckpoint(s);assert.deepEqual(restoreMission(content,config,cp).snapshot(),s.snapshot());cp.snapshot.mission.heat++;assert.throws(()=>restoreMission(content,config,cp));
}
console.log('C.12 crew: replay, Move + Act skills, rescue, extraction, wounds/rest, exact-once settlement, arrivals and roster fallback passed.');
{
 // A real, unmodified opening is winnable without a single player attack.
 const {state,s,config}=start();
 const route=[['select','crew-1'],['move','2,5'],['help','crew-5'],['select','crew-5'],['move','3,2'],['select','crew-0'],['move','1,0'],['extract'],['select','crew-2'],['move','3,0'],['extract'],['end'],['select','crew-5'],['move','3,0'],['extract'],['select','crew-1'],['move','2,1'],['brace'],['end'],['move','2,0'],['extract']];
 for(const [type,value]of route)assert.ok(s.command(type,value).ok,type);
 assert.equal(s.battle.result,'win');assert.ok(s.battle.enemies.some(p=>p.alive));assert.deepEqual(restoreMission(content,config,missionCheckpoint(s)).snapshot(),s.snapshot());assert.ok(settle(state,s));assert.equal(state.last.changes.filter(p=>p.state.startsWith('Wounded')).length,2);
}
