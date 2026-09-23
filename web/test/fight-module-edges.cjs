const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),sharp=require('sharp');
const base=process.env.FIGHT_MODULE_URL||'http://127.0.0.1:8796/work/piritori-fight-module/web/fight-module/';
const output=process.env.FIGHT_EDGE_OUTPUT||'.private/edge-smoothing';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
 fs.mkdirSync(output,{recursive:true});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/edge-test.html',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><link rel="icon" href="data:,"><script type="importmap">{"imports":{"three":"${new URL('../vendor/three.module.min.js',base)}"}}</script>`}));
  await page.goto(new URL('edge-test.html',base).href);
  const result=await page.evaluate(async base=>{
   const T=await import('three'),{createEdgeSmoothing}=await import(base+'edge-smoothing.js');
   const renderer=new T.WebGLRenderer({antialias:false,alpha:false,preserveDrawingBuffer:false});
   renderer.setSize(240,160);renderer.outputColorSpace=T.SRGBColorSpace;
   renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
   const scene=new T.Scene(),camera=new T.OrthographicCamera(-1.5,1.5,1,-1,.1,10);camera.position.z=2;
   scene.background=new T.Color(0x253731);
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([-1.4,-.8,0,1.3,-.65,0,-.8,.8,0],3));
   scene.add(new T.Mesh(geo,new T.MeshBasicMaterial({color:0xbda877})));
   // Constant color patches catch accidental second tone mapping, gamma, flips.
   for(const [x,y,color] of [[1.1,.65,0x808080],[.6,.65,0xa62b31],[1.1,.1,0x3163af]]){
    const mesh=new T.Mesh(new T.PlaneGeometry(.3,.3),new T.MeshBasicMaterial({color}));mesh.position.set(x,y,.1);scene.add(mesh);
   }
   const pass=createEdgeSmoothing(renderer),gl=renderer.getContext();
   const read=()=>{const bytes=new Uint8Array(240*160*4);gl.readPixels(0,0,240,160,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return Array.from(bytes);};
   renderer.render(scene,camera);const before=read();pass.render();const after=read(),active=pass.metrics();
   const allocations=[];
   for(const [w,h] of [[320,180],[180,320],[240,160],[320,180],[240,160]]){
    renderer.setSize(w,h);renderer.render(scene,camera);pass.render();allocations.push({...renderer.info.memory,...pass.metrics()});
   }
   const draws=renderer.info.render.calls;pass.render(false);const disabled={...renderer.info.memory,...pass.metrics()};
   pass.dispose();const disposed={...renderer.info.memory};const error=gl.getError();renderer.dispose();
   return {before,after,active,allocations,disabled,disposed,draws,error};
  },base);
  assert.equal(result.error,0);assert.equal(result.draws,5,'Four scene meshes plus one fullscreen draw');
  assert.equal(result.active.pixels,240*160);assert.equal(result.active.bytes,240*160*4);
  assert(result.allocations.every(a=>a.textures===1&&a.geometries===5&&a.bytes===a.pixels*4));
  assert.equal(result.disabled.textures,0);assert.equal(result.disabled.method,'none');assert.equal(result.disposed.geometries,4);
  const before=Buffer.from(result.before),after=Buffer.from(result.after);
  let flat=0,flatChanged=0,changed=0,intermediate=0;
  const colors=new Set();for(let i=0;i<before.length;i+=4)colors.add(before.subarray(i,i+3).toString('hex'));
  for(let y=2;y<158;y++)for(let x=2;x<238;x++){
   const at=(y*240+x)*4,center=before.subarray(at,at+3);let homogeneous=true;
   for(const [dx,dy] of [[-1,0],[1,0],[0,1],[0,-1]]){const n=((y+dy)*240+x+dx)*4;if(!center.equals(before.subarray(n,n+3)))homogeneous=false;}
   const differs=!center.equals(after.subarray(at,at+3));if(differs)changed++;
   if(homogeneous){flat++;if(differs)flatChanged++;}
   if(!colors.has(after.subarray(at,at+3).toString('hex')))intermediate++;
  }
  assert.equal(flatChanged,0,'Uniform colors must stay byte-identical, including asymmetric color patches');
  assert(changed>100&&intermediate>100,'Diagonal boundaries should acquire intermediate coverage colors');
  assert(changed/flat<.08,'Filter must not blur the entire scene');assert.deepEqual(errors,[]);
  for(const [name,data] of [['before',before],['after',after]])await sharp(data,{raw:{width:240,height:160,channels:4}}).flip().png().toFile(output+'/'+name+'.png');
  const {before:omitBefore,after:omitAfter,...report}=result;
  Object.assign(report,{flatPixels:flat,flatChanged,changedPixels:changed,intermediatePixels:intermediate,errors,physicalDevice:false});
  fs.writeFileSync(output+'/edge-report.json',JSON.stringify(report,null,2));console.log('PASS: edge coverage, unchanged colors, bounded resize allocations and disposal',JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
