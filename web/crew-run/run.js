import {hireling,nameFrom} from '../../people/roster.mjs?v=1';
import {createSession} from '../fight-module/session.js?v=19';
import {createTacticalSession,weapon} from '../fight-module/tactics.js?v=9';
import {readCampaignSave,campaignRun,campaignOuting,outingRun,applyCampaignReceipt,CAMPAIGN_SAVE_KEY} from './campaign-adapter.js?v=9';

// Connected C pilot. C.17 can opt into the authored campaign through the
// narrow receipt adapter; the ordinary Night Shift save remains independent.
export const SAVE_KEY='piritori-c12-crew-v1';
// An Act I outing (v4.74) is played under its own key, so it never replaces
// the ordinary Night Shift roster, and a reload resumes the same fight.
export const OUTING_SAVE_KEY='piritori-c19-outing-v1';
export const KITS={boots:'Escape boots · Sprint spends Action for a second Move',medical:'Field kit · Help restores 3 HP; one adjacent ally treatment',light:'Light pack · one self bandage'};
const palettes=[0x4d8f85,0x778ba9,0xa99164,0x877697,0x76966d,0xb69272];
const eq=['baseball-bat','first-handgun','folding-knife'];
const copy=structuredClone,xy=c=>c.split(',').map(Number),distance=(a,b)=>{const[x,y]=xy(a),[u,v]=xy(b);return Math.abs(x-u)+Math.abs(y-v);};
const perk=(p,id)=>Math.max(0,Number(p?.perks?.[id]||0)|0);
function recruit(i){const p=hireling('kallio-c12',i);return {id:'crew-'+i,name:p.name,aptitudes:p.aptitudes,traits:p.traits.map(t=>t.text||t.label||t.id),equipment:eq[i%3],kit:['boots','medical','light'][i%3],color:palettes[i%6],role:i%2?'runner':'muscle',fights:0,wounds:0,readyAt:1,missing:false,memories:[],perks:{},skills:[],appearanceSeed:i+1};}
export function newRun(){const crew=Array.from({length:6},(_,i)=>recruit(i));crew[5].missing=true;return {version:1,night:1,phase:'prep',crew,selected:crew.slice(0,3).map(p=>p.id),active:null,ledger:[],last:null};}
export const available=state=>state.crew.filter(p=>!p.missing&&p.readyAt<=state.night);
export const rescueTarget=state=>state.crew.find(p=>p.missing)||null;
export function configure(state,id,changes){if(state.phase!=='prep')return false;const p=state.crew.find(p=>p.id===id);if(!p)return false;if(changes.equipment){if(state.bridge?.mode==='campaign-v3')return false;if(eq.includes(changes.equipment))p.equipment=changes.equipment;}if(changes.kit&&Object.hasOwn(KITS,changes.kit))p.kit=changes.kit;return true;}
export function toggleCrew(state,id){if(state.outing||state.phase!=='prep'||!available(state).some(p=>p.id===id))return false;state.selected=state.selected.includes(id)?state.selected.filter(v=>v!==id):state.selected.length<3?[...state.selected,id]:state.selected;return true;}
export function launchConfig(state){
 const selected=available(state).filter(p=>state.selected.includes(p.id));if(selected.length<2||selected.length>3)throw Error('Choose two or three ready crew.');
 if(state.outing){const id=state.outing.id;return {id,night:state.night,objective:state.outing.goal==='getaway'?'getaway':'fight',crew:copy(selected),target:null,outing:copy(state.outing),site:'north',bridgeReceiptId:`${state.bridge.id}:${id}`};}
 const target=rescueTarget(state),objective=target?'rescue':'recovery',id=`night-${state.night}`;
 return {id,night:state.night,objective,crew:copy(selected),target:copy(target),site:state.night%2?'north':'east',bridgeReceiptId:state.bridge?.id?`${state.bridge.id}:${id}`:null};
}
export function launch(state){if(state.phase!=='prep')throw Error('Outing already started');state.active={config:launchConfig(state),checkpoint:null};state.phase='battle';return copy(state.active.config);}
export function waitNight(state){if(state.phase!=='prep')return false;state.ledger.unshift({id:`rest-${state.night}`,title:'A quiet night',text:'Ready crew stayed home. Wounded colleagues rested. Missing people still need help.'});state.night++;state.selected=available(state).slice(0,3).map(p=>p.id);return true;}
export function callReserve(state){if(state.phase!=='prep'||available(state).length>=2)return false;const p=recruit(state.crew.length);p.equipment='baseball-bat';p.readyAt=state.night;state.crew.push(p);state.selected=available(state).slice(0,3).map(v=>v.id);state.ledger.unshift({id:`reserve-${p.id}`,title:`${p.name} joined`,text:'Replacement hireling supplied for this prototype; no campaign money spent.'});return true;}

