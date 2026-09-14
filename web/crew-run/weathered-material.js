// Shared, world-scaled plaster and paint treatment for the static Blender kit.
// It changes appearance only; no textures, render targets or scene objects.
export function weatheredMaterial(material,name){
 const masonry=['plaster','stone','brick'].includes(name),paint=['green','iron'].includes(name);
 if(!masonry&&!paint)return;
 const original=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=(shader,r)=>{original.call(material,shader,r);
  shader.vertexShader='varying vec3 weatherWorld;\n'+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vec4 weatherPos=vec4(transformed,1.0);
   #ifdef USE_INSTANCING
   weatherPos=instanceMatrix*weatherPos;
   #endif
   weatherWorld=(modelMatrix*weatherPos).xyz;
  `);
  shader.fragmentShader=`varying vec3 weatherWorld;
   float wearHash(vec2 p){return fract(sin(dot(p,vec2(41.7,289.1)))*45758.5453);}
   float wearNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(wearHash(i),wearHash(i+vec2(1,0)),f.x),mix(wearHash(i+vec2(0,1)),wearHash(i+vec2(1,1)),f.x),f.y);}
   `+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 wall=vec2(weatherWorld.x+weatherWorld.z,weatherWorld.y);
    float stain=.6*wearNoise(wall*vec2(2.9,.8))+.4*wearNoise(wall*vec2(9.0,1.3));
    float baseDamp=(1.0-smoothstep(.1,1.3,weatherWorld.y))*smoothstep(.24,.74,stain);
    float mottling=wearNoise(wall*3.8);
    diffuseColor.rgb*=mix(${masonry?'.77,1.12':'.87,1.06'},mottling)*(1.0-baseDamp*${masonry?'.26':'.13'});
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.82,.88,.78),smoothstep(.51,.78,stain)*${masonry?'.50':'.24'});
   `);
 };
 material.customProgramCacheKey=()=>key+'-c16-wear-'+name;material.needsUpdate=true;
}
