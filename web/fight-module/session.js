import {createTacticalSession} from './tactics.js?v=7';
import { createState } from '../js/v3/state.js?v=7';
import { createBattleState, endPlayerPhase, autoCommand, selectAction, selectUnit, playerAttack, moveUnit, brace, useItem, withdrawBattle, negotiateBattle, resultEffects, choosePolicePosture } from './resolver.js?v=4';

// Same-tab emergency recovery only, never a campaign save. Replay committed
// commands once; a partially shown animation is not a partially applied action.
export function checkpoint(session) {
  return {version:session.battle.tactical?4:2,mode:session.mode,scenario:session.scenario,snapshot:session.snapshot(),
    actions:session.history.map(({type,actor,value})=>({type,actor,value}))};
}
export function restoreSession(content,saved) {
  if(![1,2,3,4].includes(saved?.version)||!['mixed','melee','ranged'].includes(saved.mode)||!Array.isArray(saved.actions)||saved.actions.length>1000)throw Error('Invalid training checkpoint');
  const scenario=saved.version===1?'training':saved.scenario;if(!['training','bear-path','lab-2','lab-6','lab-12'].includes(scenario))throw Error('Unknown checkpoint scenario');
  if(scenario.startsWith('lab-')&&saved.version!==4)throw Error('Older laboratory rules require a fresh test');
  const session=createSession(content,saved.mode,scenario);
  for(const {type,actor,value} of saved.actions) {
    if(!['move','attack','brace','item','talk','withdraw','end','auto','police','reload'].includes(type))throw Error('Unknown checkpoint action');
    if(actor&&actor!==session.battle.selectedId&&!session.command('select',actor).ok)throw Error('Invalid checkpoint actor');
    if(!session.command(type,value).ok)throw Error('Invalid checkpoint command');
  }
  if(saved.snapshot?.selectedId!==session.battle.selectedId)session.command('select',saved.snapshot?.selectedId);
  if(JSON.stringify(session.snapshot())!==JSON.stringify(saved.snapshot))throw Error('Checkpoint does not match the current rules');
  return session;
}

