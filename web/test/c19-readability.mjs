import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fighterLabel,missionCue} from '../fight-module/readability.js';
import {createSession} from '../fight-module/session.js';
import {newRun,launch,makeMission,missionCheckpoint,restoreMission,settle,continueRun,loadRun,available} from '../crew-run/run.js';
import {coordinate} from '../fight-module/tactics.js';
const content=JSON.parse(fs.readFileSync(new URL('../../content/era1-slice-v1.json',import.meta.url)));
for(const count of [2,6,12]){
 const s=createSession(content,'mixed','lab-'+count),b=s.battle,prior=s.snapshot(),target=b.enemies[0].id,units=b.players.concat(b.enemies);
 assert.equal(units.filter(u=>fighterLabel(b,u).detail==='full').length,1,'only selected defaults to full stats');
 assert.equal(units.filter(u=>fighterLabel(b,u,{targetId:target}).detail==='full').length,2,'selected and preview target');
 assert.ok(units.every(u=>fighterLabel(b,u,{full:true}).detail==='full'));
 assert.ok(units.every(u=>fighterLabel(b,u).description.includes(`HP ${u.hp}/${u.maxHp}`)),'compact badges retain accessible stats');
 assert.deepEqual(s.snapshot(),prior,'label inspection never edits a fixture');
}
const rescue=[['select','crew-1'],['move','2,5'],['help','crew-5'],['select','crew-5'],['move','3,2'],['select','crew-0'],['move','1,0'],['extract'],['select','crew-2'],['move','3,0'],['extract'],['end'],['select','crew-5'],['move','3,0'],['extract'],['select','crew-1'],['move','2,1'],['brace'],['end'],['move','2,0'],['extract']];
const cases=[['rescue/extraction',rescue,'win',true],['retreat',[['withdraw']],'withdraw',false],['defeat',Array.from({length:5},()=>['end']),'loss',false]];
for(const [name,route,result,success]of cases){
 let state=newRun();assert.deepEqual(loadRun(JSON.stringify(state),content),state,'preparation reload');
 const config=launch(state);let s=makeMission(content,config);
 assert.match(missionCue(s.battle,coordinate).goal,/Help.*EXIT/);
 for(const [type,value]of route){
  const before=s.snapshot();missionCue(s.battle,coordinate);assert.deepEqual(s.snapshot(),before);
  assert.ok(s.command(type,value).ok,`${name}: ${type} ${value||''}`);
  state.active.checkpoint=missionCheckpoint(s);
  const next=loadRun(JSON.stringify(state),content);
  const restored=restoreMission(content,next.active.config,next.active.checkpoint);
  assert.deepEqual(restored.snapshot(),s.snapshot(),`${name}: reload after ${type}`);
  if(type==='help')assert.match(missionCue(s.battle,coordinate).goal,/Escort.*EXIT/);
  if(type==='extract'&&s.battle.players.find(u=>u.id===s.battle.mission.targetId).extracted)assert.match(missionCue(s.battle,coordinate).goal,/Colleague home/);
  state=next;s=restored;
 }
 assert.equal(s.battle.result,result,name);assert.ok(settle(state,s));assert.equal(state.last.success,success,name);
 const settled=JSON.parse(JSON.stringify(state));assert.equal(settle(state,s),false,'immediate duplicate settlement rejected');
 state=loadRun(JSON.stringify(state),content);assert.equal(settle(state,s),false,'duplicate after reload rejected');assert.deepEqual(state,settled);
 assert.ok(continueRun(state));assert.ok(available(state).length>=2,'an onward route after outcome');assert.doesNotThrow(()=>makeMission(content,launch(state)));
 console.log(`C19 ${name}: every committed checkpoint, terminal reload, exact-once settlement and onward outing passed`);
}
{
 const r=newRun(),s=makeMission(content,launch(r)),target=s.battle.players.find(u=>u.id===s.battle.mission.targetId);
 target.helped=true;target.alive=false;assert.match(missionCue(s.battle,coordinate).goal,/rescue unavailable/);assert.equal(fighterLabel(s.battle,target).badge,'DOWN');
 // This is a presentation fixture, not an authored or played mission outcome.
}
{
 // Explicit presentation-only recovery fixture; no claim this is a played outcome.
 const carrier={id:'kit-carrier',name:'Carrier',cell:'2,2',alive:false,helped:false};
 const battle={players:[carrier],mission:{carrierId:carrier.id,targetCell:'2,2'}};
 assert.match(missionCue(battle,coordinate).goal,/check Help/,'a first down can still be helped');
 carrier.helped=true;
 const before=structuredClone(battle),cue=missionCue(battle,coordinate).goal;
 assert.match(cue,/rescue unavailable this outing/);assert.doesNotMatch(cue,/check Help/);
 assert.deepEqual(battle,before,'carrier guidance never changes the rules/state');
 carrier.alive=true;assert.match(missionCue(battle,coordinate).goal,/has the kit.*EXIT/);
 carrier.extracted=true;assert.match(missionCue(battle,coordinate).goal,/Kit secured/);
}
console.log('C19 focused/full/target labels: 2/6/12 fixtures and honest rescue/recovery guidance passed');
