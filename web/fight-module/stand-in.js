import * as T from 'three';

// Neutral development mannequins, NOT F01/F02 replacements or production art.
// One instanced body draw per fighter; fixed limb lengths and grounded feet.
export function makeStandIn(unit, world) {
  const group=new T.Group(),body=new T.Group();group.add(body);world.add(group);
  group.userData.unitId=unit.id;
  const broad=unit.role==='muscle',width=broad?1.12:.9;
  const geometry=new T.SphereGeometry(1,10,8),material=new T.MeshStandardMaterial({roughness:.64,metalness:.03});
  const mesh=new T.InstancedMesh(geometry,material,20);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;body.add(mesh);
  const colors={coat:unit.side==='player'?0x458c81:0xb86343,dark:0x222e35,skin:0xc0a787,sole:0x8f958b};
  const ring=new T.Mesh(new T.RingGeometry(.34,.39,32),new T.MeshBasicMaterial({color:unit.side==='player'?0x8fc5ae:0xe3a18a,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;group.add(ring);
  const shadow=new T.Mesh(new T.CircleGeometry(.46,24),new T.MeshBasicMaterial({color:0x071119,transparent:true,opacity:.32,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.014;group.add(shadow);
  const prop=new T.Group();body.add(prop);const gun=unit.equipment.includes('handgun'),knife=unit.equipment==='folding-knife';
  const pm=new T.MeshStandardMaterial({color:gun?0x292f32:knife?0xa4b0b5:0x796348,roughness:.58,metalness:gun?.6:0});
  const weapon=new T.Mesh(gun?new T.BoxGeometry(.075,.10,.29):knife?new T.BoxGeometry(.028,.20,.07):new T.CylinderGeometry(.046,.025,.69,10),pm);weapon.position.set(0,gun?.05:knife?.13:.25,gun?.13:.06);prop.add(weapon);const grip=new T.Mesh(new T.BoxGeometry(.06,gun?.15:.12,.075),new T.MeshStandardMaterial({color:0x252b2c,roughness:.8}));grip.position.set(0,-.02,0);prop.add(grip);prop.visible=true;const muzzle=new T.Object3D();muzzle.position.set(0,.05,.29);prop.add(muzzle);
  const a={id:unit.id,unit,group,body,ring,shadow,prop,bones:new Map(),placeholder:true,mode:'idle',elapsed:0,duration:1,down:false,mesh,muzzle,coverBlend:0,peek:0,parts:[],walkSpeed:1.45};
  a.play=(mode,duration=.8)=>{a.mode=mode;a.elapsed=0;a.duration=duration;a.down=mode==='down';prop.visible=!['item','talk','down'].includes(mode);};
  a.setWalkSpeed=speed=>{a.walkSpeed=speed;};
  const dummy=new T.Object3D(),up=new T.Vector3(0,1,0),temp=new T.Vector3();let index=0;
  function ellipsoid(center,scale,color,rotation=null){dummy.position.copy(center);dummy.scale.set(...scale);dummy.quaternion.copy(rotation||new T.Quaternion());dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);mesh.setColorAt(index,new T.Color(colors[color]));a.parts[index++]={center:center.clone(),scale,quaternion:dummy.quaternion.clone()};}
  const p=(x,y,z)=>new T.Vector3(x,y,z);
  function segment(from,to,r,color){const d=to.clone().sub(from);ellipsoid(from.clone().add(to).multiplyScalar(.5),[r,d.length()*.5+r*.18,r],color,new T.Quaternion().setFromUnitVectors(up,d.normalize()));}
  function elbow(root,end,upper,lower,pole){const delta=end.clone().sub(root),distance=T.MathUtils.clamp(delta.length(),.02,upper+lower-.002),axis=delta.normalize();end.copy(root).addScaledVector(axis,distance);const side=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize(),along=(upper*upper-lower*lower+distance*distance)/(2*distance);return root.clone().addScaledVector(axis,along).addScaledVector(side,Math.sqrt(Math.max(0,upper*upper-along*along)));}
  a.update=dt=>{
    a.elapsed+=dt;a.coverBlend=T.MathUtils.damp(a.coverBlend,a.covered&&a.mode!=='walk'&&!a.down?1:0,18,dt);index=0;a.parts=[];
    const t=Math.min(1,a.elapsed/a.duration),pulse=Math.sin(Math.PI*t),walking=a.mode==='walk',cycle=a.elapsed*Math.PI*2*a.walkSpeed/.68;
    const lean=a.mode==='strike'?pulse*.18:a.mode==='hit'?-pulse*.16:a.covered&&a.mode==='idle'?.06:0;
    const duck=.26*a.coverBlend*(1-a.peek);a.duck=duck;const chest=p(0,1.20-duck,.02+lean),hips=p(0,.90-duck,-duck*.26);
    ellipsoid(chest,[.255*width,.34,.17],'coat');ellipsoid(hips,[.20*width,.16,.15],'dark');
    ellipsoid(p(0,1.65-duck,.03+lean),[.166,.20,.165],'skin');
    ellipsoid(p(0,1.77-duck,.007+lean),[.17,.105,.16],'dark');
    ellipsoid(p(0,1.66-duck,.19+lean),[.06,.05,.05],'skin');
    for(const side of [-1,1]){
      const phase=cycle+(side<0?Math.PI:0),swing=walking?Math.sin(phase):0;
      const foot=p(side*.135,.105+Math.max(0,swing)*.14,walking?Math.cos(phase)*.22:.04),hip=hips.clone().add(p(side*.125,0,0));
      const knee=elbow(hip,foot,.42,.40,p(0,0,1));
      segment(hip,knee,.105*width,'dark');segment(knee,foot,.083,'dark');ellipsoid(foot.clone().add(p(0,-.035,.055)),[.105,.069,.18],'sole');
      const shoulder=p(side*.245*width,1.43-duck,.01+lean),hand=p(side*.32,1.00-duck,.09+(walking?-swing*.17:0));
      if(a.mode==='idle'&&gun&&a.coverBlend>.01)hand.set(side*.08,1.12-duck,.30);
      if(a.mode==='brace'){hand.set(side*.19,1.48-duck,.28);}
      if(['shoot','grip'].includes(a.mode)){const recoil=a.mode==='shoot'?Math.max(0,1-Math.abs(t-.38)*9):0;hand.set(side*.075,1.36-duck+recoil*.055,.52-recoil*.10);}
      if(a.mode==='reload'){hand.set(side*.08,1.14-duck,.27+(side===1?pulse*.12:0));}
      if(a.mode==='strike'&&side===-1){if(knife)hand.set(-.15,1.15,.06+pulse*.48);else{const swing=t<.3?t/.3*.3:.3+(t-.3)/.7;hand.set(-.34+Math.sin(swing*Math.PI)*.43,1.20+Math.sin(swing*Math.PI)*.25,.10+Math.sin(swing*Math.PI)*.32);}}
      if(a.mode==='item'){hand.set(side*.07,1.10,.28);}
      if(a.mode==='talk'&&side===-1){hand.set(-.36,1.23,.22+pulse*.10);}
      const bend=elbow(shoulder,hand,.31,.29,p(side,.1,.35));
      segment(shoulder,bend,.09*width,'coat');segment(bend,hand,.075,'coat');ellipsoid(hand,[.068,.077,.065],'skin');
      if(side===-1){prop.position.copy(hand);prop.rotation.set(a.mode==='strike'?(knife?Math.PI*.5:-.65+pulse*2.0):gun&&a.mode==='idle'?.85:0,0,a.mode==='strike'&&!knife?-1.3+pulse*2.1:gun?0:-.16);}
    }
    mesh.count=index;mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;
    body.rotation.x=a.down?-Math.PI*.5*(t*t*(3-2*t)):0;body.position.y=0;
    // Exact lower support of each transformed ellipsoid, including a rotated
    // segment. Keeps the knockdown on the surface rather than tilting into it.
    const bodyQ=body.quaternion;let floor=Infinity;
    for(const part of a.parts){const center=part.center.clone().applyQuaternion(bodyQ),q=bodyQ.clone().multiply(part.quaternion);let extent=0;for(let k=0;k<3;k++){temp.set(k===0?part.scale[k]:0,k===1?part.scale[k]:0,k===2?part.scale[k]:0).applyQuaternion(q);extent+=temp.y*temp.y;}floor=Math.min(floor,center.y-Math.sqrt(extent));}
    body.position.y=.015-floor;a.floor=.015;mesh.computeBoundingBox();mesh.computeBoundingSphere();
  };
  a.dispose=()=>{geometry.dispose();material.dispose();ring.geometry.dispose();ring.material.dispose();shadow.geometry.dispose();shadow.material.dispose();weapon.geometry.dispose();pm.dispose();grip.geometry.dispose();grip.material.dispose();group.removeFromParent();};
  a.update(0);return a;
}
