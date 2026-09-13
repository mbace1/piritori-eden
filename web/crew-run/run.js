import {hireling} from '../../people/roster.mjs';
import {createSession} from '../fight-module/session.js?v=10';
import {createTacticalSession,weapon} from '../fight-module/tactics.js?v=5';

// Connected C pilot, deliberately separate from the authored campaign save.
// Tuning below is a playtest, not a new canonical mission or economy.
export const SAVE_KEY='piritori-c12-crew-v1';
export const KITS={boots:'Escape boots · Sprint spends Action for a second Move',medical:'Field kit · Help restores 3 HP; one adjacent ally treatment',light:'Light pack · one self bandage'};
const palettes=[0x4d8f85,0x778ba9,0xa99164,0x877697,0x76966d,0xb69272];
const eq=['baseball-bat','first-handgun','folding-knife'];
const copy=structuredClone,xy=c=>c.split(',').map(Number),distance=(a,b)=>{const[x,y]=xy(a),[u,v]=xy(b);return Math.abs(x-u)+Math.abs(y-v);};
function recruit(i){const p=hireling('kallio-c12',i);return {id:'crew-'+i,name:p.name,aptitudes:p.aptitudes,traits:p.traits.map(t=>t.text||t.label||t.id),equipment:eq[i%3],kit:['boots','medical','light'][i%3],color:palettes[i%6],role:i%2?'runner':'muscle',fights:0,wounds:0,readyAt:1,missing:false,memories:[]};}
export function newRun(){const crew=Array.from({length:6},(_,i)=>recruit(i));crew[5].missing=true;return {version:1,night:1,phase:'prep',crew,selected:crew.slice(0,3).map(p=>p.id),active:null,ledger:[],last:null};}
export const available=state=>state.crew.filter(p=>!p.missing&&p.readyAt<=state.night);
export const rescueTarget=state=>state.crew.find(p=>p.missing)||null;
export function configure(state,id,changes){if(state.phase!=='prep')return false;const p=state.crew.find(p=>p.id===id);if(!p)return false;if(changes.equipment&&eq.includes(changes.equipment))p.equipment=changes.equipment;if(changes.kit&&Object.hasOwn(KITS,changes.kit))p.kit=changes.kit;return true;}
export function toggleCrew(state,id){if(state.phase!=='prep'||!available(state).some(p=>p.id===id))return false;state.selected=state.selected.includes(id)?state.selected.filter(v=>v!==id):state.selected.length<3?[...state.selected,id]:state.selected;return true;}
export function launchConfig(state){
 const selected=available(state).filter(p=>state.selected.includes(p.id));if(selected.length<2||selected.length>3)throw Error('Choose two or three ready crew.');
 const target=rescueTarget(state),objective=target?'rescue':'recovery';
 return {id:`night-${state.night}`,night:state.night,objective,crew:copy(selected),target:copy(target),site:state.night%2?'north':'east'};
}
export function launch(state){if(state.phase!=='prep')throw Error('Outing already started');state.active={config:launchConfig(state),checkpoint:null};state.phase='battle';return copy(state.active.config);}
export function waitNight(state){if(state.phase!=='prep')return false;state.ledger.unshift({id:`rest-${state.night}`,title:'A quiet night',text:'Ready crew stayed home. Wounded colleagues rested. Missing people still need help.'});state.night++;state.selected=available(state).slice(0,3).map(p=>p.id);return true;}
export function callReserve(state){if(state.phase!=='prep'||available(state).length>=2)return false;const p=recruit(state.crew.length);p.equipment='baseball-bat';p.readyAt=state.night;state.crew.push(p);state.selected=available(state).slice(0,3).map(v=>v.id);state.ledger.unshift({id:`reserve-${p.id}`,title:`${p.name} joined`,text:'Replacement hireling supplied for this prototype; no campaign money spent.'});return true;}

