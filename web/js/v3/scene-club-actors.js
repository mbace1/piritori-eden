// Shared retained-source actor drawing. Source pieces are fetched from the current
// register; no old UI/player/review renderer or generated character art is used.
// Talk means head/body acting. These sources have static mouths.
const ROOT = new URL('../../../', import.meta.url);
const DEG = Math.PI / 180;
const RIGS = { front: 'cutin-aatami-front-rig-v01', side: 'cutin-aatami-rig-v01', jaska: 'cutin-jaska-rig-v01', toko: 'scene-toko-rig-v01' };
const TOKO_CROP = [496, 68, 400, 472]; // original 1536×864 rig coordinates
const CLIP_LENGTH = { idle: 5, talk: 3.2, nod: 1.6, shake: 1.8, blink: .55 };
const REST = Object.freeze({ sy: 1, rotation: 0, headY: 0, headX: 0, blink: 0, hand: 0, brow: 0 });
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const key = (points, t) => {
  if (t <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) if (t <= points[i][0]) {
    const [a, av] = points[i - 1], [b, bv] = points[i];
    return av + (bv - av) * smooth((t - a) / (b - a));
  }
  return points.at(-1)[1];
};
const blink = t => key([[0,0],[.08,0],[.18,1],[.28,1],[.44,0],[.55,0]], t);
const mix = (a, b, k) => Object.fromEntries(Object.keys(REST).map(name => [name, a[name] + (b[name] - a[name]) * k]));
const photoBlink = t => Math.max(blink(t - 1.5), blink(t - 4.1));
function sample(who, clip, t) {
  const p = { ...REST };
  if (clip === 'idle') {
    t = ((t % 5) + 5) % 5;
    p.sy = 1 + .004 * Math.sin(t / 5 * Math.PI * 2);
    p.rotation = .7 * DEG * Math.sin(t / 5 * Math.PI * 2);
    p.blink = photoBlink(t);
    if (who === 'toko') { p.hand = 1.3 * DEG * Math.sin(t * Math.PI); p.brow = key([[0,0],[1,-1.5],[1.7,0],[5,0]], t); }
  } else if (clip === 'talk') {
    p.sy = 1 + .002 * Math.sin(t / 3.2 * Math.PI * 2);
    p.rotation = DEG * key([[0,0],[.7,-.8],[1.5,.7],[2.3,-.5],[3.2,0]],t);
    p.headY = key([[0,0],[.25,2.5],[.5,0],[1,3],[1.3,0],[2,2],[2.3,0],[3.2,0]],t);
    p.blink = blink(t - 2.45);
    if (who === 'toko') p.brow = key([[0,0],[.6,1.3],[1.4,0],[2.2,1],[3.2,0]],t);
  } else if (clip === 'nod') {
    p.headY = key([[0,0],[.35,5],[.7,5],[1.2,0],[1.6,0]],t);
    p.rotation = DEG * key([[0,0],[.4,-.5],[1.2,0],[1.6,0]],t);
    p.blink = blink(t - .32);
  } else if (clip === 'shake') {
    p.rotation = DEG * key([[0,0],[.3,-1.5],[.6,1.5],[.9,-1.5],[1.2,1],[1.6,0],[1.8,0]],t);
  } else if (clip === 'blink') p.blink = blink(t);
  return p;
}

