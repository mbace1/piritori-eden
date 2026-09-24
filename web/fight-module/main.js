import {fighterLabel} from './readability.js?v=1';
import {gunView,blendGunView} from './aim-camera.js?v=2';
import {loadLocationAssets,buildLocation,locationId} from '../crew-run/locations.js?v=3';
import {mountCrew} from '../crew-run/ui.js?v=10';
import {portraitStudio} from '../crew-run/portraits.js?v=2';
import {EDGES,coverEdges} from './cover-edges.js?v=2';
import * as T from 'three';
import {createSession,checkpoint,restoreSession} from './session.js?v=13';
import {loadFighters,makeActor,updateActor,disposeActor} from './actors.js?v=9';
import {attackTargets,validMoveCells,coverStandingLine,policeAwaitingPosture} from './resolver.js?v=4';
import {LANES,totalRows,parseSlotKey} from '../js/v3/grid.js?v=2';
import {renderProfile,pixelRatioFor,limitTextures} from './render-profile.js?v=3';
import {createEdgeSmoothing} from './edge-smoothing.js?v=2';
import {buildNightCourtyard} from './environment.js?v=2';
import {buildKarhupuisto} from '../bear-path/park.js?v=12';
import {loadParkAssets} from '../bear-path/assets.js?v=2';
import {createEncounter} from '../bear-path/encounter.js?v=2';
import {mountBearPath} from '../bear-path/presentation.js?v=5';
import {fitBattleCamera,placeLabels} from './framing.js?v=3';
import {tacticalUI} from './tactical-ui.js?v=10';
import {routes} from './tactics.js?v=7';
import {createFrameClock,createPresentationClock} from './frame-clock.js?v=2';

