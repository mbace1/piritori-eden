import * as T from 'three';

// D009: Ink & Stone and Cold Street are two approved directions, not one blend.
// They share geometry and encounter anchors; switching only changes art state.
// Physical staging is compressed fiction, not a survey of the real park.
export function buildKarhupuisto(world,renderer,cover,position,assets,initialStyle='ink'){
  if(!assets?.bear||!assets?.ground)throw Error('The park assets did not load.');
  world.background=new T.Color('#101d25');world.fog=new T.Fog('#172832',19,45);
  renderer.toneMappingExposure=1;
  const group=new T.Group();group.name='Karhupuisto';world.add(group);
  const geometries={box:new T.BoxGeometry(1,1,1),round:new T.IcosahedronGeometry(1,1),
    trunk:new T.CylinderGeometry(.7,1,1,7),rod:new T.CylinderGeometry(1,1,1,6),
    canopy:new T.PlaneGeometry(2,2),leaf:new T.IcosahedronGeometry(1,0)};
  const palette={stone:0x79796d,granite:0x594b4d,iron:0x293e3d,wood:0x644b32,
    soil:0x303b30,grass:0x4a5739,bark:0x483d30,gold:0x94753b,ochre:0x665d34,
    olive:0x3f5036,plaster:0x667176,brick:0x675c51,night:0x223239,window:0x152b32,
    trim:0x465354,leaf:0x987641,cream:0xd0b87e,wet:0x314650,rust:0x7e5038,
    scar:0x9a8770,parcel:0xb39c70,poster:0xabaa95,tram:0x315a4b};
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

  const hemisphere=new T.HemisphereLight(0x9db8ce,0x293b39,1.15);world.add(hemisphere);
  const sky=new T.DirectionalLight(0x9abbcf,1.4);sky.position.set(-4,9,7);world.add(sky);
  const lamps=[];
  // Ground albedo has no baked lights. Runtime upload is capped at 1024².
  const groundMaterial=new T.MeshStandardMaterial({map:assets.ground,color:0x85999b,roughness:.92});
  const grainStrength={value:.32};
  groundMaterial.onBeforeCompile=shader=>{shader.uniforms.parkGrain=grainStrength;shader.fragmentShader='uniform float parkGrain;\n'+shader.fragmentShader.replace('#include <map_fragment>','vec3 parkBaseColor=diffuseColor.rgb;\n#include <map_fragment>\ndiffuseColor.rgb=mix(parkBaseColor*.15,diffuseColor.rgb,parkGrain)*1.5;');};
  groundMaterial.customProgramCacheKey=()=>'park-gravel-blend-v1';
  const ground=new T.Mesh(new T.PlaneGeometry(40,44),groundMaterial);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;group.add(ground);
  // Small code-authored wear maps: directional strokes, broad chips, no random
  // full-screen grain. Every instance shares these same material/texture objects.
  function wearMap(wood=false){const c=document.createElement('canvas');c.width=256;c.height=128;const cx=c.getContext('2d');cx.fillStyle='#c5c4b9';cx.fillRect(0,0,256,128);
    for(let i=0;i<38;i++){cx.globalAlpha=.09+rand()*.16;cx.fillStyle=i%3?'#4d514b':'#f8edd6';const x=rand()*256,y=rand()*128;cx.fillRect(x,y,wood?20+rand()*130:8+rand()*40,wood?1+rand()*3:2+rand()*12);}
    cx.globalAlpha=.30;cx.fillStyle='#f5ebd2';cx.fillRect(0,1,256,2);cx.globalAlpha=.25;cx.fillStyle='#333e3d';cx.fillRect(0,124,256,4);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=2;return t;}
  const woodMap=wearMap(true),masonryMap=wearMap();mats.wood.map=woodMap;
  for(const key of ['stone','granite','plaster','brick'])mats[key].map=masonryMap;
  // Cut foliage cards have irregular leaf silhouettes, rather than solid
  // polygon balloons. One small shared texture; alpha test keeps depth stable.
  const foliageCanvas=document.createElement('canvas');foliageCanvas.width=foliageCanvas.height=256;
  const fc=foliageCanvas.getContext('2d');
  for(let i=0;i<125;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*108,x=128+Math.cos(a)*r,y=128+Math.sin(a)*r*.82,s=6+rand()*13;
    fc.fillStyle=['#87916b','#c7c499','#dfce91','#63774f'][i%4];fc.save();fc.translate(x,y);fc.rotate(rand()*6.28);fc.beginPath();fc.moveTo(-s,0);fc.lineTo(-s*.3,-s*.7);fc.lineTo(s*.55,-s*.46);fc.lineTo(s,0);fc.lineTo(0,s*.62);fc.closePath();fc.fill();fc.restore();}
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
    box('stone',x,h-.28,-15.60,6.5,.10,.30);box('trim',x,h+.12,-16.6,6.6,.15,3);
    for(const y of [2.7,4.85])box('stone',x,y,-15.59,6.45,.09,.23);
    for(const dx of [-3.04,3.04]){box('stone',x+dx,h/2,-15.57,.20,h,.30);shape('rod','iron',x+dx-.1,h/2,-15.37,.035,h,.035);}
    box('trim',x,.88,-15.49,1.03,1.78,.23);box('night',x,.83,-15.33,.83,1.62,.04);
    box('iron',x+.26,.78,-15.26,.035,.22,.07);
    for(let floor=0;floor<3;floor++)for(let col=0;col<4;col++){
      const wx=x-2.25+col*1.5,wy=1.7+floor*2.15;
      box('trim',wx,wy,-15.67,.94,1.44,.18);
      box(rand()>.74?'lit':'window',wx,wy,-15.55,.71,1.2,.07);
      box('trim',wx,wy,-15.47,.045,1.21,.05);box('trim',wx,wy-.04,-15.45,.73,.045,.05);
      box('stone',wx,wy-.77,-15.43,1.08,.085,.30);box('stone',wx,wy+.76,-15.49,1.05,.13,.24);
    }
  }
  // A quiet static tram gives city context. No invented route or service claim.
  const tx=7.8,tz=-12.4;
  box('tram',tx,.88,tz,7.1,1.55,1.6);box('cream',tx,1.9,tz,7.1,.35,1.6);box('iron',tx,2.13,tz,7.2,.12,1.7);
  for(let n=0;n<7;n++){const x=tx-2.9+n*.94;box('trim',x,1.53,tz+.82,.81,.92,.04);box(n===0||n===6?'window':'lit',x,1.53,tz+.845,.66,.74,.025);}
  box('cream',tx,.80,tz+.82,6.8,.055,.04);
  for(const x of [tx-2.4,tx+2.4])shape('round','night',x,.24,tz,.39,.26,.68);
  shape('rod','iron',tx,2.63,tz,.025,1.05,.025,.55);shape('rod','iron',tx+.48,2.63,tz,.025,1.05,.025,-.55);
  box('iron',tx+.24,3.10,tz,1,.04,.1);box('iron',0,3.15,tz,38,.02,.025);

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
    for(const side of [-1,1]){box('iron',x+side*.66,.26,z,.075,.48,.5);box('iron',x+side*.66,.76,z-.31,.07,.67,.07);
      box('iron',x+side*.66,.71,z,.065,.065,.55);box('iron',x+side*.66,.57,z+.23,.06,.30,.06);
      box('iron',x+side*.66,.055,z,.15,.06,.65);
      for(const y of [.76,.90,1.02])round('iron',x+side*.67,y,z-.246,.027,.027,.012);
      box('scar',x+side*.48,.505,z+.06,.23,.009,.035);}
  }
  bench(-5.7,3.5);bench(5.6,3.8);bench(3.6,-6.6);
  const bearCell=[...cover].find(([,v])=>v.propId==='bear-plinth')?.[0]||'2,6';
  const bp=position(bearCell),bx=bp.x,bz=bp.z-.66;
  box('granite',bx,.43,bz,1.67,.78,.94);box('stone',bx,.85,bz,1.78,.08,1.02);
  box('stone',bx,.045,bz,1.85,.09,1.10);box('iron',bx,.39,bz+.475,.61,.16,.012);
  const bear=assets.bear,bounds=new T.Box3().setFromObject(bear),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),scale=1.72/size.x;
  bear.scale.setScalar(scale);bear.position.set(bx-center.x*scale,.89-bounds.min.y*scale,bz-center.z*scale);bear.name='Karhupuisto carved bear';group.add(bear);
  bear.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.material=o.material.clone();}});
  const benchCell=[...cover].find(([,v])=>v.propId==='park-bench')?.[0]||'1,6',bb=position(benchCell);
  bench(bb.x-.3,bb.z-.55);
  box('parcel',bb.x-.3,.64,bb.z-.51,.42,.28,.27);box('wood',bb.x-.3,.785,bb.z-.51,.035,.013,.28);box('wood',bb.x-.3,.65,bb.z-.365,.035,.27,.008);
  // Graded cross-path edges, patched apron and drain stay outside actor cells.
  for(const side of [-1,1])for(let i=0;i<14;i++)box('stone',side*4.48,.027,-8+i*1.12,.14,.055,1.08);
  box('stone',.9,.02,6.15,3.25,.035,1.7);box('night',1.8,.045,6.04,.87,.035,.49);
  for(let i=0;i<10;i++)box('iron',1.43+i*.083,.068,6.04,.03,.018,.43);
  for(const x of [-.72,2.54]){box('stone',x,.46,6.75,.42,.9,.42);box('granite',x,.95,6.75,.5,.10,.5);}
  // Contact shadows remain present on devices where real shadows are disabled.
  const contactMat=new T.MeshBasicMaterial({color:0x091a1e,transparent:true,opacity:.17,depthWrite:false});
  for(const [x,z,w,d] of [[bx,bz,2.12,1.4],[bb.x-.3,bb.z-.55,2.0,.87],[-5.7,3.5,2,.85],[5.6,3.8,2,.85],[3.6,-6.6,2,.85]]){const s=new T.Mesh(new T.CircleGeometry(1,20),contactMat);s.rotation.x=-Math.PI/2;s.scale.set(w*.61,d*.69,1);s.position.set(x,.012,z);group.add(s);}

  function tree(x,z,height=5.3){
    shape('trunk','bark',x,height*.45,z,.27,height*.9,.27,.035*(rand()-.5));
    for(let n=0;n<3;n++)shape('trunk','scar',x+.13,height*.28+n*.8,z-.16,.025,.35,.035,.14);
    for(const side of [-1,1])shape('trunk','bark',x+side*.32,height*.68,z,.1,height*.38,.1,-side*.45);
    for(let i=0;i<18;i++){const a=rand()*6.28,r=rand()*1.4,px=x+Math.cos(a)*r,py=height-.3+rand()*1.3,pz=z+Math.sin(a)*r;
      for(const rotation of [a,a+Math.PI/2])shape('canopy',i%3===0?'goldFoliage':i%3===1?'ochreFoliage':'oliveFoliage',px,py,pz,.85+rand()*.4,.65+rand()*.45,1,rand()*.25,rotation);
    }
  }
  for(const [x,z,h] of [[-8,-7,6],[-7,-3,5.8],[-8,4,6.2],[8,-6,6.4],[8,1,5.4],[-3,-9,6],[3,-9.6,6.5],[9,7,6.6]])tree(x,z,h);
  // Sparse fallen leaves frame routes, rather than adding micro-noise everywhere.
  for(let i=0;i<160;i++){
    const side=i%2?1:-1,x=side*(4.3+rand()*3.4),z=-8+rand()*15;
    shape('leaf',i%3?'leaf':'ochre',x,.035,z,.08+rand()*.12,.014,.04+rand()*.06,0,rand()*6.28);
  }
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;const glowCtx=glowCanvas.getContext('2d'),grad=glowCtx.createRadialGradient(32,32,1,32,32,32);
  grad.addColorStop(0,'rgba(255,210,126,.5)');grad.addColorStop(.25,'rgba(245,187,88,.18)');grad.addColorStop(1,'rgba(255,190,84,0)');glowCtx.fillStyle=grad;glowCtx.fillRect(0,0,64,64);
  const glowTexture=new T.CanvasTexture(glowCanvas),glowMaterial=new T.SpriteMaterial({map:glowTexture,transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:0xffdc9a});
  for(const [i,[x,z]] of [[-4.7,1.2],[4.8,-2.1],[-5.5,-6.7],[5.9,5.8]].entries()){
    shape('rod','iron',x,1.8,z,.055,3.6,.055);shape('trunk','iron',x,.27,z,.15,.54,.15);shape('rod','iron',x,.05,z,.21,.1,.21);box('iron',x,3.64,z,.34,.12,.34);
    shape('trunk','iron',x,3.78,z,.14,.23,.14);shape('rod','iron',x,3.94,z,.027,.17,.027);
    box('glow',x,3.46,z,.19,.28,.19);box('iron',x,3.3,z,.31,.075,.31);
    for(const dx of [-.12,.12])for(const dz of [-.12,.12])box('iron',x+dx,3.46,z+dz,.025,.30,.025);
    const glow=new T.Sprite(glowMaterial);glow.position.set(x,3.47,z);glow.scale.set(1.4,1.4,1);group.add(glow);
    if(i<2){const light=new T.SpotLight(0xffd3a0,63,17,1.0,.86,1.45);light.position.set(x,3.65,z);light.target.position.set(x*.18,0,z*.3);
      light.castShadow=i===0;light.shadow.mapSize.set(1024,1024);light.shadow.normalBias=.04;world.add(light,light.target);lamps.push(light);}
    if(i===3)for(let n=0;n<4;n++){box(n%2?'poster':'cream',x,.65+n*.20,z+.06,.14,.16,.015);box('night',x,.65+n*.20,z+.072,.07,.013,.003);}
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
  let clock=0,currentStyle;
  const palettes={ink:{stone:0xaaa38b,granite:0x76635a,iron:0x213d3d,wood:0xb48049,soil:0x283a30,grass:0x59633d,bark:0x403b30,plaster:0x789094,brick:0x797c71,night:0x182e36,window:0x102b36,trim:0x526d70,leaf:0xc09243,cream:0xd2b877,scar:0xb19a6b,wet:0x274a52},
    cold:{stone:0x939e9b,granite:0x777879,iron:0x2e4143,wood:0x736858,soil:0x333f38,grass:0x465342,bark:0x4b4f49,plaster:0x9ba5a4,brick:0x838d8e,night:0x30424a,window:0x1a343e,trim:0x6d7c7e,leaf:0x81754c,cream:0xaea994,scar:0x858b7e,wet:0x59727a}};
  function setStyle(style){
    currentStyle=style==='cold'?'cold':'ink';const cold=currentStyle==='cold';
    for(const [name,color] of Object.entries(palettes[currentStyle]))mats[name].color.setHex(color);
    for(const name of ['stone','granite','bark']){mats[name].flatShading=!cold;mats[name].needsUpdate=true;}
    groundMaterial.color.setHex(cold?0x879baa:0xb9b198);groundMaterial.roughness=cold?.80:.96;grainStrength.value=cold?.85:.65;
    world.background.set(cold?'#17252f':'#12252b');world.fog.color.set(cold?'#293d49':'#17353e');world.fog.near=cold?23:19;
    hemisphere.color.setHex(cold?0xadcae2:0x93b9c3);hemisphere.groundColor.setHex(cold?0x3e4c51:0x343d30);hemisphere.intensity=cold?1.4:1.1;
    sky.color.setHex(cold?0xb7d0e7:0xa9c7cc);sky.intensity=cold?1.5:1.3;renderer.toneMappingExposure=cold?.97:1.05;
    for(const light of lamps){light.color.setHex(cold?0xffd9aa:0xffbd6d);light.intensity=cold?46:73;}
    for(const [i,name] of ['gold','ochre','olive'].entries()){mats[name+'Foliage'].color.setHex((cold?[0x929879,0x777e64,0x5e7864]:[0xf4b953,0xc8a661,0x8ca267])[i]);mats[name+'Foliage'].emissiveIntensity=cold?.05:.13;}
    mats.wet.opacity=cold?.25:.09;points.material.color.setHex(cold?0x9b9274:0xddad55);
    bear.traverse(o=>{if(!o.isMesh)return;o.material.flatShading=!cold;o.material.roughness=cold?.84:1;o.material.color.setHex(cold?0x9cabb7:0xacb1b5);o.material.needsUpdate=true;});
  }
  setStyle(initialStyle);
  return {name:'Karhupuisto · Bear Path',setStyle,metrics:()=>({style:currentStyle,bearTriangles:assets.triangles,assetBytes:assets.bytes,groundSize:[assets.ground.image.width,assets.ground.image.height],bearBounds:new T.Box3().setFromObject(bear).getSize(new T.Vector3()).toArray()}),landmarks:{bear:new T.Vector3(bx,1.8,bz),exit:new T.Vector3(1.2,.1,6.1),contact:new T.Vector3(.4,1.8,-1.8),note:new T.Vector3(-5.6,1,3.5)},
    update(){},tick(dt=0){clock+=dt;for(let i=0;i<bases.length;i++){const [x,y,z]=bases[i];particles[i*3]=x+Math.sin(clock*.23+i)*.45;particles[i*3+1]=(y-clock*.10+100)%5;particles[i*3+2]=z+Math.sin(clock*.18+i)*.3;}pg.attributes.position.needsUpdate=true;},
    aftermath(outcome){points.material.opacity=outcome==='peaceful'?.25:.45;}
  };
}
