import {coverEdges,coverProtection,crossesCoverEdge} from './cover-edges.js?v=1';
// C laboratory rules. Campaign resolver and saves deliberately stay separate.
export const WEAPONS={
  'baseball-bat':{name:'Bat',range:1,damage:3,accuracy:100},
  'folding-knife':{name:'Knife',range:1,damage:2,accuracy:100,pierce:1},
  'first-handgun':{name:'Handgun',range:6,damage:3,accuracy:90,magazine:4}
};
const xy=c=>c.split(',').map(Number),key=(x,y)=>`${x},${y}`;
const distance=(a,b)=>{const [x,y]=xy(a),[u,v]=xy(b);return Math.abs(x-u)+Math.abs(y-v);};
const units=b=>b.players.concat(b.enemies),alive=b=>units(b).filter(u=>u.alive);
export const weapon=u=>WEAPONS[u.equipment];
export const coordinate=c=>{const [x,y]=xy(c);return String.fromCharCode(65+x)+(y+1);};
export const coverName=(b,c)=>b.cover.get(c)?.hardBlock?'Full cover':coverEdges(b,c).length?'Partial cover':'Exposed';
export function routes(b,u,origin=u.cell){
  const occupied=new Set(alive(b).filter(v=>v.id!==u.id).map(v=>v.cell)),found=new Map([[origin,[]]]),queue=[origin];
  for(const cell of queue){const path=found.get(cell);if(path.length>=4)continue;const [x,y]=xy(cell);
    for(const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1]]){const nx=x+dx,ny=y+dy,n=key(nx,ny);
      if(nx<0||nx>=6||ny<0||ny>=8||found.has(n)||occupied.has(n)||b.cover.get(n)?.hardBlock||crossesCoverEdge(b,cell,n))continue;
      found.set(n,[...path,n]);queue.push(n);
    }
  }return found;
}
// Supercover DDA includes both side cells at an exact corner: no diagonal shots
// through touching walls. The target and shooter are excluded from blockers.
export function sightCells(from,to){
  let [x,y]=xy(from);const [tx,ty]=xy(to),dx=tx-x,dy=ty-y,sx=Math.sign(dx),sy=Math.sign(dy),ax=Math.abs(dx),ay=Math.abs(dy);
  let ix=0,iy=0;const cells=[];
  while(ix<ax||iy<ay){const a=(1+2*ix)*ay,b=(1+2*iy)*ax;
    if(a===b){if(sx&&sy)cells.push(key(x+sx,y),key(x,y+sy));x+=sx;y+=sy;ix++;iy++;}
    else if(a<b){x+=sx;ix++;}else{y+=sy;iy++;}cells.push(key(x,y));
  }return [...new Set(cells)].filter(c=>c!==from&&c!==to);
}
export function forecast(b,u,target,from=u?.cell){
  const w=u&&weapon(u),fail=reason=>({valid:false,reason,chance:0,hpDamage:0,guardDamage:0,from,to:target?.cell});
  if(!u?.alive||!target?.alive||u.side===target.side)return fail('No opposing target');
  if(w.magazine&&u.ammo<1)return fail('Reload required');
  if(distance(from,target.cell)>w.range)return fail('Out of range');
  const blockers=new Set(alive(b).filter(v=>v.id!==u.id&&v.id!==target.id).map(v=>v.cell));
  const blocked=sightCells(from,target.cell).find(c=>b.cover.get(c)?.hardBlock||blockers.has(c));
  if(blocked)return {...fail('Line blocked'),blocked};
  const wall=w.magazine?coverProtection(b,from,target.cell):null,partial=!!wall,guardDamage=Math.min(target.guard,Math.max(0,w.damage-(w.pierce||0)));
  return {valid:true,reason:'Clear',from,to:target.cell,chance:w.accuracy-(partial?25:0),damage:w.damage,guardDamage,hpDamage:Math.min(target.hp,w.damage-guardDamage),cover:partial?'partial':'exposed',coverEdge:wall?.edge??null,coverPoint:wall?.point??null,flanked:!!w.magazine&&!partial&&coverEdges(b,target.cell).length>0};
}
export const targets=(b,u,from=u.cell)=>b.enemies.filter(v=>forecast(b,u,v,from).valid);
function copyBattle(b){return {...structuredClone({...b,cover:undefined}),cover:b.cover};}
function legalPath(b,u,path){let at=u.cell;for(const c of path){if(distance(at,c)!==1||b.cover.get(c)?.hardBlock||crossesCoverEdge(b,at,c)||alive(b).some(v=>v.id!==u.id&&v.cell===c))return false;at=c;}return path.length<=4;}
export function choosePlan(b,u,{canMove=true}={}){
  const opponents=alive(b).filter(v=>v.side!==u.side),w=weapon(u);
  if(w.magazine&&!u.ammo)return {id:u.id,type:'reload',path:[],to:u.cell};
  let best=null;
  for(const [to,path] of (canMove?routes(b,u):new Map([[u.cell,[]]])))for(const target of opponents){const f=forecast(b,u,target,to),d=distance(to,target.cell);
    const score=(f.valid?100+f.hpDamage*3+f.chance/10:0)-d*(b.mission&&!f.valid?1.3:.6)-path.length*.8+(w.magazine&&coverProtection(b,target.cell,to)?4:0);
    if(!best||score>best.score)best={id:u.id,type:f.valid?'attack':path.length?'advance':'hold',target:target.id,aim:target.cell,path,to,score};
  }return best||{id:u.id,type:'hold',path:[],to:u.cell};
}
function planRound(b){const projected=copyBattle(b);b.plans=[];for(const u of projected.enemies.filter(v=>v.alive)){const plan=choosePlan(projected,u);b.plans.push(plan);u.cell=plan.to;}}
// Intent previews and resolution consume the same stored plans. They never
// silently choose a new target when the player breaks an announced attack.
export function planView(b,plan){
  const u=units(b).find(v=>v.id===plan.id),target=units(b).find(v=>v.id===plan.target);
  if(!u?.alive)return {...plan,valid:false,reason:'Attacker down'};
  if(!legalPath(b,u,plan.path))return {...plan,valid:false,reason:'Planned route blocked'};
  if(plan.type!=='attack')return {...plan,valid:true,reason:plan.type==='reload'?'Reloads':plan.type==='advance'?'Moves; no attack planned':'Holds'};
  return {...plan,...forecast(b,u,target,plan.to),to:plan.to,aim:target?.cell,target:plan.target};
}
export function threats(b,preview=null){
  const sim=copyBattle(b),totals={},views=[];
  if(preview){const u=units(sim).find(v=>v.id===preview.id);if(u)u.cell=preview.cell;}
  for(const plan of b.plans){const v=planView(sim,plan);views.push(v);if(!v.valid)continue;
    const u=units(sim).find(n=>n.id===v.id);u.cell=plan.to;
    if(v.type==='attack'){const target=units(sim).find(n=>n.id===v.target),total=totals[target.id]??={hp:0,guard:0,attacks:0};
      total.hp+=v.hpDamage;total.guard+=v.guardDamage;total.attacks++;target.guard-=v.guardDamage;target.hp-=v.hpDamage;
      // Keep target standing for combined worst-case damage; never consume RNG.
    }
  }return {views,totals};
}
export function createTacticalSession(battle,mode,scenario,data,options={}){
  Object.assign(battle,{tactical:true,moved:[],acted:[],plans:[],rng:104729,cover:new Map()});
  for(const c of ['0,3','5,4','2,6'])battle.cover.set(c,{hardBlock:true,softBlock:false,propId:'lab-full',effect:'blocks movement and sight'});
  for(const [c,edge] of [['1,3','north'],['4,4','south'],['3,1','east'],['1,6','west']])battle.cover.set(c,{softBlock:true,hardBlock:false,edge,propId:'lab-partial',effect:'Facing edge: -25 percentage points gun accuracy; walk around'});
  for(const u of units(battle)){u.ammo=weapon(u).magazine??null;u.maxAmmo=u.ammo;}
  options.prepare?.(battle);
  const history=[];
  const snapshot=()=>structuredClone({rules:options.rules||'c11-v1',...(battle.mission?{mission:battle.mission}:{}),round:battle.round,status:battle.status,result:battle.result,selectedId:battle.selectedId,moved:battle.moved,acted:battle.acted,plans:battle.plans,rng:battle.rng,units:units(battle),log:battle.log.slice(0,18)});
  const log=s=>battle.log.unshift(s),finish=()=>{if(options.finish){options.finish(battle);return;}if(!battle.enemies.some(u=>u.alive)||!battle.players.some(u=>u.alive)){battle.status='complete';battle.result=battle.players.some(u=>u.alive)?'win':'loss';}};
  function attack(u,target,events){const f=forecast(battle,u,target);if(!f.valid)return false;
    battle.rng=(Math.imul(battle.rng,1664525)+1013904223)>>>0;const roll=battle.rng/4294967296*100,hit=roll<f.chance,impact=hit?(f.hpDamage?'body':'guard'):f.cover==='partial'&&roll<weapon(u).accuracy?'cover':'miss';
    if(weapon(u).magazine)u.ammo--;if(hit){target.hp-=f.hpDamage;target.guard-=f.guardDamage;target.alive=target.hp>0;}
    events.push({type:'attack',id:u.id,target:target.id,hit,impact,forecast:f,down:!target.alive});
    log(`${u.label} → ${target.label}: ${hit?`${f.hpDamage} HP, ${f.guardDamage} guard`:impact==='cover'?'wall stopped the shot':'miss'} (${f.chance}%).`);finish();return true;
  }
  function move(u,path,events){if(!path.length||!legalPath(battle,u,path))return false;u.cell=path.at(-1);events.push({type:'move',id:u.id,to:u.cell,path:[...path]});return true;}
  function enemyTurn(events){
    for(const plan of battle.plans){if(battle.status!=='active')break;const u=battle.enemies.find(v=>v.id===plan.id),v=planView(battle,plan);
      if(!v.valid){if(u?.alive){log(`${u.label}: ${v.reason}; plan cancelled.`);events.push({type:'hold',id:u.id,reason:v.reason});}continue;}
      move(u,plan.path,events);
      if(plan.type==='attack')attack(u,battle.players.find(t=>t.id===plan.target),events);
      if(plan.type==='reload'){u.ammo=u.maxAmmo;events.push({type:'reload',id:u.id});log(`${u.label} reloads.`);}
      if(plan.type==='hold'){events.push({type:'hold',id:u.id,reason:'Holds position'});log(`${u.label} holds position.`);}
    }
    if(battle.status==='active'){battle.round++;battle.acted=[];battle.moved=[];planRound(battle);log(`Round ${battle.round}: new enemy plans revealed.`);}
  }
  function command(type,value){
    if(battle.status!=='active')return {ok:false};const u=battle.players.find(v=>v.id===battle.selectedId);
    if(options.reject?.(type))return {ok:false};
    if(type==='select'){const next=battle.players.find(v=>v.id===value&&v.alive);if(!next)return {ok:false};battle.selectedId=value;return {ok:true};}
    const before=snapshot(),events=[],actionUsed=battle.acted.includes(u?.id);let ok=false;
    const isAction=['attack','brace','item','reload',...(options.actions||[])].includes(type);
    if(isAction&&(!u?.alive||actionUsed))return {ok:false,message:'Action already used. Movement is separate.'};
    if(options.actions?.includes(type))ok=options.action(battle,u,type,value,events);
    else if(type==='move'&&u?.alive&&!battle.moved.includes(u.id)){const path=routes(battle,u).get(value);ok=!!path&&move(u,path,events);if(ok){battle.moved.push(u.id);log(`${u.label} moved to ${coordinate(value)}. ${actionUsed?'Action used.':'Action ready.'}`);}}
    else if(type==='attack')ok=attack(u,battle.enemies.find(v=>v.id===value),events);
    else if(type==='brace'){ok=true;u.guard=Math.min(4,u.guard+2);events.push({type:'brace',id:u.id});log(`${u.label} braces: guard ${u.guard}.`);}
    else if(type==='reload'&&u.maxAmmo&&u.ammo<u.maxAmmo){u.ammo=u.maxAmmo;ok=true;events.push({type:'reload',id:u.id});log(`${u.label} reloads. Movement stays available.`);}
    else if(type==='item'&&u.itemIds.includes('training-bandage')&&u.hp<u.maxHp){u.hp=Math.min(u.maxHp,u.hp+2);u.itemIds=[];ok=true;events.push({type:'item',id:u.id});log(`${u.label} bandages +2 HP.`);}
    else if(type==='end'){enemyTurn(events);ok=true;}
    else if(type==='auto'){for(const actor of battle.players.filter(v=>v.alive)){if(battle.status!=='active')break;const p=choosePlan(battle,actor,{canMove:!battle.moved.includes(actor.id)});
      if(!battle.moved.includes(actor.id)&&move(actor,p.path,events))battle.moved.push(actor.id);
      if(!battle.acted.includes(actor.id)){if(p.type==='attack')attack(actor,battle.enemies.find(v=>v.id===p.target),events);else if(p.type==='reload'){actor.ammo=actor.maxAmmo;events.push({type:'reload',id:actor.id});}else{actor.guard=Math.min(4,actor.guard+2);events.push({type:'brace',id:actor.id});}battle.acted.push(actor.id);}}
      if(battle.status==='active')enemyTurn(events);ok=true;
    }else if(type==='withdraw'||type==='talk'&&battle.round>=2){battle.status='complete';battle.result=type==='withdraw'?'withdraw':'partial';ok=true;log(type==='withdraw'?'Crew withdrew. No campaign cost.':'Training truce.');}
    if(!ok)return {ok:false,message:'Unavailable: check route, range, ammo and action budget.'};
    if(isAction)battle.acted.push(u.id);
    options.after?.(battle,type,events);finish();
    if(options.replan?.(battle,type,events)&&battle.status==='active')planRound(battle);
    const record={type,value,actor:u?.id,before,after:snapshot(),events};history.push(record);return {ok:true,record};
  }
  planRound(battle);log('Move + Act in either order. Rust plans are visible; breaking a plan cancels it.');
  return {battle,data,mode,scenario,history,command,snapshot,result:()=>({schema_version:1,encounter:scenario,result:battle.result,training:true,campaign_effects:[],actions:history.map(({type,value})=>({type,value}))})};
}
