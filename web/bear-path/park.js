import * as T from 'three';

// Directed from approved v03 panel 03: cold park depth, amber practical pools,
// bear/plinth as anchor, low planting as cover, generous readable withdrawal.
// Physical staging is compressed fiction, not a survey of the real park.
export function buildKarhupuisto(world,renderer,cover,position){
  world.background=new T.Color('#101d25');world.fog=new T.Fog('#172832',19,45);
  renderer.toneMappingExposure=1;
  const group=new T.Group();group.name='Karhupuisto';world.add(group);
  const geometries={box:new T.BoxGeometry(1,1,1),round:new T.IcosahedronGeometry(1,1),
    trunk:new T.CylinderGeometry(.7,1,1,7),rod:new T.CylinderGeometry(1,1,1,6),
    canopy:new T.PlaneGeometry(2,2),leaf:new T.IcosahedronGeometry(1,0)};
  const palette={stone:0x79796d,granite:0x594b4d,iron:0x293e3d,wood:0x644b32,
    soil:0x303b30,grass:0x4a5739,bark:0x483d30,gold:0x94753b,ochre:0x665d34,
    olive:0x3f5036,plaster:0x667176,brick:0x675c51,night:0x223239,window:0x152b32,
    trim:0x465354,leaf:0x987641,cream:0xd0b87e,wet:0x314650};
  const mats=Object.fromEntries(Object.entries(palette).map(([k,color])=>[k,new T.MeshStandardMaterial({color,roughness:k==='wet'?.34:.94,metalness:k==='iron'?.2:0})]));
  mats.glow=new T.MeshBasicMaterial({color:0xffdb88});
  mats.lit=new T.MeshStandardMaterial({color:0x987848,emissive:0xc08b43,emissiveIntensity:.8,roughness:1});
  const bins=new Map(),dummy=new T.Object3D();
  function shape(kind,material,x,y,z,sx,sy,sz,rz=0,ry=0){
    const key=kind+':'+material;if(!bins.has(key))bins.set(key,[]);
    bins.get(key).push({x,y,z,sx,sy,sz,rz,ry});
  }
  const box=(m,x,y,z,w,h,d,ry=0)=>shape('box',m,x,y,z,w,h,d,0,ry);
  const round=(m,x,y,z,w,h,d,rz=0,ry=0)=>shape('round',m,x,y,z,w,h,d,rz,ry);
  let seed=82731;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

  world.add(new T.HemisphereLight(0x9db8ce,0x293b39,1.15));
  const sky=new T.DirectionalLight(0x9abbcf,1.4);sky.position.set(-4,9,7);world.add(sky);
  // Quiet ground: mipmapped broad wear; no hundreds of subpixel paving gaps.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#727a74';ctx.fillRect(0,0,512,512);
  for(let i=0;i<70;i++){ctx.fillStyle=i%2?'#747c76':'#69736e';ctx.globalAlpha=.25;ctx.beginPath();ctx.ellipse(rand()*512,rand()*512,10+rand()*46,3+rand()*13,rand()*6.28,0,6.28);ctx.fill();}
  ctx.globalAlpha=.3;ctx.strokeStyle='#465953';ctx.lineWidth=2;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(rand()*512,rand()*512);ctx.lineTo(rand()*512,rand()*512);ctx.stroke();}ctx.globalAlpha=1;
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(5,6);
  const ground=new T.Mesh(new T.PlaneGeometry(40,44),new T.MeshStandardMaterial({map:texture,color:0x85999b,roughness:.87}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;group.add(ground);
  // Cut foliage cards have irregular leaf silhouettes, rather than solid
  // polygon balloons. One small shared texture; alpha test keeps depth stable.
  const foliageCanvas=document.createElement('canvas');foliageCanvas.width=foliageCanvas.height=256;
  const fc=foliageCanvas.getContext('2d');
  for(let i=0;i<220;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*105,x=128+Math.cos(a)*r,y=128+Math.sin(a)*r*.82;
    fc.fillStyle=['#7b8b67','#abb888','#c4b472','#607954'][i%4];fc.beginPath();fc.ellipse(x,y,5+rand()*10,3+rand()*5,rand()*6.28,0,6.28);fc.fill();}
  const foliageTexture=new T.CanvasTexture(foliageCanvas);foliageTexture.colorSpace=T.SRGBColorSpace;
  for(const name of ['gold','ochre','olive'])mats[name+'Foliage']=new T.MeshLambertMaterial({color:name==='gold'?0xe4c38a:name==='ochre'?0xc2b294:0xd3e0cf,map:foliageTexture,alphaTest:.45,side:T.DoubleSide,emissive:0x4c5634,emissiveIntensity:.15});
  mats.wet.transparent=true;mats.wet.opacity=.22;mats.wet.depthWrite=false;mats.wet.roughness=.85;
  // Municipal street beyond the park, framing buildings and a tram-stop edge.
  box('night',0,-.08,-12.4,38,.12,5);box('stone',0,.03,-9.85,36,.18,.2);
  for(const x of [-1.4,.1])box('iron',0,.001,-12+x,38,.025,.045);
  for(let i=0;i<7;i++)box('stone',-10+i*1.3,.012,-12.5,.55,.022,2.6);
  for(let block=0;block<5;block++){
    const x=-14+block*6.5,h=7+rand()*2;
    box(block%2?'brick':'plaster',x,h/2,-17,6.4,h,2.5);
    box('stone',x,.45,-15.65,6.4,.9,.28);box('trim',x,h,-15.65,6.6,.18,.45);
    for(let floor=0;floor<3;floor++)for(let col=0;col<4;col++){
      const wx=x-2.25+col*1.5,wy=1.7+floor*2.15;
      box('trim',wx,wy,-15.67,.94,1.44,.18);
      box(rand()>.74?'lit':'window',wx,wy,-15.55,.71,1.2,.07);
      box('trim',wx,wy,-15.47,.045,1.21,.05);box('trim',wx,wy-.04,-15.45,.73,.045,.05);
    }
  }

  function bed(x,z,w,d){
    box('soil',x,.08,z,w,.16,d);
    for(const side of [-1,1]){box('stone',x+side*w/2,.18,z,.14,.36,d+.15);box('stone',x,.18,z+side*d/2,w,.36,.14);}
    const count=Math.round(w*d*7);for(let i=0;i<count;i++){
      const px=x+(rand()-.5)*(w-.15),pz=z+(rand()-.5)*(d-.15);
      for(const angle of [0,Math.PI/2])shape('canopy',i%4?'oliveFoliage':'ochreFoliage',px,.33+rand()*.16,pz,.24+rand()*.13,.23+rand()*.16,1,0,angle);
    }
  }
  bed(-5.7,-.5,1.9,5.8);bed(5.9,-2,1.6,6);bed(-3.1,-7.6,3.4,1.5);bed(3.7,-7.6,4,1.5);
  // Low perimeter leaves the approach/escape lane open at the camera edge.
  for(const side of [-1,1]){
    for(let n=0;n<19;n++)box('iron',side*7.6,.57,-8+n*.8,.045,1.15,.045);
    for(const y of [.35,.89])box('iron',side*7.6,y,-.8,.045,.045,14.6);
  }
  function bench(x,z,angle=0){
    // Furniture geometry is authored around the exact cover anchor when used.
    for(let n=0;n<4;n++)box('wood',x,.46,z+(n-1.5)*.13,1.75,.07,.105,angle);
    for(let n=0;n<3;n++)box('wood',x,.77+n*.12,z-.29,1.75,.095,.07,angle);
    for(const side of [-1,1]){box('iron',x+side*.66,.26,z,.06,.48,.5);box('iron',x+side*.66,.76,z-.31,.055,.67,.055);}
  }
  bench(-5.7,3.5);bench(5.6,3.8);bench(3.6,-6.6);
  const bearCell=[...cover].find(([,v])=>v.propId==='bear-plinth')?.[0]||'2,6';
  const bp=position(bearCell),bx=bp.x,bz=bp.z-.47;
  box('granite',bx,.38,bz,1.18,.76,.75);box('stone',bx,.8,bz,1.28,.1,.83);
  // Carved bear silhouette: solid head/haunches, four paws, blunt muzzle.
  round('granite',bx-.08,1.40,bz,.54,.30,.29,0,.15);
  round('granite',bx-.34,1.35,bz,.29,.32,.3);
  round('granite',bx+.4,1.38,bz,.23,.22,.24);
  round('granite',bx+.59,1.28,bz+.025,.19,.10,.16);
  for(const dx of [-.34,.31])for(const dz of [-.19,.19])round('granite',bx+dx,1.04,bz+dz,.11,.25,.12);
  for(const dz of [-.15,.15])round('granite',bx+.34,1.57,bz+dz,.065,.065,.06);
  const benchCell=[...cover].find(([,v])=>v.propId==='park-bench')?.[0]||'1,6',bb=position(benchCell);
  bench(bb.x-.3,bb.z-.55);

  function tree(x,z,height=5.3){
    shape('trunk','bark',x,height*.45,z,.27,height*.9,.27,.035*(rand()-.5));
    for(const side of [-1,1])shape('trunk','bark',x+side*.32,height*.68,z,.1,height*.38,.1,-side*.45);
    for(let i=0;i<18;i++){const a=rand()*6.28,r=rand()*1.4,px=x+Math.cos(a)*r,py=height-.3+rand()*1.3,pz=z+Math.sin(a)*r;
      for(const rotation of [a,a+Math.PI/2])shape('canopy',i%3===0?'goldFoliage':i%3===1?'ochreFoliage':'oliveFoliage',px,py,pz,.85+rand()*.4,.65+rand()*.45,1,rand()*.25,rotation);
    }
  }
  for(const [x,z,h] of [[-8,-7,6],[-7,-3,5.8],[-8,4,6.2],[8,-6,6.4],[8,1,5.4],[-3,-9,6],[3,-9.6,6.5],[9,7,6.6]])tree(x,z,h);
  // Sparse fallen leaves frame routes, rather than adding micro-noise everywhere.
  for(let i=0;i<160;i++){
    const side=i%2?1:-1,x=side*(4.3+rand()*3.4),z=-8+rand()*15;
    shape('leaf',i%3?'leaf':'ochre',x,.035,z,.055+rand()*.08,.014,.03+rand()*.045,0,rand()*6.28);
  }
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;const glowCtx=glowCanvas.getContext('2d'),grad=glowCtx.createRadialGradient(32,32,1,32,32,32);
  grad.addColorStop(0,'rgba(255,210,126,.5)');grad.addColorStop(.25,'rgba(245,187,88,.18)');grad.addColorStop(1,'rgba(255,190,84,0)');glowCtx.fillStyle=grad;glowCtx.fillRect(0,0,64,64);
  const glowTexture=new T.CanvasTexture(glowCanvas),glowMaterial=new T.SpriteMaterial({map:glowTexture,transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:0xffdc9a});
  for(const [i,[x,z]] of [[-4.7,1.2],[4.8,-2.1],[-5.5,-6.7],[5.9,5.8]].entries()){
    shape('rod','iron',x,1.8,z,.055,3.6,.055);box('iron',x,3.64,z,.34,.12,.34);
    box('glow',x,3.46,z,.19,.28,.19);box('iron',x,3.3,z,.31,.075,.31);
    for(const dx of [-.12,.12])for(const dz of [-.12,.12])box('iron',x+dx,3.46,z+dz,.025,.30,.025);
    const glow=new T.Sprite(glowMaterial);glow.position.set(x,3.47,z);glow.scale.set(1.4,1.4,1);group.add(glow);
    if(i<2){const light=new T.SpotLight(0xffd3a0,63,17,1.0,.86,1.45);light.position.set(x,3.65,z);light.target.position.set(x*.18,0,z*.3);
      light.castShadow=i===0;light.shadow.mapSize.set(1024,1024);light.shadow.normalBias=.04;world.add(light,light.target);}
  }
  // Only authored inspectables receive hotspots; bins and signs remain scenery.
  for(const [x,z] of [[-5,4.9],[5.2,5.1]]){shape('trunk','iron',x,.42,z,.27,.8,.27);shape('rod','night',x,.84,z,.245,.025,.245);}
  box('iron',-7.8,1.6,-10.3,.065,3.2,.065);box('cream',-7.8,2.7,-10.3,.53,.72,.09);box('olive',-7.8,2.9,-10.23,.42,.24,.035);
  // Small wet patches reflect the palette, without an HDR reflection buffer.
  for(let i=0;i<9;i++)round('wet',-4+rand()*8,.007,-6+rand()*12,.4+rand()*.65,.012,.12+rand()*.22);
  for(const [key,items] of bins){const [kind,material]=key.split(':'),mesh=new T.InstancedMesh(geometries[kind],mats[material],items.length);
    items.forEach((o,i)=>{dummy.position.set(o.x,o.y,o.z);dummy.scale.set(o.sx,o.sy,o.sz);dummy.rotation.set(0,o.ry,o.rz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.castShadow=!['glow','lit','wet'].includes(material);mesh.receiveShadow=true;group.add(mesh);
  }
  const particles=new Float32Array(32*3),bases=[];for(let i=0;i<32;i++)bases.push([rand()*16-8,rand()*5,rand()*20-10]);
  const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(particles,3));
  const points=new T.Points(pg,new T.PointsMaterial({color:0xc9a357,size:.045,transparent:true,opacity:.55,depthWrite:false}));group.add(points);
  let clock=0;
  return {name:'Karhupuisto · Bear Path',landmarks:{bear:new T.Vector3(bx,1.8,bz),exit:new T.Vector3(1.2,.1,6.1),contact:new T.Vector3(.4,1.8,-1.8),note:new T.Vector3(-5.6,1,3.5)},
    update(){},tick(dt=0){clock+=dt;for(let i=0;i<bases.length;i++){const [x,y,z]=bases[i];particles[i*3]=x+Math.sin(clock*.23+i)*.45;particles[i*3+1]=(y-clock*.10+100)%5;particles[i*3+2]=z+Math.sin(clock*.18+i)*.3;}pg.attributes.position.needsUpdate=true;},
    aftermath(outcome){points.material.opacity=outcome==='peaceful'?.25:.45;}
  };
}
