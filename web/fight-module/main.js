import * as T from 'three';
import {createSession,checkpoint,restoreSession} from './session.js?v=4';
import {loadFighters,makeActor,updateActor,disposeActor} from './actors.js?v=3';
import {attackTargets,validMoveCells,coverStandingLine,policeAwaitingPosture} from './resolver.js?v=1';
import {LANES,totalRows,parseSlotKey} from '../js/v3/grid.js?v=1';
import {renderProfile,pixelRatioFor,limitTextures} from './render-profile.js?v=2';
import {createEdgeSmoothing} from './edge-smoothing.js?v=1';
import {buildNightCourtyard} from './environment.js?v=1';
import {buildKarhupuisto} from '../bear-path/park.js?v=2';
import {loadParkAssets} from '../bear-path/assets.js?v=1';
import {createEncounter} from '../bear-path/encounter.js?v=1';
import {mountBearPath} from '../bear-path/presentation.js?v=2';
import {fitBattleCamera,placeLabels} from './framing.js?v=1';

const isBear=document.body.dataset.scenario==='bear-path',scenario=isBear?'bear-path':'training';
let story=null,cameraPullback=false,parkAssets=null;
const ART_SAVE='piritori-bear-path-art-v1';
let artStyle='ink';try{artStyle=new URLSearchParams(location.search).get('look')||localStorage.getItem(ART_SAVE)||'ink';}catch{}
if(!['ink','cold'].includes(artStyle))artStyle='ink';
const STORY_SAVE='piritori-bear-path-preview-v1';
const $=id=>document.getElementById(id),canvas=$('scene'),area=$('arena');
let session,templates,content,manifest,busy=true,action='',auto=false,angle=.65,zoom=1,sequence=0,hidden=false;
let renderer,world,camera,highlight,ray,ground,stage,actors=new Map(),labels=new Map(),fps=0,low=false,frameCount=0,seconds=0;
let frameInfo,edgeSmoothing,layoutPaused=false,reflowTimer=0,autoTimer=0;
const leaders=new Map();
const RECOVERY_KEY=isBear?'piritori-bear-path-graphics-v1':'piritori-fight-c05-recovery';
const touch=navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches;
let profile=renderProfile({touch}),graphicsLost=false,ready=false,raf=0,losses=0,recoveries=0,recoveryTimer=0;
class Interrupted extends Error {}
function loading(message){$('loading-message').textContent=message;$('loading').hidden=false;}
function saveRecovery(){try{sessionStorage.setItem(RECOVERY_KEY,JSON.stringify({fight:checkpoint(session),story:story?.checkpoint(),angle,zoom,pullback:cameraPullback}));return true;}catch{return false;}}
function saveStory(){if(!isBear||!story)return;try{localStorage.setItem(STORY_SAVE,JSON.stringify({fight:checkpoint(session),story:story.checkpoint(),angle,zoom,pullback:cameraPullback}));}catch{}}
function restartChapter(){try{localStorage.removeItem(STORY_SAVE);sessionStorage.removeItem(RECOVERY_KEY);}catch{}location.reload();}
function clearRecovery(){try{sessionStorage.removeItem(RECOVERY_KEY);}catch{}}
function lockInput(){for(const el of document.querySelectorAll('#panel button,#panel select,#camera-tools button,#art-toggle,#again'))el.disabled=true;}
function queueFrame(){if(!raf&&!hidden&&!graphicsLost&&ready)raf=requestAnimationFrame(tick);}
function applyProfile(){renderer.shadowMap.enabled=profile.shadows;if(templates)for(const template of templates.values())limitTextures(template.scene,profile.textureSize);fit();}
const CELL=1.17,position=cell=>{const p=parseSlotKey(cell);return new T.Vector3((p.lane-(LANES-1)/2)*CELL,0,(3.5-p.depth)*CELL);};
const all=()=>session.battle.players.concat(session.battle.enemies),selected=()=>session.battle.players.find(u=>u.id===session.battle.selectedId);
const hint=text=>$('hint').textContent=text;
function activate(el,fn){let last=-1000;for(const name of ['pointerup','touchend','click'])el.addEventListener(name,e=>{if(el.disabled||name==='click'&&e.detail!==0)return;e.preventDefault();if(performance.now()-last<260)return;last=performance.now();fn();});}
function button(text,fn,attrs={}){const b=document.createElement('button');b.textContent=text;for(const [k,v] of Object.entries(attrs))b.setAttribute(k,v);activate(b,fn);return b;}
function buildStage(){
  world=new T.Scene();
  renderer=new T.WebGLRenderer({canvas,antialias:profile.antialias,powerPreference:'default',alpha:false,stencil:false});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=profile.shadows;renderer.shadowMap.type=T.PCFSoftShadowMap;
  edgeSmoothing=createEdgeSmoothing(renderer);
  camera=new T.OrthographicCamera(-5,5,5,-5,.1,60);ray=new T.Raycaster();ground=new T.Plane(new T.Vector3(0,1,0),0);highlight=new T.Group();world.add(highlight);
  stage=isBear?buildKarhupuisto(world,renderer,session.battle.cover,position,parkAssets,artStyle):buildNightCourtyard(world,renderer,session.battle.cover,position);
  if(isBear)showArtStyle();
  bindGraphicsRecovery();fit();new ResizeObserver(fit).observe(area);
}
function fit(){
  if(!renderer)return;const w=Math.max(1,area.clientWidth),h=Math.max(1,area.clientHeight);
  if(!graphicsLost){const ratio=pixelRatioFor(profile,w,h,devicePixelRatio);if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);if(canvas.width!==Math.floor(w*ratio)||canvas.height!==Math.floor(h*ratio))renderer.setSize(w,h,false);}
  frameInfo=fitBattleCamera(camera,{width:w,height:h,angle,zoom,lanes:LANES,rows:totalRows(),cell:CELL});stage?.update(camera);
}
const unitTag=u=>(u.side==='player'?'J':'R')+(u.modelId.includes('f02')||u.id.includes('f02')?'2':'1');
function project(at){const p=at.clone().project(camera);return {x:(p.x+1)*area.clientWidth/2,y:(1-p.y)*area.clientHeight/2};}
function layoutTags(){
  const rect=area.getBoundingClientRect(),w=rect.width,h=rect.height;
  const obstacles=['roundbar','camera-tools','perf',...(isBear?['art-toggle']:[])].map(id=>{const b=$(id).getBoundingClientRect();return {x:b.x-rect.x,y:b.y-rect.y,width:b.width,height:b.height};});
  const items=all().map(u=>{const a=actors.get(u.id),el=labels.get(u.id),head=project(a.group.position.clone().add(new T.Vector3(0,a.down?.45:2.15,0))),feet=project(a.group.position),radius=Math.max(8,h/frameInfo.span*.32);return {id:u.id,anchor:head,width:el.offsetWidth,height:el.offsetHeight,body:{x:feet.x-radius,y:head.y+4,width:radius*2,height:Math.max(0,feet.y-head.y-4)}};});
  for(const item of placeLabels(items,w,h,obstacles)){const el=labels.get(item.id),line=leaders.get(item.id);el.style.transform=`translate(${item.x}px,${item.y}px)`;const lx=Math.max(item.x+4,Math.min(item.x+item.width-4,item.anchor.x)),ly=item.y+item.height;line.setAttribute('x1',lx);line.setAttribute('y1',ly);line.setAttribute('x2',Math.max(2,Math.min(w-2,item.anchor.x)));line.setAttribute('y2',Math.max(2,Math.min(h-2,item.anchor.y)));line.setAttribute('opacity',Math.hypot(lx-item.anchor.x,ly-item.anchor.y)>11?'.72':'.35');}
}
function rebuildActors(){for(const a of actors.values())disposeActor(a);actors.clear();$('labels').replaceChildren();labels.clear();leaders.clear();const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('label-leaders');svg.setAttribute('aria-hidden','true');$('labels').append(svg);for(const u of all()){const a=makeActor(templates.get(u.modelId),u,world);a.group.position.copy(position(u.cell));a.group.rotation.y=u.side==='player'?Math.PI:0;if(!u.alive){a.play('down');a.elapsed=1;updateActor(a,0);}actors.set(u.id,a);const el=document.createElement('div');el.className='actor-label '+(u.side==='enemy'?'enemy':'');el.dataset.unit=u.id;el.setAttribute('role','img');const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('stroke',u.side==='enemy'?'#e3a18a':'#8fc5ae');line.setAttribute('stroke-width','1');svg.append(line);leaders.set(u.id,line);$('labels').append(el);labels.set(u.id,el);}}
function reset(mode=$('loadout').value){if(isBear&&story){restartChapter();return;}if(graphicsLost||!ready)return;sequence++;auto=false;clearRecovery();session=createSession(content,mode,scenario);rebuildActors();busy=false;action='';$('result').hidden=true;hint('Choose a fighter, then an action. One action each round.');refresh();}