// New candidate aperture masks, measured against the unchanged current head
// WebPs. Existing lid swatches are opaque rectangles and must not be drawn whole.
// Masks stay inside the eye opening; Jaska's glasses and brows remain untouched.
const EYES = {
  jaska: [
    { part:'lid_0', polygon:[[75,111],[81,110],[98,110],[103,112],[99,116],[90,118],[79,116],[74,114]] },
    { part:'lid_1', polygon:[[133,111],[139,110],[149,111],[156,113],[154,116],[143,118],[135,116]] },
  ],
  front: [
    { part:'lid_0', polygon:[[63,101],[74,101],[84,104],[86,107],[81,109],[71,109],[64,105]] },
    { part:'lid_1', polygon:[[112,110],[121,110],[130,112],[135,114],[129,117],[120,117],[112,113]] },
  ],
  side: [{ part:'lid_0', polygon:[[124,100],[134,100],[140,101],[140,104],[137,107],[131,106],[126,103]] }],
};
const MOUTHS = { jaska:[294,229], front:[269,167], side:[340,171], toko:[700,263] };
let manifestPromise;
const imagePromises = new Map();
function manifest() {
  return manifestPromise ||= fetch(new URL('art/v3/manifest.json',ROOT)).then(r => { if (!r.ok) throw Error(`Actor register HTTP ${r.status}`); return r.json(); }).catch(e => { manifestPromise = undefined; throw e; });
}
function image(file) {
  const url = new URL('art/v3/' + file, ROOT).href;
  if (!imagePromises.has(url)) imagePromises.set(url, new Promise((resolve,reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = () => { imagePromises.delete(url); reject(Error('Actor part failed: ' + file)); }; img.src = url;
  }));
  return imagePromises.get(url);
}
const path = (g, polygon, dx=0, dy=0) => { g.beginPath(); polygon.forEach(([x,y],i) => i ? g.lineTo(x+dx,y+dy) : g.moveTo(x+dx,y+dy)); g.closePath(); };
function around(g, [x,y], rotation=0, sy=1, dx=0, dy=0) { g.translate(x+dx,y+dy); g.rotate(rotation); g.scale(1,sy); g.translate(-x,-y); }
const point = (m,x,y) => ({ x:m.a*x+m.c*y+m.e, y:m.b*x+m.d*y+m.f });
function rectangle(points) { const xs=points.map(p=>p.x),ys=points.map(p=>p.y);return {x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)}; }

/**
 * const actors = createActors(container,{aatami:'front',partner:'jaska'});
 * await actors.ready; actors.setSpeaker('aatami'); actors.play('aatami','talk');
 * Only transparent actor canvases are appended. CSS placement belongs to caller.
 */
