import * as T from 'three';
import {rainSurface} from './rain-surface.js?v=2';

// C.09 arena laboratory. This is an authored low-cost light probe, not live
// reflections or the Dream Loop demo's renderer. No external asset service.
export function developmentLook(world,renderer,group,groundMaterial,mats,directed=false,surfaceOptions={}){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
  const cx=canvas.getContext('2d'),sky=cx.createLinearGradient(0,0,0,128);
  sky.addColorStop(0,directed?'#41647b':'#7797bb');sky.addColorStop(.48,directed?'#314b59':'#516b80');sky.addColorStop(.55,'#1c282b');sky.addColorStop(1,'#182320');cx.fillStyle=sky;cx.fillRect(0,0,256,128);
  for(const [x,y,w,h] of [[38,42,10,17],[172,43,14,14],[112,53,5,7]]){cx.fillStyle='#ffde9c';cx.fillRect(x,y,w,h);}
  const source=new T.CanvasTexture(canvas);source.mapping=T.EquirectangularReflectionMapping;source.colorSpace=T.SRGBColorSpace;
  let probe;
  function rebuildProbe(){
    probe?.dispose();const generator=new T.PMREMGenerator(renderer);
    if(surfaceOptions.courtyard){
      // Capture only this static stage, once. No actors, floor feedback or
      // per-frame reflector. Rebuilt only after graphics-context restoration.
      const hidden=[];world.traverse(o=>{if(o.visible&&((o.parent===world&&o.isGroup&&o!==group)||(o.isMesh&&(o.material===groundMaterial||o.name==='wet-paving')))){hidden.push(o);o.visible=false;}});
      const oldEnvironment=world.environment;world.environment=null;
      const cube=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});const eye=new T.CubeCamera(.1,55,cube);eye.position.set(0,1.4,-1.4);
      try{eye.update(renderer,world);probe=generator.fromCubemap(cube.texture);}finally{cube.dispose();for(const o of hidden)o.visible=true;world.environment=oldEnvironment;}
    }else probe=generator.fromEquirectangular(source);
    world.environment=probe.texture;generator.dispose();
  }
  rebuildProbe();
  const tile=document.createElement('canvas');tile.width=tile.height=256;const tx=tile.getContext('2d');
  let seed=71;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  tx.fillStyle='#202b30';tx.fillRect(0,0,256,256);
  for(let y=0;y<4;y++)for(let x=-1;x<4;x++){const light=105+Math.floor(random()*28),px=x*85+(y%2)*42;
    tx.fillStyle=`rgb(${light},${light+6},${light+9})`;tx.fillRect(px+1,y*64+1,82,61);
    tx.fillStyle='#9da6a5';tx.fillRect(px+3,y*64+2,78,1);
    for(let i=0;i<28;i++){tx.fillStyle=random()>.5?'#909d9b':'#5c686c';tx.globalAlpha=.13;tx.fillRect(px+random()*81,y*64+random()*61,2+random()*6,1);}tx.globalAlpha=1;
  }
  const map=new T.CanvasTexture(tile);map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(4,6);map.colorSpace=T.SRGBColorSpace;map.anisotropy=2;
  const bump=map.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;
  let surface=new T.MeshStandardMaterial({map,bumpMap:bump,bumpScale:.022,color:directed?0x7d817b:0x8c9caa,roughness:.45,metalness:directed?.06:.12,envMapIntensity:directed?.75:1.15});
  surface.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 pavementWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npavementWorld=(modelMatrix*vec4(position,1.0)).xyz;');
    shader.fragmentShader='varying vec3 pavementWorld;\n'+shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat wet=sin(pavementWorld.x*1.7+sin(pavementWorld.z*.8))*sin(pavementWorld.z*1.3);\nroughnessFactor=mix(.20,.74,smoothstep(-.35,.4,wet));');
  };
  const rain=directed?rainSurface(surfaceOptions):null;if(rain){surface.dispose();surface=rain.material;}
  const paving=new T.Mesh(new T.PlaneGeometry(surfaceOptions.courtyard?20:8.8,surfaceOptions.courtyard?26:15.8),surface);paving.name='wet-paving';paving.rotation.x=-Math.PI/2;paving.position.set(0,.006,-.5);paving.receiveShadow=true;group.add(paving);
  for(const key of ['iron','granite','stone']){mats[key].roughness=key==='iron'?.38:.68;mats[key].envMapIntensity=.6;}

  // Ortho view-space cutaway around every fighter. Only scenery fragments in
  // front of the figure disappear; cover/raycast/game state remain untouched.
  const people={value:Array.from({length:12},()=>new T.Vector4(0,0,-1000,0))},count={value:0};
  const focusStart={value:new T.Vector4(0,0,0,0)},focusEnd={value:new T.Vector3()};
  const modified=new Set();
  group.traverse(object=>{if(!object.isMesh||object===paving)return;
    for(const material of [].concat(object.material)){if(modified.has(material)||material===groundMaterial)continue;modified.add(material);
      const foliage=[mats.bark,mats.scar,mats.goldFoliage,mats.ochreFoliage,mats.oliveFoliage].includes(material);
      const original=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
      const priorKey=cache();material.onBeforeCompile=(shader,r)=>{original.call(material,shader,r);shader.uniforms.labPeople=people;shader.uniforms.labCount=count;shader.uniforms.labFocusStart=focusStart;shader.uniforms.labFocusEnd=focusEnd;
        shader.vertexShader='varying vec3 labView;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nlabView=mvPosition.xyz;');
        shader.fragmentShader='uniform vec4 labFocusStart;\nuniform vec3 labFocusEnd;\nvarying vec3 labView;\nuniform vec4 labPeople[12];\nuniform int labCount;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
          ${foliage?`if(labFocusStart.w>0.0){
            vec2 corridor=labFocusEnd.xy-labFocusStart.xy;
            float t=clamp(dot(labView.xy-labFocusStart.xy,corridor)/max(.001,dot(corridor,corridor)),0.0,1.0);
            vec3 onLine=mix(labFocusStart.xyz,labFocusEnd,t);
            if(length(labView.xy-onLine.xy)<1.15 && labView.z>onLine.z-.5)discard;
          }`:''}
          for(int i=0;i<12;i++){if(i>=labCount)break;vec4 person=labPeople[i];
            vec2 delta=(labView.xy-person.xy)/vec2(.72,person.w);
            float mask=1.0-smoothstep(.78,1.0,length(delta));
            float dither=fract(dot(floor(gl_FragCoord.xy),vec2(.75487766,.56984029)));
            // Include the figure's full view-depth extent. A centre-only
            // threshold left near benches covering legs at back-row cells.
            if(labView.z>person.z-.95 && mask>dither)discard;
          }`);
      };material.customProgramCacheKey=()=>priorKey+'-c14-cutaway-'+(foliage?'foliage':'solid');material.needsUpdate=true;
    }
  });
  const point=new T.Vector3();let tracked=[];
  function update(camera,actors=tracked,focus=null){tracked=actors;camera.updateMatrixWorld();focusStart.value.w=focus?1:0;
    if(focus){point.copy(focus.from).setY(1.1).applyMatrix4(camera.matrixWorldInverse);focusStart.value.set(point.x,point.y,point.z,1);focusEnd.value.copy(focus.to).setY(1.1).applyMatrix4(camera.matrixWorldInverse);}
    actors=actors.filter(a=>a.group.visible);camera.updateMatrixWorld();count.value=Math.min(12,actors.length);for(let i=0;i<count.value;i++){const a=actors[i];point.copy(a.group.position).add(new T.Vector3(0,a.down?.3:.96,0)).applyMatrix4(camera.matrixWorldInverse);people.value[i].set(point.x,point.y,point.z,a.down?.75:1.14);}}
  return {update,recover:rebuildProbe,metrics:()=>({lightProbe:surfaceOptions.courtyard?'static scenery 128px cubemap / once at load and context recovery':'authored 256x128 sky/practical PMREM',liveReflections:false,pavement:surfaceOptions.courtyard?'generated painted setts / roughness + practical glints':directed?'After the Rain / 512px albedo, roughness, bump; analytic lamp glints':'shared albedo/bump + variable wet roughness',cutawayActors:count.value,cutawayMaterials:modified.size}),dispose(){rain?.dispose();probe.dispose();source.dispose();map.dispose();bump.dispose();surface.dispose();paving.geometry.dispose();}};
}
