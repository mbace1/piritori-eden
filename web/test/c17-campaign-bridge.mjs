import assert from 'node:assert/strict';
import {campaignCrew,campaignRun,applyCampaignReceipt} from '../crew-run/campaign-adapter.js?v=4';
import {configure,launchConfig} from '../crew-run/run.js?v=8';
import {forecast} from '../fight-module/tactics.js?v=7';

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
  recruited:['a','b','c'],deployed:['c','a'],hiredCrew:{},
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

const projected=campaignCrew(state,content),byId=id=>projected.find(p=>p.id===id);
assert.equal(projected.length,3,'all campaign crew eligible for the C bridge project into its roster');
assert.deepEqual(projected.map(p=>p.id),['c','a','b'],'campaign deployment preference leads the ready C roster');
assert.equal(byId('a').equipment,'baseball-bat','authored campaign weapon survives the projection');
assert.equal(byId('a').prototypeWeapon,false,'supported authored weapon remains authored');
assert.deepEqual(byId('a').perks,{toughness:1,strength:2},'perks cross the boundary');
assert.deepEqual(byId('a').skills,['wall'],'skills cross the boundary');
assert.equal(byId('b').equipment,'baseball-bat','unsupported campaign loadout receives a neutral C test weapon');
assert.equal(byId('b').prototypeWeapon,true,'fallback weapon is explicitly prototype supply, never aptitude-derived ownership');
assert.equal(byId('b').kit,'light','an aptitude never invents free support equipment');
assert.equal(byId('b').prototypeSupport,true,'un-authored Night Shift support stays marked as prototype supply');
assert.equal(byId('c').equipment,'folding-knife','authored knife survives the projection');
assert.equal(byId('c').prototypeWeapon,false);

const run=campaignRun(state,content,{now:()=>12345});
assert.equal(run.bridge.mode,'campaign-v3');
assert.equal(run.night,3,'outing label follows the campaign position');
assert.deepEqual(run.selected,['c','a','b'],'selected crew follows the campaign deployment preference first');
assert.equal(run.crew.find(p=>p.id==='a').appearanceSeed,byId('a').appearanceSeed,'procedural identity is stable');
assert.equal(configure(run,'a',{equipment:'first-handgun'}),false,'campaign weapon cannot be swapped for prototype gear in C prep');
assert.equal(run.crew.find(p=>p.id==='a').equipment,'baseball-bat');
assert.equal(configure(run,'a',{kit:'boots'}),true,'prototype support can still be configured without claiming campaign ownership');

const missingState=structuredClone(state);
missingState.crewStatus.c={...missingState.crewStatus.c,status:'missing',condition:0};
const missingRun=campaignRun(missingState,content,{now:()=>23456}),missingC=missingRun.crew.find(p=>p.id==='c');
assert.equal(missingC.missing,true,'campaign missing state crosses into the C roster');
assert.deepEqual(missingRun.selected,['a','b'],'missing people cannot occupy a deployment slot');
const rescue=launchConfig(missingRun);
assert.equal(rescue.objective,'rescue');
assert.equal(rescue.target.id,'c','a campaign missing person becomes the Night Shift rescue target');
assert.ok(!rescue.crew.some(p=>p.id==='c'),'the person being rescued is not counted as deployed');

const attacker={id:'a',side:'player',alive:true,cell:'1,1',equipment:'baseball-bat',harmBonus:2,ammo:null};
const target={id:'r',side:'enemy',alive:true,cell:'1,2',equipment:'baseball-bat',hp:10,guard:1};
const tactical={players:[attacker],enemies:[target],cover:new Map()};
const read=forecast(tactical,attacker,target);
assert.equal(read.damage,5,'Strength adds to the weapon damage before the forecast is shown');
assert.equal(read.guardDamage,1);
assert.equal(read.hpDamage,4,'the same strengthened amount flows through guard into HP');

const receipt={
  bridgeReceiptId:`${run.bridge.id}:night-3`,
  deployedIds:['a','b','c'],
  success:true,rounds:4,heat:6,text:'2 returned. 1 missing. One outing spent.',
  changes:[
    {id:'a',name:'A',state:'Wounded · campaign condition worsened',campaignEffect:'damage'},
    {id:'b',name:'B',state:'Returned · wounded unchanged',campaignEffect:'unchanged'},
    {id:'c',name:'C',state:'Missing · recover on a later outing',campaignEffect:'missing'},
  ],
};
assert.equal(applyCampaignReceipt(state,content,receipt),true,'first receipt applies');
assert.equal(state.crewStatus.a.status,'wounded');
assert.equal(state.crewStatus.a.condition,6,'new outing damage costs one campaign condition point');
assert.equal(state.crewStatus.b.status,'wounded','surviving C.17 does not heal a wound that existed before the outing');
assert.equal(state.crewStatus.b.condition,5,'existing campaign condition stays unchanged without new damage');
assert.equal(state.crewStatus.c.status,'missing');
assert.equal(state.crewStatus.c.condition,0);
assert.equal(state.crewFights.a,3,'deployed crew age exactly once');
assert.equal(state.crewPerkPoints.a,1,'crossing the three-fight boundary grants the existing level point');
assert.equal(state.battleHistory.at(-1).source,'c17-night-shift');
const historyCount=state.battleHistory.length;
assert.equal(applyCampaignReceipt(state,content,receipt),false,'same receipt is rejected on replay');
assert.equal(state.crewFights.a,3,'replayed receipt cannot age crew twice');
assert.equal(state.battleHistory.length,historyCount,'replayed receipt cannot duplicate history');

const recoveryReceipt={
  bridgeReceiptId:`${missingRun.bridge.id}:night-3`,deployedIds:['a','b'],success:true,rounds:3,heat:2,text:'3 returned. 0 missing.',
  changes:[{id:'c',name:'C',state:'Recovered · needs treatment',campaignEffect:'recovered'}],
};
assert.equal(applyCampaignReceipt(missingState,content,recoveryReceipt),true);
assert.equal(missingState.crewStatus.c.status,'wounded','a rescued missing person returns wounded, not magically healthy');
assert.equal(missingState.crewStatus.c.condition,1,'recovery restores a minimum living condition without inventing full healing');
assert.ok(!recoveryReceipt.deployedIds.includes('c'),'recovered target does not spend a career fight');

console.log('C.17 campaign bridge: deployment, loadout, build math, wounds, recovery and exact-once aftermath passed');
