import * as T from 'three';
import {GLTFLoader} from '../vendor/jsm/loaders/GLTFLoader.js';
import {EDGES} from '../fight-module/cover-edges.js?v=1';
import {developmentLook} from '../bear-path/development-look.js?v=5';

export const LOCATIONS={courtyard:'Porttikongi · rain courtyard',yard:'Linjat · service yard',park:'Karhupuisto · park'};
export function locationId(){const id=new URLSearchParams(location.search).get('arena');return Object.hasOwn(LOCATIONS,id)?id:'courtyard';}
export async function loadLocationAssets(){
 const base=new URL('./assets/',import.meta.url),manifest=await fetch(new URL('kallio-kit-v01.manifest.json',base)).then(r=>{if(!r.ok)throw Error('Scenery register unavailable');return r.json();});
 async function bytes(file){const e=manifest.files.find(e=>e.file===file);if(!e)throw Error('Unregistered scenery');const r=await fetch(new URL(file,base));if(!r.ok)throw Error('Scenery download failed');const b=await r.arrayBuffer();if(b.byteLength!==e.bytes)throw Error('Scenery download incomplete');if(crypto.subtle){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),n=>n.toString(16).padStart(2,'0')).join('');if(hash!==e.sha256)throw Error('Scenery version mismatch');}return b;}
 const [glb,png,paving]=await Promise.all([bytes('kallio-kit-v01.glb'),bytes('painted-plaster-v01.png'),bytes('painted-setts-v01.png')]);
 const model=await new GLTFLoader().parseAsync(glb,base.href),url=URL.createObjectURL(new Blob([png],{type:'image/png'}));let texture;
 try{texture=await new T.TextureLoader().loadAsync(url);}finally{URL.revokeObjectURL(url);}
 texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=2;
 const pavingURL=URL.createObjectURL(new Blob([paving],{type:'image/png'}));let pavingTexture;try{pavingTexture=await new T.TextureLoader().loadAsync(pavingURL);}finally{URL.revokeObjectURL(pavingURL);}pavingTexture.colorSpace=T.SRGBColorSpace;pavingTexture.wrapS=pavingTexture.wrapT=T.RepeatWrapping;pavingTexture.repeat.set(2.7,3.6);pavingTexture.anisotropy=2;return {model:model.scene,texture,pavingTexture,bytes:glb.byteLength+png.byteLength+paving.byteLength,manifest};
}