const isCrew=document.body.dataset.scenario==='crew-run';
let crew=null;const arenaId=locationId();let locationAssets=null,cameraPreset='tactical';
const isLab=isCrew||document.body.dataset.scenario==='arena-lab',isBear=document.body.dataset.scenario==='bear-path',isPark=isBear||isLab;
const labCount=[2,6,12].includes(Number(new URLSearchParams(location.search).get('actors')))?Number(new URLSearchParams(location.search).get('actors')):6;
if(isLab)document.body.dataset.labCount=labCount;
const scenario=isLab?'lab-'+labCount:isBear?'bear-path':'training';
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
let fullLabels=false;
try{fullLabels=localStorage.getItem('piritori-c19-labels')==='full';}catch{}
const frameClock=createFrameClock(performance.now()),tagPositions=new Map();
let tagsDirty=true,sceneDirty=true,labelLayouts=0,renderedFrames=0,actorList=[];
document.fonts?.addEventListener('loadingdone',()=>{tagsDirty=true;});
const RECOVERY_KEY=isCrew?'piritori-c12-graphics':isLab?'piritori-arena-lab-c11-'+labCount:isBear?'piritori-bear-path-graphics-v1':'piritori-fight-c05-recovery';
const touch=navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches;
const safeGraphics=isCrew&&new URLSearchParams(location.search).get('graphics')==='safe';
let renderError='';
const frameSize=new T.Vector2();
let profile=renderProfile({touch}),graphicsLost=false,graphicsPreparing=false,preparationMs=0,ready=false,raf=0,losses=0,recoveries=0,recoveryTimer=0;
const presentationClocks=new Set();
function pausePresentations(){const now=performance.now();for(const clock of presentationClocks)clock.pause(hidden||layoutPaused,now);}
class Interrupted extends Error {}
function loading(message){$('loading-message').textContent=message;$('loading').hidden=false;}
function saveRecovery(){crew?.persist();try{sessionStorage.setItem(RECOVERY_KEY,JSON.stringify({fight:checkpoint(session),story:story?.checkpoint(),angle,zoom,pullback:cameraPullback}));return true;}catch{return false;}}
function saveStory(){if(!isBear||!story)return;try{localStorage.setItem(STORY_SAVE,JSON.stringify({fight:checkpoint(session),story:story.checkpoint(),angle,zoom,pullback:cameraPullback}));}catch{}}
function restartChapter(){try{localStorage.removeItem(STORY_SAVE);sessionStorage.removeItem(RECOVERY_KEY);}catch{}location.reload();}
function clearRecovery(){try{sessionStorage.removeItem(RECOVERY_KEY);}catch{}}
function lockInput(){const crewLock=graphicsLost||graphicsPreparing?',#crew-screen button,#crew-screen select':'';for(const el of document.querySelectorAll('#panel button,#panel select,#camera-tools button,#art-toggle,#again'+crewLock))el.disabled=true;}
function queueFrame(){if(!raf&&!hidden&&!graphicsLost&&ready)raf=requestAnimationFrame(tick);}
function applyProfile(){renderer.shadowMap.enabled=profile.shadows;if(templates)for(const template of templates.values())limitTextures(template.scene,profile.textureSize);fit();}
const CELL=1.17,position=cell=>{const p=parseSlotKey(cell);return new T.Vector3((p.lane-(LANES-1)/2)*CELL,0,(3.5-p.depth)*CELL);};
const all=()=>session.battle.players.concat(session.battle.enemies),selected=()=>session.battle.players.find(u=>u.id===session.battle.selectedId);
const hint=text=>$('hint').textContent=text;
const labUI=isLab?tacticalUI({getSession:()=>session,button,tile,edgeMark,intentLine:isCrew?intentLine:null,run,hint,refresh,aim:toggleAim,isAiming:()=>actionFocus?.kind==='gun',cancelAim:()=>{cancelFocus();fit();}}):null;
function activate(el,fn){let last=-1000;for(const name of ['pointerup','touchend','click'])el.addEventListener(name,e=>{if(el.disabled||name==='click'&&e.detail!==0)return;e.preventDefault();if(performance.now()-last<260)return;last=performance.now();fn();});}
function button(text,fn,attrs={}){const b=document.createElement('button');b.textContent=text;for(const [k,v] of Object.entries(attrs))b.setAttribute(k,v);activate(b,fn);return b;}
function buildStage(){
  world=new T.Scene();
  renderer=new T.WebGLRenderer({canvas,context:canvas.__piritoriGL||undefined,antialias:profile.antialias,powerPreference:'default',alpha:false,stencil:false});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=profile.shadows;renderer.shadowMap.type=T.PCFSoftShadowMap;
  edgeSmoothing=createEdgeSmoothing(renderer);
  camera=new T.OrthographicCamera(-5,5,5,-5,.1,60);ray=new T.Raycaster();ground=new T.Plane(new T.Vector3(0,1,0),0);highlight=new T.Group();world.add(highlight);
  stage=isCrew&&arenaId!=='park'?buildLocation(world,renderer,session.battle.cover,position,locationAssets,arenaId):isPark?buildKarhupuisto(world,renderer,session.battle.cover,position,parkAssets,artStyle,isLab,isCrew):buildNightCourtyard(world,renderer,session.battle.cover,position);
  if(isCrew)crew.setPortraitSource(portraitStudio(renderer));
  if(isBear)showArtStyle();
  bindGraphicsRecovery();fit();new ResizeObserver(fit).observe(area);
}
function drawScene(){
  if(!(isCrew&&safeGraphics))stage?.beforeRender?.(camera);
  renderer.setRenderTarget(null);renderer.setScissorTest(false);renderer.getSize(frameSize);renderer.setViewport(0,0,frameSize.x,frameSize.y);
  renderer.render(world,camera);
  // Avoid the default-framebuffer copy on the crew track. Its failure can
  // replace a valid scene with black without producing a JavaScript exception.
  edgeSmoothing.render(profile.edgeSmoothing&&!isCrew);
}
function fit(){
  tagsDirty=true;sceneDirty=true;
  if(!renderer)return;const w=Math.max(1,area.clientWidth),h=Math.max(1,area.clientHeight);
  if(!graphicsLost){const ratio=pixelRatioFor(profile,w,h,devicePixelRatio);if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);if(canvas.width!==Math.floor(w*ratio)||canvas.height!==Math.floor(h*ratio))renderer.setSize(w,h,false);}
  frameInfo=fitBattleCamera(camera,{width:w,height:h,angle,zoom:zoom*(1+(actionFocus?.kind==='gun'?0:actionFocus?.strength||0)*.12),lanes:LANES,rows:totalRows(),cell:CELL,tight:isCrew,elevation:cameraPreset==='overhead'?30:cameraPreset==='oblique'?7:10});
  if(actionFocus?.kind==='gun'){const shot=gunView(camera,{...actionFocus,width:w,height:h,angle});blendGunView(camera,shot,actionFocus.strength);frameInfo.span=camera.top-camera.bottom;}
  else if(actionFocus){const shift=actionFocus.center.clone().multiplyScalar(actionFocus.strength*.18);camera.position.add(shift);camera.lookAt(shift.clone().setY(.55));camera.updateMatrixWorld();}stage?.update(camera,actorList,actionFocus?.kind==='gun'?actionFocus:null);updateFocusButton();
}
const unitTag=u=>u.label||((u.side==='player'?'J':'R')+(u.modelId.includes('f02')||u.id.includes('f02')?'2':'1'));
function project(at){const p=at.clone().project(camera);return {x:(p.x+1)*area.clientWidth/2,y:(1-p.y)*area.clientHeight/2};}
function layoutTags(){
  // Standing bodies keep the same tag anchors. Avoid DOM measurements and the
  // collision search until camera/layout, label content or an actor changes.
  let changed=tagsDirty;
  for(const a of actorList){const p=a.group.position,old=tagPositions.get(a.id);
    if(!old||old.x!==p.x||old.y!==p.y||old.z!==p.z||old.down!==a.down)changed=true;
  }
  if(!changed)return;
  tagsDirty=false;labelLayouts++;
  for(const a of actorList){const p=a.group.position;let old=tagPositions.get(a.id);
    if(!old){old={};tagPositions.set(a.id,old);}Object.assign(old,{x:p.x,y:p.y,z:p.z,down:a.down});
  }
  const rect=area.getBoundingClientRect(),w=rect.width,h=rect.height;
  const obstacles=['roundbar','camera-tools','perf',...(isBear?['art-toggle']:[])].map(id=>{const b=$(id).getBoundingClientRect();return {x:b.x-rect.x,y:b.y-rect.y,width:b.width,height:b.height};}).filter(b=>b.y+b.height>0&&b.y<h&&b.x+b.width>0&&b.x<w);
  const focusIds=actionFocus?.kind==='gun'&&actionFocus.strength>.9?[actionFocus.id,actionFocus.target]:null;
  for(const u of all()){const visible=!focusIds||focusIds.includes(u.id);labels.get(u.id).style.visibility=visible?'':'hidden';leaders.get(u.id).style.visibility=visible?'':'hidden';}
  const items=all().filter(u=>!u.waiting&&!u.evacuated&&(!focusIds||focusIds.includes(u.id))).map(u=>{const a=actors.get(u.id),el=labels.get(u.id),head=project(a.group.position.clone().add(new T.Vector3(0,a.down?.45:2.15,0))),feet=project(a.group.position),radius=Math.max(8,h/frameInfo.span*.32);return {id:u.id,anchor:head,width:el.offsetWidth,height:el.offsetHeight,body:isLab&&labCount>6?null:{x:feet.x-radius,y:head.y+4,width:radius*2,height:Math.max(0,feet.y-head.y-4)}};});
  if(isCrew){const el=labels.get('@exit'),line=leaders.get('@exit');el.hidden=!!focusIds;line.style.display=focusIds?'none':'';if(!focusIds){const anchor=project(position('2,0').lerp(position('3,0'),.5).setY(.12));items.push({id:'@exit',anchor,width:el.offsetWidth,height:el.offsetHeight,body:null});}}
  for(const item of placeLabels(items,w,h,obstacles)){const el=labels.get(item.id),line=leaders.get(item.id);el.style.transform=`translate(${item.x}px,${item.y}px)`;const lx=Math.max(item.x+4,Math.min(item.x+item.width-4,item.anchor.x)),ly=item.y+item.height;line.setAttribute('x1',lx);line.setAttribute('y1',ly);line.setAttribute('x2',Math.max(2,Math.min(w-2,item.anchor.x)));line.setAttribute('y2',Math.max(2,Math.min(h-2,item.anchor.y)));line.setAttribute('opacity',Math.hypot(lx-item.anchor.x,ly-item.anchor.y)>11?'.72':'.35');}
}
function replaceCrewSession(next){sequence++;cancelFocus();auto=false;session=next;busy=false;action='';hint('');labUI?.cancel();if(ready){rebuildActors();fit();refresh();}}
function rebuildActors(){tagsDirty=true;tagPositions.clear();for(const a of actors.values())disposeActor(a);actors.clear();$('labels').replaceChildren();labels.clear();leaders.clear();const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('label-leaders');svg.setAttribute('aria-hidden','true');$('labels').append(svg);for(const u of all()){const a=makeActor(isLab?{placeholder:true}:templates.get(u.modelId),u,world);a.group.position.copy(position(u.cell));a.group.visible=!u.waiting&&!u.evacuated;a.group.rotation.y=u.side==='player'?Math.PI:0;if(isLab)coverStance(a,u.cell);if(!u.alive){a.play('down');a.elapsed=1;updateActor(a,0);}actors.set(u.id,a);const el=document.createElement('div');el.className='actor-label '+(u.side==='enemy'?'enemy':'');el.dataset.unit=u.id;el.hidden=!!(u.waiting||u.evacuated);el.setAttribute('role','img');const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('stroke',u.side==='enemy'?'#e3a18a':'#8fc5ae');line.setAttribute('stroke-width','1');svg.append(line);leaders.set(u.id,line);$('labels').append(el);labels.set(u.id,el);}
  if(isCrew){const el=document.createElement('div');el.id='exit-marker';el.className='exit-marker';el.setAttribute('role','img');el.textContent='EXIT · A1–F1';const cost=document.createElement('small');cost.textContent='EXTRACT · 1 ACTION';el.append(cost);el.setAttribute('aria-label','South exit A1 to F1. Extract each fighter here for one Action.');$('labels').append(el);labels.set('@exit',el);const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('stroke','#b6e1d9');line.setAttribute('stroke-width','1.5');svg.append(line);leaders.set('@exit',line);}
  actorList=[...actors.values()];}
function reset(mode=$('loadout').value){if(isCrew)return;if(isBear&&story){restartChapter();return;}if(graphicsLost||graphicsPreparing||!ready)return;sequence++;cancelFocus();fit();auto=false;clearRecovery();session=createSession(content,mode,scenario);rebuildActors();busy=false;action='';labUI?.cancel();$('result').hidden=true;hint(isLab?'Move + Act in either order. Inspect a destination or attack before confirming.':'Choose a fighter, then an action. One action each round.');refresh();}