export function createSession(content, mode='mixed', scenario='training') {
  const data={content,crew:new Map(content.crew.map(v=>[v.id,v])),equipment:new Map(content.equipment.map(v=>[v.id,v])),missions:new Map(content.missions.map(v=>[v.id,v]))};
  if(!['training','bear-path','lab-2','lab-6','lab-12'].includes(scenario))throw Error('Unknown scene');
  const campaign=createState(content),authored=scenario==='bear-path';
  const equipment=mode==='melee'?['baseball-bat','folding-knife']:mode==='ranged'?['first-handgun','first-handgun']:['baseball-bat','first-handgun'];
  const lab=scenario.startsWith('lab-'),count=lab?Number(scenario.slice(4))/2:2;
  const crew=Array.from({length:count},(_,i)=>'f0'+(i+1)).map((id,i)=>({id,name:`${i?'F02 Wiry':'F01 Heavy'} · Jade`,role:i%2?'runner':'muscle',initial_equipment:[equipment[i%2]],named:false}));
  const definition=authored?structuredClone(content.battles.find(b=>b.id==='battle-karhupuisto-2v2')):{id:lab?scenario+'-'+mode:'fighter-module-v1-'+mode,format:count+'v'+count,player_deployed:count,training:true,objective:lab?'Practice tactics with neutral stand-ins. No campaign costs.':'Practice the prototype fighters. No campaign costs.',opponents:crew.map((v,i)=>({id:'op-'+v.id,name:`${i?'F02 Wiry':'F01 Heavy'} · Rust`,role:v.role,equipment:equipment[i%2],cell:i?'front-3':'front-2',intent:'attack-in-reach'})),cover:lab?structuredClone(content.battles.find(b=>b.id==='battle-karhupuisto-2v2').cover):[],negotiation:{available:true},withdrawal:{available_from_round:1,known_cost:'no campaign cost'},casualty_table:{death:'not-eligible-in-this-battle'}};
  const battle=createBattleState(definition,crew,campaign,data);
  // Explicit test fixture only: same two bodies and loadouts on both sides.
  if(!authored){battle.players[0].cell='2,2';if(battle.players[1])battle.players[1].cell='3,2';
  battle.enemies[0].cell='2,5';if(battle.enemies[1])battle.enemies[1].cell='3,5';
  for(const u of battle.players.concat(battle.enemies)){u.hp=u.maxHp=5;u.itemIds=['training-bandage'];u.modelId=u.id.includes('f02')?'cast3d-f02-wiry-skirmisher-v05':'cast3d-f01-heavy-bruiser-v05';}
  battle.items['training-bandage']={effectType:'restore_condition',magnitude:2,singleUse:true};
  if(!lab)for(const cell of ['1,3','4,4'])battle.cover.set(cell,{propId:'concrete-block',softBlock:true,hardBlock:false,effect:'blocks direct fire'});
  }else{
    for(const [i,u] of battle.players.concat(battle.enemies).entries()){u.modelId=(i%2)?'cast3d-f02-wiry-skirmisher-v05':'cast3d-f01-heavy-bruiser-v05';u.itemIds??=[];}
    battle.players[0].name='Heavy · your crew';battle.players[1].name='Wiry · your crew';
  }
  if(lab){
    battle.repositionPolicy='legal-attack';
    for(const side of [battle.players,battle.enemies])side.forEach((u,i)=>{u.cell=`${count===1?2:count===3?i+1:i},${u.side==='player'?2:5}`;u.label=(u.side==='player'?'J':'R')+(i+1);u.name=`Stand-in ${i+1} · ${u.side==='player'?'Jade':'Rust'}`;u.role=i%2?'runner':'muscle';});
  }
  if(lab)return createTacticalSession(battle,mode,scenario,data);
  const history=[];
  const snapshot=()=>structuredClone({round:battle.round,status:battle.status,result:battle.result,selectedId:battle.selectedId,acted:battle.acted,units:battle.players.concat(battle.enemies),log:battle.log.slice(0,18),...(authored?{heat:battle.heat,police:battle.police,policeResolved:battle.policeResolved,policeTaken:battle.policeTaken,policeSaved:battle.policeSaved}:{})});
  function command(type,value){
    if(battle.status!=='active')return {ok:false};
    const before=snapshot(),actor=battle.players.find(u=>u.id===battle.selectedId),events=[];let result;
    if(['attack','move','brace','item'].includes(type)&&(!actor?.alive||battle.acted.includes(actor.id)))return {ok:false};
    if(type==='select')return {ok:selectUnit(battle,value)};
    if(type==='attack'){selectAction(battle,'attack');result=playerAttack(battle,value);}
    else if(type==='move'){selectAction(battle,'move');result=moveUnit(battle,value);}
    else if(type==='brace'){selectAction(battle,'brace');result=brace(battle);}
    else if(type==='item'){selectAction(battle,'item');result=useItem(battle,'training-bandage');}
    else if(type==='end')result={ok:endPlayerPhase(battle,e=>events.push(e))};
    else if(type==='auto')result={ok:autoCommand(battle,e=>events.push(e))};
    else if(type==='withdraw')result={ok:withdrawBattle(battle)};
    else if(type==='talk')result={ok:negotiateBattle(battle)};
    else if(type==='police'&&authored&&['BACK_OFF','HELP_FRIENDS'].includes(value)){const answered=choosePolicePosture(battle,value);result={ok:answered&&withdrawBattle(battle)};}
    else return {ok:false};
    if(result?.ok){const record={type,value,actor:actor?.id,before,after:snapshot(),events};history.push(record);return {ok:true,record};}
    return result??{ok:false};
  }
  return {battle,data,mode,scenario,history,command,snapshot,result:()=>({schema_version:1,encounter:definition.id,result:battle.result,training:!authored,survivors:battle.players.concat(battle.enemies).filter(u=>u.alive).map(u=>u.id),downed:battle.players.concat(battle.enemies).filter(u=>!u.alive).map(u=>u.id),campaign_effects:authored?resultEffects(battle,data):[],police:authored?{taken:battle.policeTaken,saved:battle.policeSaved}:null,actions:history.map(({type,value})=>({type,value}))})};
}
