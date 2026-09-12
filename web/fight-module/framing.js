import * as T from 'three';

// Frame the whole legal board, including empty edge cells and headroom. The
// active fighters never determine the fit, so casualties don't move the camera.
export function fitBattleCamera(camera,{width,height,angle,zoom,lanes,rows,cell}) {
  const aspect=width/height,top=Math.min(66,height*.22),bottom=24,side=16;
  camera.position.set(Math.sin(angle)*13,10,Math.cos(angle)*13);
  camera.lookAt(0,.55,0);camera.updateMatrixWorld(true);
  const corners=[];
  for(const x of [-1,1])for(const z of [-1,1])for(const y of [0,2.3])
    corners.push(new T.Vector3(x*(lanes*cell/2+.45),y,z*(rows*cell/2+.45)).applyMatrix4(camera.matrixWorldInverse));
  const minX=Math.min(...corners.map(p=>p.x)),maxX=Math.max(...corners.map(p=>p.x));
  const minY=Math.min(...corners.map(p=>p.y)),maxY=Math.max(...corners.map(p=>p.y));
  const safeW=Math.max(.3,1-2*side/width),safeH=Math.max(.3,1-(top+bottom)/height);
  const overviewSpan=Math.max(11.9,15/aspect,(maxX-minX)/(aspect*safeW),(maxY-minY)/safeH);
  const span=overviewSpan/zoom,cx=(minX+maxX)/2,cy=(minY+maxY)/2+(top-bottom)*span/(2*height);
  Object.assign(camera,{left:cx-span*aspect/2,right:cx+span*aspect/2,top:cy+span/2,bottom:cy-span/2});
  camera.updateProjectionMatrix();
  return {overviewSpan,span,zoom,angle,aspect,safeInset:{top,bottom,side}};
}

export const intersects=(a,b,gap=0)=>a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;

// Small deterministic screen-space layout. Try nearby positions above each
// fighter, avoiding bodies, the HUD and tags already placed. Leaders preserve
// identity when a tag moves away from its actor's projected head.
export function placeLabels(items,width,height,obstacles=[]) {
  const placed=[],bodies=items.map(i=>i.body).filter(Boolean),gap=5;
  for(const item of [...items].sort((a,b)=>a.anchor.y-b.anchor.y||a.id.localeCompare(b.id))) {
    const candidates=[];
    for(const row of [0,-1,1,-2,2,3,4,5,6,7,8])for(const col of [0,-1,1,-2,2,-3,3,-4,4,-5,5]) {
      const x=Math.max(4,Math.min(width-item.width-4,item.anchor.x-item.width/2+col*(item.width+gap)/2));
      const y=Math.max(4,Math.min(height-item.height-4,item.anchor.y-item.height-7-row*(item.height+gap)/2));
      const rect={x,y,width:item.width,height:item.height};
      const blocked=placed.some(p=>intersects(rect,p,gap))||obstacles.some(o=>intersects(rect,o,3))||bodies.some(b=>intersects(rect,b,3));
      if(!blocked)candidates.push({...rect,id:item.id,anchor:item.anchor,score:Math.abs(col)*9+Math.abs(row)*12+Math.abs(x+item.width/2-item.anchor.x)*.1});
    }
    // Extreme manual zoom can put an actor off-screen. Keep its tag reachable
    // with an edge placement rather than hiding information or clipping text.
    if(!candidates.length)for(let y=4;y+item.height<height;y+=item.height+gap)for(let x=4;x+item.width<width;x+=item.width+gap){
      const rect={x,y,width:item.width,height:item.height};
      if(!placed.some(p=>intersects(rect,p,gap))&&!obstacles.some(o=>intersects(rect,o,3)))candidates.push({...rect,id:item.id,anchor:item.anchor,score:1000+Math.hypot(x-item.anchor.x,y-item.anchor.y)});
    }
    candidates.sort((a,b)=>a.score-b.score||a.x-b.x||a.y-b.y);
    const choice=candidates[0];
    if(choice)placed.push(choice);
  }
  return placed;
}