function tacticalPerson(p,base,extra={}){
 const maxHp=5+perk(p,'toughness');
 return {...copy(base),id:p.id,name:p.name,role:p.role,equipment:p.equipment,kit:p.kit,color:p.color,hp:maxHp,maxHp,guard:p.equipment==='baseball-bat'?2:1,harmBonus:perk(p,'strength'),skills:copy(p.skills||[]),aptitudes:copy(p.aptitudes||[]),perks:copy(p.perks||{}),appearanceSeed:p.appearanceSeed,...extra};
}

// ── Campaign outings: an Act I fight, played here (Act I v4.74–v4.75) ──────
// design/C19_CAMPAIGN_FIGHTS.md §6. Owner, 2026-10-24: "fighting 75%, escape
// 25%", and the police can arrive. The door gives the fight its job (`goal`):
//   fight    make them back off. Won when none of them is still standing,
//            downed or run off. They break and run once half their weight is
//            down; a tough one weighs two. Proposed, a playtest gate.
//   getaway  get out with it. Won when everyone is out by the south edge.
// Withdraw is there in both: the standing leave, and the job is lost.
// Pressure is C's own (a round +1, a gunshot +1, a body +2), starting from
// the place's heat. At POLICE_AT the police are announced at one end and walk
// in after the next enemy turn; the fight then stops on Act I's question
// (web/js/v3/battle.js): Back off, or Help your friends. Anyone they take is
// arrested. Aatami is never taken or left behind: down, he is carried out.
export const POLICE_AT=5;
export const POSTURES=['BACK_OFF','HELP_FRIENDS'];
const POLICE_RESCUE_REACH=1;
const OUTING_ROWS={fight:{crew:1,front:4,middle:5,back:6},getaway:{crew:5,front:3,middle:2,back:1}};
const OUTING_LANE={1:1,2:2,3:4},OUTING_CREW_X={2:[2,3],3:[1,2,3]};
const OUTING_SPARE={fight:['1,5','4,5','3,4'],getaway:['1,2','4,2','2,3']};
const seedOf=t=>[...String(t)].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
const weightOf=u=>u.tough?2:1,rowOf=c=>xy(c)[1];
function outingCell(goal,formation,i,taken){
 const rows=OUTING_ROWS[goal],spare=OUTING_SPARE[goal],m=/^(front|middle|back)-(\d)$/.exec(String(formation||''));
 const cell=m&&OUTING_LANE[m[2]]!==undefined?`${OUTING_LANE[m[2]]},${rows[m[1]]}`:null;
 return cell&&!taken.has(cell)?cell:spare.find(c=>!taken.has(c))??spare[i%3];
}
/** Who each answer to the police costs (Act I's rule, battle.js). Pure, so the
 *  question can name it before it is answered. */
