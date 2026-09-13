import * as T from 'three';
import {GLTFLoader} from '../vendor/jsm/loaders/GLTFLoader.js';
import {limitTextures} from '../fight-module/render-profile.js?v=2';

// IDs, byte lengths and hashes bind this scene to versioned runtime derivatives.
export async function loadParkAssets(manifest,profile){
 async function asset(id){
  const entry=manifest.assets.find(a=>a.id===id);if(!entry)throw Error('Missing park asset '+id);
  const url=new URL(entry.file,new URL('../../art/v3/',import.meta.url));
  const response=await fetch(url);if(!response.ok)throw Error('Park asset download '+response.status);
  const bytes=await response.arrayBuffer();if(bytes.byteLength!==entry.bytes)throw Error('Incomplete park asset '+id);
  if(crypto.subtle){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(hash!==entry.sha256)throw Error('Park asset version mismatch '+id);}
  return {entry,bytes,url};
 }
 const [bear,ground]=await Promise.all([asset('prop-karhupuisto-bear-v01'),asset('surface-karhupuisto-gravel-v01')]);
 const model=await new GLTFLoader().parseAsync(bear.bytes,new URL('.',bear.url).href);
 const objectURL=URL.createObjectURL(new Blob([ground.bytes],{type:'image/png'}));
 let texture;try{texture=await new T.TextureLoader().loadAsync(objectURL);}finally{URL.revokeObjectURL(objectURL);}
 texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(7,8);texture.anisotropy=2;
 const proxy=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:texture}));limitTextures(proxy,Math.min(profile.textureSize,1024));proxy.geometry.dispose();proxy.material.dispose();
 return {bear:model.scene,ground:texture,triangles:bear.entry.triangle_count,bytes:bear.bytes.byteLength+ground.bytes.byteLength};
}