function clearHighlights(){for(const o of [...highlight.children]){o.geometry.dispose();o.material.dispose();highlight.remove(o);}}
function tile(cell,color,opacity=.22){const p=position(cell),m=new T.Mesh(new T.PlaneGeometry(CELL*.9,CELL*.9),new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.copy(p).setY(isCrew?.065:.025);highlight.add(m);
  if(isCrew){const h=CELL*.45,outline=new T.LineLoop(new T.BufferGeometry().setFromPoints([new T.Vector3(-h,0,-h),new T.Vector3(h,0,-h),new T.Vector3(h,0,h),new T.Vector3(-h,0,h)]),new T.LineBasicMaterial({color,transparent:true,opacity:.95,depthWrite:false,fog:false,toneMapped:false}));outline.position.copy(m.position).y+=.008;highlight.add(outline);}
}
function intentLine(from,to,color=0xc87563){
  const a=position(from).setY(.10),b=position(to).setY(.10);if(a.distanceTo(b)<.1)return;
  const direction=b.clone().sub(a).normalize(),end=b.clone().addScaledVector(direction,-.23),start=a.clone().addScaledVector(direction,.3);
  const line=new T.Line(new T.BufferGeometry().setFromPoints([start,end]),new T.LineDashedMaterial({color,dashSize:.16,gapSize:.12,transparent:true,opacity:.85,depthWrite:false,toneMapped:false}));line.computeLineDistances();highlight.add(line);
  const side=new T.Vector3(-direction.z,0,direction.x),tip=end.clone().addScaledVector(direction,.14),back=end.clone().addScaledVector(direction,-.12),v=[tip,back.clone().addScaledVector(side,.09),back.clone().addScaledVector(side,-.09)];
  const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(v.flatMap(p=>p.toArray()),3));highlight.add(new T.Mesh(geometry,new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.9,depthWrite:false,toneMapped:false})));
}
function refresh(){
  tagsDirty=true;sceneDirty=true;document.body.classList.toggle('resolving',busy);
  if(!session||!ready)return;if(isCrew)$('crew-picker').disabled=busy||graphicsLost||layoutPaused;if(graphicsLost||graphicsPreparing||layoutPaused){lockInput();return;}for(const el of document.querySelectorAll('#camera-tools button,#again'))el.disabled=false;if(isBear)$('art-toggle').disabled=busy;if(story){story.render();if(!story.isBattle())return;}const b=session.battle,u=selected(),ended=b.status!=='active',canAct=!busy&&!ended&&u?.alive&&!b.acted.includes(u.id);
  $('round').textContent='ROUND '+String(b.round).padStart(2,'0');$('phase').textContent=busy?'RESOLVING':ended?'COMPLETE':'JADE · YOUR TURN';
  const focused=document.activeElement?.dataset.unitid;$('roster').replaceChildren();
  for(const p of b.players){const el=button('',()=>select(p.id),{'data-unitid':p.id,'aria-pressed':String(p.id===u?.id)});el.innerHTML=`<span class="identity">${unitTag(p)} · ${p.name}<small>${p.equipment==='baseball-bat'?'Bat':p.equipment==='folding-knife'?'Blade':'Handgun'} · ${b.acted.includes(p.id)?'ACTION USED':p.alive?'READY':'DOWN'}</small></span><span class="stats">HP ${p.hp}/${p.maxHp}<br>Guard ${p.guard}</span>`;el.disabled=busy||ended||!p.alive||b.acted.includes(p.id);$('roster').append(el);}
  if(focused)$('roster').querySelector(`[data-unitid="${focused}"]`)?.focus({preventScroll:true});
  for(const el of document.querySelectorAll('[data-action]')){el.disabled=!canAct||(el.dataset.action==='item'&&!u.itemIds.includes('training-bandage'));el.setAttribute('aria-pressed',String(action===el.dataset.action));}
  for(const id of ['end','talk','withdraw','auto','showcase','restart','loadout'])$(id).disabled=busy||(ended&&!['restart','loadout','showcase'].includes(id));
  $('talk').disabled=busy||ended||b.round<2; $('auto').textContent='Auto: '+(auto?'on':'off');$('auto').setAttribute('aria-pressed',String(auto));
  $('choices').replaceChildren();$('choices').hidden=!canAct||!['move','attack'].includes(action);clearHighlights();
  if(!isLab&&canAct&&action==='move')for(const cell of validMoveCells(b,u)){tile(cell,0x8ecbaf);const p=parseSlotKey(cell);$('choices').append(button(`${String.fromCharCode(65+p.lane)}${p.depth+1}`,()=>run('move',cell),{'data-cell':cell,'aria-label':`Move to ${String.fromCharCode(65+p.lane)}${p.depth+1}`}));}
  if(!isLab&&canAct&&action==='attack'){const targets=attackTargets(b,u);for(const target of b.enemies.filter(v=>v.alive)){const valid=targets.some(v=>v.id===target.id),el=button(`${unitTag(target)} · ${target.name} · HP ${target.hp}/${target.maxHp} · G ${target.guard} · ${valid?(target.guard?'break guard':'hit condition'):'out of reach / blocked'}`,()=>run('attack',target.id),{'data-target':target.id});el.disabled=!valid;$('choices').append(el);if(valid)tile(target.cell,0xe9a38b,.30);}}
  if(isLab)labUI.render(action,busy);
  for(const p of all()){
    const el=labels.get(p.id),a=actors.get(p.id),view=fighterLabel(b,p,{targetId:labUI?.targetId(),full:!isLab||fullLabels});
    el.classList.toggle('active',view.selected);el.classList.toggle('targeted',view.targeted);el.classList.toggle('objective',isCrew&&view.objective);el.classList.toggle('down',!p.alive);el.dataset.detail=view.detail;
    el.setAttribute('aria-label',view.description);el.title=view.description;el.hidden=!!(p.waiting||p.evacuated);leaders.get(p.id).style.display=el.hidden?'none':'';a.group.visible=!p.waiting&&!p.evacuated;
    el.replaceChildren();const identity=document.createElement('b');identity.textContent=unitTag(p);el.append(identity);
    if(isCrew&&view.badge){const badge=document.createElement('em');badge.className='objective-badge';badge.textContent=view.badge;el.append(badge);}
    const stats=document.createElement('small');if(p.alive){for(const value of [`${p.hp}/${p.maxHp}`,`G${p.guard}`]){const span=document.createElement('span');span.textContent=value;stats.append(span);}}else stats.textContent='DOWN';el.append(stats);
    a.ring.material.opacity=p.alive?1:.25;a.ring.material.transparent=true;
    if(isLab){a.ring.scale.setScalar(view.selected||view.targeted?1.18:1);a.ring.material.color.setHex(view.targeted?0xffd28a:view.selected?0xe7f3d0:p.side==='enemy'?0xe3a18a:0x8fc5ae);}
  }
  $('log').replaceChildren(...b.log.slice(0,12).map(s=>{const li=document.createElement('li');li.textContent=s;return li;}));
  refreshPolice();
  if(crew){crew.render(busy);if(!crew.inBattle())lockInput();}
  if(ended&&!busy&&!story&&!crew){$('result').hidden=false;$('result-title').textContent=({win:'JADE HOLDS THE YARD',loss:'RUST HOLDS THE YARD',withdraw:'CREW WITHDREW',partial:'TRUCE REACHED'})[b.result];$('result-text').textContent=`${b.round} rounds. ${all().filter(v=>!v.alive).length} downed. Training only: no campaign changes.`;}
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

function closeCrewPicker(){
  if(!isCrew)return;const roster=$('roster'),picker=$('crew-picker'),hadFocus=roster.contains(document.activeElement);
  roster.hidden=true;picker.setAttribute('aria-expanded','false');if(hadFocus)picker.focus({preventScroll:true});
}
function select(id){if(crew&&!crew.inBattle())return;if(story&&!story.isBattle())return;if(busy||graphicsLost||layoutPaused||!ready)return;session.command('select',id);crew?.persist();closeCrewPicker();action='';labUI?.cancel();hint(isCrew?'':isLab?'Move + Act in either order. Rust plans are shown below.':'Choose Attack, Move, Brace or Bandage.');refresh();}
function choose(name){if(crew&&!crew.inBattle())return;if(story&&!story.isBattle())return;if(busy||graphicsLost||layoutPaused||!ready||session.battle.status!=='active')return;closeCrewPicker();labUI?.cancel();if(['brace','item','reload'].includes(name)){run(name);return;}action=action===name?'':name;hint(isLab?'Choose a destination or target to inspect, then confirm.':name==='move'?'Tap a green cell, or choose its coordinate below. Reposition spends this action.':'Choose a highlighted opponent. Cover and weapon lanes determine reach.');refresh();}
function tween(seconds,fn){const ticket=sequence,clock=createPresentationClock(performance.now());clock.pause(hidden||layoutPaused,performance.now());presentationClocks.add(clock);return new Promise((resolve,reject)=>{function tick(now){if(ticket!==sequence||graphicsLost){presentationClocks.delete(clock);reject(new Interrupted());return;}const elapsed=clock.take(now);fn(Math.min(1,elapsed/seconds));if(elapsed<seconds)requestAnimationFrame(tick);else{presentationClocks.delete(clock);resolve();}}requestAnimationFrame(tick);});}
async function moveVisual(id,to){const a=actors.get(id),from=a.group.position.clone(),dest=typeof to==='string'?position(to):to;const d=dest.clone().sub(from);if(d.length()<.01)return;a.group.rotation.y=Math.atan2(d.x,d.z);a.play('walk');const duration=(a.bakedMotion||a.placeholder)?Math.max(.5,d.length()/1.45):Math.min(1.3,Math.max(.5,d.length()*.2));a.bakedMotion?.setWalkSpeed(d.length()/duration);a.setWalkSpeed?.(d.length()/duration);await tween(duration,t=>a.group.position.lerpVectors(from,dest,t));a.play('idle');}
async function gesture(id,mode,duration=.75){const a=actors.get(id);a.play(mode,duration);await tween(duration,()=>{});if(mode!=='down')a.play('idle');}
function spark(at){const g=new T.Group();world.add(g);for(let i=0;i<8;i++){const o=new T.Mesh(new T.BoxGeometry(.027,.027,.027),new T.MeshBasicMaterial({color:i%2?0xd8c090:0xb7c6ae}));g.add(o);}tween(.3,t=>g.children.forEach((o,i)=>{o.position.copy(at).add(new T.Vector3(Math.sin(i*4)*t*.45,Math.sin(t*Math.PI)*.4,Math.cos(i*4)*t*.45));})).catch(e=>{if(!(e instanceof Interrupted))console.error(e);}).finally(()=>{g.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});g.removeFromParent();});}
async function attackVisual(id,targetId){const a=actors.get(id),target=actors.get(targetId);if(!a||!target)return;const home=a.group.position.clone(),goal=target.group.position.clone(),d=goal.clone().sub(home).normalize(),ranged=a.unit.equipment.includes('handgun');a.group.rotation.y=Math.atan2(d.x,d.z);
  if(!ranged&&home.distanceTo(goal)>1.2)await moveVisual(id,goal.clone().addScaledVector(d,-.92));
  a.play(ranged?'shoot':'strike',.85);await tween(.4,()=>{});spark(goal.clone().setY(1.15));target.play('hit',.45);await tween(.45,()=>{});target.play('idle');a.play('idle');
  if(!ranged&&a.group.position.distanceTo(home)>.01)await moveVisual(id,home);
}
let actionFocus=null,focusEnabled=false,focusSerial=0,aimPose=null;
try{focusEnabled=localStorage.getItem('piritori-c10-focus')==='on';}catch{}
function cancelFocus(){if(aimPose){const a=actors.get(aimPose.id);if(a){a.group.rotation.y=aimPose.rotation;a.peek=0;a.play('idle');}aimPose=null;}focusSerial++;actionFocus=null;tagsDirty=true;updateFocusButton();}
function updateFocusButton(){if($('aim-preview')){$('aim-preview').textContent=actionFocus?.kind==='gun'?'Overview':'Aim view';$('aim-preview').setAttribute('aria-pressed',String(actionFocus?.kind==='gun'));}area.dataset.camera=actionFocus?.kind==='gun'?'aim':'overview';if($('actioncam')){$('actioncam').textContent='FOCUS '+(focusEnabled?'ON':'OFF');$('actioncam').setAttribute('aria-pressed',String(focusEnabled));}}
if(isLab){const control=button('',()=>{fullLabels=!fullLabels;try{localStorage.setItem('piritori-c19-labels',fullLabels?'full':'focused');}catch{}paintLabelControl();refresh();},{id:'label-mode','aria-label':'Show all fighter statistics','aria-pressed':String(fullLabels)});function paintLabelControl(){control.textContent='Labels: '+(fullLabels?'all stats':'focused');control.setAttribute('aria-pressed',String(fullLabels));}paintLabelControl();($('camera-panel')||$('camera-tools')).append(control);updateFocusButton();activate($('actioncam'),()=>{cancelFocus();focusEnabled=!focusEnabled;try{localStorage.setItem('piritori-c10-focus',focusEnabled?'on':'off');}catch{}updateFocusButton();fit();});}
function aimState(id,target){
  const a=actors.get(id),b=actors.get(target);if(!a||!b||!a.unit.equipment.includes('handgun'))return null;
  return {kind:'gun',id,target,from:a.group.position.clone(),to:b.group.position.clone(),strength:0};
}
async function animateFocus(to,token,duration=.30){
  if(!actionFocus)return;const from=actionFocus.strength;
  const step=t=>{if(token===focusSerial&&actionFocus){actionFocus.strength=T.MathUtils.lerp(from,to,t);fit();}};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)step(1);else await tween(duration,step);
}
function toggleAim(target){
  if(busy||graphicsLost||layoutPaused)return;
  const token=++focusSerial;
  if(actionFocus?.kind==='gun'){cancelFocus();fit();return;}
  actionFocus=aimState(selected()?.id,target);if(!actionFocus)return;
  const a=actors.get(actionFocus.id),direction=actionFocus.to.clone().sub(actionFocus.from);aimPose={id:a.id,rotation:a.group.rotation.y};a.group.rotation.y=Math.atan2(direction.x,direction.z);a.peek=1;a.play('grip');
  animateFocus(1,token).catch(e=>{if(!(e instanceof Interrupted))console.error(e);});updateFocusButton();
}
async function focusAction(id,target){
  const held=actionFocus?.kind==='gun'&&actionFocus.id===id&&actionFocus.target===target;
  const token=++focusSerial;
  if(!held&&(!focusEnabled||matchMedia('(prefers-reduced-motion: reduce)').matches||area.clientWidth<600||area.clientHeight<280))return ()=>{};
  const a=actors.get(id),b=actors.get(target);if(!a||!b)return ()=>{};
  if(!held)actionFocus=isCrew?aimState(id,target):null;
  if(!actionFocus){const center=a.group.position.clone().add(b.group.position).multiplyScalar(.5);center.y=0;actionFocus={center,strength:0};}
  await animateFocus(1,token);
  return async()=>{if(token!==focusSerial||!actionFocus)return;await animateFocus(0,token,.28);if(token===focusSerial){cancelFocus();fit();}};
}
async function routeVisual(id,path){
  if(!path?.length)return;const a=actors.get(id),points=[a.group.position.clone(),...path.map(position)],lengths=points.slice(1).map((p,i)=>p.distanceTo(points[i])),length=lengths.reduce((a,b)=>a+b,0);
  a.covered=false;a.peek=0;a.play('walk');a.setWalkSpeed?.(2.1);
  await tween(length/2.1,t=>{let distance=t*length,index=0;while(index<lengths.length-1&&distance>lengths[index])distance-=lengths[index++];const direction=points[index+1].clone().sub(points[index]);a.group.rotation.y=Math.atan2(direction.x,direction.z);a.group.position.lerpVectors(points[index],points[index+1],Math.min(1,distance/lengths[index]));});a.play('idle');coverStance(a,path.at(-1));
}
function coverStance(a,cell){
  a.covered=coverEdges(session.battle,cell).length>0;a.peek=0;
  if(a.covered&&!a.down){const [dx,dy]=EDGES[coverEdges(session.battle,cell)[0].edge];a.group.rotation.y=Math.atan2(dx,-dy);}
}
function edgeMark(cell,edge,color,opacity){
  const [dx,dy]=EDGES[edge],p=position(cell),m=new T.Mesh(new T.PlaneGeometry(dx?.09:CELL,dx?CELL:.09),new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide}));
  m.rotation.x=-Math.PI/2;m.position.copy(p).add(new T.Vector3(dx*CELL*.5,.04,-dy*CELL*.5));highlight.add(m);
}
async function impactEffect(at,kind,target,e){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,colors={body:0xe8b291,guard:0x99d9df,cover:0xc6b392,miss:0x8ea2ab},color=colors[kind];
  const geometry=new T.BoxGeometry(.045,.045,.045),material=new T.MeshBasicMaterial({color,transparent:true,depthWrite:false}),chips=new T.InstancedMesh(geometry,material,reduced?0:10),dummy=new T.Object3D();chips.frustumCulled=false;world.add(chips);
  const ring=new T.Mesh(new T.RingGeometry(.09,.12,24),new T.MeshBasicMaterial({color,transparent:true,depthWrite:false,side:T.DoubleSide}));ring.position.copy(at);ring.quaternion.copy(camera.quaternion);world.add(ring);
  const label=document.createElement('div');label.className='combat-callout '+kind;label.textContent=kind==='body'?`−${e.forecast.hpDamage} HP${e.forecast.guardDamage?` / −${e.forecast.guardDamage} G`:''}`:kind==='guard'?`GUARD −${e.forecast.guardDamage}`:kind==='cover'?'WALL':'MISS';area.append(label);
  try{await tween(reduced?.45:.6,t=>{
    const opacity=1-t*t;material.opacity=opacity;ring.material.opacity=opacity;ring.scale.setScalar(reduced?1:1+t*(kind==='body'?3:2));
    for(let i=0;i<chips.count;i++){const angle=i*2.399;dummy.position.copy(at).add(new T.Vector3(Math.cos(angle)*t*.48,Math.sin(angle)*t*.32+t*.22-t*t*.3,Math.sin(angle*1.7)*t*.32));dummy.rotation.set(t*i,t*3,0);dummy.scale.setScalar(1-t*.7);dummy.updateMatrix();chips.setMatrixAt(i,dummy.matrix);}chips.instanceMatrix.needsUpdate=true;
    const tag=labels.get(target.id).getBoundingClientRect(),rect=area.getBoundingClientRect();label.style.left=Math.max(65,Math.min(rect.width-65,tag.x-rect.x+tag.width/2))+'px';label.style.top=Math.max(38,tag.y-rect.y-5)+'px';label.style.opacity=String(t<.6?1:(1-t)/.4);
  });}finally{geometry.dispose();material.dispose();chips.removeFromParent();ring.geometry.dispose();ring.material.dispose();ring.removeFromParent();label.remove();}
}
async function shotEffect(a,to){
  const from=new T.Vector3();a.muzzle.getWorldPosition(from);
  const geometry=new T.BufferGeometry().setFromPoints([from,to]),material=new T.LineBasicMaterial({color:0xffdf99,transparent:true,opacity:.95,depthWrite:false}),line=new T.Line(geometry,material);world.add(line);
  const flash=new T.Mesh(new T.OctahedronGeometry(.095),new T.MeshBasicMaterial({color:0xffedb5,transparent:true,depthWrite:false}));flash.position.copy(from);world.add(flash);
  try{await tween(.12,t=>{material.opacity=1-t;flash.scale.setScalar(1-t);});}finally{geometry.dispose();material.dispose();line.removeFromParent();flash.geometry.dispose();flash.material.dispose();flash.removeFromParent();}
}
async function tacticalAttack(e){
  const a=actors.get(e.id),target=actors.get(e.target),d=target.group.position.clone().sub(a.group.position),home=a.group.position.clone();
  coverStance(a,e.forecast.from);coverStance(target,e.forecast.to);a.group.rotation.y=Math.atan2(d.x,d.z);
  const returnCamera=await focusAction(e.id,e.target),ranged=a.unit.equipment.includes('handgun'),kind=e.impact;
  try{
    // Rising over a low wall is presentation only; it cannot alter shot odds.
    if(a.covered&&ranged){a.play('grip');await tween(.18,t=>{a.peek=t;});}
    a.play(ranged?'shoot':'strike',.85);
    await tween(ranged?.30:.32,t=>{if(!ranged)a.group.position.copy(home).addScaledVector(d.clone().normalize(),Math.sin(t*Math.PI*.5)*.16);});
    let at=target.group.position.clone().setY(kind==='body'?1.15-(target.duck||0):kind==='guard'?1.35-(target.duck||0):1.0);
    if(kind==='cover'){const [x,y]=e.forecast.coverPoint;at.set((x-(LANES-1)/2)*CELL,.60,(3.5-y)*CELL);}
    else if(kind==='miss')at.add(new T.Vector3(.5,0,.24));
    if(e.hit){target.group.rotation.y=Math.atan2(-d.x,-d.z);target.play(kind==='guard'?'brace':'hit',.6);}
    hint(`${a.unit.label} → ${target.unit.label}: ${kind==='body'?`${e.forecast.hpDamage} HP / ${e.forecast.guardDamage} guard`:kind==='guard'?'GUARD':kind==='cover'?'WALL STOPPED SHOT':'MISS'}`);
    await Promise.all([ranged?shotEffect(a,at):Promise.resolve(),impactEffect(at,kind,target,e),tween(.30,t=>{if(!ranged)a.group.position.lerpVectors(home.clone().addScaledVector(d.clone().normalize(),.16),home,t);})]);
    a.group.position.copy(home);a.play('idle');if(a.peek)await tween(.18,t=>{a.peek=1-t;});coverStance(a,e.forecast.from);
    if(e.down)await gesture(e.target,'down',.7);else {target.play('idle');coverStance(target,e.forecast.to);}
  }finally{a.peek=0;await returnCamera();}
}

