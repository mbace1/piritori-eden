// Review-only staging. Original registered pieces + shared 10fps clip/figure renderer.
// Does not import app/state code, write storage, mutate manifests, or promote art.
import { makeJaskaBlinkRepair, makeAatamiBlinkRepair } from './blink-repair.js';
import { CUTINS, REST, pose, rigParts, drawFigure, drawCutin } from '../../../web/js/v3/cutin-stage.js';
const root = new URL('../../../', location.href);
const [manifest, content] = await Promise.all(['art/v3/manifest.json','content/era1-slice-v1.json'].map(p=>fetch(new URL(p,root)).then(r=>{if(!r.ok)throw Error(p);return r.json();})));
const encounter=content.encounters.find(e=>e.id==='enc-jaska-receipt');
const load=url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error(`Cannot load ${url}`));image.src=url;});
const rigs={};
for(const who of ['jaska','aatami']) {
 const asset=manifest.assets.find(a=>a.id===CUTINS[who].rig), images={};
 await Promise.all(asset.members.map(async m=>{images[m.part]=await load(new URL(`art/v3/${m.file}`,root));}));
 rigs[who]=rigParts(asset,images);
}
const repairedRigs={jaska:makeJaskaBlinkRepair(rigs.jaska),aatami:makeAatamiBlinkRepair(rigs.aatami)};
const repair=new URLSearchParams(location.search).get('repair')==='1';
if(repair)document.querySelector('.review-label strong').textContent='SCENE CLUB · BLINK REPAIR CANDIDATE';
const activeRig=who=>repair?repairedRigs[who]:rigs[who];
const plateAsset=manifest.assets.find(a=>a.id===encounter.scene_asset_id);
const plate=await load(new URL(`art/v3/${plateAsset.file}`,root));
const frame=document.querySelector('#frame'),canvas=document.querySelector('#scene'),g=canvas.getContext('2d');
const words=document.querySelector('#words'),options=document.querySelector('#options'),arrival=document.querySelector('#arrival'),map=document.querySelector('#map'),result=document.querySelector('#map-result'),forecast=document.querySelector('#map-forecast'),replay=document.querySelector('#replay');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let phase='map',started=performance.now()/1000,selected=null,shown='',manual=null,lastPose=null,lastClip=null;
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
const button=(label,action,note)=>{const b=document.createElement('button');b.type='button';b.innerHTML='<strong></strong>';b.querySelector('strong').textContent=label;if(note){const s=document.createElement('small');s.textContent=note;b.append(s);}b.onclick=action;return b;};
function enter(){phase='arriving';started=performance.now()/1000;selected=null;shown='';}
function answer(choice){selected=choice;phase='answer';started=performance.now()/1000;shown='';}
function leave(){phase='leaving';started=performance.now()/1000;shown='';}
function setUI(){
 if(shown===phase)return;shown=phase;options.replaceChildren();
 arrival.hidden=phase!=='arriving';result.hidden=phase!=='returned';replay.hidden=phase!=='returned';
 if(phase==='map')options.append(button('Arrive at Scene Club',enter));
 if(phase==='ask')for(const choice of encounter.choices)options.append(button(choice.label,()=>answer(choice),choice.forecast));
 if(phase==='outcome')options.append(button('Back to Kallio',leave));
 if(phase==='returned'){forecast.textContent=selected.forecast;replay.onclick=()=>{phase='map';started=performance.now()/1000;shown='';};}
}
function cover(img,w,h){const s=Math.max(w/img.width,h/img.height);g.drawImage(img,(w-img.width*s)/2,(h-img.height*s)/2,img.width*s,img.height*s);}
function box(el,b){Object.assign(el.style,{left:`${b.x}px`,top:`${b.y}px`,width:`${b.w}px`,height:`${b.h}px`});}
function landscape(w,h,who,p,alpha=1,slide=0,bubble=true){
 g.save();g.globalAlpha=alpha;cover(plate,w,h);g.fillStyle='#0b10126b';g.fillRect(0,0,w,h);
 const rig=activeRig(who),fh=h*.94,s=fh/rig.size[1],fx=-w*.04+slide,fy=h-fh;
 drawFigure(g,rig,p,fx,fy,s);
 const head=rig.parts.head,mouthY=fy+(head.y+head.h*.78)*s;
 const b={x:w*.30,y:h*.035,w:w*.34,h:Math.max(88,mouthY-24-h*.035)};
 if(bubble){
  g.fillStyle='#c7aa79';g.shadowColor='#0008';g.shadowBlur=12;g.shadowOffsetY=5;
  g.beginPath();g.moveTo(b.x,b.y);g.lineTo(b.x+b.w,b.y+2);g.lineTo(b.x+b.w-2,b.y+b.h);g.lineTo(b.x+44,b.y+b.h);g.lineTo(b.x+10,b.y+b.h+7);g.lineTo(b.x+10,b.y+b.h);g.lineTo(b.x+2,b.y+b.h-1);g.closePath();g.fill();
 }
 g.restore();
 box(words,b);words.style.fontSize=`${Math.max(13,Math.min(19,w*.015))}px`;
 box(options,{x:w*.67,y:h*.035,w:w*.31,h:h*.91});options.style.justifyContent='center';options.style.overflowY='auto';
}
function portrait(w,h,who,p,alpha=1,slide=0,bubble=true){
 g.save();g.globalAlpha=alpha;g.scale(w/1080,h/1920);
 if(bubble)drawCutin(g,who,activeRig(who),p,{t:elapsed(),plate});
 else {const sh=1920*.62,sw=sh*plate.width/plate.height;g.drawImage(plate,(1080-sw)/2-120,0,sw,sh);g.fillStyle='#121719';g.fillRect(0,sh,1080,1920-sh);const gr=g.createLinearGradient(0,0,0,1920);gr.addColorStop(0,'#0a0c0e40');gr.addColorStop(1,'#0a0c0ee8');g.fillStyle=gr;g.fillRect(0,0,1080,1920);drawFigure(g,activeRig(who),p,-40+slide,1920-1920*.62,1920*.62/activeRig(who).size[1]);}
 g.restore();
 const b=CUTINS[who].bubble;box(words,{x:b.x*w/1080,y:b.y*h/1920,w:b.w*w/1080,h:b.h*h/1920});words.style.fontSize=`${Math.max(12,40*w/1080)}px`;
 box(options,{x:w*.037,y:h*.70,w:w*.926,h:h*.285});options.style.justifyContent='flex-end';options.style.overflowY='auto';
}
function elapsed(){return manual??performance.now()/1000-started;}
function render(){
 const w=frame.clientWidth,h=frame.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
 let t=elapsed();
 if(manual===null){if(phase==='arriving'&&t>2.4){phase='ask';started=performance.now()/1000;t=0;}if(phase==='answer'&&t>3.2){phase='outcome';started=performance.now()/1000;t=0;}if(phase==='leaving'&&t>1){phase='returned';started=performance.now()/1000;t=0;}}
 setUI();
 const land=w/h>1.2,draw=land?landscape:portrait;
 words.hidden=!['ask','answer','outcome'].includes(phase);
 options.hidden=['arriving','answer','leaving','returned'].includes(phase);
 if(phase==='map'||phase==='returned'){canvas.style.opacity=0;map.style.opacity=1;}
 else {
  canvas.style.opacity=1;map.style.opacity=phase==='leaving'?ease(t):1;
  const who=phase==='arriving'||phase==='answer'?'aatami':'jaska';
  const clip=phase==='arriving'?'idle':phase==='ask'||phase==='answer'?'talk':selected?.id==='take-envelope'?'shake':'nod';
  const activeClip=CUTINS[who].clips[clip];
  const p=reduced?REST:(!activeClip.loop&&t>activeClip.dur?pose(who,'idle',t-activeClip.dur):pose(who,clip,t));
  lastPose=p;lastClip=reduced?'rest':(!activeClip.loop&&t>activeClip.dur?'idle':clip);
  const alpha=phase==='arriving'?(reduced?1:ease(t/.7)):phase==='leaving'?1-ease(t):1;
  const slide=phase==='arriving'&&!reduced?(1-ease((t-.2)/1.4))*(land?w*.22:350):0;
  draw(w,h,who,p,alpha,slide,phase!=='arriving');
  words.textContent=phase==='ask'?encounter.opening:phase==='answer'?selected.label:selected?.forecast??'';
 }
 frame.dataset.phase=phase;
 requestAnimationFrame(render);
}
window.__sceneClubReview={ready:true,blinkRepair:repair,get phase(){return phase;},get selected(){return selected?.id??null;},get lastPose(){return lastPose;},get lastClip(){return lastClip;},get reducedMotion(){return reduced;},setFrame(p,t=0,choice='ask-envelope'){phase=p;manual=t;selected=encounter.choices.find(c=>c.id===choice);shown='';},resume(){manual=null;started=performance.now()/1000;},enter,answer:id=>answer(encounter.choices.find(c=>c.id===id)),leave};
render();
