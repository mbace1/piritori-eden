import { createState } from '../js/v3/state.js?v=5';
import { createBattleState, endPlayerPhase, autoCommand, selectAction, selectUnit, playerAttack, moveUnit, brace, useItem, withdrawBattle, negotiateBattle } from './resolver.js?v=1';

export function createSession(content, mode='mixed') {
  const data={content,crew:new Map(content.crew.map(v=>[v.id,v])),equipment:new Map(content.equipment.map(v=>[v.id,v])),missions:new Map(content.missions.map(v=>[v.id,v]))};
  const campaign=createState(content);
  const equipment=mode==='melee'?['baseball-bat','folding-knife']:mode==='ranged'?['first-handgun','first-handgun']:['baseball-bat','first-handgun'];
  const crew=['f01','f02'].map((id,i)=>({id,name:`${i?'F02 Wiry':'F01 Heavy'} · Jade`,role:i?'runner':'muscle',initial_equipment:[equipment[i]],named:false}));
  const definition={id:'fighter-module-v1-'+mode,format:'2v2',player_deployed:2,training:true,objective:'Practice the repaired fighters. No campaign costs.',opponents:crew.map((v,i)=>({id:'op-'+v.id,name:`${i?'F02 Wiry':'F01 Heavy'} · Rust`,role:v.role,equipment:equipment[i],cell:i?'front-3':'front-2',intent:'attack-in-reach'})),cover:[],negotiation:{available:true},withdrawal:{available_from_round:1,known_cost:'no campaign cost'},casualty_table:{death:'not-eligible-in-this-battle'}};
  const battle=createBattleState(definition,crew,campaign,data);
  // Explicit test fixture only: same two bodies and loadouts on both sides.
  battle.players[0].cell='2,2';battle.players[1].cell='3,2';
  battle.enemies[0].cell='2,5';battle.enemies[1].cell='3,5';
  for(const u of battle.players.concat(battle.enemies)){u.hp=u.maxHp=5;u.itemIds=['training-bandage'];u.modelId=u.id.includes('f02')?'cast3d-f02-wiry-skirmisher-v05':'cast3d-f01-heavy-bruiser-v05';}
  battle.items['training-bandage']={effectType:'restore_condition',magnitude:2,singleUse:true};
  for(const cell of ['1,3','4,4'])battle.cover.set(cell,{propId:'concrete-block',softBlock:true,hardBlock:false,effect:'blocks direct fire'});
  const history=[];
  const snapshot=()=>structuredClone({round:battle.round,status:battle.status,result:battle.result,selectedId:battle.selectedId,acted:battle.acted,units:battle.players.concat(battle.enemies),log:battle.log.slice(0,18)});
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
    else return {ok:false};
    if(result?.ok){const record={type,value,actor:actor?.id,before,after:snapshot(),events};history.push(record);return {ok:true,record};}
    return result??{ok:false};
  }
  return {battle,data,mode,history,command,snapshot,result:()=>({schema_version:1,encounter:definition.id,result:battle.result,training:true,survivors:battle.players.concat(battle.enemies).filter(u=>u.alive).map(u=>u.id),downed:battle.players.concat(battle.enemies).filter(u=>!u.alive).map(u=>u.id),campaign_effects:[],actions:history.map(({type,value})=>({type,value}))})};
}

