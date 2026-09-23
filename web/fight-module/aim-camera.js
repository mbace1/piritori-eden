import * as T from 'three';

// A composed gun view, not a second simulation or a freely aimed reticle.
// Keep both complete figures and the cover between them within safe margins.
// Choose the shoulder on the overview's side of the firing line (no axis flip).
export function gunView(camera,{from,to,width,height,angle,cover=[]}){
  const direction=to.clone().sub(from).setY(0).normalize();
  if(direction.lengthSq()<.01||width<240||height<180)return null;
  const side=new T.Vector3(-direction.z,0,direction.x);
  const planning=new T.Vector3(Math.sin(angle),0,Math.cos(angle));
  if(side.dot(planning)<0)side.negate();
  const centre=from.clone().lerp(to,.5).setY(.9);
  const eye=direction.clone().multiplyScalar(-9).addScaledVector(side,10);
  // Portrait needs a steeper shot for separation; landscape can come down.
  eye.y=width<height?8.2:5.6;
  const targetCamera=camera.clone();targetCamera.position.copy(centre).add(eye);
  targetCamera.lookAt(centre);targetCamera.updateMatrixWorld(true);
  const points=[];
  for(const p of [from,to,...cover])for(const x of [-.6,.6])for(const z of [-.45,.45])for(const y of [0,2.35])
    points.push(new T.Vector3(p.x+x,y,p.z+z).applyMatrix4(targetCamera.matrixWorldInverse));
  const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
  const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
  const aspect=width/height,top=78,bottom=34,safeH=Math.max(.4,1-(top+bottom)/height);
  const span=Math.max(4.9,(maxY-minY)/safeH,(maxX-minX)/(aspect*.82));
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2+(top-bottom)*span/(2*height);
  return {position:targetCamera.position.clone(),quaternion:targetCamera.quaternion.clone(),
    left:cx-span*aspect/2,right:cx+span*aspect/2,top:cy+span/2,bottom:cy-span/2,span};
}

export function blendGunView(camera,view,amount){
  if(!view)return;
  const t=amount*amount*(3-2*amount);
  camera.position.lerp(view.position,t);camera.quaternion.slerp(view.quaternion,t);
  for(const key of ['left','right','top','bottom'])camera[key]=T.MathUtils.lerp(camera[key],view[key],t);
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
