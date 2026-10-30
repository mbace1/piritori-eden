import * as T from 'three';
import {GLTFLoader} from '../vendor/jsm/loaders/GLTFLoader.js?v=1';
import {EDGES} from '../fight-module/cover-edges.js?v=2';
import {developmentLook} from '../bear-path/development-look.js?v=6';
import {limitTextures} from '../fight-module/render-profile.js?v=3';
import {weatheredMaterial} from './weathered-material.js?v=2';
import {LAYOUTS,lay,facing} from './layouts.js?v=5';

export const LOCATIONS={courtyard:'Porttikongi · rain courtyard',yard:'Linjat · service yard',street:'Kallio · tram street',quay:'Sörnäinen · quay',park:'Karhupuisto · park'};
export function locationId(){const id=new URLSearchParams(location.search).get('arena');return Object.hasOwn(LOCATIONS,id)?id:'courtyard';}
export async function loadLocationAssets(profile){
 const base=new URL('./assets/',import.meta.url),manifest=await fetch(new URL('kallio-kit-v02.manifest.json',base)).then(r=>{if(!r.ok)throw Error('Scenery register unavailable');return r.json();});
 async function bytes(file){const e=manifest.files.find(e=>e.file===file);if(!e)throw Error('Unregistered scenery');const r=await fetch(new URL(file,base));if(!r.ok)throw Error('Scenery download failed');const b=await r.arrayBuffer();if(b.byteLength!==e.bytes)throw Error('Scenery download incomplete');if(crypto.subtle){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),n=>n.toString(16).padStart(2,'0')).join('');if(hash!==e.sha256)throw Error('Scenery version mismatch');}return b;}
 const [glb,png,paving]=await Promise.all([bytes('kallio-kit-v02.glb'),bytes('painted-plaster-v01.png'),bytes('painted-setts-v01.png')]);
 const model=await new GLTFLoader().parseAsync(glb,base.href),url=URL.createObjectURL(new Blob([png],{type:'image/png'}));let texture;
 try{texture=await new T.TextureLoader().loadAsync(url);}finally{URL.revokeObjectURL(url);}
 texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=2;
 const pavingURL=URL.createObjectURL(new Blob([paving],{type:'image/png'}));let pavingTexture;try{pavingTexture=await new T.TextureLoader().loadAsync(pavingURL);}finally{URL.revokeObjectURL(pavingURL);}pavingTexture.colorSpace=T.SRGBColorSpace;pavingTexture.wrapS=pavingTexture.wrapT=T.RepeatWrapping;pavingTexture.repeat.set(4.2,5.6);pavingTexture.anisotropy=2;
 const proxy=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshStandardMaterial({map:texture,bumpMap:pavingTexture}));limitTextures(proxy,Math.min(1024,profile.textureSize));proxy.geometry.dispose();proxy.material.dispose();
 return {model:model.scene,texture,pavingTexture,bytes:glb.byteLength+png.byteLength+paving.byteLength,manifest};
}