function clearHighlights(){for(const o of [...highlight.children]){o.geometry.dispose();o.material.dispose();highlight.remove(o);}}
function tile(cell,color,opacity=.22){const p=position(cell),m=new T.Mesh(new T.PlaneGeometry(CELL*.9,CELL*.9),new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.copy(p).setY(.025);highlight.add(m);}
function refresh(){
  if(!session||!ready)return;if(graphicsLost||layoutPaused){lockInput();return;}for(const el of document.querySelectorAll('#camera-tools button,#again'))el.disabled=false;if(isBear)$('art-toggle').disabled=busy;if(story){story.render();if(!story.isBattle())return;}const b=session.battle,u=selected(),ended=b.status!=='active',canAct=!busy&&!ended&&u?.alive&&!b.acted.includes(u.id);
  $('round').textContent='ROUND '+String(b.round).padStart(2,'0');$('phase').textContent=busy?'RESOLVING':ended?'COMPLETE':'JADE · YOUR TURN';
  const focused=document.activeElement?.dataset.unitid;$('roster').replaceChildren();
  for(const p of b.players){const el=button('',()=>select(p.id),{'data-unitid':p.id,'aria-pressed':String(p.id===u?.id)});el.innerHTML=`<span class="identity">${unitTag(p)} · ${p.name}<small>${p.equipment==='baseball-bat'?'Bat':p.equipment==='folding-knife'?'Blade':'Handgun'} · ${b.acted.includes(p.id)?'ACTION USED':p.alive?'READY':'DOWN'}</small></span><span class="stats">HP ${p.hp}/${p.maxHp}<br>Guard ${p.guard}</span>`;el.disabled=busy||ended||!p.alive||b.acted.includes(p.id);$('roster').append(el);}
  if(focused)$('roster').querySelector(`[data-unitid="${focused}"]`)?.focus({preventScroll:true});
  for(const el of document.querySelectorAll('[data-action]')){el.disabled=!canAct||(el.dataset.action==='item'&&!u.itemIds.includes('training-bandage'));el.setAttribute('aria-pressed',String(action===el.dataset.action));}
  for(const id of ['end','talk','withdraw','auto','showcase','restart','loadout'])$(id).disabled=busy||(ended&&!['restart','loadout','showcase'].includes(id));
  $('talk').disabled=busy||ended||b.round<2; $('auto').textContent='Auto: '+(auto?'on':'off');$('auto').setAttribute('aria-pressed',String(auto));
  $('choices').replaceChildren();$('choices').hidden=!canAct||!['move','attack'].includes(action);clearHighlights();
  if(canAct&&action==='move')for(const cell of validMoveCells(b,u)){tile(cell,0x8ecbaf);const p=parseSlotKey(cell);$('choices').append(button(`${String.fromCharCode(65+p.lane)}${p.depth+1}`,()=>run('move',cell),{'data-cell':cell,'aria-label':`Move to ${String.fromCharCode(65+p.lane)}${p.depth+1}`}));}
  if(canAct&&action==='attack'){const targets=attackTargets(b,u);for(const target of b.enemies.filter(v=>v.alive)){const valid=targets.some(v=>v.id===target.id),el=button(`${unitTag(target)} · ${target.name} · HP ${target.hp}/${target.maxHp} · G ${target.guard} · ${valid?(target.guard?'break guard':'hit condition'):'out of reach / blocked'}`,()=>run('attack',target.id),{'data-target':target.id});el.disabled=!valid;$('choices').append(el);if(valid)tile(target.cell,0xe9a38b,.30);}}
  for(const p of all()){const el=labels.get(p.id),a=actors.get(p.id);el.classList.toggle('active',p.id===u?.id);el.classList.toggle('down',!p.alive);el.setAttribute('aria-label',`${unitTag(p)} · ${p.name} · ${p.alive?`HP ${p.hp}/${p.maxHp}, guard ${p.guard}`:'down'}`);el.title=el.getAttribute('aria-label');el.innerHTML=`<b>${unitTag(p)}</b><small>${p.alive?`<span>${p.hp}/${p.maxHp}</span><span>G${p.guard}</span>`:'DOWN'}</small>`;a.ring.material.opacity=p.alive?1:.25;a.ring.material.transparent=true;}
  $('log').replaceChildren(...b.log.slice(0,12).map(s=>{const li=document.createElement('li');li.textContent=s;return li;}));
  refreshPolice();
  if(ended&&!busy&&!story){$('result').hidden=false;$('result-title').textContent=({win:'JADE HOLDS THE YARD',loss:'RUST HOLDS THE YARD',withdraw:'CREW WITHDREW',partial:'TRUCE REACHED'})[b.result];$('result-text').textContent=`${b.round} rounds. ${all().filter(v=>!v.alive).length} downed. Training only: no campaign changes.`;}
}

function refreshPolice(){
  const panel=$('police-panel');if(!panel)return;const b=session.battle,pending=policeAwaitingPosture(b);panel.hidden=!pending;if(!pending)return;
  panel.replaceChildren();const title=document.createElement('h3');title.textContent='POLICE AT THE '+(b.policeEntryDepth===0?'CREW’S':'OPPOSITION’S')+' END';
  const text=document.createElement('p'),fallen=b.players.filter(u=>!u.alive);text.textContent='The fight stops for your answer. '+(fallen.length?`${fallen.length} crew down. Backing off leaves them behind. Helping may cost the rescuer too.`:'Your crew is still standing. Clear the park before anyone is taken.');
  panel.append(title,text,button('Back off',()=>run('police','BACK_OFF'),{'data-police':'BACK_OFF'}),button('Help your friends',()=>run('police','HELP_FRIENDS'),{'data-police':'HELP_FRIENDS'}));
  for(const el of document.querySelectorAll('[data-action],#end,#talk,#withdraw,#auto'))el.disabled=true;
  for(const el of panel.querySelectorAll('button'))el.disabled=busy||graphicsLost||layoutPaused;
  $('choices').hidden=true;clearHighlights();
}

function select(id){if(story&&!story.isBattle())return;if(busy||graphicsLost||layoutPaused||!ready)return;session.command('select',id);action='';hint('Choose Attack, Move, Brace or Bandage.');refresh();}
function choose(name){if(story&&!story.isBattle())return;if(busy||graphicsLost||layoutPaused||!ready||session.battle.status!=='active')return;if(['brace','item'].includes(name)){run(name);return;}action=action===name?'':name;hint(name==='move'?'Tap a green cell, or choose its coordinate below. Reposition spends this action.':'Choose a highlighted opponent. Cover and weapon lanes determine reach.');refresh();}
function tween(seconds,fn){const ticket=sequence;let elapsed=0;return new Promise((resolve,reject)=>{let last=performance.now();function tick(now){if(ticket!==sequence||graphicsLost){reject(new Interrupted());return;}const dt=hidden||layoutPaused?0:Math.min(.05,(now-last)/1000);last=now;elapsed+=dt;fn(Math.min(1,elapsed/seconds));if(elapsed<seconds)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});}
async function moveVisual(id,to){const a=actors.get(id),from=a.group.position.clone(),dest=typeof to==='string'?position(to):to;const d=dest.clone().sub(from);if(d.length()<.01)return;a.group.rotation.y=Math.atan2(d.x,d.z);a.play('walk');const duration=a.bakedMotion?Math.max(.5,d.length()/1.45):Math.min(1.3,Math.max(.5,d.length()*.2));a.bakedMotion?.setWalkSpeed(d.length()/duration);await tween(duration,t=>a.group.position.lerpVectors(from,dest,t));a.play('idle');}
async function gesture(id,mode,duration=.75){const a=actors.get(id);a.play(mode,duration);await tween(duration,()=>{});if(mode!=='down')a.play('idle');}
function spark(at){const g=new T.Group();world.add(g);for(let i=0;i<8;i++){const o=new T.Mesh(new T.BoxGeometry(.027,.027,.027),new T.MeshBasicMaterial({color:i%2?0xd8c090:0xb7c6ae}));g.add(o);}tween(.3,t=>g.children.forEach((o,i)=>{o.position.copy(at).add(new T.Vector3(Math.sin(i*4)*t*.45,Math.sin(t*Math.PI)*.4,Math.cos(i*4)*t*.45));})).catch(e=>{if(!(e instanceof Interrupted))console.error(e);}).finally(()=>{g.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});g.removeFromParent();});}
async function attackVisual(id,targetId){const a=actors.get(id),target=actors.get(targetId);if(!a||!target)return;const home=a.group.position.clone(),goal=target.group.position.clone(),d=goal.clone().sub(home).normalize(),ranged=a.unit.equipment.includes('handgun');a.group.rotation.y=Math.atan2(d.x,d.z);
  if(!ranged&&home.distanceTo(goal)>1.2)await moveVisual(id,goal.clone().addScaledVector(d,-.92));
  a.play(ranged?'shoot':'strike',.85);await tween(.4,()=>{});spark(goal.clone().setY(1.15));target.play('hit',.45);await tween(.45,()=>{});target.play('idle');a.play('idle');
  if(!ranged&&a.group.position.distanceTo(home)>.01)await moveVisual(id,home);
}
async function present(record){
  const {type,actor,value,before,after,events}=record;
  if(type==='move')await moveVisual(actor,value);
  else if(type==='attack')await attackVisual(actor,value);
  else if(['brace','item'].includes(type))await gesture(actor,type);
  else if(type==='talk')await Promise.all(session.battle.players.filter(u=>u.alive).map(u=>gesture(u.id,'talk')));
  else if(type==='withdraw')await Promise.all(session.battle.players.filter(u=>u.alive).map(u=>moveVisual(u.id,actors.get(u.id).group.position.clone().add(new T.Vector3(0,0,2.2)))));
  else if(['end','auto'].includes(type)&&events.length){for(const e of events){if(e.type==='move')await moveVisual(e.id,e.to);else if(e.type==='attack')await attackVisual(e.id,e.target);else await gesture(e.id,'brace');}}
  else if(type==='auto'){for(const next of after.units){const old=before.units.find(v=>v.id===next.id);if(old.cell!==next.cell)await moveVisual(next.id,next.cell);}for(const next of after.units){const old=before.units.find(v=>v.id===next.id);if(old.hp>next.hp||old.guard>next.guard)await gesture(next.id,'hit',.4);}}
  for(const next of after.units){const old=before.units.find(v=>v.id===next.id);if(old.alive&&!next.alive)await gesture(next.id,'down',.7);}
  for(const u of all()){if(!u.alive)continue;const a=actors.get(u.id);if(type!=='withdraw')a.group.position.copy(position(u.cell));a.group.rotation.y=u.side==='player'?Math.PI:0;}
}
async function run(type,value){if(story&&!story.isBattle())return;if(busy||graphicsLost||layoutPaused||!ready)return;if(type==='police')auto=false;const result=session.command(type,value);if(!result.ok){hint(result.message||'That action is not available yet.');return;}const ticket=sequence;saveStory();busy=true;action='';refresh();try{await present(result.record);}catch(e){if(!(e instanceof Interrupted))throw e;}if(ticket!==sequence||graphicsLost)return;busy=false;if(story&&session.battle.status!=='active')story.complete(session.result());saveStory();hint(session.battle.log[0]);refresh();if(auto&&session.battle.status==='active')autoTimer=setTimeout(()=>{if(auto&&!busy&&ticket===sequence)run('auto');},600);}
async function showcase(){if(busy||graphicsLost||layoutPaused||!ready)return;const ticket=sequence;auto=false;busy=true;action='';refresh();const starts=new Map([...actors].map(([id,a])=>[id,a.group.position.clone()])),baked=[...actors.values()].every(a=>a.bakedMotion);try{for(const mode of ['idle','walk','strike','shoot','brace','item','talk','hit','grip','down']){hint(`ACTION REHEARSAL · ${mode.toUpperCase()} · ${baked?'Blender motion candidate':['idle','walk'].includes(mode)?'own-character clip':'prototype gesture'}`);if(mode==='walk'&&baked){const headings=new Map([...actors].map(([id,a])=>[id,a.group.rotation.y]));await Promise.all([...actors].map(([id,a])=>moveVisual(id,starts.get(id).clone().add(new T.Vector3(0,0,1).applyQuaternion(a.group.quaternion).multiplyScalar(.9)))));await Promise.all([...actors].map(([id])=>moveVisual(id,starts.get(id))));for(const [id,a] of actors)a.group.rotation.y=headings.get(id);continue;}for(const a of actors.values()){a.down=false;a.play(mode,1.15);}await tween(1.15,t=>{if(mode==='walk')for(const [id,a] of actors)a.group.position.copy(starts.get(id)).add(new T.Vector3(.45*Math.sin(t*Math.PI),0,0));});}}catch(e){if(!(e instanceof Interrupted))throw e;}if(ticket!==sequence||graphicsLost)return;reset();hint('Rehearsal complete. Fresh battle ready.');}

