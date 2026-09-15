import assert from 'node:assert/strict';
import {campaignCrew,campaignRun,applyCampaignReceipt} from '../crew-run/campaign-adapter.js';

const content={
  id:'era1-test',
  crew:[
    {id:'a',role:'muscle',named:false,condition:7,nerve:4,initial_equipment:['baseball-bat'],traits:[]},
    {id:'b',role:'runner',named:false,condition:6,nerve:5,initial_equipment:['feature-phone'],traits:[]},
    {id:'c',role:'runner',named:false,condition:5,nerve:5,initial_equipment:['folding-knife'],traits:[]},
  ],
};
const state={
  version:3,contentId:content.id,scheduleIndex:2,
  recruited:['a','b','c'],hiredCrew:{},
  crewStatus:{
    a:{condition:7,maxCondition:7,nerve:4,status:'available',critical:false},
    b:{condition:5,maxCondition:6,nerve:5,status:'wounded',critical:false},
    c:{condition:5,maxCondition:5,nerve:5,status:'available',critical:false},
  },
  crewFights:{a:2,b:0,c:0},retiredCrew:[],arrestedCrew:[],
  crewPerks:{a:{toughness:1,strength:2}},crewSkills:{a:['wall']},crewPerkPoints:{},
  crewAptitudes:{a:['muscle','anchor'],b:['runner','courier'],c:['blade']},trainedCrew:[],
  flags:[],logs:[],battleHistory:[],
};

const projected=campaignCrew(state,content);
assert.equal(projected.length,3,'all non-missing campaign crew project into the outing');
assert.equal(projected[0].equipment,'baseball-bat','authored campaign weapon survives the projection');
assert.deepEqual(projected[0].perks,{toughness:1,strength:2},'perks cross the boundary');
assert.deepEqual(projected[0].skills,['wall'],'skills cross the boundary');
assert.equal(projected[1].kit,'boots','runner/courier receives the existing mobility support in the pilot');
assert.equal(projected[2].equipment,'folding-knife','authored knife survives the projection');

const run=campaignRun(state,content,{now:()=>12345});
assert.equal(run.bridge.mode,'campaign-v3');
assert.equal(run.night,3,'outing label follows the campaign position');
assert.equal(run.selected.length,3);
assert.equal(run.crew[0].appearanceSeed,projected[0].appearanceSeed,'procedural identity is stable');

const receipt={
  bridgeReceiptId:`${run.bridge.id}:night-3`,
  deployedIds:['a','b','c'],
  success:true,rounds:4,heat:6,text:'2 returned. 1 missing. One outing spent.',
  changes:[
    {id:'a',name:'A',state:'Wounded · rests next outing'},
    {id:'b',name:'B',state:'Returned ready'},
    {id:'c',name:'C',state:'Missing · recover on a later outing'},
  ],
};
assert.equal(applyCampaignReceipt(state,content,receipt),true,'first receipt applies');
assert.equal(state.crewStatus.a.status,'wounded');
assert.equal(state.crewStatus.a.condition,6,'wound costs one campaign condition point');
assert.equal(state.crewStatus.b.status,'available');
assert.equal(state.crewStatus.c.status,'missing');
assert.equal(state.crewStatus.c.condition,0);
assert.equal(state.crewFights.a,3,'deployed crew age exactly once');
assert.equal(state.crewPerkPoints.a,1,'crossing the three-fight boundary grants the existing level point');
assert.equal(state.battleHistory.at(-1).source,'c17-night-shift');
const historyCount=state.battleHistory.length;
assert.equal(applyCampaignReceipt(state,content,receipt),false,'same receipt is rejected on replay');
assert.equal(state.crewFights.a,3,'replayed receipt cannot age crew twice');
assert.equal(state.battleHistory.length,historyCount,'replayed receipt cannot duplicate history');

console.log('C.17 campaign bridge: passed');
