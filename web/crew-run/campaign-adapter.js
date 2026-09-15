import {
  SAVE_KEY as CAMPAIGN_SAVE_KEY,
  crewRecord, aptitudesOf, perksOf, skillsOf, fightsOf, ageCrew,
} from '../js/v3/state.js?v=6';
import {nameFrom} from '../../people/roster.mjs?v=1';

// C.17 bridge: the authored campaign remains the source of truth. Night Shift
// receives a small, serialisable projection and returns a receipt. The bridge
// never imports the campaign renderer/save format into the tactical resolver.
export {CAMPAIGN_SAVE_KEY};

const C_WEAPONS=new Set(['baseball-bat','folding-knife','first-handgun']);
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
function weaponFor(record,aptitudes){
  const authored=(record?.initial_equipment||[]).find(id=>C_WEAPONS.has(id));
  if(authored)return authored;
  if(aptitudes.includes('shooter'))return 'first-handgun';
  if(aptitudes.includes('blade'))return 'folding-knife';
  return 'baseball-bat';
}
function kitFor(record,aptitudes){
  const traits=(record?.traits||[]).map(textOfTrait).join(' ').toLowerCase();
  if(traits.includes('nurse'))return 'medical';
  if(aptitudes.some(a=>['runner','courier'].includes(a)))return 'boots';
  return 'light';
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
  return (state.recruited||[]).filter(id=>!retired.has(id)&&!arrested.has(id)).map(id=>{
    const record=crewRecord(state,data,id),status=state.crewStatus?.[id];
    if(!record||status?.status==='missing')return null;
    const aptitudes=aptitudesOf(state,data,id),perks=copy(perksOf(state,id)),skills=copy(skillsOf(state,id));
    const maxCondition=Math.max(1,Number(status?.maxCondition??record.condition??5));
    const condition=Math.max(0,Number(status?.condition??maxCondition));
    return {
      id,
      name:record.name||nameFrom(id),
      aptitudes:copy(aptitudes),
      traits:(record.traits||[]).map(textOfTrait).filter(Boolean),
      equipment:weaponFor(record,aptitudes),
      kit:kitFor(record,aptitudes),
      color:COLORS[hash(id)%COLORS.length],
      role:roleFor(record,aptitudes),
      fights:fightsOf(state,id),
      wounds:Math.max(0,maxCondition-condition),
      readyAt:1,
      missing:false,
      memories:memoriesFor(state,id),
      perks,
      skills,
      campaignCondition:condition,
      campaignMaxCondition:maxCondition,
      appearanceSeed:hash(`c17:${id}`),
    };
  }).filter(Boolean);
}

export function campaignRun(state,content,{now=Date.now}={}){
  const crew=campaignCrew(state,content);
  if(crew.length<2)throw Error('Campaign needs at least two available crew for this outing.');
  const chosen=crew.slice(0,Math.min(3,crew.length)).map(p=>p.id);
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
    if(String(change.state).startsWith('Missing')){
      status.status='missing';status.condition=0;status.critical=false;
      pushUnique(state.flags,`memory:missing:${change.id}`);
      log(state,`${crewRecord(state,data,change.id)?.name||change.name||change.id} did not make it home from the outing.`);
    }else if(String(change.state).startsWith('Wounded')){
      status.status='wounded';status.condition=Math.max(1,Math.min(status.maxCondition??status.condition??1,(status.condition??1)-1));status.critical=false;
      pushUnique(state.flags,`memory:wounded:${change.id}`);
    }else{
      status.status='available';status.critical=false;
    }
  }

  // Same campaign currency as every other survived fight: one deployed outing
  // advances career/level boundaries once, regardless of success.
  ageCrew(state,data,receipt.deployedIds);
  state.battleHistory=Array.isArray(state.battleHistory)?state.battleHistory:[];
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
