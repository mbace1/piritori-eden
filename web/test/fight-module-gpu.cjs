const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),sharp=require('sharp');
const base=process.env.FIGHT_MODULE_URL||'http://127.0.0.1:8796/work/piritori-fight-module/web/fight-module/';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
 const reports=[];fs.mkdirSync('.private/c05',{recursive:true});
 try{for(const spec of [{name:'phone',width:412,height:915,dpr:2.625,touch:true},{name:'tablet',width:834,height:1194,dpr:2,touch:true},{name:'desktop',width:1180,height:820,dpr:1,touch:false}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:spec.touch,isMobile:spec.touch,deviceScaleFactor:spec.dpr});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const tap=async selector=>{await page.locator(selector)[spec.touch?'tap':'click']();};
  const ready=()=>page.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy&&!fightModule.metrics().graphicsLost);
  const snapshot=()=>page.evaluate(()=>fightModule.snapshot());
  const metrics=()=>page.evaluate(()=>fightModule.metrics());
  const lose=async()=>{await page.evaluate(()=>{window.testGpu=document.getElementById('scene').getContext('webgl2').getExtension('WEBGL_lose_context');if(!window.testGpu)throw Error('No loss extension');window.testGpu.loseContext();});await page.waitForFunction(()=>fightModule.metrics().graphicsLost);};
  const visibleFrame=async()=>{await page.waitForTimeout(300);const {data,info}=await sharp(await page.locator('#scene').screenshot()).removeAlpha().raw().toBuffer({resolveWithObject:true});let painted=0;for(let i=0;i<data.length;i+=info.channels)if(Math.abs(data[i]-34)+Math.abs(data[i+1]-43)+Math.abs(data[i+2]-41)>25)painted++;assert(painted/(info.width*info.height)>.4,'Canvas is blank despite successful state recovery');};
  const restore=async()=>{await page.evaluate(()=>testGpu.restoreContext());await ready();await visibleFrame();};
  await page.goto(base);await ready();await page.waitForTimeout(2400);
  const initial=await metrics();
  if(spec.touch){assert.equal(initial.profile,'mobile');assert.equal(initial.antialias,false);assert.equal(initial.shadows,false);assert(initial.drawingBuffer[0]*initial.drawingBuffer[1]<=650000);assert(initial.textureSizes.flat().every(s=>s==='1024x1024'));assert(initial.fps<=32);}
  // Player input commits once; lose the actual GL context during its walk.
  await tap('[data-action="move"]');await tap('[data-cell="2,3"]');const moved=await snapshot();await lose();
  assert.equal(await page.locator('#end').isDisabled(),true);await page.keyboard.press('Enter');await page.keyboard.press('1');
  await page.waitForTimeout(500);assert.deepEqual(await snapshot(),moved);assert.equal((await metrics()).busy,true);
  await restore();assert.deepEqual(await snapshot(),moved);assert.equal((await metrics()).history.length,1);
  await tap('[data-action="brace"]');await ready();await tap('#end');const enemy=await snapshot();await lose();await restore();assert.deepEqual(await snapshot(),enemy);
  // Rehearsal's canceled async tail must never reset the real battle later.
  await tap('#showcase');await lose();await restore();await page.waitForTimeout(800);assert.deepEqual(await snapshot(),enemy);
  const baseline=await metrics();assert.equal(baseline.models,4);assert.equal(baseline.finite,true);
  for(let i=0;i<2;i++){await lose();await restore();assert.deepEqual(await snapshot(),enemy);}
  const repeated=await metrics();assert.equal(repeated.textures,baseline.textures);assert.equal(repeated.geometries,baseline.geometries);
  if(spec.name==='phone'){
   // Browser refuses to restore: real fallback button reloads the saved turn.
   await lose();await page.locator('#reload-graphics').waitFor({state:'visible',timeout:8000});await tap('#reload-graphics');await ready();assert.deepEqual(await snapshot(),enemy);assert.equal((await metrics()).profile,'mobile');
   // Also test completed battle recovery without restarting it.
   await tap('#withdraw');await ready();const result=await snapshot();await lose();await restore();assert.deepEqual(await snapshot(),result);assert.equal(await page.locator('#result').isVisible(),true);await tap('#again');await ready();
   await page.setViewportSize({width:915,height:412});await page.waitForTimeout(400);const landscape=await metrics();assert(landscape.drawingBuffer[0]*landscape.drawingBuffer[1]<=650000);await page.screenshot({path:'.private/c05/phone-landscape.png'});await page.setViewportSize({width:412,height:915});
  }else{await tap('#restart');await ready();}
  await visibleFrame();await page.screenshot({path:`.private/c05/${spec.name}.png`});
  assert.deepEqual(errors,[]);reports.push({name:spec.name,dpr:spec.dpr,initial,after:await metrics(),checks:['real context loss during move','input blocked during loss','enemy turn recovery','rehearsal cancellation','repeated restoration without GPU allocation growth',...(spec.name==='phone'?['reload checkpoint fallback','completed outcome recovery','orientation resize']:[])],errors,physicalDevice:false});await context.close();
 }
 fs.writeFileSync('work/piritori-fight-module/web/fight-module/gpu-recovery-report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