export function makeMission(content,config){
 const base=createSession(content,'mixed','lab-6'),b=base.battle,template=copy(b.players[0]),enemyTemplate=copy(b.enemies[0]);
 b.players=config.crew.map((p,i)=>({...copy(template),id:p.id,name:p.name,label:String(i+1),role:p.role,equipment:p.equipment,kit:p.kit,color:p.color,cell:`${i+1},1`,hp:5,maxHp:5,guard:p.equipment==='baseball-bat'?2:1,alive:true,itemIds:p.kit==='light'?['training-bandage']:[],evacuated:false,helped:false}));
 const targetCell=config.site==='north'?'3,5':'5,3';
 if(config.target)b.players.push({...copy(template),id:config.target.id,name:config.target.name,label:'SOS',role:config.target.role,color:config.target.color,equipment:config.target.equipment,kit:config.target.kit,cell:targetCell,hp:0,maxHp:5,guard:0,alive:false,stranded:true,helped:false,evacuated:false,itemIds:[]});
 b.enemies=Array.from({length:4},(_,i)=>({...copy(enemyTemplate),id:`rival-${i}`,name:['Lookout','Enforcer','North arrival','East arrival'][i],label:'R'+(i+1),equipment:i===0?'first-handgun':'baseball-bat',role:i%2?'muscle':'runner',cell:['1,6','4,6','0,7','5,7'][i],hp:4,maxHp:4,guard:1,alive:i<2,waiting:i>=2,itemIds:[]}));
 b.selectedId=b.players[0].id;b.status='active';b.result=null;b.round=1;b.log=[];
 b.objective=config.target?'Bring your colleague home. Rescue, then extract through the south edge.':'Recover the lost kit and bring the crew home.';
 const options={rules:'c12-v1',actions:['help','extract','sprint','aid','recover'],reject:t=>['auto','talk'].includes(t),
 prepare(b){b.mission={id:config.id,objective:config.objective,targetId:config.target?.id||null,targetCell,recovered:false,carrierId:null,heat:0,arrival:null,arrived:false,resolved:false};},
 finish(b){if(b.status!=='active')return;if(!b.players.some(p=>p.alive)){b.status='complete';b.result=b.players.some(p=>p.evacuated)?'withdraw':'loss';if(objectiveExtracted(b))b.result='win';}},
 action(b,u,type,value,events){
  if(type==='extract'&&xy(u.cell)[1]===0){u.extracted=true;u.evacuated=true;u.alive=false;events.push({type:'extract',id:u.id});b.log.unshift(`${u.name} reached the exit with their kit.`);return true;}
  if(type==='sprint'&&u.kit==='boots'&&b.moved.includes(u.id)){b.moved=b.moved.filter(id=>id!==u.id);events.push({type:'brace',id:u.id});b.log.unshift(`${u.name} spends Action for a second Move.`);return true;}
  if(type==='recover'&&!config.target&&!b.mission.recovered&&distance(u.cell,b.mission.targetCell)<=1){b.mission.recovered=true;b.mission.carrierId=u.id;events.push({type:'item',id:u.id});b.log.unshift(`${u.name} carries the kit. They must reach the south exit to secure it.`);return true;}
  const t=b.players.find(v=>v.id===value);
  if(!t||t.evacuated||distance(u.cell,t.cell)>1||t.id===u.id)return false;
  if(type==='help'&&!t.alive&&!t.helped&&!b.players.concat(b.enemies).some(v=>v.alive&&v.cell===t.cell)){
   t.hp=u.kit==='medical'?3:1;t.alive=true;t.helped=true;t.stranded=false;b.acted.push(t.id);events.push({type:'help',id:u.id,target:t.id});b.log.unshift(`${u.name} got ${t.name} up at ${t.hp} HP. They can Move now; Action returns next round.`);return true;}
  if(type==='aid'&&u.kit==='medical'&&!u.medicalUsed&&t.alive&&t.hp<t.maxHp){u.medicalUsed=true;t.hp=Math.min(t.maxHp,t.hp+3);events.push({type:'item',id:u.id});b.log.unshift(`${u.name} treats ${t.name}: +3 HP. Field treatment spent.`);return true;}
  return false;
 },
 after(b,type,events){
  const m=b.mission;m.heat+=events.reduce((n,e)=>n+(e.type==='attack'?(weapon(b.players.concat(b.enemies).find(p=>p.id===e.id)).magazine?1:0)+(e.down?2:0):0),0)+(type==='end'?1:0);
  if(type==='withdraw')b.log.unshift('Standing crew escaped. Anyone down stays missing until recovered.');
  if(type==='withdraw')for(const p of b.players.filter(p=>p.alive)){p.evacuated=true;p.alive=false;events.push({type:'extract',id:p.id});}
  if(b.status==='active'&&!m.arrival&&m.heat>=5){m.arrival={afterRound:b.round,cells:['0,7','5,7']};b.log.unshift(`Rivals heard the fight. Two arrivals after enemy turn ${b.round}; A8 / F8. They will show plans before attacking.`);}
  if(b.status==='active'&&type==='end'&&m.arrival&&!m.arrived&&b.round>m.arrival.afterRound){
   for(const p of b.enemies.filter(p=>p.waiting)){if(b.players.concat(b.enemies).some(v=>v.alive&&v.cell===p.cell))continue;p.waiting=false;p.alive=true;events.push({type:'arrive',id:p.id});}
   m.arrived=!b.enemies.some(p=>p.waiting);b.log.unshift(m.arrived?'Rivals entered from the north. Read their new plans.':'An arrival is waiting behind an occupied entrance.');
  }
 },replan:(b,t,events)=>events.some(e=>e.type==='arrive')};
 const s=createTacticalSession(b,'mixed','crew-run',base.data,options);
 const result=s.result;s.result=()=>({...result(),training:false,scope:'connected-crew-pilot',campaign_applied:false,mission:copy(b.mission),units:copy(b.players)});
 return s;
}
export const missionCheckpoint=s=>({snapshot:s.snapshot(),actions:s.history.map(({type,actor,value})=>({type,actor,value}))});
export function objectiveExtracted(b){const id=b.mission.targetId||b.mission.carrierId;return !!id&&b.players.some(p=>p.id===id&&p.extracted);}
export function restoreMission(content,config,saved){const s=makeMission(content,config);if(!saved)return s;if(!Array.isArray(saved.actions)||saved.actions.length>1000)throw Error('Invalid outing history');for(const {type,actor,value}of saved.actions){if(!['move','attack','brace','item','reload','end','withdraw','help','extract','sprint','aid','recover'].includes(type))throw Error('Unknown outing command');if(actor!==s.battle.selectedId&&!s.command('select',actor).ok)throw Error('Invalid outing actor');if(!s.command(type,value).ok)throw Error('Invalid outing command');}if(saved.snapshot.selectedId!==s.battle.selectedId)s.command('select',saved.snapshot.selectedId);if(JSON.stringify(s.snapshot())!==JSON.stringify(saved.snapshot))throw Error('Outing checkpoint mismatch');return s;}
export function settle(state,session){
 if(state.phase!=='battle'||session.battle.status==='active'||state.active?.config.id!==session.battle.mission.id)return false;
 const config=state.active.config,b=session.battle,changes=[];
 for(const u of b.players){const p=state.crew.find(v=>v.id===u.id);p.missing=!u.evacuated;
  if(u.evacuated){p.fights++;p.wounds+=u.hp<u.maxHp?1:0;p.readyAt=state.night+(u.hp<u.maxHp?2:1);const msg=u.hp<u.maxHp?'Wounded · rests next outing':'Returned ready';p.memories.unshift(`Night ${state.night}: ${msg.toLowerCase()}.`);changes.push({id:p.id,name:p.name,state:msg,kit:'Kit returned'});}
  else {p.memories.unshift(`Night ${state.night}: left behind. Recovery needed.`);changes.push({id:p.id,name:p.name,state:'Missing · recover on a later outing',kit:'Kit held with them'});}
 }
 const success=objectiveExtracted(b);
 const receipt={id:config.id,title:success?'Someone came home':'The night left a debt',success,rounds:b.round,heat:b.mission.heat,changes,text:`${changes.filter(c=>!c.state.startsWith('Missing')).length} returned. ${changes.filter(c=>c.state.startsWith('Missing')).length} missing. One outing spent.`};
 state.last=receipt;state.ledger.unshift(receipt);state.ledger=state.ledger.slice(0,30);state.night++;state.phase='aftermath';state.active.checkpoint=missionCheckpoint(session);return true;
}
export function continueRun(state){if(state.phase!=='aftermath')return false;state.phase='prep';state.active=null;state.selected=available(state).slice(0,3).map(p=>p.id);return true;}
export function loadRun(raw,content){if(!raw)return newRun();const s=JSON.parse(raw);if(s.version!==1||!['prep','battle','aftermath'].includes(s.phase)||!Number.isInteger(s.night)||s.night<1||!Array.isArray(s.crew)||s.crew.length>100||!Array.isArray(s.selected)||!Array.isArray(s.ledger))throw Error('Unsupported crew save');if(new Set(s.crew.map(p=>p.id)).size!==s.crew.length||s.crew.some(p=>!eq.includes(p.equipment)||!Object.hasOwn(KITS,p.kit)||typeof p.name!=='string'||!Number.isInteger(p.readyAt)))throw Error('Invalid crew');if(s.active)restoreMission(content,s.active.config,s.active.checkpoint);return s;}
