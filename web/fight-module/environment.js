import * as T from 'three';

// Reference: the painted Kallion Kulma night yard, courtyard v05 and service
// yard plates. Geometry stays outside the existing battle footprint.
export function buildNightCourtyard(world, renderer, cover, position) {
  world.background = new T.Color(0x090f15);
  world.fog = new T.Fog(0x090f15, 22, 44);
  renderer.toneMappingExposure = .94;
  const cube = new T.BoxGeometry(1, 1, 1), layers = [];
  const mat = (color, roughness=.9, metalness=0) => new T.MeshStandardMaterial({color, roughness, metalness});
  const materials = {
    plaster: mat(0x49463b), brick: mat(0x4c3930), stone: mat(0x282e2e),
    trim: mat(0x292a25), roof: mat(0x20292b), iron: mat(0x1a2628, .65, .25),
    wood: mat(0x4c3c2b), door: mat(0x26312c), window: mat(0x101b20, .3, .15),
    warm: new T.MeshStandardMaterial({color:0xa77b43, emissive:0xe4a653, emissiveIntensity:1.3, roughness:.85}),
    dull: new T.MeshStandardMaterial({color:0x60503a, emissive:0xb7864b, emissiveIntensity:.35, roughness:.9}),
    lamp: new T.MeshBasicMaterial({color:0xffdb94}),
    concrete: mat(0x69695c), rust: mat(0x65513b, .8, .1)
  };
  function batch(name, occludes=null) {
    const group = new T.Group(); group.name=name; world.add(group);
    const bins=new Map();
    return {
      box(key,w,h,d,x,y,z,rotation=0) {
        if(!bins.has(key)) bins.set(key,[]);
        bins.get(key).push({w,h,d,x,y,z,rotation});
      },
      finish() {
        for(const [key,items] of bins) {
          const material=materials[key].clone(), mesh=new T.InstancedMesh(cube,material,items.length), dummy=new T.Object3D();
          items.forEach((o,i)=>{dummy.position.set(o.x,o.y,o.z);dummy.rotation.y=o.rotation;dummy.scale.set(o.w,o.h,o.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
          mesh.castShadow=!['warm','dull','lamp','window'].includes(key);
          mesh.receiveShadow=true; group.add(mesh);
        }
        if(occludes) layers.push({group,occludes});
        return group;
      }
    };
  }
  // Cold sky maintains readable silhouettes; the visible lamps provide warmth.
  world.add(new T.HemisphereLight(0xa9c2d1,0x4f3c2b,.95));
  const moon=new T.DirectionalLight(0x9fbccc,.75);moon.position.set(3,9,-8);world.add(moon);
  const fill=new T.DirectionalLight(0xdad7c4,1.1);fill.position.set(1,7,8);world.add(fill);

  const groundMat=mat(0x222a2b,.8,.08);
  const foundation=new T.Mesh(new T.BoxGeometry(15,.4,17),groundMat);
  foundation.position.y=-.24;foundation.receiveShadow=true;world.add(foundation);
  // Staggered stone paving, deliberately unrelated to the hidden tactical grid.
  const pavers=new T.InstancedMesh(cube,mat(0x5d615a,.66,.08),32*28),dummy=new T.Object3D();
  const tint=new T.Color();let index=0;
  for(let row=0;row<32;row++)for(let col=0;col<28;col++) {
    const seed=((row*37+col*19)%17)/17;
    dummy.position.set((col-13.5)*.51+(row%2)*.255,-.025,(row-15.5)*.51);
    dummy.scale.set(.492,.045,.492);dummy.updateMatrix();pavers.setMatrixAt(index,dummy.matrix);
    tint.setRGB(.58+seed*.20,.57+seed*.17,.52+seed*.15);pavers.setColorAt(index++,tint);
  }
  pavers.receiveShadow=true;world.add(pavers);

  const rear=batch('rear-building',camera=>camera.position.z<-2);
  rear.box('plaster',13,4.8,.55,0,2.8,-6.3);
  rear.box('stone',13,.85,.65,0,.38,-6.24);
  rear.box('trim',13,.13,.8,0,5.19,-6.25);
  rear.box('roof',13.35,.2,1.25,0,5.34,-6.55);
  // A dark porttikongi and one warm service entrance anchor the composition.
  rear.box('trim',1.9,2.6,.13,-2.3,1.30,-5.95);
  rear.box('window',1.6,2.38,.16,-2.3,1.18,-5.85);
  rear.box('stone',2.05,.19,.55,-2.3,2.58,-5.82);
  rear.box('door',1.14,2.05,.14,2.4,1.03,-5.87);
  rear.box('trim',1.35,.14,.32,2.4,2.13,-5.84);
  rear.box('iron',.035,.28,.06,2.78,1.10,-5.76);
  function window(b,x,y,z,rotation,lit) {
    b.box('trim',.9,1.30,.16,x,y,z,rotation);
    const dx=Math.sin(rotation)*.10,dz=Math.cos(rotation)*.10;
    b.box(lit===2?'warm':lit===1?'dull':'window',.70,1.10,.035,x+dx,y,z+dz,rotation);
    b.box('trim',.045,1.12,.08,x+dx*1.3,y,z+dz*1.3,rotation);
    b.box('trim',.72,.04,.08,x+dx*1.3,y+.1,z+dz*1.3,rotation);
    b.box('stone',.98,.09,.28,x,y-.68,z+.02,rotation);
  }
  for(let n=0;n<9;n++)window(rear,-5.6+n*1.4,4.12,-5.99,0,n===1||n===6?2:n===4?1:0);
  for(const x of [-5.6,-4.2,.5,4.2,5.6])window(rear,x,1.73,-5.99,0,x===-4.2?1:0);
  for(const x of [-6.1,.05,6.1])rear.box('iron',.075,5.1,.08,x,2.5,-5.87);
  rear.finish();

  for(const side of [-1,1]) {
    const wing=batch(side<0?'left-wing':'right-wing',camera=>camera.position.x*side>3);
    wing.box('brick',.5,3.65,5.2,side*6.35,1.85,-3.8);
    wing.box('stone',.6,.65,5.25,side*6.29,.3,-3.8);
    wing.box('roof',1.05,.18,5.45,side*6.45,3.74,-3.8);
    for(let i=0;i<3;i++)window(wing,side*6.04,2.48,-5.55+i*1.7,-side*Math.PI/2,i===1?1:0);
    wing.finish();
  }
  const edge=batch('yard-furniture');
  // Low boundary keeps orbit views usable; no tall foreground wall.
  for(const side of [-1,1]) {
    edge.box('stone',.16,.22,8.2,side*5.65,.08,1.45);
    for(let i=0;i<11;i++)edge.box('iron',.038,.93,.038,side*5.65,.57,-2.4+i*.76);
    for(const y of [.44,.95])edge.box('iron',.04,.045,8.2,side*5.65,y,1.45);
  }
  for(let i=0;i<4;i++) {
    edge.box('wood',.28,.10,1.9,-5.05+i*.3,.53,-3.55);
  }
  edge.box('wood',.10,.25,1.9,-5.48,.84,-3.55);
  for(const z of [-4.2,-2.9])edge.box('iron',1.2,.48,.08,-5,.24,z);
  for(const x of [4.55,5.35]) {
    edge.box('door',.67,.9,.73,x,.45,-4.55);
    edge.box('iron',.74,.09,.78,x,.94,-4.55);
  }
  // Existing cover remains at its exact resolver cells and retains its shape.
  for(const [cell] of cover) {
    const p=position(cell);
    edge.box('stone',.90,.52,.32,p.x,.26,p.z-.37);
    edge.box('concrete',.96,.07,.36,p.x,.55,p.z-.37);
  }
  for(const z of [-.5,2.5])for(let n=0;n<7;n++)edge.box('iron',.45,.017,.028,4.95,.004,z+n*.07);

  function lamp(x,z,targetX,targetZ,shadow) {
    edge.box('iron',.065,4.25,.065,x,2.12,z);
    edge.box('iron',.55,.065,.065,x-.23,4.23,z);
    edge.box('iron',.40,.12,.27,x-.44,4.17,z);
    edge.box('lamp',.29,.025,.18,x-.44,4.10,z);
    const light=new T.SpotLight(0xffcf95,62,18,.90,.85,1.65);
    light.position.set(x-.44,4.07,z);light.target.position.set(targetX,0,targetZ);
    light.castShadow=shadow;
    if(shadow){light.shadow.mapSize.set(1024,1024);light.shadow.normalBias=.025;light.shadow.bias=-.0001;}
    world.add(light,light.target);
  }
  lamp(-4.75,1.1,-1.1,0,true);
  lamp(4.8,-2.6,1.9,-1,false);
  edge.box('iron',.30,.16,.24,2.4,2.5,-5.73);
  // A lit entrance will mean a real available NPC visit. This training scene
  // has no bound destination/availability state yet, so keep the door dark.
  edge.box('window',.17,.055,.18,2.4,2.40,-5.71);
  edge.finish();

  // Local wet patches catch lamp highlights without a full-screen bloom pass.
  const wetMat=new T.MeshStandardMaterial({color:0x26302e,roughness:.13,metalness:.3,
    transparent:true,opacity:.48,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const wetGeo=new T.CircleGeometry(1,24);
  for(const [x,z,sx,sz] of [[-4.1,1.5,.65,.27],[4.15,-2.5,.78,.28],[2.4,-4.9,.7,.22],[-3.8,4,.9,.19],[4.1,3.8,.6,.28]]) {
    const patch=new T.Mesh(wetGeo,wetMat);patch.rotation.x=-Math.PI/2;
    patch.position.set(x,.008,z);patch.scale.set(sx,sz,1);world.add(patch);
  }

  return {
    name:'Kallio courtyard · night',
    update(camera) {
      for(const {group,occludes} of layers) {
        const faded=occludes(camera);
        group.visible=!faded;
      }
    }
  };
}