// Fictional visual pilots grounded in the atlas, not campaign site dispatch.
// Tactical cover is built from the resolver's map, never inferred from scenery.
export function buildLocation(world,renderer,cover,position,assets,id){
 const yard=id==='yard',group=new T.Group();group.name=id;world.add(group);
 world.background=new T.Color('#0c1922');world.fog=new T.Fog('#173040',22,50);renderer.toneMappingExposure=1.02;
 const hemi=new T.HemisphereLight(0xa4bfd0,0x344343,.63),moon=new T.DirectionalLight(0xb9d4e1,1.05);moon.position.set(-5,11,6);world.add(hemi,moon);
 const model=assets.model;model.updateMatrixWorld(true);const mats={},bins=new Map(),dummy=new T.Object3D();
 model.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(!mats[m.name]){const n=m.clone();if(['plaster','stone','brick'].includes(m.name)){n.map=assets.texture;n.roughness=.79;}if(m.name==='plaster')n.color.setHex(0xc3b9a2);if(m.name==='stone')n.color.setHex(0x858e89);if(m.name==='brick')n.color.setHex(yard?0x967760:0x9a8674);if(m.name==='lit'){n.emissive.setHex(0xffb75e);n.emissiveIntensity=.75;}mats[m.name]=n;}});
 mats.granite=mats.stone;
 function put(name,x,y,z,rotation=0,scale=1){const motif=model.getObjectByName(name);if(!motif)throw Error('Missing Blender motif '+name);dummy.position.set(x,y,z);dummy.rotation.set(0,rotation,0);dummy.scale.setScalar(scale);dummy.updateMatrix();const placement=dummy.matrix.clone();
  motif.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+':'+o.material.name;if(!bins.has(key))bins.set(key,{geometry:o.geometry,material:mats[o.material.name],matrices:[]});bins.get(key).matrices.push(placement.clone().multiply(o.matrixWorld));});
 }
 if(!yard){
  put('archway',0,0,-7.7);
  for(const x of [-7.6,-4.6,4.6,7.6])put('facade_bay',x,0,-7.7);
  for(const z of [-4.55,-1.55,1.45])put('facade_bay',-6.4,0,z,Math.PI/2);
  for(const x of [-4.6,4.6])put('balcony',x,3.7,-7.2);
  put('facade_bay',7.6,0,-4.7);put('balcony',7.6,3.7,-4.2);put('bike_rack',-4.5,0,-6.5);put('vent',-5.9,1.3,-3,Math.PI/2);
  put('pallets',5.8,0,2.4);put('container',-5.25,0,2.15);put('container',-5.25,0,3.3);
 }else{
  for(const x of [-7,-3,1,5,9])put('service_bay',x,0,-8.4);
  for(const z of [-4.8,-.8])put('service_bay',-7,0,z,Math.PI/2);
  for(const x of [-7,-4,-1,2,5,8])put('facade_bay',x,0,-13);
  put('pallets',-5.8,0,2.4);put('pallets',-5.8,.5,2.4);put('pallets',5.5,0,-5.6);
  for(const z of [-3,-1.8,0])put('container',6.5,0,z);put('bike_rack',-5.4,0,-6.5);
 }
 put('bicycle',-4.9,0,-6.25,.14);put('bicycle',-3.7,0,-6.35,-.08);put('drain',4.2,0,2.9);
 for(const [cell,v]of cover){const p=position(cell);if(v.hardBlock)put('container',p.x,0,p.z);else{const [dx,dy]=EDGES[v.edge];put('low_wall',p.x+dx*.585,0,p.z-dy*.585,dx?Math.PI/2:0);}}
 const lamps=yard?[[-4.5,3.2,-7.4,0],[4,3.2,-7.4,0],[-6.4,3.2,.4,Math.PI/2]]:[[-4.6,3.2,-7.1,0],[4.6,3.2,-7.1,0],[-5.9,3.6,1.1,Math.PI/2]];
 for(const [x,y,z,r]of lamps)put('lamp',x,y,z,r);
 for(const bin of bins.values()){const mesh=new T.InstancedMesh(bin.geometry,bin.material,bin.matrices.length);bin.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=bin.material!==mats.lit;mesh.receiveShadow=true;group.add(mesh);}
 const floorMat=new T.MeshStandardMaterial({color:0x3b474a,roughness:.7,map:assets.texture}),floor=new T.Mesh(new T.PlaneGeometry(46,50),floorMat);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;group.add(floor);
 // One shadowed practical. Other pools and the sky fill have no shadow maps.
 for(const [i,[x,y,z,r]]of lamps.entries()){
  const light=new T.SpotLight(i===1&&yard?0x9bc4d2:0xffc481,i===2?52:40,19,.95,.85,1.6);light.position.set(x+(r?.5:0),y,z+(r?0:.55));light.target.position.set(x*.20,0,z*.22);light.castShadow=i===2;light.shadow.mapSize.set(1024,1024);light.shadow.normalBias=.035;world.add(light,light.target);
 }
 const rear=new T.PointLight(0xffbd73,24,9,2);rear.position.set(yard?1:0,2.5,yard?-7.1:-8);world.add(rear);
 const cc=document.createElement('canvas');cc.width=cc.height=64;const cx=cc.getContext('2d'),g=cx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,222,170,.7)');g.addColorStop(.2,'rgba(255,190,110,.18)');g.addColorStop(1,'rgba(255,170,80,0)');cx.fillStyle=g;cx.fillRect(0,0,64,64);
 const glowMap=new T.CanvasTexture(cc),glowMat=new T.SpriteMaterial({map:glowMap,blending:T.AdditiveBlending,depthWrite:false,opacity:.65});
 for(const [x,y,z,r]of lamps){const s=new T.Sprite(glowMat);s.position.set(x+(r?.36:0),y-.12,z+(r?0:.36));s.scale.set(2,2,1);group.add(s);}
 // Local wisps at the far service passage, never a full-screen white wash.
 const wisps=[];for(let i=0;i<5;i++){const m=new T.SpriteMaterial({map:glowMap,color:0x77949d,transparent:true,opacity:.055,depthWrite:false});const s=new T.Sprite(m);s.position.set((yard?1:0)+(i-2)*.7,.4,yard?-6.8:-6.5);s.scale.set(2.5,.65,1);group.add(s);wisps.push(s);}
 const lab=developmentLook(world,renderer,group,floorMat,mats,true,{courtyard:true,pavingTexture:assets.pavingTexture,lights:lamps.map(([x,y,z])=>[x,y,z])});let clock=0;
 return {name:LOCATIONS[id],setStyle(){},update:lab.update,recover:lab.recover,tick(dt){clock+=dt;wisps.forEach((s,i)=>{s.position.x=(yard?1:0)+(i-2)*.7+Math.sin(clock*.17+i)*.4;s.material.opacity=.035+.015*Math.sin(clock*.3+i);});},metrics:()=>({location:id,kitBytes:assets.bytes,motifs:assets.manifest.motifs,instancedBatches:bins.size,development:lab.metrics(),lights:'3 practical spots / 1 shadow map + sky + passage spill',campaignSiteBound:false}),aftermath(){}};
}