export function policeOutcome(b,posture){
 const m=b.mission,y=m.police?.y??0,near=p=>Math.abs(rowOf(p.cell)-y);
 const fallen=b.players.filter(p=>!p.alive&&!p.evacuated&&!p.taken&&p.id!==m.protagonist);
 if(posture!=='HELP_FRIENDS')return {taken:fallen.map(p=>p.id),saved:[]};
 const standing=b.players.filter(p=>p.alive&&!p.evacuated),taken=[],saved=[];
 for(const f of [...fallen].sort((a,c)=>near(a)-near(c))){
  if(!standing.length){taken.push(f.id);continue;}
  const helper=standing.pop();saved.push(f.id);if(near(f)<=POLICE_RESCUE_REACH)taken.push(helper.id);
 }
 return {taken,saved};
}
function makeOuting(content,config){
 const base=createSession(content,'mixed','lab-6'),b=base.battle,template=copy(b.players[0]),enemyTemplate=copy(b.enemies[0]),outing=config.outing;
 const goal=outing.goal==='getaway'?'getaway':'fight',crewRow=OUTING_ROWS[goal].crew,xs=OUTING_CREW_X[config.crew.length]||OUTING_CREW_X[3],taken=new Set();
 b.players=config.crew.map((p,i)=>tacticalPerson(p,template,{label:String(i+1),cell:`${xs[i]},${crewRow}`,alive:true,itemIds:p.kit==='light'?['training-bandage']:[],evacuated:false,helped:false}));
 b.enemies=outing.rivals.slice(0,3).map((r,i)=>{const cell=outingCell(goal,r.cell,i,taken);taken.add(cell);
  return {...copy(enemyTemplate),id:r.id,name:r.name,label:'R'+(i+1),equipment:r.equipment,role:r.tough||['muscle','enforcer'].includes(r.role)?'muscle':'runner',tough:Boolean(r.tough),rival:true,hp:r.tough?5:4,maxHp:r.tough?5:4,guard:r.tough?2:1,harmBonus:0,skills:[],aptitudes:[],perks:{},appearanceSeed:seedOf(r.id),itemIds:[],cell,alive:true,waiting:false};});
 b.selectedId=b.players[0].id;b.status='active';b.result=null;b.round=1;b.log=[];
 const place=outing.place||'The fight';
 b.objective=goal==='getaway'?`${place}. Get everyone out ${outing.wayOut||'by the south edge'}: the south edge is the way out.`:`${place}. Make them back off: put them down or make them run.`;
 const evacuate=(p,events)=>{p.wasDown=!p.alive;p.evacuated=true;p.alive=false;events.push({type:'extract',id:p.id});};
 const options={rules:'c19-outing-v2',actions:['help','extract','sprint','aid','police'],free:['police'],
 reject:t=>['auto','talk'].includes(t)||(b.mission?.police?.arrived&&!b.mission.police.resolved&&t!=='police'),
 withdrawText:'The crew pulls out. The job is lost.',
 prepare(b){b.mission={id:config.id,objective:config.objective,goal,protagonist:content.protagonist?.id||null,targetId:null,targetCell:null,recovered:false,carrierId:null,
  heat:Math.max(0,Math.min(3,Number(outing.heat)||0)),police:{at:POLICE_AT,afterRound:null,y:null,cells:[],arrived:false,resolved:false,posture:null,taken:[],saved:[]},routed:false,end:null,
  place:outing.place||null,wayOut:outing.wayOut||null,side:outing.side||null};},
 finish(b){if(b.status!=='active')return;const m=b.mission;
  if(m.goal==='fight'&&!b.enemies.some(e=>e.rival&&e.alive)){b.status='complete';b.result='win';m.end='win';for(const p of b.players)if(!p.evacuated){p.home=true;p.wasDown=!p.alive;}b.log.unshift(m.routed?'They are gone. The place is yours.':'None of them is standing. The place is yours.');return;}
  if(!b.players.some(p=>p.alive)){b.status='complete';const out=b.players.filter(p=>p.evacuated);
   b.result=m.goal==='getaway'&&b.players.every(p=>p.extracted)?'win':out.length?'withdraw':'loss';m.end=b.result;}
 },
 action(b,u,type,value,events){
  const m=b.mission;
  if(type==='police'){
   if(!m.police.arrived||m.police.resolved||!POSTURES.includes(value))return false;
   const {taken,saved}=policeOutcome(b,value);
   for(const p of b.players){if(p.evacuated)continue;if(taken.includes(p.id)){p.taken=true;p.alive=false;}else evacuate(p,events);}
   Object.assign(m.police,{resolved:true,posture:value,taken,saved});m.end='police';
   b.status='complete';b.result='withdraw';
   b.log.unshift(taken.length?`The police take ${taken.map(id=>b.players.find(p=>p.id===id).name).join(' and ')}.`:'The crew clears out before the police reach anyone.');
   return true;
  }
  if(!u)return false;
  if(type==='extract'&&xy(u.cell)[1]===0){u.extracted=true;evacuate(u,events);b.log.unshift(`${u.name} is out.`);return true;}
  if(type==='sprint'&&u.kit==='boots'&&b.moved.includes(u.id)){b.moved=b.moved.filter(id=>id!==u.id);events.push({type:'brace',id:u.id});b.log.unshift(`${u.name} spends Action for a second Move.`);return true;}
  const t=b.players.find(v=>v.id===value);
  if(!t||t.evacuated||distance(u.cell,t.cell)>1||t.id===u.id)return false;
  if(type==='help'&&!t.alive&&!t.helped&&!b.players.concat(b.enemies).some(v=>v.alive&&v.cell===t.cell)){
   t.hp=Math.min(t.maxHp,u.kit==='medical'?3:1);t.alive=true;t.helped=true;b.acted.push(t.id);events.push({type:'help',id:u.id,target:t.id});b.log.unshift(`${u.name} got ${t.name} up at ${t.hp} HP. They can Move now; Action returns next round.`);return true;}
  if(type==='aid'&&u.kit==='medical'&&!u.medicalUsed&&t.alive&&t.hp<t.maxHp){u.medicalUsed=true;t.hp=Math.min(t.maxHp,t.hp+3);events.push({type:'item',id:u.id});b.log.unshift(`${u.name} treats ${t.name}: +3 HP. Field treatment spent.`);return true;}
  return false;
 },
 after(b,type,events){
  const m=b.mission,pol=m.police;
  m.heat+=events.reduce((n,e)=>n+(e.type==='attack'?(weapon(b.players.concat(b.enemies).find(p=>p.id===e.id)).magazine?1:0)+(e.down?2:0):0),0)+(type==='end'?1:0);
  if(type==='withdraw'){
   // Pulling out leaves the downed. With the police already on the way, they are found.
   for(const p of b.players.filter(p=>p.alive))evacuate(p,events);
   for(const p of b.players.filter(p=>!p.alive&&!p.evacuated))if(pol.afterRound!==null&&p.id!==m.protagonist)p.taken=true;
   m.end='withdraw';
  }
  // They break: half their weight down, and the rest run.
  const side=b.enemies.filter(e=>e.rival),total=side.reduce((n,e)=>n+weightOf(e),0),down=side.filter(e=>!e.alive&&!e.fled).reduce((n,e)=>n+weightOf(e),0);
  if(b.status==='active'&&!m.routed&&side.some(e=>e.alive)&&down*2>=total){
   for(const e of side.filter(e=>e.alive)){e.alive=false;e.fled=true;e.evacuated=true;events.push({type:'extract',id:e.id});}
   m.routed=true;b.log.unshift('The rest of them break and run.');
  }
  if(b.status==='active'&&pol.afterRound===null&&m.heat>=pol.at){
   const ours=b.players.filter(p=>p.alive).length,theirs=b.enemies.filter(e=>e.alive).length,crewEnd=m.goal==='getaway'?7:0;
   pol.y=ours>=theirs?crewEnd:7-crewEnd;pol.afterRound=b.round;
   pol.cells=[2,3,1,4,0,5].map(x=>`${x},${pol.y}`).filter(c=>!b.cover.get(c)?.hardBlock).slice(0,Math.min(4,2+Math.floor((m.heat-pol.at)/3)));
   b.log.unshift(`Sirens. The police come in at the ${pol.y===0?'south':'north'} end after enemy turn ${b.round}.`);
  }
  if(b.status==='active'&&type==='end'&&pol.afterRound!==null&&!pol.arrived&&b.round>pol.afterRound){
   pol.arrived=true;b.log.unshift(policeOutcome(b,'BACK_OFF').taken.length?'The police are here. Back off, or help your friends.':'The police are here. Nobody is down: clear out.');
  }
 }};
 const s=createTacticalSession(b,'mixed','crew-run',base.data,options);
 const result=s.result;s.result=()=>({...result(),training:false,scope:'campaign-outing',campaign_applied:false,mission:copy(b.mission),units:copy(b.players)});
 return s;
}
export function makeMission(content,config){
 if(config.outing)return makeOuting(content,config);
 const base=createSession(content,'mixed','lab-6'),b=base.battle,template=copy(b.players[0]),enemyTemplate=copy(b.enemies[0]);
 b.players=config.crew.map((p,i)=>tacticalPerson(p,template,{label:String(i+1),cell:`${i+1},1`,alive:true,itemIds:p.kit==='light'?['training-bandage']:[],evacuated:false,helped:false}));
 const targetCell=config.site==='north'?'3,5':'5,3';
 if(config.target){const t=tacticalPerson(config.target,template,{label:'SOS',cell:targetCell,hp:0,guard:0,alive:false,stranded:true,helped:false,evacuated:false,itemIds:[]});b.players.push(t);}
 b.enemies=Array.from({length:4},(_,i)=>({...copy(enemyTemplate),id:`rival-${i}`,name:['Lookout','Enforcer','North arrival','East arrival'][i],label:'R'+(i+1),equipment:i===0?'first-handgun':'baseball-bat',role:i%2?'muscle':'runner',cell:['1,6','4,6','0,7','5,7'][i],hp:4,maxHp:4,guard:1,harmBonus:0,skills:[],aptitudes:[],perks:{},appearanceSeed:100+i,alive:i<2,waiting:i>=2,itemIds:[]}));
 b.selectedId=b.players[0].id;b.status='active';b.result=null;b.round=1;b.log=[];
 b.objective=config.target?'Bring your colleague home. Rescue, then extract through the south edge.':'Recover the lost kit and bring the crew home.';
 const options={rules:'c17-v1',actions:['help','extract','sprint','aid','recover'],reject:t=>['auto','talk'].includes(t),
 prepare(b){b.mission={id:config.id,objective:config.objective,targetId:config.target?.id||null,targetCell,recovered:false,carrierId:null,heat:0,arrival:null,arrived:false,resolved:false};},
 finish(b){if(b.status!=='active')return;if(!b.players.some(p=>p.alive)){b.status='complete';b.result=b.players.some(p=>p.evacuated)?'withdraw':'loss';if(objectiveExtracted(b))b.result='win';}},
 action(b,u,type,value,events){
  if(type==='extract'&&xy(u.cell)[1]===0){u.extracted=true;u.evacuated=true;u.alive=false;events.push({type:'extract',id:u.id});b.log.unshift(`${u.name} reached the exit with their kit.`);return true;}
  if(type==='sprint'&&u.kit==='boots'&&b.moved.includes(u.id)){b.moved=b.moved.filter(id=>id!==u.id);events.push({type:'brace',id:u.id});b.log.unshift(`${u.name} spends Action for a second Move.`);return true;}
  if(type==='recover'&&!config.target&&!b.mission.recovered&&distance(u.cell,b.mission.targetCell)<=1){b.mission.recovered=true;b.mission.carrierId=u.id;events.push({type:'item',id:u.id});b.log.unshift(`${u.name} carries the kit. They must reach the south exit to secure it.`);return true;}
  const t=b.players.find(v=>v.id===value);
  if(!t||t.evacuated||distance(u.cell,t.cell)>1||t.id===u.id)return false;
  if(type==='help'&&!t.alive&&!t.helped&&!b.players.concat(b.enemies).some(v=>v.alive&&v.cell===t.cell)){
   t.hp=Math.min(t.maxHp,u.kit==='medical'?3:1);t.alive=true;t.helped=true;t.stranded=false;b.acted.push(t.id);events.push({type:'help',id:u.id,target:t.id});b.log.unshift(`${u.name} got ${t.name} up at ${t.hp} HP. They can Move now; Action returns next round.`);return true;}
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
 const result=s.result;s.result=()=>({...result(),training:false,scope:config.bridgeReceiptId?'campaign-crew-pilot':'connected-crew-pilot',campaign_applied:false,mission:copy(b.mission),units:copy(b.players)});
 return s;
}
export const missionCheckpoint=s=>({snapshot:s.snapshot(),actions:s.history.map(({type,actor,value})=>({type,actor,value}))});
export function objectiveExtracted(b){if(b.mission.goal)return b.result==='win';const id=b.mission.targetId||b.mission.carrierId;return !!id&&b.players.some(p=>p.id===id&&p.extracted);}
export function restoreMission(content,config,saved){const s=makeMission(content,config);if(!saved)return s;if(!Array.isArray(saved.actions)||saved.actions.length>1000)throw Error('Invalid outing history');for(const {type,actor,value}of saved.actions){if(!['move','attack','brace','item','reload','end','withdraw','help','extract','sprint','aid','recover','police'].includes(type))throw Error('Unknown outing command');if(actor!==s.battle.selectedId&&!s.command('select',actor).ok)throw Error('Invalid outing actor');if(!s.command(type,value).ok)throw Error('Invalid outing command');}if(saved.snapshot.selectedId!==s.battle.selectedId)s.command('select',saved.snapshot.selectedId);if(JSON.stringify(s.snapshot())!==JSON.stringify(saved.snapshot))throw Error('Outing checkpoint mismatch');return s;}
/** An outing's people, as Act I will read them: home, hurt, carried, missing
 *  or arrested. Aatami is never missing and never taken. */
function outingChanges(state,b,protagonist){
 const changes=[];
 for(const u of b.players){
  const p=state.crew.find(v=>v.id===u.id),out=u.evacuated||u.home;
  const change=(label,campaignEffect,kit='Kit returned')=>{p.memories.unshift(`Night ${state.night}: ${label.toLowerCase()}.`);changes.push({id:p.id,name:p.name,state:label,campaignEffect,kit,hp:u.hp,maxHp:u.maxHp,equipment:u.equipment});};
  if(u.taken&&u.id!==protagonist){p.missing=true;change('Taken by the police','arrested','Kit taken');continue;}
  if(!out&&u.id!==protagonist){p.missing=true;change('Missing · left behind','missing','Kit held with them');continue;}
  p.missing=false;p.fights++;
  if(!out||u.wasDown){p.wounds++;change('Carried out · hurt','carried');continue;}
  if(u.hp<u.maxHp){p.wounds++;change('Home · hurt','damage');continue;}
  change(p.campaignStatus==='available'?'Home':`Home · ${p.campaignStatus} unchanged`,'unchanged');
 }
 return changes;
}
const OUTING_TITLES={police:'The police came',withdraw:'You pulled out',loss:'Nobody got out'};
export function settle(state,session){
 if(state.phase!=='battle'||session.battle.status==='active'||state.active?.config.id!==session.battle.mission.id)return false;
 const config=state.active.config,b=session.battle,bridged=state.bridge?.mode==='campaign-v3',m=b.mission;let changes=[],receipt;
 if(config.outing){
  changes=outingChanges(state,b,session.data.content.protagonist?.id);
  const end=m.end||b.result,title=OUTING_TITLES[end]||(m.goal==='getaway'?'Everyone got out':m.routed?'They ran':'They are down');
  const count=effect=>changes.filter(c=>c.campaignEffect===effect).length;
  receipt={id:config.id,bridgeReceiptId:config.bridgeReceiptId,outingId:config.outing.id,goal:m.goal,result:b.result,end,routed:m.routed,deployedIds:config.crew.map(p=>p.id),title,success:b.result==='win',rounds:b.round,heat:m.heat,
   police:{posture:m.police.posture,taken:m.police.taken.map(id=>b.players.find(p=>p.id===id)?.name||id)},changes,
   text:[`${changes.length-count('missing')-count('arrested')} home`,count('missing')&&`${count('missing')} missing`,count('arrested')&&`${count('arrested')} taken by the police`].filter(Boolean).join(' · ')+'.'};
 }else{
 for(const u of b.players){
  const p=state.crew.find(v=>v.id===u.id),wasMissing=!!p.missing,deployed=config.crew.some(v=>v.id===p.id);p.missing=!u.evacuated;
  if(u.evacuated){
   if(!bridged){p.fights++;p.wounds+=u.hp<u.maxHp?1:0;p.readyAt=state.night+(u.hp<u.maxHp?2:1);const msg=u.hp<u.maxHp?'Wounded · rests next outing':'Returned ready';p.memories.unshift(`Night ${state.night}: ${msg.toLowerCase()}.`);changes.push({id:p.id,name:p.name,state:msg,kit:'Kit returned',hp:u.hp,maxHp:u.maxHp,equipment:u.equipment});continue;}
   if(deployed)p.fights++;
   const tookDamage=u.hp<u.maxHp;let campaignEffect='unchanged',msg=p.campaignStatus==='available'?'Returned ready':`Returned · ${p.campaignStatus} unchanged`;
   if(wasMissing){campaignEffect='recovered';msg='Recovered · needs treatment';p.wounds=Math.max(1,p.wounds);}
   else if(tookDamage){campaignEffect='damage';msg='Wounded · campaign condition worsened';p.wounds++;}
   p.readyAt=state.night+(['damage','recovered'].includes(campaignEffect)?2:1);
   p.memories.unshift(`Night ${state.night}: ${msg.toLowerCase()}.`);
   changes.push({id:p.id,name:p.name,state:msg,campaignEffect,kit:'Kit returned',hp:u.hp,maxHp:u.maxHp,equipment:u.equipment});
  }else{
   const campaignEffect=bridged?'missing':undefined;p.memories.unshift(`Night ${state.night}: left behind. Recovery needed.`);changes.push({id:p.id,name:p.name,state:'Missing · recover on a later outing',campaignEffect,kit:'Kit held with them',hp:0,maxHp:u.maxHp,equipment:u.equipment});
  }
 }
 const success=objectiveExtracted(b);
 receipt={id:config.id,bridgeReceiptId:config.bridgeReceiptId||null,deployedIds:config.crew.map(p=>p.id),title:success?'Someone came home':'The night left a debt',success,rounds:b.round,heat:m.heat,changes,text:`${changes.filter(c=>!c.state.startsWith('Missing')).length} returned. ${changes.filter(c=>c.state.startsWith('Missing')).length} missing. One outing spent.`};
 }
 if(bridged&&receipt.bridgeReceiptId&&globalThis.localStorage){
  const campaign=readCampaignSave(globalThis.localStorage,session.data.content);
  if(campaign){const applied=applyCampaignReceipt(campaign,session.data.content,receipt),marker=`memory:c17-receipt:${receipt.bridgeReceiptId}`;receipt.campaignApplied=applied||campaign.flags?.includes(marker)||false;if(receipt.campaignApplied)globalThis.localStorage.setItem(CAMPAIGN_SAVE_KEY,JSON.stringify(campaign));}
 }
 state.last=receipt;state.ledger.unshift(receipt);state.ledger=state.ledger.slice(0,30);state.night++;state.phase='aftermath';state.active.checkpoint=missionCheckpoint(session);return true;
}
export function continueRun(state){if(state.outing||state.phase!=='aftermath')return false;state.phase='prep';state.active=null;state.selected=available(state).slice(0,3).map(p=>p.id);return true;}
function wantsCampaign(){try{return new URLSearchParams(globalThis.location?.search||'').get('campaign')==='1';}catch{return false;}}
function outingParam(){try{return new URLSearchParams(globalThis.location?.search||'').get('outing')||'';}catch{return '';}}
export const saveKey=()=>outingParam()?OUTING_SAVE_KEY:SAVE_KEY;
export function loadRun(raw,content){
 const outingId=outingParam();
 if(outingId){
  // The same outing resumes (prep, mid-fight, or its aftermath); any other is
  // built fresh from the campaign save, where Act I wrote it.
  let parsed=null;try{parsed=raw?JSON.parse(raw):null;}catch{}
  if(parsed?.bridge?.outingId===outingId)return checkRun(parsed,content);
  const outing=campaignOuting(readCampaignSave(globalThis.localStorage,content),outingId);
  if(!outing)throw Error('That fight is not in this campaign.');
  return outingRun(readCampaignSave(globalThis.localStorage,content),content,outing);
 }
 let parsed=null;if(raw){try{parsed=JSON.parse(raw);}catch(e){if(!wantsCampaign())throw e;}}
 if(wantsCampaign()&&parsed?.bridge?.mode!=='campaign-v3'){
  const campaign=readCampaignSave(globalThis.localStorage,content);if(campaign)return campaignRun(campaign,content);
 }
 if(!parsed){if(wantsCampaign()){const campaign=readCampaignSave(globalThis.localStorage,content);if(campaign)return campaignRun(campaign,content);}return newRun();}
 return checkRun(parsed,content);
}
function checkRun(s,content){
 if(s.version!==1||!['prep','battle','aftermath'].includes(s.phase)||!Number.isInteger(s.night)||s.night<1||!Array.isArray(s.crew)||s.crew.length>100||!Array.isArray(s.selected)||!Array.isArray(s.ledger))throw Error('Unsupported crew save');if(new Set(s.crew.map(p=>p.id)).size!==s.crew.length||s.crew.some(p=>!eq.includes(p.equipment)||!Object.hasOwn(KITS,p.kit)||typeof p.name!=='string'||!Number.isInteger(p.readyAt)))throw Error('Invalid crew');
 if(s.active){
  try{restoreMission(content,s.active.config,s.active.checkpoint);}
  catch(error){
   const oldRules=s.active?.checkpoint?.snapshot?.rules;
   if(!s.bridge&&oldRules==='c12-v1'){
    s.phase='prep';s.active=null;s.selected=available(s).slice(0,3).map(p=>p.id);
    s.ledger.unshift({id:`migration-${s.night}`,title:'Outing reset after rules update',text:'Crew records kept. The in-progress C.16 outing returned to preparation for the C.17 rules.'});s.ledger=s.ledger.slice(0,30);
   }else throw error;
  }
 }
 return s;
}