async function presentTactical(record){
  for(const e of record.events){if(e.type==='help'){await gesture(e.id,'item',.5);await gesture(e.target,'rise',.7);}else if(e.type==='extract'){await moveVisual(e.id,actors.get(e.id).group.position.clone().add(new T.Vector3(0,0,1.7)));actors.get(e.id).group.visible=false;}else if(e.type==='arrive'){const a=actors.get(e.id);a.group.visible=true;a.group.position.copy(position(a.unit.cell)).add(new T.Vector3(0,0,-1.5));await moveVisual(e.id,position(a.unit.cell));}else if(e.type==='move')await routeVisual(e.id,e.path);else if(e.type==='attack')await tacticalAttack(e);else if(e.type==='hold'){hint(`${actors.get(e.id).unit.label}: ${e.reason}.`);await tween(.25,()=>{});}else await gesture(e.id,e.type,.65);}
  if(!isCrew&&record.type==='withdraw')await Promise.all(session.battle.players.filter(u=>u.alive).map(u=>moveVisual(u.id,actors.get(u.id).group.position.clone().add(new T.Vector3(0,0,2.2)))));
  for(const u of all()){const a=actors.get(u.id);if(u.alive&&record.type!=='withdraw')a.group.position.copy(position(u.cell));coverStance(a,u.cell);}
}

