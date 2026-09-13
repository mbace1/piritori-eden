// QA injection only. Not included by either game entry point.
window.labAudit={
  motion(){
    ready=false;cancelAnimationFrame(raf);raf=0;const results=[];
    try{for(const role of ['muscle','runner'])for(const mode of ['idle','walk','strike','shoot','brace','item','talk','hit','grip','down']){
      const actor=makeActor({placeholder:true},{id:'qa',role,side:'player',equipment:mode==='shoot'?'first-handgun':'baseball-bat'},world);actor.play(mode,1.15);
      let minimum=Infinity,maximumContact=-Infinity;
      for(let frame=0;frame<36;frame++){updateActor(actor,frame?1/30:0);actor.group.updateMatrixWorld(true);let frameMin=Infinity;
        const matrix=new T.Matrix4(),point=new T.Vector3();for(let n=0;n<actor.mesh.count;n++){actor.mesh.getMatrixAt(n,matrix);matrix.premultiply(actor.mesh.matrixWorld);for(let i=0;i<actor.mesh.geometry.attributes.position.count;i++){point.fromBufferAttribute(actor.mesh.geometry.attributes.position,i).applyMatrix4(matrix);if(!point.toArray().every(Number.isFinite))throw Error('Nonfinite stand-in vertex');frameMin=Math.min(frameMin,point.y);}}
        minimum=Math.min(minimum,frameMin);maximumContact=Math.max(maximumContact,frameMin);
      }results.push({role,mode,minY:minimum,maxLowestVertex:maximumContact});disposeActor(actor);
    }}finally{ready=true;queueFrame();}return results;
  },
  replay(){const saved=checkpoint(session);return JSON.stringify(restoreSession(content,saved).snapshot())===JSON.stringify(session.snapshot());},
  lose(){this.lossExtension=renderer.getContext().getExtension('WEBGL_lose_context');this.lossExtension.loseContext();},
  restore(){this.lossExtension.restoreContext();},
  visibility(){
    ready=false;cancelAnimationFrame(raf);raf=0;const saved={angle,zoom,target:renderer.getRenderTarget(),tone:renderer.toneMapping,shadow:renderer.shadowMap.enabled,background:world.background,fog:world.fog};
    const objects=[],decor=[];world.traverse(o=>{if(o.isMesh)objects.push({o,material:o.material,visible:o.visible,instanceColor:o.instanceColor});else if(o.isSprite||o.isPoints){decor.push([o,o.visible]);o.visible=false;}});
    const masks=new Map(),white=new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide});
    function mask(original){if(!masks.has(original)){const m=new T.MeshBasicMaterial({color:0x000000,side:original.side,alphaTest:original.alphaTest,alphaMap:original.alphaMap,map:original.alphaTest?original.map:null});m.onBeforeCompile=original.onBeforeCompile;m.customProgramCacheKey=()=>original.customProgramCacheKey()+'-qa';masks.set(original,m);}return masks.get(original);}
    const w=512,h=Math.round(w*area.clientHeight/area.clientWidth),target=new T.WebGLRenderTarget(w,h),pixels=new Uint8Array(w*h*4),rows=[];
    renderer.toneMapping=T.NoToneMapping;renderer.shadowMap.enabled=false;world.background=new T.Color(0);world.fog=null;
    function count(){renderer.setRenderTarget(target);renderer.render(world,camera);renderer.readRenderTargetPixels(target,0,0,w,h,pixels);let n=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>240&&pixels[i+1]>240&&pixels[i+2]>240)n++;return n;}
    try{zoom=1;for(let step=0;step<8;step++){angle=.65+step*Math.PI/4;fit();stage.update(camera,[...actors.values()]);world.updateMatrixWorld(true);
      for(const actor of actors.values()){
        const own=new Set();actor.body.traverse(o=>{if(o.isMesh)own.add(o);});
        for(const item of objects){item.o.instanceColor=null;item.o.material=own.has(item.o)?white:mask(item.material);item.o.visible=item.visible&&(!item.material.transparent||item.material.alphaTest>0||own.has(item.o));}
        const seen=count();
        for(const other of actors.values())if(other!==actor)other.group.visible=false;
        const scenerySeen=count();for(const other of actors.values())other.group.visible=true;
        for(const item of objects)item.o.visible=item.visible&&own.has(item.o);const full=count();rows.push({step,id:actor.id,seen,full,fraction:full?seen/full:0,sceneryFraction:full?scenerySeen/full:0});
      }
    }}finally{for(const item of objects){item.o.material=item.material;item.o.visible=item.visible;item.o.instanceColor=item.instanceColor;}for(const [o,v] of decor)o.visible=v;for(const m of masks.values())m.dispose();white.dispose();target.dispose();renderer.setRenderTarget(saved.target);renderer.toneMapping=saved.tone;renderer.shadowMap.enabled=saved.shadow;world.background=saved.background;world.fog=saved.fog;angle=saved.angle;zoom=saved.zoom;fit();stage.update(camera,[...actors.values()]);ready=true;queueFrame();}return rows;
  }
};