// Fictional visual pilots grounded in the atlas, not campaign site dispatch.
// Tactical cover is built from the resolver's map, never inferred from scenery.
// `opts.marks` is what earlier fights left in this set (outing.js `placeMarks`).
export function buildLocation(world,renderer,cover,position,assets,id,opts={}){
 const yard=id==='yard'||id==='quay',group=new T.Group();group.name=id;world.add(group);
 world.background=new T.Color('#0c1922');world.fog=new T.Fog('#173040',22,50);renderer.toneMappingExposure=1.02;
 const hemi=new T.HemisphereLight(0xa4bfd0,0x344343,.94),moon=new T.DirectionalLight(0xb9d4e1,1.14);moon.position.set(-5,11,6);world.add(hemi,moon);
 const model=assets.model;model.updateMatrixWorld(true);const mats={},bins=new Map(),dummy=new T.Object3D();
 model.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(!mats[m.name]){const n=m.clone();if(['plaster','stone','brick'].includes(m.name)){n.map=assets.texture;n.roughness=.79;}if(m.name==='plaster')n.color.setHex(0xc3b9a2);if(m.name==='stone')n.color.setHex(0x858e89);if(m.name==='brick')n.color.setHex(yard?0x967760:0x9a8674);if(m.name==='lit'){n.emissive.setHex(0xffb75e);n.emissiveIntensity=.75;}mats[m.name]=n;}});
 mats.granite=mats.stone;
 if(mats.window_lit){mats.window_lit.emissive.setHex(0xffba70);mats.window_lit.emissiveIntensity=.85;}
 for(const [name,m]of Object.entries(mats))if(name!=='granite')weatheredMaterial(m,name);

 // Layer 5, the cutaway (C19_LEVEL_PASS): a run whose face turns away from
 // the camera is hidden with everything on it, the way a tactics game lifts
 // the near walls. The kit stays in one batch per material (a batch per run
 // cost 37% more draws); each instance knows its run and a hidden run's are
 // zeroed. `into` is the run being placed; the open set has none.
 const runs=[];let into=null;
 function put(name,x,y,z,rotation=0,scale=1){const motif=model.getObjectByName(name);if(!motif)throw Error('Missing Blender motif '+name);dummy.position.set(x,y,z);dummy.rotation.set(0,rotation,0);dummy.scale.setScalar(scale);dummy.updateMatrix();const placement=dummy.matrix.clone();
  motif.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+':'+o.material.name;if(!bins.has(key))bins.set(key,{geometry:o.geometry,material:mats[o.material.name],matrices:[],owners:[]});const bin=bins.get(key);bin.matrices.push(placement.clone().multiply(o.matrixWorld));bin.owners.push(into);});
 }
 // Layer 1: a wall is a RUN (layouts.js `lay`), modules end to end at their
 // measured widths, so a join can neither open nor overlap. `hangs` is what
 // is fixed to that wall (balconies, racks, vents) and goes where it goes.
 // A run `with` another is part of that building: it shares its record, so
 // the cutaway lifts the two together and both wear the building's plaster
 // (`tint`). Every façade module gets its coping (`cap`).
 function run(spec){const shared=spec.with&&byId[spec.with];const rec=shared??{id:spec.id,group:new T.Group(),normal:facing(spec.rotation),visible:true,parts:{},tint:spec.tint};
  if(!shared){rec.group.name='run-'+spec.id;group.add(rec.group);runs.push(rec);}into=rec;
  for(const m of lay(spec).placed){put(m.name,m.x,0,m.z,m.rotation);cap(rec,m);}
  for(const [name,x,y,z,r] of spec.hangs??[])put(name,x,y,z,r);
  into=null;return rec;}
 // Layer 2: the building behind a façade, after the park's street blocks
 // (bear-path/park.js). A kit bay is a 1 m slab; this is the plaster box from
 // its back, a zinc roof along `ridge` and a chimney or two, in the group of
 // the run it belongs to. UVs are in metres so the plaster keeps the bays'
 // scale, and the kit's materials read vertex colour, so the box carries white.
 const roofMat=new T.MeshStandardMaterial({color:0x3b454a,roughness:.58,metalness:.2,side:T.DoubleSide});
 // A plane cut short keeps the texture's scale: UVs over the size it replaces.
 const metric=(g,w,d)=>{const uv=g.attributes.uv,p=g.parameters;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*p.width/w,uv.getY(i)*p.height/d);return g;};
 const white=(g,tint=[1,1,1])=>{const n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++)a.set(tint,i*3);g.setAttribute('color',new T.BufferAttribute(a,3));return g;};
 const setParts={},stacks=[],part=(owner,key,g)=>{const parts=owner?owner.parts:setParts;(parts[key]??=[]).push(g);};
 // The kit's cornice is a pale band 0.9 m deep whose top (6.44 m) stands above
 // the roofs' eaves (6.3 m), so from above every wall wore a white stripe
 // (design/COURTYARD_VISUAL_AUDIT). A zinc coping over it, front edge just past
 // the cornice, reads as the roof's edge instead; from the front it is a thin
 // dark line on the cornice. In the run's group, so it is lifted with the wall.
 const CAP={facade_bay:.63,facade_bay_b:.63,archway:1.21};
 function cap(owner,m){const front=CAP[m.name];if(front==null)return;const g=new T.BoxGeometry(m.to-m.from,.09,front+.39);g.translate(0,6.475,(front-.39)/2);g.rotateY(m.rotation);g.translate(m.x,0,m.z);part(owner,'roof',g);}
 function block(owner,x0,x1,z0,z1,y0=0,y1=6.3,ridge='x',material='plaster'){
  const w=x1-x0,h=y1-y0,d=z1-z0,g=white(new T.BoxGeometry(w,h,d),material==='plaster'?owner?.tint:undefined),uv=g.attributes.uv,size=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++)for(let v=0;v<4;v++){const i=f*4+v;uv.setXY(i,uv.getX(i)*size[f][0]/3,uv.getY(i)*size[f][1]/3);}
  g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);part(owner,material,g);
  if(!ridge)return;
  const r=1.7,a=ridge==='x',c=a?(z0+z1)/2:(x0+x1)/2,P=(x,y,z)=>[x,y,z],t=y1+r;
  const q=a?[P(x0,y1,z0),P(x1,y1,z0),P(x1,y1,z1),P(x0,y1,z1),P(x0,t,c),P(x1,t,c)]:[P(x0,y1,z0),P(x1,y1,z0),P(x1,y1,z1),P(x0,y1,z1),P(c,t,z0),P(c,t,z1)];
  const tri=a?[3,2,5,3,5,4,1,0,4,1,4,5,0,3,4,2,1,5]:[0,3,5,0,5,4,2,1,4,2,4,5,1,0,4,3,2,5];
  const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute(tri.flatMap(i=>q[i]),3));roof.computeVertexNormals();part(owner,'roof',roof);
  const len=a?w:d;for(const f of len>7?[.27,.71]:[.5]){const along=(a?x0:z0)+len*f;stacks.push({at:a?[along,t-.2,c+.35]:[c+.35,t-.2,along],owner});}
 }
 // One mesh per material per run: every box and roof of a run in one draw.
 function merge(list){const out=new T.BufferGeometry(),flat=list.map(g=>g.index?g.toNonIndexed():g);
  for(const name of ['position','normal','uv','color']){if(!flat.every(g=>g.attributes[name]))continue;const size=flat[0].attributes[name].itemSize,arr=new Float32Array(flat.reduce((n,g)=>n+g.attributes[name].array.length,0));let o=0;for(const g of flat){arr.set(g.attributes[name].array,o);o+=g.attributes[name].array.length;}out.setAttribute(name,new T.BufferAttribute(arr,size));}
  return out;}
 // An outside corner where two runs meet face to face: a stone pier over the
 // square where both slabs end, so neither slab's end shows.
 const pier=(owner,x0,x1,z0,z1)=>block(owner,x0,x1,z0,z1,0,6.55,false,'stone');
 // Everything the place is, from layouts.js.
 const layout=LAYOUTS[id]??LAYOUTS.courtyard,byId={};const wispX=layout.rear?.[0]??(yard?1:0);
 for(const spec of layout.runs)byId[spec.id]=run(spec);
 for(const b of layout.blocks){const [x0,x1,z0,z1,y0,y1]=b.box;block(byId[b.run],x0,x1,z0,z1,y0,y1,b.ridge??false,b.stone?'stone':'plaster');}
 for(const [name,x,y,z,r] of layout.props)put(name,x,y,z,r);
 for(const [x,z,r] of layout.planters)put('planter',x,0,z,r);
 for(const [x,z] of layout.litter)put('ground_litter',x,0,z,x*.4);
 for(const [name,x,y,z,r] of layout.common??[])put(name,x,y,z,r);
 // Layer 6: the street's dressing, after the park's municipal street
 // (bear-path/park.js): asphalt between two kerbs, a tram track and a tram
 // standing on it beside the board. Plain materials, no vertex colour.
 if(layout.road){
  const plain=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.7,...extra});
  const asphalt=plain(0x22292c,{roughness:.5}),iron=plain(0x2d3436,{metalness:.35,roughness:.45}),tramGreen=plain(0x315a4b),cream=plain(0xd0b87e),pane=plain(0x987848,{emissive:0xc08b43,emissiveIntensity:.8,roughness:1}),dark=plain(0x152b32);
  const piece=(mat,x,y,z,w,h,d,parent=group)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m;};
  const {z0,z1}=layout.road;
  const road=new T.Mesh(new T.PlaneGeometry(64,z1-z0),asphalt);road.rotation.x=-Math.PI/2;road.position.set(0,.012,(z0+z1)/2);road.receiveShadow=true;group.add(road);
  for(const z of [z0,z1])block(null,-32,32,z-.12,z+.12,0,.14,false,'stone');
  for(const zt of layout.rails??[])for(const dz of [-.72,.72])piece(iron,0,.03,zt+dz,64,.035,.07);
  if(layout.tram){const {x:tx,z:tz}=layout.tram;
   piece(tramGreen,tx,.88,tz,7.1,1.55,1.6);piece(cream,tx,1.9,tz,7.1,.35,1.6);piece(iron,tx,2.13,tz,7.2,.12,1.7);
   for(let n=0;n<7;n++){const x=tx-2.9+n*.94;for(const side of [1,-1]){piece(dark,x,1.53,tz+side*.82,.81,.92,.04);piece(n===0||n===6?dark:pane,x,1.53,tz+side*.845,.66,.74,.025);}}
   piece(cream,tx,.8,tz+.82,6.8,.055,.04);
   for(const x of [tx-2.4,tx+2.4])piece(dark,x,.24,tz,.6,.4,1.2);
   piece(iron,tx+.24,3.1,tz,1,.04,.1);piece(iron,tx,2.62,tz,.04,.95,.04);
  }
 }
 // Layer 7: the quay's dressing, after the Sörnäinen docks plate. The ground
 // stops at the edge (layout.floor); a stone quay wall drops to the harbour, a
 // boat is tied up and the far pier lies across the water. Plain materials.
 if(layout.quay){
  const q=layout.quay,plain=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.7,...extra});
  const water=plain(0x16313b,{roughness:.32}),iron=plain(0x2d3436,{metalness:.35,roughness:.45}),hull=plain(0x3a2220,{roughness:.6}),gunwale=plain(0xc9bfa6),deck=plain(0x4b4136),house=plain(0xb8b2a2),pane=plain(0x987848,{emissive:0xc08b43,emissiveIntensity:.8,roughness:1}),head=plain(0xffd59a,{emissive:0xffc070,emissiveIntensity:1.4});
  const piece=(mat,x,y,z,w,h,d)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.receiveShadow=true;group.add(m);return m;};
  const sea=new T.Mesh(new T.PlaneGeometry(80,q.z1-q.z0+40),water);sea.rotation.x=-Math.PI/2;sea.position.set(q.edge+40,-1.05,(q.z0+q.z1)/2);group.add(sea);
  block(null,q.edge-.15,q.edge+.15,q.z0,q.z1,-1.3,0,false,'stone');block(null,q.edge-.35,q.edge+.2,q.z0,q.z1,0,.16,false,'stone');
  for(const z of q.bollards??[]){const b=new T.Mesh(new T.CylinderGeometry(.15,.19,.46,10),iron);b.position.set(q.edge-.12,.39,z);b.castShadow=true;group.add(b);}
  const fx0=layout.floor?.[0]??-23;for(const zt of q.rails??[])for(const dz of [-.72,.72])piece(iron,(fx0+q.edge)/2,.03,zt+dz,q.edge-fx0,.035,.07);
  // A low hull with a pale gunwale and a pointed bow (a three-sided prism),
  // the wheelhouse aft, a mast, and two lines to the bollards.
  if(q.boat){const {x,z,beam,length}=q.boat,top=.12,bowZ=z-length/2,hz=z+length*.3;
   piece(hull,x,(top-1.2)/2,z,beam,top+1.2,length);piece(gunwale,x,top+.05,z,beam+.06,.1,length+.02);piece(deck,x,top+.12,z,beam-.3,.04,length-.3);
   const R=beam/Math.sqrt(3),bow=new T.Mesh(new T.CylinderGeometry(R,R,top+1.2,3),hull);bow.rotation.y=Math.PI;bow.scale.set(1,1,.9);bow.position.set(x,(top-1.2)/2,bowZ-.45*R);group.add(bow);
   piece(house,x,top+.85,hz,beam*.62,1.5,length*.2);piece(deck,x,top+1.64,hz,beam*.7,.08,length*.22);
   for(const s of [1,-1])for(let n=-1;n<=1;n+=2)piece(pane,x+s*(beam*.31+.01),top+1.05,hz+n*length*.05,.02,.42,length*.06);
   piece(iron,x,top+2.6,z-length*.12,.1,5,.1);
   for(const zb of [bowZ+1.2,z+length/2-1.2]){const dx=x-beam/2-(q.edge-.12),len=Math.hypot(dx,.6),l=piece(iron,(x-beam/2+q.edge-.12)/2,.35,zb,len,.03,.03);l.rotation.z=Math.atan2(-.3,dx);}
  }
  // The far pier across the harbour. The plate's cranes are not here: an
  // orthographic camera stands anything that tall up through the frame.
  if(q.pier)block(null,q.pier[0],q.pier[1],q.pier[2],q.pier[3],-1.3,.4,false,'stone');
  // Lamp posts along the quay, each with its light lying on the water.
  const streak=new T.MeshBasicMaterial({color:0xffb35c,transparent:true,opacity:.3,blending:T.AdditiveBlending,depthWrite:false});
  for(const [px,pz] of q.posts??[]){piece(iron,px,2.1,pz,.12,4.2,.12);piece(iron,px+.25,4.15,pz,.6,.08,.08);piece(head,px+.52,4.02,pz,.34,.18,.3);
   const glow=new T.Mesh(new T.PlaneGeometry(6.5,.9),streak);glow.rotation.x=-Math.PI/2;glow.position.set(q.edge+3.6,-1.03,pz);group.add(glow);}
 }
 for(const [cell,v]of cover){const p=position(cell);if(v.hardBlock)put('container',p.x,0,p.z);else{const [dx,dy]=EDGES[v.edge];put('low_wall',p.x+dx*.585,0,p.z-dy*.585,dx?Math.PI/2:0);}}
 const lamps=layout.lamps.map(([x,y,z,r])=>[x,y,z,r]),lampOwners=layout.lamps.map(l=>byId[l[4]]);
 lamps.forEach(([x,y,z,r],i)=>{into=lampOwners[i]??null;put('lamp',x,y,z,r);into=null;});
 const batches=[];
 const paint=new T.Color();
 for(const bin of bins.values()){const mesh=new T.InstancedMesh(bin.geometry,bin.material,bin.matrices.length);bin.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));
  if(bin.material===mats.plaster&&bin.owners.some(o=>o?.tint))bin.owners.forEach((o,i)=>mesh.setColorAt(i,paint.setRGB(...(o?.tint??[1,1,1]))));mesh.castShadow=bin.material!==mats.lit;mesh.receiveShadow=true;mesh.frustumCulled=false;group.add(mesh);batches.push({mesh,matrices:bin.matrices,owners:bin.owners});}
 if(stacks.length){const stack=new T.InstancedMesh(white(new T.BoxGeometry(.62,1.5,.62)),mats.brick??mats.stone,stacks.length),matrices=stacks.map(({at:[x,y,z]})=>{dummy.position.set(x,y+.75,z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();return dummy.matrix.clone();});matrices.forEach((m,i)=>stack.setMatrixAt(i,m));stack.receiveShadow=true;stack.frustumCulled=false;group.add(stack);batches.push({mesh:stack,matrices,owners:stacks.map(s=>s.owner)});}
 const surface={plaster:mats.plaster,stone:mats.stone,roof:roofMat};
 for(const [owner,parts] of [...runs.map(r=>[r,r.parts]),[null,setParts]])for(const [key,list] of Object.entries(parts)){const m=new T.Mesh(merge(list),surface[key]);m.receiveShadow=true;(owner?.group??group).add(m);}
 const floorMat=new T.MeshStandardMaterial({color:0x3b474a,roughness:.7,map:assets.texture}),[fx0,fx1,fz0,fz1]=layout.floor??[-23,23,-25,25],floor=new T.Mesh(metric(new T.PlaneGeometry(fx1-fx0,fz1-fz0),46,50),floorMat);floor.rotation.x=-Math.PI/2;floor.position.set((fx0+fx1)/2,0,(fz0+fz1)/2);floor.receiveShadow=true;group.add(floor);
 // One shadowed practical. Other pools and the sky fill have no shadow maps.
 for(const [i,[x,y,z,r]]of lamps.entries()){
  const light=new T.SpotLight(i===1?0x9bc4d2:0xffc481,i===2?30:24,19,.95,.85,1.6);light.position.set(x+(r?.5:0),y,z+(r?0:.55));light.target.position.set(x*.20,0,z*.22);light.castShadow=i===2;light.shadow.mapSize.set(1024,1024);light.shadow.normalBias=.035;world.add(light,light.target);
 }
 const rear=new T.PointLight(0xffbd73,24,9,2);rear.position.set(...(layout.rear??[yard?1:0,2.5,yard?-7.1:-8]));world.add(rear);
 const cc=document.createElement('canvas');cc.width=cc.height=64;const cx=cc.getContext('2d'),g=cx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,222,170,.7)');g.addColorStop(.2,'rgba(255,190,110,.18)');g.addColorStop(1,'rgba(255,170,80,0)');cx.fillStyle=g;cx.fillRect(0,0,64,64);
 const glowMap=new T.CanvasTexture(cc),glowMat=new T.SpriteMaterial({map:glowMap,blending:T.AdditiveBlending,depthWrite:false,opacity:.65});
 lamps.forEach(([x,y,z,r],i)=>{const s=new T.Sprite(glowMat);s.position.set(x+(r?.36:0),y-.12,z+(r?0:.36));s.scale.set(2,2,1);(lampOwners[i]?.group??group).add(s);});
 // Local wisps at the far service passage, never a full-screen white wash.
 const wisps=[];for(let i=0;i<5;i++){const m=new T.SpriteMaterial({map:glowMap,color:0x77949d,transparent:true,opacity:.055,depthWrite:false});const s=new T.Sprite(m);s.position.set(wispX+(i-2)*.7,.4,yard?-6.8:-6.5);s.scale.set(2.5,.65,1);group.add(s);wisps.push(s);}
 // V3, the place's own lights (layouts.js `signs`): a lit box sign flat on its
 // wall, or a blade sign out from it, read from both sides; a glow; and its
 // colour spilled on the paving under it. No new lights, which would cost every
 // material a pass: emissive faces and additive planes, lifted with the wall.
 // The text is redrawn once the house face has loaded, or a slow font leaves
 // the fallback baked into the texture for good.
 const signs=[],still=matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const FONT='"Barlow Condensed","Arial Narrow",sans-serif';
 function signFace(text,color,w,h){const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=2;
  const draw=()=>{const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.fillStyle='#140e11';x.fillRect(0,0,c.width,c.height);x.globalAlpha=.5;x.strokeStyle=color;x.lineWidth=5;x.strokeRect(9,9,c.width-18,c.height-18);x.globalAlpha=1;
   let size=c.height*.6;const font=()=>x.font=`600 ${size}px ${FONT}`;font();while(x.measureText(text).width>c.width*.84&&size>12){size-=2;font();}
   x.textAlign='center';x.textBaseline='middle';const y=c.height/2+size*.05;x.shadowColor=color;x.shadowBlur=size*.5;x.fillStyle=color;x.fillText(text,c.width/2,y);x.fillText(text,c.width/2,y);
   x.shadowBlur=size*.12;x.fillStyle='#fff3ea';x.fillText(text,c.width/2,y);t.needsUpdate=true;};
  draw();document.fonts?.load(`600 40px ${FONT}`).then(draw,()=>{});return t;}
 const signBody=new T.MeshStandardMaterial({color:0x1b1416,roughness:.6,metalness:.3});
 for(const [text,runId,x,y,z,r,color,w,blade,flicker] of layout.signs??[]){
  const parent=byId[runId]?.group??group,h=blade?.58:w>2.2?.66:.52,face=new T.MeshBasicMaterial({map:signFace(text,color,w,h),toneMapped:false});
  const sign=new T.Group();sign.name='sign-'+text;sign.position.set(x,y,z);sign.rotation.y=r;parent.add(sign);
  sign.add(new T.Mesh(new T.BoxGeometry(w+.06,h+.06,blade?.06:.09),signBody));
  for(const side of blade?[1,-1]:[1]){const p=new T.Mesh(new T.PlaneGeometry(w,h),face);p.position.z=side*(blade?.035:.05);if(side<0)p.rotation.y=Math.PI;sign.add(p);}
  // A blade hangs from a bracket into the wall (local +x is toward it).
  if(blade){const arm=new T.Mesh(new T.BoxGeometry(w+.16,.035,.035),signBody);arm.position.set(.08,h/2+.06,0);sign.add(arm);}
  const tint=new T.Color(color),glow=new T.Sprite(new T.SpriteMaterial({map:glowMap,color:tint,blending:T.AdditiveBlending,depthWrite:false,transparent:true,opacity:.85}));
  glow.position.z=blade?0:.25;glow.scale.set(w*2.2,h*4,1);sign.add(glow);
  const n=[Math.sin(r),Math.cos(r)],out=blade?0:1.1,spill=new T.Mesh(new T.PlaneGeometry(blade?2.2:w*1.8,2.2),new T.MeshBasicMaterial({map:glowMap,color:tint,transparent:true,opacity:.42,blending:T.AdditiveBlending,depthWrite:false}));
  spill.rotation.x=-Math.PI/2;spill.rotation.z=r;spill.position.set(x+n[0]*out,.03,z+n[1]*out);parent.add(spill);
  signs.push({face,glow,spill,flicker:flicker&&!still,base:[.85,.42]});
 }
 // V4, the place remembers (outing.js `placeMarks`, layouts.js `aftermath`):
 // what earlier fights in this set left, always off the board. The police
 // leave their tape (blue and white, POLIISI · POLIS, as Finnish police tape
 // is), someone hurt leaves a stain, and every fight leaves more glass.
 // `?aftermath=all` shows all three, for a picture or a check.
 const after=layout.aftermath,marks=new URLSearchParams(location.search).get('aftermath')==='all'?{fights:2,police:true,hurt:true}:opts.marks;
 if(after&&marks){
  const seeded=s=>()=>(s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296;
  if(marks.police&&after.tape){const [runId,x0,z0,x1,z1,y]=after.tape,len=Math.hypot(x1-x0,z1-z0),c=document.createElement('canvas');c.width=512;c.height=40;const cx=c.getContext('2d');
   for(let i=0;i<4;i++){const blue=i%2===0;cx.fillStyle=blue?'#1f4fbf':'#f1f3f6';cx.fillRect(i*128,0,128,40);cx.fillStyle=blue?'#f1f3f6':'#1f4fbf';cx.font='600 26px '+FONT;cx.textAlign='center';cx.textBaseline='middle';cx.fillText(blue?'POLIISI':'POLIS',i*128+64,21);}
   const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=T.RepeatWrapping;
   const N=10,pos=[],uv=[],index=[];for(let i=0;i<=N;i++){const t=i/N,px=x0+(x1-x0)*t,pz=z0+(z1-z0)*t,py=y-.14*(1-(2*t-1)**2);pos.push(px,py+.035,pz,px,py-.035,pz);uv.push(t*len/1.6,1,t*len/1.6,0);if(i<N){const a=i*2;index.push(a,a+1,a+2,a+1,a+3,a+2);}}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
   const tape=new T.Mesh(g,new T.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.3,roughness:.5,side:T.DoubleSide}));tape.name='aftermath-tape';(byId[runId]?.group??group).add(tape);}
  if(marks.fights>0)for(const [gx,gz] of (after.glass??[]).slice(0,marks.fights>1?2:1)){const rnd=seeded(Math.round(gx*97+gz*13)),tri=[];
   for(let i=0;i<16;i++){const a=rnd()*Math.PI*2,d=Math.sqrt(rnd())*.55,cxp=gx+Math.cos(a)*d,czp=gz+Math.sin(a)*d,s=.04+rnd()*.08,b=rnd()*Math.PI*2;for(let k=0;k<3;k++){const q=b+k*2.1+rnd()*.5;tri.push(cxp+Math.cos(q)*s,.012,czp+Math.sin(q)*s);}}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(tri,3));g.computeVertexNormals();
   const glass=new T.Mesh(g,new T.MeshStandardMaterial({color:0xcfe4ec,roughness:.08,metalness:.15,emissive:0x5d7a84,emissiveIntensity:.25,side:T.DoubleSide}));glass.name='aftermath-glass';group.add(glass);
   const neck=new T.Mesh(new T.CylinderGeometry(.03,.04,.2,8),new T.MeshStandardMaterial({color:0x2f6b3a,roughness:.15,emissive:0x163a1d,emissiveIntensity:.4}));neck.rotation.set(0,rnd()*Math.PI,Math.PI/2);neck.position.set(gx+.2,.04,gz-.1);group.add(neck);}
  if(marks.hurt&&after.stain){const [sx,sz]=after.stain,c=document.createElement('canvas');c.width=c.height=128;const cx=c.getContext('2d'),rnd=seeded(Math.round(sx*31+sz*7));
   for(let i=0;i<9;i++){const x=40+rnd()*48,y=40+rnd()*48,r=12+rnd()*26,gr=cx.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(58,10,8,.75)');gr.addColorStop(.7,'rgba(42,8,6,.45)');gr.addColorStop(1,'rgba(30,6,5,0)');cx.fillStyle=gr;cx.fillRect(0,0,128,128);}
   const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const stain=new T.Mesh(new T.PlaneGeometry(1.2,1.2),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}));stain.name='aftermath-stain';stain.rotation.x=-Math.PI/2;stain.position.set(sx,.014,sz);group.add(stain);}
 }
 const lab=developmentLook(world,renderer,group,floorMat,mats,true,{courtyard:true,pavingTexture:assets.pavingTexture,lights:lamps.map(([x,y,z])=>[x,y,z])});let clock=0;
 // The wet paving stops where the ground does.
 const wet=layout.floor&&group.getObjectByName('wet-paving');
 if(wet){const p=wet.geometry.parameters,x0=wet.position.x-p.width/2,x1=Math.min(wet.position.x+p.width/2,layout.floor[1]);wet.geometry.dispose();wet.geometry=metric(new T.PlaneGeometry(x1-x0,p.height),p.width,p.height);wet.position.x=(x0+x1)/2;}
 const look=new T.Vector3();
 const hidden=new T.Matrix4().makeScale(0,0,0);
 function cutaway(camera){camera.getWorldDirection(look);const h=Math.hypot(look.x,look.z)||1;let changed=false;
  for(const r of runs){const v=-(r.normal[0]*look.x+r.normal[1]*look.z)/h>-.1;if(v!==r.visible){r.visible=v;r.group.visible=v;changed=true;}}
  if(changed)for(const b of batches){b.owners.forEach((o,i)=>b.mesh.setMatrixAt(i,o&&!o.visible?hidden:b.matrices[i]));b.mesh.instanceMatrix.needsUpdate=true;}}
 return {name:LOCATIONS[id],setStyle(){},update(camera,...rest){cutaway(camera);return lab.update?.(camera,...rest);},beforeRender:lab.beforeRender,recover:lab.recover,tick(dt){clock+=dt;for(const s of signs){if(!s.flicker)continue;const on=Math.sin(clock*1.3)<.82||Math.sin(clock*23)>-.2;s.face.color.setScalar(on?1:.35);s.glow.material.opacity=on?s.base[0]:.12;s.spill.material.opacity=on?s.base[1]:.06;}wisps.forEach((s,i)=>{s.position.x=wispX+(i-2)*.7+Math.sin(clock*.17+i)*.4;s.material.opacity=.035+.015*Math.sin(clock*.3+i);});},metrics:()=>({location:id,kitBytes:assets.bytes,textureSizes:[assets.texture,assets.pavingTexture].map(t=>[t.image.width,t.image.height]),motifs:assets.manifest.motifs,instancedBatches:bins.size,development:lab.metrics(),lights:'3 practical spots / 1 shadow map + sky + passage spill',campaignSiteBound:false,signs:signs.length,aftermath:['tape','glass','stain'].filter(k=>group.getObjectByName('aftermath-'+k)||runs.some(r=>r.group.getObjectByName('aftermath-'+k))),runs:runs.length,hiddenRuns:runs.filter(r=>!r.visible).length}),aftermath(){}};
}
