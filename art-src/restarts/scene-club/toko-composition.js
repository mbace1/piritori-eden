// The retained Toko belongs to his counter. Room and every rig/counter piece use
// one source-coordinate camera; the foreground Aatami stays a separate actor.
import { createActors } from './actors.js';
const ROOT=new URL('../../../',import.meta.url);
const rect=points=>{const x=points.map(p=>p.x),y=points.map(p=>p.y);return{x:Math.min(...x),y:Math.min(...y),width:Math.max(...x)-Math.min(...x),height:Math.max(...y)-Math.min(...y)}};
const point=(m,x,y)=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f});
const load=url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Retained Toko room failed to load'));image.src=url});
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

/**
 * Same controller surface as createActors(). Supply two independently positioned
 * hosts: roomContainer for the painted room/counter/Toko; foregroundContainer for
 * Aatami. Neither host receives UI. Root CSS owns host placement and Aatami size.
 * focus can be normalized [x,y] or ({width,height})=>[x,y].
 */
export function createTokoComposition(roomContainer,foregroundContainer,{aatami='front',reducedMotion,focus}={}){
  if(!(roomContainer instanceof Element)||!(foregroundContainer instanceof Element))throw TypeError('Room and foreground containers are required');
  const actors=createActors(foregroundContainer,{aatami,partner:'toko',reducedMotion,tokoSurface:'composition'});
  const canvas=document.createElement('canvas'),g=canvas.getContext('2d');
  canvas.className='toko-room-canvas';canvas.dataset.status='loading';canvas.dataset.composition='room-counter-toko';
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Retained Toko Slomo paper artwork behind his original counter; candidate motion, static mouth');
  canvas.style.cssText='display:block;width:100%;height:100%';roomContainer.append(canvas);
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  let still=reducedMotion??media.matches,dead=false,ready=false,raf=0,tick=-1,plate,plateAsset,sourceSize,headPaint=null,camera=null,focusSetting=focus;
  function draw(){
    if(!ready||dead)return;
    const width=roomContainer.clientWidth,height=roomContainer.clientHeight;
    if(!width||!height)return;
    const dpr=Math.min(devicePixelRatio||1,2),pixelWidth=Math.max(1,Math.round(width*dpr)),pixelHeight=Math.max(1,Math.round(height*dpr));
    if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){canvas.width=pixelWidth;canvas.height=pixelHeight;}
    const [sw,sh]=sourceSize,chosen=typeof focusSetting==='function'?focusSetting({width,height,sourceWidth:sw,sourceHeight:sh}):focusSetting;
    const [fx,fy]=chosen??[width/height<1?.39:.5,.5],scale=Math.max(width/sw,height/sh);
    if(!Number.isFinite(fx)||!Number.isFinite(fy))throw Error('Toko focus must contain finite normalized coordinates');
    const x=clamp(width/2-clamp(fx,0,1)*sw*scale,width-sw*scale,0),y=clamp(height/2-clamp(fy,0,1)*sh*scale,height-sh*scale,0);
    camera={width,height,sourceWidth:sw,sourceHeight:sh,scale,x,y,focus:[fx,fy],fit:'cover'};
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,canvas.width,canvas.height);
    g.setTransform(dpr*scale,0,0,dpr*scale,dpr*x,dpr*y);
    g.drawImage(plate,0,0,sw,sh);
    headPaint=actors.drawTokoTo(g,{counter:true});
    const state=actors.debug.snapshot().actors.toko;
    canvas.dataset.clip=state.clip||'idle';canvas.dataset.blink=String(+(headPaint?.pose.blink??0).toFixed(3));
  }
  function loop(time){raf=0;if(dead||still)return;const next=Math.floor(time/100);if(next!==tick){tick=next;draw();}raf=requestAnimationFrame(loop);}
  function setReducedMotion(value){still=Boolean(value);actors.setReducedMotion(still);if(raf)cancelAnimationFrame(raf);raf=0;tick=-1;draw();if(ready&&!dead&&!still)raf=requestAnimationFrame(loop);}
  const observer=new ResizeObserver(draw);observer.observe(roomContainer);
  const mediaChange=e=>{if(reducedMotion===undefined)setReducedMotion(e.matches)};media.addEventListener('change',mediaChange);
  function bounds(){
    const result=actors.bounds(),r=canvas.getBoundingClientRect();
    if(!headPaint||!camera){result.toko={canvas:{x:r.x,y:r.y,width:r.width,height:r.height},ready:false};return result;}
    const convert=p=>({x:r.x+p.x*r.width/canvas.width,y:r.y+p.y*r.height/canvas.height}),{head,headMatrix:m,mouth}=headPaint;
    const points=[[head.x,head.y],[head.x+head.w,head.y],[head.x+head.w,head.y+head.h],[head.x,head.y+head.h]].map(([x,y])=>convert(point(m,x,y)));
    result.toko={canvas:{x:r.x,y:r.y,width:r.width,height:r.height},head:rect(points),mouth:convert(point(m,...mouth)),source:{id:'scene-toko-rig-v01',dimensions:[...sourceSize],crop:[0,0,...sourceSize],plate:plateAsset.id},camera:{...camera},ready:true};
    return result;
  }
  const api={
    ready:null,
    play(who,clip){const result=actors.play(who,clip);draw();return result;},
    setSpeaker(who){const result=actors.setSpeaker(who);canvas.dataset.speaking=String(who==='toko');return result;},
    setReducedMotion,bounds,
    setFocus(value){focusSetting=value;draw();},
    destroy(){dead=true;if(raf)cancelAnimationFrame(raf);raf=0;observer.disconnect();media.removeEventListener('change',mediaChange);actors.destroy();canvas.remove();},
    debug:{
      hold(who,clip,seconds=0){const result=actors.debug.hold(who,clip,seconds);draw();return result;},
      rest(who){actors.debug.rest(who);draw();},
      resume(who){actors.debug.resume(who);draw();},
      snapshot(){return{...actors.debug.snapshot(),composition:'aligned Toko room/counter with foreground Aatami',camera:camera&&{...camera},plate:plateAsset?.id,counterDepthOrder:'room → torso/head → counter strip → forearm/note/hand',bakedUI:false};},
      redraw:draw,
    },
  };
  api.ready=(async()=>{
    const response=await fetch(new URL('art/v3/manifest.json',ROOT));if(!response.ok)throw Error(`Toko register HTTP ${response.status}`);const register=await response.json();
    const rig=register.assets.find(a=>a.id==='scene-toko-rig-v01');plateAsset=register.assets.find(a=>a.id===rig?.plate_asset_id);if(!rig||!plateAsset?.file)throw Error('Retained Toko rig/empty bar is unregistered');
    sourceSize=[...rig.dimensions];if(plateAsset.dimensions.some((v,i)=>v!==sourceSize[i]))throw Error('Toko room and rig coordinate systems differ');
    [plate]=await Promise.all([load(new URL('art/v3/'+plateAsset.file,ROOT)),actors.ready]);
    if(dead)return api;ready=true;canvas.dataset.status='ready';canvas.dataset.plate=plateAsset.id;canvas.dataset.approval=plateAsset.approval_status;draw();if(!still&&!raf)raf=requestAnimationFrame(loop);return api;
  })().catch(error=>{canvas.dataset.status='error';throw error});
  return api;
}
