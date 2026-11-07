// Review model: authored inventories + isolated real-engine fixtures. No storage APIs.
import {createState,chapterEndingAvailable,attemptChapterEnding,forecastEnding} from '../../../web/js/v3/state.js?v=13';
import {turnPlan,nextChapter} from '../../../web/js/v3/chapter.js?v=1';
import {nameFrom} from '../../../people/roster.mjs';

export function chapterInventory(content,story,map){
 const encounters=new Map(content.encounters.map(e=>[e.id,e]));
 const anchors=new Map(map.anchors.map(a=>[a.id,a]));
 const missionCopy=new Map((story.missions||[]).map(m=>[m.id,m]));
 return content.schedule.map((slot,index)=>{
  const encounter=encounters.get(slot.encounter_id);
  const missions=content.missions.filter(m=>m.signal_encounter_id===encounter?.id||m.id===encounter?.mission_id);
  return {index,...slot,encounter,anchor:anchors.get(slot.anchor_id)?.label||'Door selected in game',missions:missions.map(m=>({...m,title:missionCopy.get(m.id)?.title||m.id})),requires:encounter?.choices.flatMap(c=>c.requirements||[])||[]};
 });
}
export function timeBudget(trips,visits){
 for(const n of [trips,visits])if(!Number.isInteger(n)||n<0||n>100)throw Error('Use whole counts from 0 to 100');
 const actions=trips+visits,tenths=actions*3;
 return {trips,visits,actions,currentBlocks:0,proposedBlocks:tenths/10,wholeBlocks:Math.floor(tenths/10),remainderTenths:tenths%10,authority:'ROADMAP §9 D002; arithmetic planning estimate, not integrated schedule simulation'};
}
export function crewChoices(content){return content.crew.map(c=>({...c,name:c.name||nameFrom(c.id)}));}
export function engineData(content){return {content,crew:new Map(crewChoices(content).map(c=>[c.id,c])),missions:new Map(content.missions.map(m=>[m.id,m]))};}
export function shipmentFixture(content,{crewIds=[],cash=800,earned=400,seed=2026,arrests=0,exitFund=180,debt=250}={}){
 const state=createState(content),known=new Set(content.crew.map(c=>c.id));
 if(crewIds.some(id=>!known.has(id)))throw Error('Unknown authored crew');
 state.recruited=[...new Set(crewIds)];state.deployed=[...state.recruited];
 state.cash=Number(cash);state.chapterEarned=Number(earned);state.seed=Number(seed);state.exitFund=exitFund;state.debt=debt;
 state.scheduleIndex=content.schedule.length-1;state.selectedAnchor=content.chapters[0].ending.anchor_id;
 state.arrestedCrew=Array.from({length:Math.max(0,Math.min(6,arrests))},(_,i)=>`review-prior-arrest-${i}`);
 state.equipment=[{id:'knife',cond:0}];
 return state;
}
export function shipmentReadiness(state,content){
 const ending=content.chapters[0].ending;
 return {goalAvailable:chapterEndingAvailable(state,engineData(content)),cashAvailable:state.cash>=ending.stake_eur,atPlace:state.selectedAnchor===ending.anchor_id,stake:ending.stake_eur};
}
export function settleFixture(state,content){
 const before=structuredClone(state),reason=attemptChapterEnding(state,engineData(content));
 return {reason,before,after:structuredClone(state),outcome:state.lastEndingOutcome,cashDelta:state.cash-before.cash,upgradeAdded:state.upgrades.filter(u=>!before.upgrades.includes(u)),newArrests:state.arrestedCrew.filter(id=>!before.arrestedCrew.includes(id)),gearLost:before.equipment.length-state.equipment.length};
}
export function carryPreview(state,content){return {rows:turnPlan(state,content),nextChapterAuthored:Boolean(nextChapter(state,content)),ending:forecastEnding(state,engineData(content))};}
export function endingExamples(content){
 return content.endings.map(e=>{
  const state=shipmentFixture(content,{crewIds:content.crew.slice(0,2).map(c=>c.id)});
  if(e.id==='pasila-deferred')state.exitFund=0;
  if(e.id==='pasila-expensive')state.debt=350;
  if(e.id==='pasila-haunted')state.crewStatus[content.crew[0].id].status='dead';
  return {...e,engineForecast:forecastEnding(state,engineData(content))?.id,fixture:{exitFund:state.exitFund,debt:state.debt,crew:state.recruited.length,deaths:Object.values(state.crewStatus).filter(c=>c.status==='dead').length}};
 });
}
export function proposalSummary(content,crewIds,approach){
 const selected=crewChoices(content).filter(c=>crewIds.includes(c.id));
 const reserve=approach==='van'&&selected.length>1?selected.find(c=>c.competencies.includes('extraction'))||selected.at(-1):null;
 return {proposed:true,approach,anchor:content.chapters[0].ending.anchor_id,container:selected.filter(c=>c!==reserve),reserve,stake:content.chapters[0].ending.stake_eur,implemented:false};
}