async function present(record){
  const {type,actor,value,before,after,events}=record;
  if(isLab){await presentTactical(record);return;}
  if(type==='move')await moveVisual(actor,value);
  else if(type==='attack')await attackVisual(actor,value);
  else if(['brace','item'].includes(type))await gesture(actor,type);
  else if(type==='talk')await Promise.all(session.battle.players.filter(u=>u.alive).map(u=>gesture(u.id,'talk')));
  else if(type==='withdraw')await Promise.all(session.battle.players.filter(u=>u.alive).map(u=>moveVisual(u.id,actors.get(u.id).group.position.clone().add(new T.Vector3(0,0,2.2)))));
  else if(['end','auto'].includes(type)&&events.length){for(const e of events){if(e.type==='move')await moveVisual(e.id,e.to);else if(e.type==='attack')await attackVisual(e.id,e.target);else await gesture(e.id,'brace');}}
  else if(type==='auto'){for(const next of after.units){const old=before.units.find(v=>v.id===next.id);if(old.cell!==next.cell)await moveVisual(next.id,next.cell);}for(const next of after.units){const old=before.units.find(v=>v.id===next.id);if(old.hp>next.hp||old.guard>next.guard)await gesture(next.id,'hit',.4);}}
  for(const next of after.units){const old=before.units.find(v=>v.id===next.id);if(old.alive&&!next.alive)await gesture(next.id,'down',.7);}
  for(const u of all()){if(!u.alive)continue;const a=actors.get(u.id);if(type!=='withdraw')a.group.position.copy(position(u.cell));a.group.visible=!u.waiting&&!u.evacuated;a.group.rotation.y=u.side==='player'?Math.PI:0;if(isLab)coverStance(a,u.cell);}
}
async function run(type,value){if(crew&&!crew.inBattle())return;if(story&&!story.isBattle())return;if(busy||graphicsLost||layoutPaused||!ready)return;if(type==='police')auto=false;const result=session.command(type,value);if(!result.ok){hint(result.message||'That action is not available yet.');return;}const ticket=sequence;crew?.commit(session);saveStory();busy=true;action='';labUI?.cancel(type==='attack');refresh();try{await present(result.record);}catch(e){if(!(e instanceof Interrupted))throw e;}if(ticket!==sequence||graphicsLost)return;busy=false;if(story&&session.battle.status!=='active')story.complete(session.result());saveStory();hint(session.battle.log[0]);refresh();if(auto&&session.battle.status==='active')autoTimer=setTimeout(()=>{if(auto&&!busy&&ticket===sequence)run('auto');},600);}
async function showcase(){if(busy||graphicsLost||layoutPaused||!ready)return;const ticket=sequence;auto=false;busy=true;action='';refresh();const starts=new Map([...actors].map(([id,a])=>[id,a.group.position.clone()])),baked=[...actors.values()].every(a=>a.bakedMotion);try{for(const mode of ['idle','walk','strike','shoot','brace','item','talk','hit','grip','down']){hint(`ACTION REHEARSAL · ${mode.toUpperCase()} · ${isLab?'stand-in motion':baked?'Blender motion candidate':['idle','walk'].includes(mode)?'own-character clip':'prototype gesture'}`);if(mode==='walk'&&(baked||isLab)){const headings=new Map([...actors].map(([id,a])=>[id,a.group.rotation.y]));await Promise.all([...actors].map(([id,a])=>moveVisual(id,starts.get(id).clone().add(new T.Vector3(0,0,1).applyQuaternion(a.group.quaternion).multiplyScalar(.9)))));await Promise.all([...actors].map(([id])=>moveVisual(id,starts.get(id))));for(const [id,a] of actors)a.group.rotation.y=headings.get(id);continue;}for(const a of actors.values()){a.down=false;a.play(mode,1.15);}await tween(1.15,t=>{if(mode==='walk')for(const [id,a] of actors)a.group.position.copy(starts.get(id)).add(new T.Vector3(.45*Math.sin(t*Math.PI),0,0));});}}catch(e){if(!(e instanceof Interrupted))throw e;}if(ticket!==sequence||graphicsLost)return;reset();hint('Rehearsal complete. Fresh battle ready.');}

