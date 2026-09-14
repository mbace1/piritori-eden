import * as T from 'three';
import {makeStandIn} from '../fight-module/stand-in.js?v=7';

// Identification portraits use the actual development figure, never an
// unrelated approved face or a generated promise of higher character fidelity.
// Reuse the scene's renderer: no second WebGL context, retained GPU targets or
// network image service. Each portrait is rendered once per outfit and cached.
export function portraitStudio(renderer){
 const cache=new Map();
 return unit=>{
  const key=[unit.id,unit.color,unit.role,unit.equipment].join(':');
  if(cache.has(key))return cache.get(key);
  if(renderer.getContext().isContextLost())return '';
  const scene=new T.Scene();scene.background=new T.Color('#242b30');
  scene.add(new T.HemisphereLight(0xb6c6d0,0x1e2022,1.6));
  const keyLight=new T.DirectionalLight(0xffd4a0,3);keyLight.position.set(-2,3,4);scene.add(keyLight);
  const rim=new T.DirectionalLight(0x7cc3cd,1.2);rim.position.set(2,2,-2);scene.add(rim);
  const actor=makeStandIn({...unit,side:'player'},scene);actor.group.rotation.y=-.36;actor.ring.visible=actor.shadow.visible=false;
  const camera=new T.OrthographicCamera(-.47,.47,.55,-.55,.1,10);camera.position.set(0,1.43,4);camera.lookAt(0,1.43,0);
  const width=160,height=188,target=new T.WebGLRenderTarget(width,height),pixels=new Uint8Array(width*height*4);
  const previous=renderer.getRenderTarget(),clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha(),auto=renderer.autoClear;
  try{
   renderer.autoClear=true;renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d'),data=ctx.createImageData(width,height);
   // Render-target pixels are linear; encode display sRGB before making a PNG.
   // Without this, identification cards falsely darken skin and coat colours.
   const srgb=n=>Math.round(255*(n<=.0031308?n*12.92:1.055*Math.pow(n,1/2.4)-.055));
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){const from=((height-y-1)*width+x)*4,to=(y*width+x)*4;for(let c=0;c<3;c++)data.data[to+c]=srgb(pixels[from+c]/255);data.data[to+3]=pixels[from+3];}
   ctx.putImageData(data,0,0);const url=canvas.toDataURL('image/png');cache.set(key,url);return url;
  }finally{renderer.setRenderTarget(previous);renderer.setClearColor(clear,alpha);renderer.autoClear=auto;target.dispose();actor.dispose();}
 };
}
