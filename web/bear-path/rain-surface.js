import * as T from 'three';

// C.14 / After the Rain. Reproducible canvas maps + bounded analytic practical
// glints. These are stylized light reflections, not mirrors of scene geometry.
export function rainSurface(options={}){
  const make=()=>{const c=document.createElement('canvas');c.width=c.height=512;return c;};
  const albedo=make(),rough=make(),height=make(),a=albedo.getContext('2d'),r=rough.getContext('2d'),h=height.getContext('2d');
  let seed=1402;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  a.fillStyle='#202a30';a.fillRect(0,0,512,512);r.fillStyle='#ddd';r.fillRect(0,0,512,512);h.fillStyle='#404040';h.fillRect(0,0,512,512);
  for(let row=0;row<8;row++)for(let col=-1;col<6;col++){
    const x=col*102.4+(row%2)*51.2,y=row*64,n=Math.floor(random()*18),v=81+n;
    const shape=[[x+2,y+3],[x+99,y+1],[x+101,y+59],[x+97,y+63],[x+2,y+61]];
    const polygon=(ctx,color)=>{ctx.fillStyle=color;ctx.beginPath();shape.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.fill();};
    polygon(a,`rgb(${v-6},${v+2},${v+8})`);polygon(r,'#bcbcbc');polygon(h,'#bbbbbb');
    a.fillStyle='#a3aba5';a.globalAlpha=.26;a.fillRect(x+5,y+3,92,1);a.globalAlpha=1;
    for(let i=0;i<6;i++){const px=x+random()*98,py=y+5+random()*55;a.fillStyle=i%2?'#bbc3b9':'#26333a';a.globalAlpha=.09;a.fillRect(px,py,8+random()*24,2+random()*5);}a.globalAlpha=1;
  }
  // Broad irregular wet islands, repeated seamlessly; dry islands keep the
  // full ground from becoming a polished sheet. No texture-service dependency.
  for(let i=0;i<58;i++){
    const x=random()*512,y=random()*512,rx=12+random()*43,ry=5+random()*16;
    for(const ox of [-512,0,512])for(const oy of [-512,0,512]){
      r.fillStyle=i%3?'#464646':'#606060';r.beginPath();a.fillStyle='#142f3c';a.globalAlpha=.18;a.beginPath();
      for(let n=0;n<12;n++){const t=n*Math.PI/6,rad=.78+random()*.22,px=x+ox+Math.cos(t)*rx*rad,py=y+oy+Math.sin(t)*ry*rad;
        for(const ctx of [r,a])n?ctx.lineTo(px,py):ctx.moveTo(px,py);}
      r.closePath();r.fill();a.closePath();a.fill();a.globalAlpha=1;
    }
  }
  // Broken painterly marks disturb the highlight at a readable stone scale.
  for(let i=0;i<600;i++){r.fillStyle=i%3?'#707070':'#ababab';r.globalAlpha=.55;r.fillRect(random()*512,random()*512,3+random()*12,1+random()*2);}r.globalAlpha=1;
  const texture=(c,colorSpace)=>{const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(options.courtyard?4.2:2.8,options.courtyard?6.5:4.6);t.colorSpace=colorSpace;t.anisotropy=2;return t;};
  const map=texture(albedo,T.SRGBColorSpace),roughnessMap=texture(rough,T.NoColorSpace),bumpMap=texture(height,T.NoColorSpace);
  const material=new T.MeshStandardMaterial({map:options.pavingTexture||map,roughnessMap,bumpMap:options.pavingTexture||bumpMap,bumpScale:options.courtyard?.018:.004,color:options.courtyard?0x5d727e:0x999a91,roughness:options.courtyard?.7:1,metalness:options.courtyard?.12:0,envMapIntensity:options.courtyard?.85:.25});
  material.onBeforeCompile=shader=>{
    const lights=options.lights||[[-4.7,3.47,1.2],[5.9,3.47,5.8],[4.8,3.47,-2.1]];const vec=v=>'vec3('+v.map(n=>Number(n).toFixed(3)).join(',')+')';
    shader.vertexShader='varying vec3 rainWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nrainWorld=(modelMatrix*vec4(position,1.0)).xyz;');
    shader.fragmentShader=`varying vec3 rainWorld;
      float practicalGlint(vec3 p,vec3 ray){vec3 l=normalize(p-rainWorld);float aligned=max(0.0,dot(ray,l));return pow(aligned,42.0);}
      `+shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nfloat rainWet=1.0-smoothstep(.22,.60,roughnessFactor);\nroughnessFactor=max(.42,roughnessFactor);').replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        vec3 reflectedRay=reflect(normalize(rainWorld-cameraPosition),vec3(0.0,1.0,0.0));
        float wet=rainWet;
        float fracture=.35+.35*fract(sin(dot(floor(rainWorld.xz*vec2(11.0,24.0)),vec2(12.9898,78.233)))*43758.5453);
        float warm=practicalGlint(${vec(lights[0])},reflectedRay)+practicalGlint(${vec(lights[1])},reflectedRay);
        float cool=practicalGlint(${vec(lights[2])},reflectedRay);
        totalEmissiveRadiance+=wet*fracture*(vec3(1.0,.58,.22)*warm*${options.courtyard?.16:1.3}+vec3(.20,.50,.72)*cool*${options.courtyard?.1:.6});
      `);
  };
  if(options.courtyard){material.onBeforeCompile=()=>{};material.roughnessMap=null;material.roughness=.46;material.metalness=0;material.envMapIntensity=.55;}
  material.customProgramCacheKey=()=>'c15-rain-practicals-'+JSON.stringify({courtyard:!!options.courtyard,lights:options.lights});
  return {material,dispose(){map.dispose();roughnessMap.dispose();bumpMap.dispose();material.dispose();}};
}
