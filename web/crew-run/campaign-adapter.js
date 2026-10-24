import {
  SAVE_KEY as CAMPAIGN_SAVE_KEY,
  crewRecord, aptitudesOf, perksOf, skillsOf, fightsOf, ageCrew,
} from '../js/v3/state.js?v=9';
import {nameFrom} from '../../people/roster.mjs?v=1';

// C.17 bridge: the authored campaign remains the source of truth. Night Shift
// receives a small, serialisable projection and returns a receipt. The bridge
// never imports the campaign renderer/save format into the tactical resolver.
export {CAMPAIGN_SAVE_KEY};

const C_WEAPONS=new Set(['baseball-bat','folding-knife','first-handgun']);
const C_KITS=new Set(['boots','medical','light']);
const COLORS=[0x4d8f85,0x778ba9,0xa99164,0x877697,0x76966d,0xb69272,0x8f7468,0x66838b];
const copy=value=>structuredClone(value);

function hash(text){let h=2166136261>>>0;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function dataFor(content){return {content,crew:new Map((content.crew||[]).map(p=>[p.id,p]))};}
function textOfTrait(t){return typeof t==='string'?t:(t?.text||t?.label||t?.id||'');}
function roleFor(record,aptitudes){
  if(['runner','muscle'].includes(record?.role))return record.role;
  if(aptitudes.some(a=>['runner','courier','spotter','shooter'].includes(a)))return 'runner';
  return 'muscle';
}
function weaponRead(record){
  const authored=(record?.initial_equipment||[]).find(id=>C_WEAPONS.has(id));
  return {equipment:authored||'baseball-bat',prototypeWeapon:!authored};
}
function kitRead(record){
  // C.16's boots/medical/light are supplied prototype support. Only carry one
  // through when campaign content explicitly authors that id; never turn an
  // aptitude or a flavour trait into free equipment behind the player's back.
  const authored=(record?.initial_equipment||[]).find(id=>C_KITS.has(id));
  return {kit:authored||'light',prototypeSupport:!authored};
}
function memoriesFor(state,id){
  return (state.flags||[]).filter(flag=>String(flag).includes(`:${id}`)).slice(-3).reverse().map(flag=>String(flag).replace(/^memory:/,'').replaceAll(':',' · '));
}

export function readCampaignSave(storage,content){
  try{
    const state=JSON.parse(storage?.getItem(CAMPAIGN_SAVE_KEY)||'null');
    if(!state||state.version!==3||state.contentId!==content.id||!Array.isArray(state.recruited))return null;
    return state;
  }catch{return null;}
}

export function campaignCrew(state,content){
  const data=dataFor(content),retired=new Set(state.retiredCrew||[]),arrested=new Set(state.arrestedCrew||[]);
  const roster=(state.recruited||[]).filter(id=>!retired.has(id)&&!arrested.has(id)&&state.crewStatus?.[id]?.status!=='dead');
  const ready=roster.filter(id=>state.crewStatus?.[id]?.status!=='missing');
  const missing=roster.filter(id=>state.crewStatus?.[id]?.status==='missing');
  const preferred=(state.deployed||[]).filter(id=>ready.includes(id));
  const ordered=[...preferred,...ready.filter(id=>!preferred.includes(id)),...missing];
  return ordered.map(id=>projectPerson(state,content,id)).filter(Boolean);
}

// One campaign person as Night Shift sees them. Aatami resolves here too
// (crewRecord falls back to the protagonist), which is how an outing (v4.74)
// carries him while he still fights.
export function projectPerson(state,content,id){
    const data=dataFor(content),record=crewRecord(state,data,id),status=state.crewStatus?.[id];
    if(!record)return null;
    const aptitudes=aptitudesOf(state,data,id),perks=copy(perksOf(state,id)),skills=copy(skillsOf(state,id)),weapon=weaponRead(record),kit=kitRead(record);
    const maxCondition=Math.max(1,Number(status?.maxCondition??record.condition??5));
    const condition=Math.max(0,Number(status?.condition??maxCondition));
    return {
      id,
      name:record.name||nameFrom(id),
      aptitudes:copy(aptitudes),
      traits:(record.traits||[]).map(textOfTrait).filter(Boolean),
      equipment:weapon.equipment,
      prototypeWeapon:weapon.prototypeWeapon,
      kit:kit.kit,
      prototypeSupport:kit.prototypeSupport,
      color:COLORS[hash(id)%COLORS.length],
      role:roleFor(record,aptitudes),
      fights:fightsOf(state,id),
      wounds:Math.max(0,maxCondition-condition),
      readyAt:1,
      missing:status?.status==='missing',
      memories:memoriesFor(state,id),
      perks,
      skills,
      campaignStatus:status?.status||'available',
      campaignCritical:Boolean(status?.critical),
      campaignCondition:condition,
      campaignMaxCondition:maxCondition,
      appearanceSeed:hash(`c17:${id}`),
      protagonist:content.protagonist?.id===id,
    };
}

// v4.74 (design/C19_CAMPAIGN_FIGHTS.md step 1): an Act I door fight arrives
// as an OUTING already written into the campaign save. Who fights, where, and
// against whom are the campaign's, so nothing is chosen here.
export function campaignOuting(state,id){
  const outing=state?.outing;
  return outing&&outing.id===id?outing:null;
}

export function outingRun(state,content,outing){
  if(outing?.status!=='open')throw Error('That fight is already settled.');
  const crew=outing.fighters.map(id=>projectPerson(state,content,id)).filter(Boolean);
  if(crew.length<2)throw Error('An outing needs at least two people who can fight.');
  return {
    version:1,
    night:Math.max(1,Number(state.scheduleIndex||0)+1),
    phase:'prep',
    crew,
    selected:crew.map(p=>p.id),
    active:null,
    ledger:[],
    last:null,
    outing:copy(outing),
    bridge:{mode:'campaign-v3',id:outing.id,outingId:outing.id,contentId:content.id,sourceScheduleIndex:Number(state.scheduleIndex||0)},
  };
}

export function campaignRun(state,content,{now=Date.now}={}){
  const crew=campaignCrew(state,content),ready=crew.filter(p=>!p.missing);
  if(ready.length<2)throw Error('Campaign needs at least two available crew for this outing.');
  const chosen=ready.slice(0,Math.min(3,ready.length)).map(p=>p.id);
  return {
    version:1,
    night:Math.max(1,Number(state.scheduleIndex||0)+1),
    phase:'prep',
    crew,
    selected:chosen,
    active:null,
    ledger:[],
    last:null,
    bridge:{
      mode:'campaign-v3',
      id:`c17-${Number(now()).toString(36)}`,
      contentId:content.id,
      sourceScheduleIndex:Number(state.scheduleIndex||0),
    },
  };
}

function pushUnique(items,value){if(!items.includes(value))items.push(value);}
function log(state,text){state.logs=Array.isArray(state.logs)?state.logs:[];state.logs.push(text);if(state.logs.length>80)state.logs.splice(0,state.logs.length-80);}

// Apply exactly once. The receipt id is written into campaign flags before any
// future reload can re-submit the same tactical aftermath.
export function applyCampaignReceipt(state,content,receipt){
  if(!receipt?.bridgeReceiptId||!Array.isArray(receipt.deployedIds))return false;
  state.flags=Array.isArray(state.flags)?state.flags:[];
  const marker=`memory:c17-receipt:${receipt.bridgeReceiptId}`;
  if(state.flags.includes(marker))return false;
  const data=dataFor(content);
  pushUnique(state.flags,marker);

  for(const change of receipt.changes||[]){
    const status=state.crewStatus?.[change.id];
    if(!status)continue;
    let effect=change.campaignEffect||(
      String(change.state).startsWith('Missing')?'missing':
      String(change.state).startsWith('Wounded')?'damage':'unchanged'
    );
    // Aatami is hurt, never left behind: the crew carry him out (Act I's rule,
    // owner 2026-10-24). An outing marks him `carried`; nothing makes him missing.
    if(effect==='carried'||(effect==='missing'&&change.id===content.protagonist?.id))effect='damage';
    if(effect==='missing'){
      status.status='missing';status.condition=0;status.critical=false;
      pushUnique(state.flags,`memory:missing:${change.id}`);
      log(state,`${crewRecord(state,data,change.id)?.name||change.name||change.id} did not make it home from the outing.`);
    }else if(effect==='recovered'){
      status.status='wounded';status.condition=Math.max(1,status.condition||0);status.critical=false;
      pushUnique(state.flags,`memory:recovered:${change.id}`);
      log(state,`${crewRecord(state,data,change.id)?.name||change.name||change.id} came home from a recovery outing and still needs treatment.`);
    }else if(effect==='damage'){
      status.condition=Math.max(1,Math.min(status.maxCondition??status.condition??1,(status.condition??1)-1));
      if(status.critical){status.status='critical';}
      else {status.status='wounded';status.critical=false;}
      pushUnique(state.flags,`memory:wounded:${change.id}`);
    }
    // `unchanged` deliberately does nothing: a person who entered C.17 already
    // wounded/critical cannot be healed merely by surviving the prototype.
  }

  // Same campaign currency as every other survived fight: one deployed outing
  // advances career/level boundaries once, regardless of success.
  ageCrew(state,data,receipt.deployedIds);
  state.battleHistory=Array.isArray(state.battleHistory)?state.battleHistory:[];
  // An outing goes back to Act I settled; Act I pays the door's stakes once.
  const outing=receipt.outingId&&state.outing?.id===receipt.outingId?state.outing:null;
  if(outing){
    const named=effect=>(receipt.changes||[]).filter(c=>c.campaignEffect===effect).map(c=>c.name);
    Object.assign(outing,{status:'settled',result:receipt.result,rounds:receipt.rounds,carried:named('carried'),missing:named('missing')});
    state.battleHistory.push({id:outing.battle,result:receipt.result,round:receipt.rounds,at:outing.anchor,outing:outing.id,source:'c19-night-shift'});
    log(state,`Night Shift: ${receipt.text||'outing resolved.'}`);
    return true;
  }
  state.battleHistory.push({
    id:receipt.bridgeReceiptId,
    result:receipt.success?'objective-complete':'withdraw-or-loss',
    rounds:receipt.rounds,
    pressure:receipt.heat,
    deployed:[...receipt.deployedIds],
    source:'c17-night-shift',
  });
  log(state,`Night Shift: ${receipt.text||'outing resolved.'}`);
  return true;
}