for(const el of document.querySelectorAll('[data-action]'))activate(el,()=>choose(el.dataset.action));
activate($('end'),()=>run('end'));activate($('talk'),()=>run('talk'));activate($('withdraw'),()=>run('withdraw'));activate($('auto'),()=>{if(graphicsLost||!ready)return;auto=!auto;refresh();if(auto&&!busy)run('auto');});activate($('restart'),()=>reset());activate($('again'),()=>reset());activate($('showcase'),showcase);$('loadout').addEventListener('change',()=>reset());activate($('help'),()=>$('help-dialog').showModal());
activate($('download'),()=>{const blob=new Blob([JSON.stringify(story?{...story.result(),battle:session.result()}:session.result(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='piritori-fight-module-result.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
function showArtStyle(){const label=artStyle==='ink'?'Ink & Stone':'Cold Street';$('art-toggle').textContent=label+' ↔';$('art-toggle').setAttribute('aria-label',label+': switch art direction');document.body.dataset.look=artStyle;}
if(isBear)activate($('art-toggle'),()=>{if(busy||graphicsLost||layoutPaused||!ready)return;artStyle=artStyle==='ink'?'cold':'ink';stage.setStyle(artStyle);showArtStyle();try{localStorage.setItem(ART_SAVE,artStyle);const url=new URL(location.href);url.searchParams.set('look',artStyle);history.replaceState(null,'',url);}catch{}});
activate($('rotate'),()=>{angle+=Math.PI/4;fit();});activate($('zoomout'),()=>{zoom=Math.max(.7,zoom-.15);fit();});activate($('zoomin'),()=>{zoom=Math.min(1.7,zoom+.15);fit();});activate($('resetcam'),()=>{angle=.65;zoom=1;fit();});
function boardTap(x,y){if(busy||graphicsLost||layoutPaused||!ready)return;const rect=canvas.getBoundingClientRect(),p=new T.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(p,camera);if(action==='move'){const at=new T.Vector3();if(ray.ray.intersectPlane(ground,at))run('move',`${Math.round(at.x/CELL+(LANES-1)/2)},${Math.round(3.5-at.z/CELL)}`);return;}const hit=ray.intersectObjects([...actors.values()].map(a=>a.body),true)[0];if(!hit)return;let node=hit.object;while(node&&!node.userData.unitId)node=node.parent;if(!node)return;const u=all().find(v=>v.id===node.userData.unitId);if(story&&!story.isBattle()){story.tapActor(u.id);return;}if(u.side==='player')select(u.id);else if(action==='attack')run('attack',u.id);else hint('Choose Attack first, then a highlighted opponent.');}
let down=null,lastTap=0;canvas.addEventListener('pointerdown',e=>{if(graphicsLost||layoutPaused||!ready)return;down={id:e.pointerId,x:e.clientX,y:e.clientY,angle};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(down&&down.id===e.pointerId&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>9){angle=down.angle+(e.clientX-down.x)*.006;fit();}});canvas.addEventListener('pointerup',e=>{if(!down)return;const tap=Math.hypot(e.clientX-down.x,e.clientY-down.y)<9;down=null;lastTap=performance.now();if(tap)boardTap(e.clientX,e.clientY);});canvas.addEventListener('pointercancel',()=>{down=null;});canvas.addEventListener('touchend',e=>{if(performance.now()-lastTap<300)return;const t=e.changedTouches[0];if(t&&!down){e.preventDefault();boardTap(t.clientX,t.clientY);}},{passive:false});canvas.addEventListener('wheel',e=>{e.preventDefault();if(graphicsLost||layoutPaused||!ready)return;zoom=T.MathUtils.clamp(zoom-e.deltaY*.001,.7,1.7);fit();},{passive:false});
window.addEventListener('keydown',e=>{if(graphicsLost||layoutPaused||!ready)return;if($('help-dialog').open)return;if(story?.key(e.key))return;if(e.key==='Escape'){action='';refresh();return;}if(e.target.matches('select,input')||(e.key==='Enter'&&e.target.matches('button,a,summary')))return;const key=e.key.toLowerCase();if(key==='1'||key==='2')select(session.battle.players[Number(key)-1].id);if({a:'attack',m:'move',b:'brace',i:'item'}[key])choose({a:'attack',m:'move',b:'brace',i:'item'}[key]);if(e.key==='Enter'){e.preventDefault();run('end');}});
let padPrevious=[],padAt=0;function controller(now){if(layoutPaused)return;const p=navigator.getGamepads?.()[0];if(!p)return;const fresh=i=>p.buttons[i]?.pressed&&!padPrevious[i];const controls=[...document.querySelectorAll('button,select,summary,a')].filter(e=>!e.disabled&&e.getClientRects().length&&!e.closest('[hidden]')&&(!$('help-dialog').open||e.closest('dialog')));if(now-padAt>170&&(fresh(13)||fresh(15)||fresh(12)||fresh(14))){const step=fresh(13)||fresh(15)?1:-1,index=controls.indexOf(document.activeElement);controls[(index+step+controls.length)%controls.length]?.focus();padAt=now;}if(fresh(0))document.activeElement?.click();if(fresh(1)){if($('help-dialog').open)$('help-dialog').close();else{story?.key('Escape');action='';refresh();}}if(fresh(6)||fresh(7)){zoom=T.MathUtils.clamp(zoom+(fresh(7)?.15:-.15),.7,1.7);fit();}padPrevious=p.buttons.map(v=>v.pressed);}
matchMedia('(orientation:landscape)').addEventListener('change',()=>{
  if(!ready)return;layoutPaused=true;down=null;clearTimeout(reflowTimer);clearTimeout(autoTimer);refresh();
  reflowTimer=setTimeout(()=>{layoutPaused=false;fit();previous=performance.now();refresh();if(auto&&!busy&&!graphicsLost)run('auto');},280);
});
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;previous=performance.now();frameCount=seconds=0;if(hidden){cancelAnimationFrame(raf);raf=0;}else queueFrame();});
activate($('reload-graphics'),()=>{if(graphicsLost){const stored=saveRecovery();$('loading-detail').textContent=stored?'Reloading the saved turn…':'This browser cannot retain the turn across a reload.';location.reload();}});
function bindGraphicsRecovery(){
  // Registered AFTER Three's listeners: Three rebuilds its GL resources first.
  canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();if(graphicsLost)return;graphicsLost=true;losses++;sequence++;auto=false;busy=true;down=null;cancelAnimationFrame(raf);raf=0;
    const stored=saveRecovery();lockInput();$('result').hidden=true;$('labels').hidden=true;
    loading('Graphics paused. Restoring the scene…');$('loading-detail').textContent=stored?'Your current turn is saved in this tab.':'Your current turn is held while this page stays open.';
    $('reload-graphics').hidden=true;clearTimeout(recoveryTimer);recoveryTimer=setTimeout(()=>{if(graphicsLost){loading('The browser has not restored graphics yet.');$('reload-graphics').textContent=stored?'Reload saved fight':'Reload game';$('reload-graphics').hidden=false;}},5000);
  });
  canvas.addEventListener('webglcontextrestored',()=>{
    clearTimeout(recoveryTimer);graphicsLost=false;recoveries++;profile=renderProfile({touch,recovered:true});low=true;
    if(templates)for(const template of templates.values())limitTextures(template.scene,profile.textureSize);
    if(cameraPullback){zoom=1;cameraPullback=false;}applyProfile();previous=performance.now();frameCount=seconds=0;
    if(ready){rebuildActors();resumeGraphics();}
  });
}
function resumeGraphics(){busy=false;action='';if(story?.isBattle()&&session.battle.status!=='active')story.complete(session.result());saveStory();$('labels').hidden=false;$('loading').hidden=true;$('reload-graphics').hidden=true;for(const el of document.querySelectorAll('#camera-tools button,#again'))el.disabled=false;refresh();clearRecovery();hint('Graphics restored. Your turn is unchanged; lighter rendering is active.');queueFrame();}
let previous=performance.now();
function tick(now){raf=0;if(hidden||graphicsLost||!ready)return;queueFrame();const real=Math.max(0,(now-previous)/1000);if(real<1/profile.fps-.001)return;previous=now;const dt=Math.min(.05,real);for(const a of actors.values())updateActor(a,layoutPaused?0:dt);if(!story||story.isBattle())layoutTags();story?.layout();stage?.tick?.(layoutPaused||matchMedia('(prefers-reduced-motion: reduce)').matches?0:dt);renderer.render(world,camera);edgeSmoothing.render(profile.edgeSmoothing);controller(now);frameCount++;seconds+=real;if(seconds>2){fps=Math.round(frameCount/seconds);if(fps<22&&!low){low=true;profile=renderProfile({touch:true});applyProfile();}$('perf').textContent=`${isBear?'C.08':'C.06'} · ${fps} FPS · ${renderer.info.render.calls} draws · ${profile.name}`;frameCount=0;seconds=0;}}
async function boot(){
  let saved;try{saved=JSON.parse(sessionStorage.getItem(RECOVERY_KEY));}catch{}if(!saved&&isBear){try{saved=JSON.parse(localStorage.getItem(STORY_SAVE));}catch{}}if(saved)profile=renderProfile({recovered:true});
  [content,manifest]=await Promise.all(['../../content/era1-slice-v1.json','../../art/v3/manifest.json?v=8'].map(p=>fetch(p).then(r=>{if(!r.ok)throw Error('Data failed '+r.status);return r.json();})));
  session=createSession(content,isBear?'melee':'mixed',scenario);let restored=false;if(saved){try{session=restoreSession(content,saved.fight);if(session.scenario!==scenario)throw Error('Wrong scene save');angle=Number.isFinite(saved.angle)?saved.angle:.65;zoom=T.MathUtils.clamp(Number.isFinite(saved.zoom)?saved.zoom:1,.7,1.7);restored=true;}catch{clearRecovery();saved=null;session=createSession(content,isBear?'melee':'mixed',scenario);}}
  if(isBear&&saved){try{if(!saved.story)throw Error('Incomplete scene save');const state=createEncounter(content,saved.story).state;if(state.phase!=='battle'&&state.choice!=='hold-path'&&session.history.length)throw Error('Mismatched scene save');if(state.phase==='aftermath'&&state.choice==='hold-path'&&session.battle.status==='active')throw Error('Mismatched outcome');if(saved.pullback)zoom=1;}catch{saved=null;restored=false;session=createSession(content,'melee',scenario);clearRecovery();try{localStorage.removeItem(STORY_SAVE);}catch{}}}
  $('loadout').value=session.mode;[templates,parkAssets]=await Promise.all([loadFighters(manifest,profile),isBear?loadParkAssets(manifest,profile):null]);buildStage();for(const template of templates.values())limitTextures(template.scene,profile.textureSize);rebuildActors();ready=true;
  if(isBear){
    story=mountBearPath({content,renderer,world,stage,actors:()=>actors,project,fit,position,
      battle:()=>session.battle,locked:()=>busy||graphicsLost||layoutPaused,save:saveStory,restart:restartChapter,
      beginBattle:async()=>{const cameraTicket=sequence;cameraPullback=true;busy=true;refresh();saveStory();const from=zoom;try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await tween(.65,t=>{zoom=T.MathUtils.lerp(from,1,t*t*(3-2*t));fit();});else{zoom=1;fit();}}catch(e){if(!(e instanceof Interrupted))throw e;}if(cameraTicket===sequence&&!graphicsLost){cameraPullback=false;busy=false;refresh();saveStory();}},
      calmAftermath:()=>{for(const a of actors.values())if(a.unit.alive)a.play('idle');}
    },saved?.story);
    window.bearPath={snapshot:()=>story.checkpoint(),result:()=>story.result()};
    if(!saved){zoom=1.22;fit();}
  }
  window.fightModule={snapshot:()=>session.snapshot(),view:()=>({frame:frameInfo,points:all().map(u=>({id:u.id,head:project(actors.get(u.id).group.position.clone().add(new T.Vector3(0,2.15,0))),feet:project(actors.get(u.id).group.position)})),cells:Array.from({length:LANES*totalRows()},(_,i)=>{const cell=`${i%LANES},${Math.floor(i/LANES)}`;return {cell,...project(position(cell)),head:project(position(cell).setY(2.3))};})}),metrics:()=>({scenario,environment:stage.metrics?.(),story:story?.checkpoint().state,layoutPaused,fps,edgeSmoothing:edgeSmoothing.metrics(),draws:renderer.info.render.calls,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,models:actors.size,bones:[...actors.values()].map(a=>a.bones.size),busy,graphicsLost,losses,recoveries,profile:profile.name,pixelRatio:renderer.getPixelRatio(),drawingBuffer:[canvas.width,canvas.height],shadows:renderer.shadowMap.enabled,antialias:renderer.getContextAttributes()?.antialias,textureSizes:[...templates.values()].map(t=>{const sizes=new Set();t.scene.traverse(n=>{for(const mat of [].concat(n.material||[]))for(const v of Object.values(mat))if(v?.isTexture)sizes.add(v.image?.width+'x'+v.image?.height);});return [...sizes];}),mode:session.mode,history:session.history.map(r=>({type:r.type,actor:r.actor,value:r.value})),finite:[...actors.values()].every(a=>[...a.bones.values()].every(b=>b.matrixWorld.elements.every(Number.isFinite)))})};
  if(graphicsLost){lockInput();return;}if(recoveries){resumeGraphics();return;}busy=false;if(story?.isBattle()&&session.battle.status!=='active')story.complete(session.result());refresh();$('loading').hidden=true;clearRecovery();saveStory();if(restored)hint('Saved turn restored. Lighter rendering is active.');previous=performance.now();frameCount=seconds=0;queueFrame();
}
boot().catch(e=>{loading('Unable to load fight: '+e.message);lockInput();console.error(e);});