export function createActors(container, { aatami='front', partner='jaska', reducedMotion, tokoSurface='actor', reviewOnly=true } = {}) {
  if (!(container instanceof Element)) throw TypeError('An actor container is required');
  // partner null: Aatami alone, or beside a stand-in the caller draws (meeting-view.js).
  if (!['front','side'].includes(aatami) || (partner !== null && !['jaska','toko'].includes(partner))) throw Error('Unknown retained actor variant');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let still = reducedMotion ?? media.matches, destroyed = false, loaded = false, raf = 0, tick = -1, speaker = partner ?? 'aatami';
  const actors = new Map();
  for (const who of ['aatami',partner].filter(Boolean)) {
    const variant = who === 'aatami' ? aatami : who, canvas = document.createElement('canvas');
    canvas.className = `actor actor-${who}`; canvas.dataset.actor = who; canvas.dataset.variant = variant; canvas.dataset.status = 'loading';
    canvas.setAttribute('role','img'); canvas.setAttribute('aria-label',`${who === 'aatami' ? 'Young Aatami' : who === 'jaska' ? 'Jaska' : 'Toko Slomo'} · retained source artwork; ${reviewOnly ? 'candidate motion; ' : ''}static mouth`);
    if (who !== 'toko' || tokoSurface !== 'composition') container.append(canvas);
    actors.set(who,{who,variant,canvas,g:canvas.getContext('2d'),clip:'idle',start:performance.now()/1000,from:null,held:null,pose:{...REST}});
  }
  function current(actor, now) {
    if (still) return { ...REST };
    if (actor.held) return actor.held.clip === 'rest' ? {...REST} : sample(actor.who,actor.held.clip,actor.held.seconds);
    let t = Math.max(0,now-actor.start);
    if (actor.clip !== 'idle' && t >= CLIP_LENGTH[actor.clip]) {
      actor.start += CLIP_LENGTH[actor.clip]; actor.clip='idle'; actor.from={...REST}; t=now-actor.start;
    }
    const pose=sample(actor.who,actor.clip,Math.floor(t*10)/10);
    return actor.from ? mix(actor.from,pose,smooth(t/.18)) : pose;
  }
  function put(actor,name) { const part=actor.parts[name];actor.g.drawImage(part.img,part.x,part.y); }
  function closeHumanEyes(actor,k) {
    if (k <= 0) return;
    const {g,parts:{head}}=actor;
    for (const eye of EYES[actor.variant]) {
      const lid=actor.parts[eye.part],xs=eye.polygon.map(p=>p[0]),ys=eye.polygon.map(p=>p[1]);
      const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
      g.save(); path(g,eye.polygon,head.x,head.y); g.clip();
      g.beginPath();g.rect(head.x+x,head.y+y,w,h*clamp(k));g.clip();
      g.drawImage(lid.img,0,0,lid.w,lid.h,head.x+x,head.y+y,w,h);
      // Procedural closed-eye ink is candidate animation art, never a source edit.
      if(k>.45){g.globalAlpha=clamp((k-.45)/.55);g.strokeStyle='#342c25';g.lineWidth=.85;g.lineCap='round';g.beginPath();g.moveTo(head.x+x+2,head.y+y+h*.55);g.quadraticCurveTo(head.x+x+w*.5,head.y+y+h*.72,head.x+x+w-2,head.y+y+h*.48);g.stroke();}
      g.restore();
    }
  }
  function human(actor,p) {
    const {g,asset}=actor;
    g.save();around(g,asset.rig.pivots.torso,0,p.sy);put(actor,'torso');
    g.save();around(g,asset.rig.pivots.head,p.rotation,1,p.headX,p.headY);actor.headMatrix=g.getTransform();put(actor,'head');closeHumanEyes(actor,p.blink);g.restore();g.restore();
  }
  function chef(actor,p,includeCounter=false) {
    const {g,asset,parts}=actor,PV=asset.rig.pivots;
    // Skip identity pivot operations: fractional source pivots would otherwise
    // introduce tiny resampling differences in an exactly still room composite.
    const body=()=>{if(p.sy!==1)around(g,PV.torso,0,p.sy)};
    g.save();body();put(actor,'torso');
    g.save();if(p.rotation||p.headX||p.headY)around(g,PV.head,p.rotation,1,p.headX,p.headY);actor.headMatrix=g.getTransform();put(actor,'head');
    if(p.brow){put(actor,'hood_bare');for(const name of ['brow_l','brow_r']){g.save();around(g,PV[name],0,1,0,p.brow);put(actor,name);g.restore();}}
    if(p.blink>0)for(const name of ['eye_l','eye_r']){
      const eye=parts[name],height=Math.ceil(eye.h*clamp(p.blink));g.drawImage(actor.tokoLids[name],0,0,eye.w,height,eye.x,eye.y,eye.w,height);
    }
    g.restore();g.restore();
    if(includeCounter)put(actor,'counter');
    g.save();body();if(p.hand)around(g,PV.fore_r,p.hand);put(actor,'fore_r');g.restore();
    put(actor,'note');
    g.save();body();put(actor,'hand_l');g.restore();
    // The separate room composition can retain the source counter as an
    // occluder before the forearms/note. The ordinary transparent actor omits it.
  }
  function draw(actor,now) {
    if(!actor.parts || destroyed)return;
    const {g,canvas,crop}=actor;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,canvas.width,canvas.height);g.translate(-crop[0],-crop[1]);
    actor.pose=current(actor,now);actor.who==='toko'?chef(actor,actor.pose):human(actor,actor.pose);
    canvas.dataset.clip=still?'rest':actor.held?.clip||actor.clip;canvas.dataset.blink=String(+actor.pose.blink.toFixed(3));
  }
  function drawAll(){const now=performance.now()/1000;for(const actor of actors.values())draw(actor,now);}
  function loop(now){raf=0;if(destroyed||still)return;const next=Math.floor(now/100);if(next!==tick){tick=next;drawAll();}raf=requestAnimationFrame(loop);}
  function setReducedMotion(value){still=Boolean(value);if(raf)cancelAnimationFrame(raf);raf=0;tick=-1;drawAll();if(!still&&!destroyed&&loaded)raf=requestAnimationFrame(loop);}
  function play(who,clip){const actor=actors.get(who);if(!actor||destroyed)return false;if(!Object.hasOwn(CLIP_LENGTH,clip))throw Error('Unknown actor clip');const now=performance.now()/1000;actor.from=current(actor,now);actor.held=null;actor.clip=clip;actor.start=now;draw(actor,now);return true;}
  function setSpeaker(who){if(!actors.has(who))return false;speaker=who;for(const actor of actors.values()){const speaking=actor.who===who;actor.canvas.classList.toggle('is-speaking',speaking);actor.canvas.dataset.speaking=String(speaking);}return true;}
  function bounds(){return Object.fromEntries([...actors].map(([who,a])=>{
    const r=a.canvas.getBoundingClientRect(),rect={x:r.x,y:r.y,width:r.width,height:r.height};
    if(!a.parts||!a.headMatrix)return[who,{canvas:rect,ready:false}];
    const scale={x:r.width/a.canvas.width,y:r.height/a.canvas.height},convert=p=>({x:r.x+p.x*scale.x,y:r.y+p.y*scale.y}),head=a.parts.head,m=a.headMatrix;
    const points=[[head.x,head.y],[head.x+head.w,head.y],[head.x+head.w,head.y+head.h],[head.x,head.y+head.h]].map(([x,y])=>convert(point(m,x,y)));
    return[who,{canvas:rect,head:rectangle(points),mouth:convert(point(m,...MOUTHS[a.variant])),source:{id:a.asset.id,dimensions:[...a.asset.dimensions],crop:[...a.crop]},ready:true}];
  }));}
  const mediaChange=e=>{if(reducedMotion===undefined)setReducedMotion(e.matches)};
  media.addEventListener('change',mediaChange);
  const api={ready:null,setSpeaker,play,setReducedMotion,bounds,
    // Source-coordinate paint hook for the aligned room helper. It deliberately
    // does not apply the actor crop or alter Aatami/Jaska drawing and bounds.
    drawTokoTo(context,{counter=true}={}){
      const actor=actors.get('toko');if(!actor?.parts||destroyed)return null;
      if(counter&&!actor.parts.counter)throw Error('Toko counter requires composition surface');
      const previousContext=actor.g,previousHead=actor.headMatrix,p=current(actor,performance.now()/1000);
      try{actor.g=context;chef(actor,p,counter);return{headMatrix:actor.headMatrix,head:{x:actor.parts.head.x,y:actor.parts.head.y,w:actor.parts.head.w,h:actor.parts.head.h},mouth:[...MOUTHS.toko],pose:{...p}};}
      finally{actor.g=previousContext;actor.headMatrix=previousHead;}
    },
    destroy(){destroyed=true;if(raf)cancelAnimationFrame(raf);raf=0;media.removeEventListener('change',mediaChange);for(const actor of actors.values())actor.canvas.remove();},debug:{
    hold(who,clip,seconds=0){const actor=actors.get(who);if(!actor||destroyed)return false;if(clip!=='rest'&&!Object.hasOwn(CLIP_LENGTH,clip))throw Error('Unknown actor clip');actor.held={clip,seconds:Math.max(0,Number(seconds)||0)};draw(actor,performance.now()/1000);return true;},
    rest(who){for(const actor of actors.values())if(!who||actor.who===who)actor.held={clip:'rest',seconds:0};drawAll();},
    resume(who){for(const actor of actors.values())if(!who||actor.who===who)play(actor.who,'idle');},
    snapshot(){return{speaker,reducedMotion:still,staticMouths:true,candidateMotion:Boolean(reviewOnly),actors:Object.fromEntries([...actors].map(([who,a])=>[who,{id:a.asset?.id,variant:a.variant,clip:a.canvas.dataset.clip,pose:{...a.pose},crop:a.crop&&[...a.crop],canvas:[a.canvas.width,a.canvas.height]}]))};},
  }};
  api.ready=(async()=>{
    const register=await manifest();
    await Promise.all([...actors.values()].map(async actor=>{
      const asset=register.assets.find(a=>a.id===RIGS[actor.variant]);if(!asset)throw Error('Retained rig not registered: '+actor.variant);
      actor.asset=asset;actor.crop=actor.who==='toko'?[...TOKO_CROP]:[0,0,...asset.dimensions];
      const entries=await Promise.all(asset.members.filter(m=>m.part!=='counter'||tokoSurface==='composition').map(async m=>[m.part,{...m,img:await image(m.file)}]));actor.parts=Object.fromEntries(entries);
      actor.canvas.width=actor.crop[2];actor.canvas.height=actor.crop[3];actor.canvas.style.aspectRatio=`${actor.crop[2]} / ${actor.crop[3]}`;
      if(actor.who==='toko')actor.tokoLids=Object.fromEntries(['eye_l','eye_r'].map(name=>{const p=actor.parts[name],c=document.createElement('canvas');c.width=p.w;c.height=p.h;const g=c.getContext('2d');g.drawImage(p.img,0,0);g.globalCompositeOperation='source-in';g.fillStyle=`rgb(${asset.rig.lid_rgb.join(',')})`;g.fillRect(0,0,c.width,c.height);return[name,c];}));
      actor.canvas.dataset.rig=asset.id;actor.canvas.dataset.status='ready';actor.canvas.dataset.approval=asset.approval_status;actor.start=performance.now()/1000;
    }));
    if(destroyed)return api;loaded=true;setSpeaker(speaker);drawAll();if(!still&&!raf)raf=requestAnimationFrame(loop);return api;
  })().catch(error=>{for(const actor of actors.values())actor.canvas.dataset.status='error';throw error;});
  return api;
}
