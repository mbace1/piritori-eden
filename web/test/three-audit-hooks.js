// Injected only into the local QA browser. No production runtime changes.
window.audit3d={
 async visibility(){
  ready=false;cancelAnimationFrame(raf);raf=0;
  const saved={angle,zoom,target:renderer.getRenderTarget(),tone:renderer.toneMapping,shadow:renderer.shadowMap.enabled,background:world.background,fog:world.fog};
  const meshes=[],decor=[];world.traverse(o=>{if(o.isMesh)meshes.push({o,material:o.material,visible:o.visible});else if(o.isSprite||o.isPoints||o.isLine){decor.push({o,visible:o.visible});o.visible=false;}});
  const white=new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide}),black=new T.MeshBasicMaterial({color:0x000000,side:T.DoubleSide}),alpha=new Map();
  const w=512,h=Math.round(512*area.clientHeight/area.clientWidth),target=new T.WebGLRenderTarget(w,h),pixels=new Uint8Array(w*h*4);
  renderer.toneMapping=T.NoToneMapping;renderer.shadowMap.enabled=false;world.background=new T.Color(0);world.fog=null;
  function blackFor(m){if(!m?.alphaTest)return black;if(!alpha.has(m))alpha.set(m,new T.MeshBasicMaterial({color:0x000000,map:m.map,alphaMap:m.alphaMap,alphaTest:m.alphaTest,side:m.side}));return alpha.get(m);}
  function count(){renderer.setRenderTarget(target);renderer.render(world,camera);renderer.readRenderTargetPixels(target,0,0,w,h,pixels);let n=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>127&&pixels[i+1]>127&&pixels[i+2]>127)n++;return n;}
  const rows=[];
  try{zoom=1;for(let step=0;step<8;step++){
    angle=.65+step*Math.PI/4;fit();world.updateMatrixWorld(true);
    for(const a of actors.values()){
      const own=new Set();a.body.traverse(o=>{if(o.isMesh)own.add(o);});
      for(const item of meshes){item.o.material=own.has(item.o)?white:Array.isArray(item.material)?item.material.map(blackFor):blackFor(item.material);item.o.visible=item.visible&&(!item.material?.transparent||item.material?.alphaTest>0||own.has(item.o));}
      const seen=count();for(const item of meshes)item.o.visible=item.visible&&own.has(item.o);const full=count();
      rows.push({step,degrees:Math.round(angle*180/Math.PI),id:a.id,visiblePixels:seen,fullPixels:full,visibleFraction:full?seen/full:0});
    }
  }}finally{for(const m of meshes){m.o.material=m.material;m.o.visible=m.visible;}for(const d of decor)d.o.visible=d.visible;white.dispose();black.dispose();for(const m of alpha.values())m.dispose();target.dispose();world.background=saved.background;world.fog=saved.fog;renderer.toneMapping=saved.tone;renderer.shadowMap.enabled=saved.shadow;renderer.setRenderTarget(saved.target);angle=saved.angle;zoom=saved.zoom;fit();ready=true;queueFrame();}
  return {method:'white skinned silhouette, black depth occluders; foliage alpha test retained; HUD excluded',width:w,height:h,rows};
 },
 pause(){ready=false;cancelAnimationFrame(raf);raf=0;},
 frame(){renderer.setRenderTarget(null);renderer.render(world,camera);edgeSmoothing.render(profile.edgeSmoothing);},
 async motions(){
  this.pause();const results=[],baseVisibility=[...actors.values()].map(a=>[a,a.group.visible,a.prop.visible]);for(const [a] of baseVisibility){a.group.visible=false;a.prop.visible=false;}
  try{for(const [id,template] of templates){const modes=[];for(const mode of ['idle','walk','strike','shoot','brace','item','talk','hit','grip','down']){
    const unit={id:'audit-'+id,side:'player',modelId:id,equipment:mode==='shoot'?'9mm-handgun':'baseball-bat'},a=makeActor(template,unit,world);
    const skins=[];a.body.traverse(m=>{if(m.isSkinnedMesh)skins.push(m);});a.play(mode,1);let minimum=Infinity,worstBelow=0,totalVertices=0,worstAt=0;const samples=[];
    for(let i=0;i<=30;i++){updateActor(a,i?1/24:0);world.updateMatrixWorld(true);let min=Infinity,below=0,total=0;for(const m of skins){m.skeleton.update();for(let j=0;j<m.geometry.attributes.position.count;j++){const p=m.getVertexPosition(j,new T.Vector3()).applyMatrix4(m.matrixWorld);if(!p.toArray().every(Number.isFinite))throw Error('Nonfinite deformed vertex');min=Math.min(min,p.y);if(p.y<-.02)below++;total++;}}const fraction=below/total;if(min<minimum){minimum=min;worstAt=i/24;}worstBelow=Math.max(worstBelow,fraction);totalVertices=total;samples.push({time:i/24,minY:min,belowFloorFraction:fraction});}
    modes.push({mode,minY:minimum,maxBelowFloorFraction:worstBelow,worstAt,vertices:totalVertices,samples});disposeActor(a);
   }results.push({id,modes});}
  }finally{for(const [a,visible,prop] of baseVisibility){a.group.visible=visible;a.prop.visible=prop;}ready=true;queueFrame();}
  return {method:'all deformed skinned vertices at 24 samples/sec, 1.25 sec per action, production v05 actor code; penetration threshold -0.02m',results};
 }
};
