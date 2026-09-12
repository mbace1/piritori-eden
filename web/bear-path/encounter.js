// One authored encounter; this module owns only its standalone preview ledger.
// Campaign saves are never read/written. Effects remain exportable by source ID.
export const SCENARIO='enc-bear-path';
export function createEncounter(content, saved=null) {
  const authored=content.encounters.find(e=>e.id===SCENARIO);
  const mission=content.missions.find(m=>m.id===authored.mission_id);
  if(!authored||!mission)throw Error('Bear Path content missing');
  const state={phase:'approach',seen:[],subject:null,choice:null,outcome:null,
    // Explicit starting brief: the earlier Three Vans job supplied this note.
    flags:['toko-van-pattern'],cash:0,pressure:0,relationships:{},contactOpen:true,
    timeSpent:0,effects:[],settlements:0,returned:false,policeTaken:[],policeSaved:[]};
  const history=[];
  const canChoose=id=>state.phase==='dialogue'&&authored.choices.some(c=>c.id===id)&&id!=='send-fixer';
  function settle(outcome,effects){
    if(state.settlements)return false;
    state.phase='aftermath';state.outcome=outcome;state.effects=[...effects];state.settlements=1;
    for(const effect of effects){
      const [kind,id,value]=effect.split(':');
      if(kind==='cash')state.cash+=Number(id);
      if(kind==='pressure'&&id==='karhupuisto')state.pressure+=Number(value);
      if(kind==='relationship')state.relationships[id]=(state.relationships[id]||0)+Number(value);
      if(effect==='service:park-contact:closed-one-day')state.contactOpen=false;
    }
    return true;
  }
  function command(type,value){
    let ok=false;
    if(type==='look'&&['approach','dialogue'].includes(state.phase)&&['bear','exit','contact','note'].includes(value)){
      state.subject=value;if(!state.seen.includes(value))state.seen.push(value);ok=true;
    }else if(type==='talk'&&state.phase==='approach'){state.phase='dialogue';state.subject='contact';ok=true;
    }else if(type==='back'&&state.phase==='dialogue'){state.phase='approach';state.subject=null;ok=true;
    }else if(type==='choose'&&canChoose(value)){
      state.choice=value;state.timeSpent=1;
      if(value==='hold-path'){state.phase='battle';ok=true;}
      if(value==='name-empty-van')ok=settle('peaceful',[...authored.choices.find(c=>c.id===value).effects,...mission.success_effects]);
      if(value==='withdraw')ok=settle('withdraw',[...authored.choices.find(c=>c.id===value).effects,...mission.partial_effects]);
    }else if(type==='battle-result'&&state.phase==='battle'&&['win','loss','partial','withdraw'].includes(typeof value==='string'?value:value?.outcome)){
      // Same mapping as the existing resolver's resultEffects(). Downed crew
      // are carried separately for the campaign casualty resolver, never killed here.
      const outcome=typeof value==='string'?value:value.outcome;
      const taken=typeof value==='string'?[]:value.taken||[],rescued=typeof value==='string'?[]:value.saved||[];
      if(!Array.isArray(taken)||!Array.isArray(rescued)||![...taken,...rescued].every(id=>['f01','f02'].includes(id)))return {ok:false};
      const effects=outcome==='win'?mission.success_effects:outcome==='loss'?mission.failure_effects:mission.partial_effects;
      ok=settle(outcome,effects);if(ok){state.policeTaken=[...taken];state.policeSaved=[...rescued];}
    }else if(type==='return'&&state.phase==='aftermath'&&!state.returned){state.returned=true;ok=true;}
    if(ok)history.push({type,value});return {ok};
  }
  if(saved){
    if(saved.version!==1||saved.scenario!==SCENARIO||!Array.isArray(saved.history)||saved.history.length>200)throw Error('Invalid encounter save');
    for(const item of saved.history)if(!command(item.type,item.value).ok)throw Error('Invalid encounter history');
    if(JSON.stringify(state)!==JSON.stringify(saved.state))throw Error('Encounter save mismatch');
  }
  return {state,authored,mission,command,canChoose,
    checkpoint:()=>({version:1,scenario:SCENARIO,history:structuredClone(history),state:structuredClone(state)}),
    result:()=>({schema_version:1,scenario:SCENARIO,mission:mission.id,scope:'standalone-preview',
      outcome:state.outcome,choice:state.choice,effects:[...state.effects],time_blocks:state.timeSpent,
      settlements:state.settlements,police:{taken:[...state.policeTaken],saved:[...state.policeSaved]},campaign_applied:false})};
}