for(const el of document.querySelectorAll('[data-action]'))activate(el,()=>choose(el.dataset.action));
activate($('end'),()=>run('end'));activate($('talk'),()=>run('talk'));activate($('withdraw'),()=>run('withdraw'));activate($('auto'),()=>{if(graphicsLost||graphicsPreparing||!ready)return;auto=!auto;refresh();if(auto&&!busy)run('auto');});activate($('restart'),()=>reset());activate($('again'),()=>reset());activate($('showcase'),showcase);$('loadout').addEventListener('change',()=>reset());activate($('help'),()=>$('help-dialog').showModal());
activate($('download'),()=>{const blob=new Blob([JSON.stringify(story?{...story.result(),battle:session.result()}:session.result(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='piritori-fight-module-result.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
function showArtStyle(){const label=artStyle==='ink'?'Ink & Stone':'Cold Street';$('art-toggle').textContent=label+' ↔';$('art-toggle').setAttribute('aria-label',label+': switch art direction');document.body.dataset.look=artStyle;}
if(isBear)activate($('art-toggle'),()=>{if(busy||graphicsLost||layoutPaused||!ready)return;artStyle=artStyle==='ink'?'cold':'ink';stage.setStyle(artStyle);showArtStyle();try{localStorage.setItem(ART_SAVE,artStyle);const url=new URL(location.href);url.searchParams.set('look',artStyle);history.replaceState(null,'',url);}catch{}});
activate($('rotate'),()=>{cancelFocus();angle+=Math.PI/4;fit();});activate($('zoomout'),()=>{cancelFocus();zoom=Math.max(.7,zoom-.15);fit();});activate($('zoomin'),()=>{cancelFocus();zoom=Math.min(1.7,zoom+.15);fit();});activate($('resetcam'),()=>{cancelFocus();angle=.65;zoom=1;cameraPreset='tactical';for(const b of document.querySelectorAll('[data-camera-preset]'))b.setAttribute('aria-pressed',String(b.dataset.cameraPreset===cameraPreset));fit();});
if(isCrew){
 activate($('camera-menu'),()=>{const panel=$('camera-panel');panel.hidden=!panel.hidden;$('camera-menu').setAttribute('aria-expanded',String(!panel.hidden));tagsDirty=true;});
 activate($('crew-picker'),()=>{const roster=$('roster');roster.hidden=!roster.hidden;$('crew-picker').setAttribute('aria-expanded',String(!roster.hidden));});
 for(const button of document.querySelectorAll('[data-camera-preset]'))activate(button,()=>{cancelFocus();cameraPreset=button.dataset.cameraPreset;angle=cameraPreset==='oblique'?-.62:cameraPreset==='overhead'?.05:.65;zoom=1;for(const b of document.querySelectorAll('[data-camera-preset]'))b.setAttribute('aria-pressed',String(b===button));fit();});
}
function boardTap(x,y){if(crew&&!crew.inBattle())return;if(busy||graphicsLost||layoutPaused||!ready)return;const rect=canvas.getBoundingClientRect(),p=new T.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(p,camera);if(action==='move'){const at=new T.Vector3();if(ray.ray.intersectPlane(ground,at)){const cell=`${Math.round(at.x/CELL+(LANES-1)/2)},${Math.round(3.5-at.z/CELL)}`;if(isLab){if(routes(session.battle,selected()).has(cell))labUI.pick('move',cell);}else run('move',cell);}return;}const hit=ray.intersectObjects([...actors.values()].map(a=>a.body),true)[0];if(!hit)return;let node=hit.object;while(node&&!node.userData.unitId)node=node.parent;if(!node)return;const u=all().find(v=>v.id===node.userData.unitId);if(story&&!story.isBattle()){story.tapActor(u.id);return;}if(u.side==='player')select(u.id);else if(action==='attack'){if(isLab)labUI.pick('attack',u.id);else run('attack',u.id);}else hint('Choose Attack first, then a highlighted opponent.');}
let down=null,lastTap=0;canvas.addEventListener('pointerdown',e=>{if(graphicsLost||graphicsPreparing||layoutPaused||!ready)return;down={id:e.pointerId,x:e.clientX,y:e.clientY,angle};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(down&&down.id===e.pointerId&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>9){cancelFocus();angle=down.angle+(e.clientX-down.x)*.006;fit();}});canvas.addEventListener('pointerup',e=>{if(!down)return;const tap=Math.hypot(e.clientX-down.x,e.clientY-down.y)<9;down=null;lastTap=performance.now();if(tap)boardTap(e.clientX,e.clientY);});canvas.addEventListener('pointercancel',()=>{down=null;});canvas.addEventListener('touchend',e=>{if(performance.now()-lastTap<300)return;const t=e.changedTouches[0];if(t&&!down){e.preventDefault();boardTap(t.clientX,t.clientY);}},{passive:false});canvas.addEventListener('wheel',e=>{e.preventDefault();if(graphicsLost||graphicsPreparing||layoutPaused||!ready)return;cancelFocus();zoom=T.MathUtils.clamp(zoom-e.deltaY*.001,.7,1.7);fit();},{passive:false});
window.addEventListener('keydown',e=>{if(graphicsLost||graphicsPreparing||layoutPaused||!ready)return;if(document.querySelector('dialog[open]'))return;if(story?.key(e.key))return;if(crew&&!crew.inBattle())return;if(e.key==='Escape'){action='';labUI?.cancel();refresh();return;}if(e.target.matches('select,input')||(e.key==='Enter'&&e.target.matches('button,a,summary')))return;const key=e.key.toLowerCase();if(/^[1-6]$/.test(key)&&session.battle.players[Number(key)-1])select(session.battle.players[Number(key)-1].id);if({a:'attack',m:'move',b:'brace',i:'item',r:'reload'}[key])choose({a:'attack',m:'move',b:'brace',i:'item',r:'reload'}[key]);if(e.key==='Enter'){e.preventDefault();run('end');}});
let padPrevious=[],padAt=0;function controller(now){if(layoutPaused)return;const p=navigator.getGamepads?.()[0];if(!p)return;const fresh=i=>p.buttons[i]?.pressed&&!padPrevious[i];const modal=document.querySelector('dialog[open]');const controls=[...document.querySelectorAll('button,select,summary,a')].filter(e=>!e.disabled&&e.getClientRects().length&&!e.closest('[hidden]')&&(!modal||modal.contains(e)));if(now-padAt>170&&(fresh(13)||fresh(15)||fresh(12)||fresh(14))){const step=fresh(13)||fresh(15)?1:-1,index=controls.indexOf(document.activeElement);controls[(index+step+controls.length)%controls.length]?.focus();padAt=now;}if(fresh(0))document.activeElement?.click();if(fresh(1)){if(modal)modal.close();else{story?.key('Escape');action='';labUI?.cancel();refresh();}}if(fresh(6)||fresh(7)){cancelFocus();zoom=T.MathUtils.clamp(zoom+(fresh(7)?.15:-.15),.7,1.7);fit();}padPrevious=p.buttons.map(v=>v.pressed);}
matchMedia('(orientation:landscape)').addEventListener('change',()=>{
  if(!ready)return;cancelFocus();layoutPaused=true;pausePresentations();down=null;clearTimeout(reflowTimer);clearTimeout(autoTimer);refresh();
  reflowTimer=setTimeout(()=>{layoutPaused=false;pausePresentations();fit();frameClock.reset(performance.now());refresh();if(auto&&!busy&&!graphicsLost)run('auto');},280);
});
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;pausePresentations();frameClock.reset(performance.now());frameCount=seconds=0;if(hidden){cancelAnimationFrame(raf);raf=0;}else queueFrame();});
activate($('reload-graphics'),()=>{if(graphicsLost||busy){const stored=saveRecovery();$('loading-detail').textContent=stored?'Reloading the saved turn…':'This browser cannot retain the turn across a reload.';location.reload();}});
function bindGraphicsRecovery(){
  // Registered AFTER Three's listeners: Three rebuilds its GL resources first.
  canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();if(graphicsLost)return;graphicsLost=true;cancelFocus();losses++;sequence++;auto=false;busy=true;down=null;cancelAnimationFrame(raf);raf=0;
    const stored=saveRecovery();lockInput();$('result').hidden=true;$('labels').hidden=true;
    loading('Graphics paused. Restoring the scene…');$('loading-detail').textContent=stored?'Your current turn is saved in this tab.':'Your current turn is held while this page stays open.';
    $('reload-graphics').hidden=true;clearTimeout(recoveryTimer);recoveryTimer=setTimeout(()=>{if(graphicsLost){loading('The browser has not restored graphics yet.');$('reload-graphics').textContent=stored?'Reload saved fight':'Reload game';$('reload-graphics').hidden=false;}},5000);
  });
  canvas.addEventListener('webglcontextrestored',()=>{
    const restorationStarted=performance.now();
    clearTimeout(recoveryTimer);graphicsLost=false;recoveries++;profile=renderProfile({touch,recovered:true});low=true;
    if(templates)for(const template of templates.values())limitTextures(template.scene,profile.textureSize);
    if(cameraPullback){zoom=1;cameraPullback=false;}applyProfile();stage?.recover?.();frameClock.reset(performance.now());frameCount=seconds=0;
    if(ready){rebuildActors();prepareGraphics(restorationStarted).then(ok=>{if(ok)resumeGraphics();}).catch(e=>{if(!graphicsLost){loading('Graphics could not be prepared. Reload the saved fight.');$('reload-graphics').hidden=false;console.error(e);}});}
  });
}
function resumeGraphics(){busy=false;action='';labUI?.cancel();if(story?.isBattle()&&session.battle.status!=='active')story.complete(session.result());saveStory();$('labels').hidden=false;$('loading').hidden=true;$('reload-graphics').hidden=true;for(const el of document.querySelectorAll('#camera-tools button,#again'))el.disabled=false;refresh();clearRecovery();hint('Graphics restored. Your turn is unchanged; lighter rendering is active.');queueFrame();}
async function prepareGraphics(start=performance.now()){
  const ticket=sequence;graphicsPreparing=true;busy=true;lockInput();
  loading('Preparing restored graphics…');
  try{
    if(!(isCrew&&safeGraphics))stage?.beforeRender?.(camera);
    await renderer.compileAsync(world,camera);
    if(ticket!==sequence||graphicsLost)return false;
    drawScene();
    preparationMs=performance.now()-start;warmupFrames=2;frameCount=seconds=0;fps=0;frameClock.reset(performance.now());
    return true;
  }finally{if(ticket===sequence)graphicsPreparing=false;}
}
let warmupFrames=2,fpsSamples=0;
function tick(now){
  raf=0;if(hidden||graphicsLost||graphicsPreparing||!ready)return;queueFrame();
  // Native input keeps polling even while a menu reuses its last GPU frame.
  controller(now);
  // Keep the last scene behind crew planning, the roster and modal dialogs.
  // Redraw on a selection or resize, but leave scrolling and input free of
  // continuous GPU work while the player is reading these controls.
  const stillMenu=crew&&!busy&&(!crew.inBattle()||!$('roster').hidden||document.querySelector('dialog[open]'));
  if(stillMenu&&!sceneDirty){frameClock.reset(now);frameCount=seconds=0;return;}
  const sample=frameClock.take(now,profile.fps);if(!sample)return;
  sceneDirty=false;
  const {real,dt}=sample;
  for(const a of actorList)updateActor(a,layoutPaused?0:dt);
  if(!story||story.isBattle())layoutTags();story?.layout();
  stage?.tick?.(layoutPaused||matchMedia('(prefers-reduced-motion: reduce)').matches?0:dt);
  stage?.update(camera,actorList,actionFocus?.kind==='gun'?actionFocus:null);
  // Context loss can precede the DOM event while a shader is being linked.
  // Three then receives null driver info logs. Only suppress that lost-context
  // race; normal shader/render faults still surface. The recovery event rebuilds.
  try{if(renderer.getContext().isContextLost())return;drawScene();}
  catch(e){if(!renderer.getContext().isContextLost()){renderError=e.message;busy=true;graphicsPreparing=true;lockInput();loading('The scene could not be drawn.');$('loading-detail').textContent=renderError;$('reload-graphics').textContent='Retry graphics';$('reload-graphics').hidden=false;console.error(e);}return;}
  renderedFrames++;
  if(warmupFrames>0){warmupFrames--;return;}
  frameCount++;seconds+=real;
  if(seconds>2){
    fps=Math.round(frameCount/seconds*10)/10;fpsSamples++;
    if(fps<22&&!low){low=true;profile=renderProfile({touch:true});applyProfile();}
    $('perf').textContent=`${isCrew?'C.19 · FIELD CLARITY':isLab?'C.19 · MOVE + ACT':isBear?'C.08':'C.06'} · ${fps} FPS · ${renderer.info.render.calls} draws · ${profile.name}`;
    tagsDirty=true;frameCount=0;seconds=0;
  }
}
async function boot(){
  let saved;try{saved=JSON.parse(sessionStorage.getItem(RECOVERY_KEY));}catch{}if(!saved&&isBear){try{saved=JSON.parse(localStorage.getItem(STORY_SAVE));}catch{}}if(isCrew)saved=null;if(saved)profile=renderProfile({recovered:true});
  [content,manifest]=await Promise.all(['../../content/era1-slice-v1.json','../../art/v3/manifest.json?v=9'].map(p=>fetch(p).then(r=>{if(!r.ok)throw Error('Data failed '+r.status);return r.json();})));
  session=createSession(content,isBear?'melee':'mixed',scenario);let restored=false;if(saved){try{session=restoreSession(content,saved.fight);if(session.scenario!==scenario)throw Error('Wrong scene save');angle=Number.isFinite(saved.angle)?saved.angle:.65;zoom=T.MathUtils.clamp(Number.isFinite(saved.zoom)?saved.zoom:1,.7,1.7);restored=true;}catch{clearRecovery();saved=null;session=createSession(content,isBear?'melee':'mixed',scenario);}}
  if(isBear&&saved){try{if(!saved.story)throw Error('Incomplete scene save');const state=createEncounter(content,saved.story).state;if(state.phase!=='battle'&&state.choice!=='hold-path'&&session.history.length)throw Error('Mismatched scene save');if(state.phase==='aftermath'&&state.choice==='hold-path'&&session.battle.status==='active')throw Error('Mismatched outcome');if(saved.pullback)zoom=1;}catch{saved=null;restored=false;session=createSession(content,'melee',scenario);clearRecovery();try{localStorage.removeItem(STORY_SAVE);}catch{}}}
  if(isCrew){crew=mountCrew({content,button,replaceSession:replaceCrewSession,getSession:()=>session,refresh,run,tile});session=crew.initial();}
  $('loadout').value=session.mode;[templates,parkAssets,locationAssets]=await Promise.all([isLab?Promise.resolve(new Map()):loadFighters(manifest,profile),isPark&&(!isCrew||arenaId==='park')?loadParkAssets(manifest,profile):null,isCrew&&arenaId!=='park'?loadLocationAssets(profile):null]);buildStage();for(const template of templates.values())limitTextures(template.scene,profile.textureSize);rebuildActors();ready=true;
  if(isBear){
    story=mountBearPath({content,renderer,world,stage,actors:()=>actors,project,fit,position,
      battle:()=>session.battle,locked:()=>busy||graphicsLost||layoutPaused,save:saveStory,restart:restartChapter,
      beginBattle:async()=>{const cameraTicket=sequence;cameraPullback=true;busy=true;refresh();saveStory();const from=zoom;try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await tween(.65,t=>{zoom=T.MathUtils.lerp(from,1,t*t*(3-2*t));fit();});else{zoom=1;fit();}}catch(e){if(!(e instanceof Interrupted))throw e;}if(cameraTicket===sequence&&!graphicsLost){cameraPullback=false;busy=false;refresh();saveStory();}},
      calmAftermath:()=>{for(const a of actors.values())if(a.unit.alive)a.play('idle');}
    },saved?.story);
    window.bearPath={snapshot:()=>story.checkpoint(),result:()=>story.result()};
    if(!saved){zoom=1.22;fit();}
  }
  if(crew){
  window.crewRun={snapshot:()=>crew.state()};
  for(const [id,value]of [['graphics-safe','safe'],['graphics-auto','auto']])activate($(id),()=>{crew.persist();const url=new URL(location.href);if(value==='safe')url.searchParams.set('graphics','safe');else url.searchParams.delete('graphics');location.assign(url.href);});
  $('help-dialog').addEventListener('toggle',()=>{if($('help-dialog').open)$('graphics-status').textContent=`C.19 · ${safeGraphics?'safe':'direct'} rendering · ${canvas.width} × ${canvas.height} · ${renderedFrames} frames\nWebGL ${graphicsLost?'lost':'active'}${renderError?'\n'+renderError:''}`;});
}
  window.fightModule={snapshot:()=>session.snapshot(),view:()=>({frame:frameInfo,points:all().map(u=>({id:u.id,head:project(actors.get(u.id).group.position.clone().add(new T.Vector3(0,2.15,0))),feet:project(actors.get(u.id).group.position)})),cells:Array.from({length:LANES*totalRows()},(_,i)=>{const cell=`${i%LANES},${Math.floor(i/LANES)}`;return {cell,...project(position(cell)),head:project(position(cell).setY(2.3))};})}),metrics:()=>({scenario,graphicsMode:safeGraphics?'safe':isCrew?'direct':'standard',renderError,environment:stage.metrics?.(),camera:{preset:cameraPreset,mode:actionFocus?.kind||'overview',strength:actionFocus?.strength||0,ids:actionFocus?.kind==='gun'?[actionFocus.id,actionFocus.target]:[],enabled:focusEnabled},story:story?.checkpoint().state,layoutPaused,fps,fpsSamples,graphicsPreparing,preparationMs,renderedFrames,labelLayouts,edgeSmoothing:edgeSmoothing.metrics(),draws:renderer.info.render.calls,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,models:actors.size,characterProvider:isLab?'development stand-ins':'v05 imported prototypes',bones:[...actors.values()].map(a=>a.bones.size),busy,graphicsLost,losses,recoveries,profile:profile.name,pixelRatio:renderer.getPixelRatio(),drawingBuffer:[canvas.width,canvas.height],shadows:renderer.shadowMap.enabled,antialias:renderer.getContextAttributes()?.antialias,textureSizes:[...templates.values()].map(t=>{const sizes=new Set();t.scene.traverse(n=>{for(const mat of [].concat(n.material||[]))for(const v of Object.values(mat))if(v?.isTexture)sizes.add(v.image?.width+'x'+v.image?.height);});return [...sizes];}),mode:session.mode,history:session.history.map(r=>({type:r.type,actor:r.actor,value:r.value})),finite:[...actors.values()].every(a=>a.placeholder?Array.from(a.mesh.instanceMatrix.array).every(Number.isFinite):[...a.bones.values()].every(b=>b.matrixWorld.elements.every(Number.isFinite)))})};
  if(graphicsLost){lockInput();return;}if(recoveries){resumeGraphics();return;}busy=false;if(story?.isBattle()&&session.battle.status!=='active')story.complete(session.result());refresh();$('loading').hidden=true;clearRecovery();saveStory();if(restored)hint('Saved turn restored. Lighter rendering is active.');frameClock.reset(performance.now());frameCount=seconds=0;queueFrame();
}
boot().catch(e=>{loading('Unable to load fight: '+e.message);lockInput();console.error(e);});
