import * as T from 'three';
import {GLTFLoader} from '../vendor/jsm/loaders/GLTFLoader.js';
import {limitTextures} from './render-profile.js?v=1';

export async function loadFighters(manifest,{textureSize=2048}={}) {
  const loader=new GLTFLoader(), templates=new Map();
  for(const id of ['cast3d-f01-heavy-bruiser-v05','cast3d-f02-wiry-skirmisher-v05']){
    const asset=manifest.assets.find(a=>a.id===id);if(!asset)throw Error('Missing registered fighter '+id);
    const url=new URL(asset.file,new URL('../../art/v3/',import.meta.url)),response=await fetch(url);if(!response.ok)throw Error('Fighter download failed: '+response.status);
    const bytes=await response.arrayBuffer();if(bytes.byteLength!==asset.bytes)throw Error('Incomplete fighter download');
    if(crypto.subtle){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(hash!==asset.sha256)throw Error('Fighter version mismatch');}
    const template=await loader.parseAsync(bytes,new URL('.',url).href);
    limitTextures(template.scene,textureSize);templates.set(id,template);
  }return templates;
}

function cloneSkin(source){
  const copy=source.clone(true),map=new Map();
  function pair(a,b){map.set(a,b);a.children.forEach((n,i)=>pair(n,b.children[i]));}pair(source,copy);
  source.traverse(n=>{if(n.isSkinnedMesh){const dst=map.get(n);dst.skeleton=n.skeleton.clone();dst.skeleton.bones=n.skeleton.bones.map(b=>map.get(b));dst.bindMatrix.copy(n.bindMatrix);dst.bindMatrixInverse.copy(n.bindMatrixInverse);}});return copy;
}
const v=()=>new T.Vector3();
export function makeActor(template,unit,world){
  const group=new T.Group(),body=cloneSkin(template.scene);group.add(body);world.add(group);group.userData.unitId=unit.id;
  const bones=new Map();body.traverse(n=>{if(n.isBone)bones.set(n.name,n);if(n.isMesh){n.castShadow=n.receiveShadow=true;n.frustumCulled=false;}});
  body.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(body,true);body.scale.multiplyScalar(1.88/bounds.getSize(v()).y);body.updateMatrixWorld(true);const box=new T.Box3().setFromObject(body,true);body.position.y-=box.min.y;body.position.x-=box.getCenter(v()).x;body.position.z-=box.getCenter(v()).z;
  // Garment tint follows clothing-weighted vertices, preserving face/hands.
  body.traverse(n=>{if(!n.isSkinnedMesh)return;n.geometry=n.geometry.clone();n.material=n.material.clone();const g=n.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,colors=new Float32Array(g.attributes.position.count*3),tint=new T.Color(unit.side==='player'?0xa7d0c4:0xd7aa9b);for(let i=0;i<g.attributes.position.count;i++){let mask=0;for(let k=0;k<4;k++){const name=n.skeleton.bones[si.array[i*4+k]]?.name??'';if(/Spine|Hips|Shoulder|Arm|UpLeg|^LeftLeg$|^RightLeg$/.test(name))mask+=sw.array[i*4+k];}const c=new T.Color(1,1,1).lerp(tint,Math.min(1,mask)*.85);c.toArray(colors,i*3);}g.setAttribute('color',new T.BufferAttribute(colors,3));n.material.vertexColors=true;});
  const mixer=new T.AnimationMixer(body),actions=Object.fromEntries(template.animations.map(c=>[c.name,mixer.clipAction(c)]));
  actions['alert-idle'].play();mixer.update(0);body.updateMatrixWorld(true);
  const hips=bones.get('Hips'),rootXZ={x:hips.position.x,z:hips.position.z};
  const handClip=template.animations.find(c=>c.name==='hand-open-fist-grip');const hands=[];
  for(const t of handClip.tracks){const [name,property]=t.name.split('.');if(/Hand(?:Thumb|Index|Middle|Ring|Pinky)/.test(name)&&property==='quaternion')hands.push({bone:bones.get(name),sample:t.createInterpolant()});}
  const ring=new T.Mesh(new T.RingGeometry(.35,.40,32),new T.MeshBasicMaterial({color:unit.side==='player'?0x8fc5ae:0xe3a18a,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;group.add(ring);
  // Props are world-unit proxies attached through the verified grip joint.
  const prop=new T.Group();world.add(prop);const material=new T.MeshStandardMaterial({color:unit.equipment.includes('handgun')?0x323b3d:0x725b3f,roughness:.88});
  const shape=unit.equipment.includes('handgun')?new T.BoxGeometry(.055,.14,.18):unit.equipment==='folding-knife'?new T.BoxGeometry(.025,.27,.045):new T.CylinderGeometry(.032,.022,.62,8);
  const mesh=new T.Mesh(shape,material);mesh.position.y=unit.equipment==='folding-knife'?.08:.17;prop.add(mesh);prop.visible=false;
  const actor={id:unit.id,group,body,bones,mixer,actions,hands,rootXZ,ring,prop,unit,mode:'idle',motion:null,down:false,elapsed:0};
  actor.play=(mode,duration=.8)=>{actor.mode=mode;actor.elapsed=0;actor.duration=duration;const name=mode==='walk'?'casual-walk':'alert-idle';for(const [key,a] of Object.entries(actions)){if(key===name)a.reset().fadeIn(.12).play();else a.fadeOut(.12);}actor.prop.visible=['strike','shoot','grip'].includes(mode);};
  return actor;
}

function aimBone(bone,child,point,weight){
  if(!bone||!child)return;bone.updateWorldMatrix(true,true);const origin=bone.getWorldPosition(v()),now=child.getWorldPosition(v()).sub(origin),wanted=point.clone().sub(origin);if(now.lengthSq()<1e-8||wanted.lengthSq()<1e-8)return;
  const delta=new T.Quaternion().setFromUnitVectors(now.normalize(),wanted.normalize()),world=bone.getWorldQuaternion(new T.Quaternion()).premultiply(delta),parent=bone.parent.getWorldQuaternion(new T.Quaternion()).invert(),local=parent.multiply(world);bone.quaternion.slerp(local,weight);bone.updateWorldMatrix(false,true);
}
function arm(actor,side,target,weight=1){
  const shoulder=actor.bones.get(side+'Arm'),elbow=actor.bones.get(side+'ForeArm'),hand=actor.bones.get(side+'Hand');if(!shoulder||!elbow||!hand)return;
  const s=shoulder.getWorldPosition(v()),e=elbow.getWorldPosition(v()),w=hand.getWorldPosition(v());const upper=s.distanceTo(e),lower=e.distanceTo(w),d=target.clone().sub(s),length=T.MathUtils.clamp(d.length(),Math.abs(upper-lower)+.005,upper+lower-.005);d.normalize();const wrist=s.clone().addScaledVector(d,length);
  const pole=actor.group.localToWorld(new T.Vector3(side==='Left'?.8:-.8,.85,.15)).sub(s);pole.addScaledVector(d,-pole.dot(d)).normalize();const along=(upper*upper-lower*lower+length*length)/(2*length),height=Math.sqrt(Math.max(0,upper*upper-along*along));const bent=s.clone().addScaledVector(d,along).addScaledVector(pole,height);
  aimBone(shoulder,elbow,bent,weight);aimBone(elbow,hand,wrist,weight);
}
export function updateActor(a,dt){
  a.elapsed+=dt;a.mixer.update(dt);const hips=a.bones.get('Hips');hips.position.x=a.rootXZ.x;hips.position.z=a.rootXZ.z;a.body.updateMatrixWorld(true);
  const t=Math.min(1,a.elapsed/(a.duration||1)),pulse=Math.sin(Math.PI*t),local=(x,y,z)=>a.group.localToWorld(new T.Vector3(x,y,z));
  const fingers=mode=>{const time=mode==='grip'?2.8:1.4;for(const h of a.hands)if(h.bone)h.bone.quaternion.fromArray(h.sample.evaluate(time));};
  if(['strike','shoot','brace','item','talk','grip'].includes(a.mode)){
    const weight=a.mode==='grip'?1:Math.min(1,t*7,(1-t)*7);
    if(a.mode==='brace'){arm(a,'Left',local(.22,1.40,.25),weight);arm(a,'Right',local(-.20,1.40,.32),weight);fingers('fist');}
    if(a.mode==='strike'){arm(a,'Right',local(-.12,1.2,.23+Math.sin(Math.PI*Math.min(1,t*1.4))*.5),weight);arm(a,'Left',local(.20,1.3,.2),weight);fingers('grip');}
    if(a.mode==='shoot'||a.mode==='grip'){arm(a,'Right',local(-.12,1.35,.62),weight);arm(a,'Left',local(.14,1.3,.38),weight);fingers('grip');}
    if(a.mode==='item'){arm(a,'Left',local(.12,1.15,.15),weight);arm(a,'Right',local(.2,1.15,.18),weight);}
    if(a.mode==='talk'){arm(a,'Right',local(-.30,1.25,.32),weight);}
  }
  if(a.mode==='hit'){a.body.rotation.x=-pulse*.12;}
  else a.body.rotation.x=0;
  if(a.mode==='down'||a.down){a.down=true;a.body.rotation.x=-Math.PI/2*Math.min(1,t);a.body.position.y=.10*Math.min(1,t);}
  a.body.updateMatrixWorld(true);
  if(a.prop.visible){const grip=a.bones.get('grip_right');grip.getWorldPosition(a.prop.position);grip.getWorldQuaternion(a.prop.quaternion);}
}
export function disposeActor(a){a.mixer.stopAllAction();a.mixer.uncacheRoot(a.body);const skins=new Set();a.body.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}if(n.skeleton)skins.add(n.skeleton);});for(const skin of skins)skin.dispose();a.ring.geometry.dispose();a.ring.material.dispose();a.prop.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});a.group.removeFromParent();a.prop.removeFromParent();}

