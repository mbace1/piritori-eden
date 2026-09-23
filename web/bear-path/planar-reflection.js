import * as T from 'three';

// A bounded static-environment reflection. Camera movement invalidates it;
// fighters and ground are excluded, and no second WebGL context is created.
// Oblique clipping follows the homogeneous plane construction also used by
// Three r167 Reflector. Using inverse projection keeps orthographic views valid.
export function planarReflection(renderer,world,group,paving,groundMaterial,beforeCapture){
 let size=renderer.shadowMap.enabled?256:128;
 const target=new T.WebGLRenderTarget(size,size,{type:T.HalfFloatType,depthBuffer:true});
 const matrix=new T.Matrix4(),bias=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
 const uniforms={wetReflection:{value:target.texture},wetReflectionMatrix:{value:matrix},wetReflectionPixel:{value:1/size}};
 const material=paving.material,original=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=(shader,r)=>{original.call(material,shader,r);Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='uniform mat4 wetReflectionMatrix; varying vec4 wetReflectionUV; varying vec3 wetWorld;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nwetWorld=(modelMatrix*vec4(transformed,1.0)).xyz;wetReflectionUV=wetReflectionMatrix*vec4(wetWorld,1.0);');
  shader.fragmentShader='uniform sampler2D wetReflection; uniform float wetReflectionPixel; varying vec4 wetReflectionUV; varying vec3 wetWorld;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`vec2 wetUV=wetReflectionUV.xy/wetReflectionUV.w;
   if(all(greaterThan(wetUV,vec2(0.0)))&&all(lessThan(wetUV,vec2(1.0)))){
    float spread=wetReflectionPixel*(.65+roughnessFactor);
    vec3 reflected=texture2D(wetReflection,wetUV).rgb*.4;
    reflected+=(texture2D(wetReflection,wetUV+vec2(spread,0.0)).rgb+texture2D(wetReflection,wetUV-vec2(spread,0.0)).rgb+texture2D(wetReflection,wetUV+vec2(0.0,spread)).rgb+texture2D(wetReflection,wetUV-vec2(0.0,spread)).rgb)*.15;
    float wetStrength=mix(.025,.38,1.0-smoothstep(.30,.62,roughnessFactor));
    outgoingLight=mix(outgoingLight,reflected,wetStrength);
   }
   #include <opaque_fragment>`);
 };
 material.customProgramCacheKey=()=>key+'-c16-planar';material.needsUpdate=true;
 let last='',captures=0,lastTime=-Infinity;
 function render(camera){
  const budget=renderer.shadowMap.enabled?256:128;if(size!==budget){size=budget;target.setSize(size,size);uniforms.wetReflectionPixel.value=1/size;last='';}
  const time=performance.now();camera.updateMatrixWorld();const stamp=[...camera.matrixWorld.elements,...camera.projectionMatrix.elements].map(v=>v.toFixed(3)).join(',');
  if(stamp===last||time-lastTime<100)return;
  const mirror=camera.clone();mirror.position.copy(camera.position);mirror.position.y=.012-camera.position.y;
  const direction=new T.Vector3();camera.getWorldDirection(direction);direction.y=-direction.y;mirror.up.copy(camera.up);mirror.up.y=-mirror.up.y;mirror.lookAt(mirror.position.clone().add(direction));mirror.updateMatrixWorld();
  matrix.copy(bias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
  const plane=new T.Plane(new T.Vector3(0,1,0),-.006).applyMatrix4(mirror.matrixWorldInverse),clip=new T.Vector4(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
  const q=new T.Vector4(Math.sign(clip.x),Math.sign(clip.y),1,1).applyMatrix4(mirror.projectionMatrix.clone().invert());clip.multiplyScalar(2/clip.dot(q));const p=mirror.projectionMatrix.elements;
  p[2]=clip.x-p[3];p[6]=clip.y-p[7];p[10]=clip.z-p[11];p[14]=clip.w-p[15];mirror.projectionMatrixInverse.copy(mirror.projectionMatrix).invert();
  const hidden=[];world.traverse(o=>{if(o.visible&&((o.parent===world&&o.isGroup&&o!==group)||(o.isMesh&&(o===paving||o.material===groundMaterial)))){hidden.push(o);o.visible=false;}});
  const restoreCutaways=beforeCapture(),oldTarget=renderer.getRenderTarget(),tone=renderer.toneMapping,auto=renderer.shadowMap.autoUpdate,needs=renderer.shadowMap.needsUpdate;
  try{renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;renderer.toneMapping=T.NoToneMapping;renderer.setRenderTarget(target);renderer.clear();renderer.render(world,mirror);last=stamp;lastTime=time;captures++;}
  finally{renderer.setRenderTarget(oldTarget);renderer.toneMapping=tone;renderer.shadowMap.autoUpdate=auto;renderer.shadowMap.needsUpdate=needs;for(const o of hidden)o.visible=true;restoreCutaways();}
 }
 return{render,reset(){last='';lastTime=-Infinity;},metrics:()=>({method:'static-scenery planar',size,captures,actorsReflected:false,update:'camera change, at most 10 Hz'}),dispose(){target.dispose();}};
}
