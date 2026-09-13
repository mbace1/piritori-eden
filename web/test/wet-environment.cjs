const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.CREW_RUN_URL||'http://127.0.0.1:8796/work/piritori-c16-art/web/crew-run/';
const out=process.env.WET_OUTPUT||'.private/c16-wet';fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true,args:['--enable-unsafe-swiftshader']});try{
 for(const spec of [{name:'desktop',width:1440,height:1000,dpr:1},{name:'phone',width:412,height:915,dpr:3,touch:true},{name:'landscape',width:915,height:412,dpr:3,touch:true},{name:'tablet',width:1194,height:834,dpr:2,touch:true}]){
  const ctx=await b.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:Number(process.env.ARENA_LAB_DPR||spec.dpr),hasTouch:!!spec.touch,isMobile:!!spec.touch}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.route('**/fight-module/main.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+"\nlet wetGL;window.wetAudit={lose(){wetGL=renderer.getContext().getExtension('WEBGL_lose_context');wetGL.loseContext();},restore(){wetGL.restoreContext();}};"});});
  const idle=()=>p.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy&&!fightModule.metrics().layoutPaused,{},{timeout:120000});
  const tap=async el=>{await el.scrollIntoViewIfNeeded();await el[spec.touch?'tap':'click']();};
  const metrics=()=>p.evaluate(()=>fightModule.metrics());
  await p.goto(base);await idle();await tap(p.locator('#crew-deploy'));await idle();await p.waitForTimeout(4600);
  const before=await p.evaluate(()=>fightModule.snapshot()),m=await metrics(),ref=m.environment.development.planarReflection;
  assert.equal(ref.size,spec.touch?128:256);assert.equal(ref.actorsReflected,false);assert.ok(m.fps>0,'sampled rendered frames');
  await p.waitForTimeout(1300);assert.equal((await metrics()).environment.development.planarReflection.captures,ref.captures,'stationary view does not render reflection every frame');
  await tap(p.locator('#camera-menu'));await tap(p.locator('[data-camera-preset="oblique"]'));await tap(p.locator('#camera-menu'));await idle();await p.waitForTimeout(450);
  const moved=await metrics();assert.ok(moved.environment.development.planarReflection.captures>ref.captures);assert.equal(moved.textures,m.textures,'camera reuse does not allocate textures');assert.equal(moved.geometries,m.geometries);assert.deepEqual(await p.evaluate(()=>fightModule.snapshot()),before);
  await p.evaluate(()=>wetAudit.lose());await p.waitForFunction(()=>fightModule.metrics().graphicsLost);await p.waitForTimeout(350);await p.evaluate(()=>wetAudit.restore());await idle();await p.waitForTimeout(4300);
  const restored=await metrics();assert.equal(restored.environment.development.planarReflection.size,128,'recovery obeys conservative reflection budget');assert.ok(restored.environment.development.planarReflection.captures>moved.environment.development.planarReflection.captures);assert.ok(restored.finite);assert.deepEqual(await p.evaluate(()=>fightModule.snapshot()),before,'graphics recovery preserves the turn');
  await p.screenshot({path:`${out}/${spec.name}-recovered.png`});assert.deepEqual(errors,[]);
  console.log(JSON.stringify({layout:spec.name,fps:m.fps,recoveredFps:restored.fps,reflection:ref,draws:m.draws,textures:m.textures,buffer:m.drawingBuffer,recoveredBuffer:restored.drawingBuffer,errors}));await ctx.close();
 }
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
