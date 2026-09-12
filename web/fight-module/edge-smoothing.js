import * as T from 'three';
import {FXAAShader} from '../vendor/jsm/shaders/FXAAShader.js';

// Run after the opaque scene has been tone-mapped into the default framebuffer.
// Copy its encoded pixels once; do not add HDR/depth targets or supersampling.
// This pass deliberately does not perform a second color-space conversion.
export function createEdgeSmoothing(renderer) {
  const scene=new T.Scene(),camera=new T.Camera(),size=new T.Vector2();
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute([0,0,2,0,0,2],2));
  const uniforms=T.UniformsUtils.clone(FXAAShader.uniforms);
  const material=new T.ShaderMaterial({uniforms,vertexShader:FXAAShader.vertexShader,
    fragmentShader:FXAAShader.fragmentShader,depthTest:false,depthWrite:false,
    toneMapped:false,blending:T.NoBlending});
  const triangle=new T.Mesh(geometry,material);triangle.frustumCulled=false;scene.add(triangle);
  let texture=null;
  function release(){texture?.dispose();texture=null;uniforms.tDiffuse.value=null;}
  return {
    render(enabled=true) {
      if(!enabled){release();return;}
      renderer.getDrawingBufferSize(size);
      if(!texture||texture.image.width!==size.x||texture.image.height!==size.y){
        release();texture=new T.FramebufferTexture(size.x,size.y);
        texture.minFilter=texture.magFilter=T.LinearFilter;
        texture.colorSpace=T.NoColorSpace;texture.generateMipmaps=false;
        uniforms.tDiffuse.value=texture;uniforms.resolution.value.set(1/size.x,1/size.y);
      }
      // Copy before render can clear/overwrite the canvas. Sampling a distinct
      // texture avoids a feedback loop and works with preserveDrawingBuffer off.
      renderer.copyFramebufferToTexture(texture);
      const autoClear=renderer.autoClear,autoReset=renderer.info.autoReset;
      renderer.autoClear=false;renderer.info.autoReset=false;
      try{renderer.render(scene,camera);}finally{
        renderer.autoClear=autoClear;renderer.info.autoReset=autoReset;
      }
    },
    metrics:()=>({method:texture?'fxaa':'none',pixels:texture?texture.image.width*texture.image.height:0,
      bytes:texture?texture.image.width*texture.image.height*4:0}),
    dispose(){release();geometry.dispose();material.dispose();}
  };
}
