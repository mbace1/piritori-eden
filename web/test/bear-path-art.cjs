const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.BEAR_PATH_URL||'http://127.0.0.1:8796/work/piritori-fight-module/web/bear-path/';
const output=process.env.BEAR_PATH_OUTPUT||'.private/bear-path-c08';fs.mkdirSync(output,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),report=[];
try{for(const spec of [{name:'desktop',width:1280,height:850},{name:'phone',width:412,height:915,touch:true,dpr:2.625},{name:'tablet',width:834,height:1194,touch:true,dpr:2},{name:'landscape',width:915,height:412,touch:true,dpr:2.625}]){
 const ctx=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:!!spec.touch,isMobile:!!spec.touch,deviceScaleFactor:spec.dpr||1}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const ready=()=>page.waitForFunction(()=>window.bearPath&&!fightModule.metrics().busy&&!fightModule.metrics().graphicsLost),tap=s=>page.locator(s)[spec.touch?'tap':'click'](),metrics=()=>page.evaluate(()=>fightModule.metrics());
 const state=()=>page.evaluate(()=>({fight:fightModule.snapshot(),story:bearPath.snapshot(),camera:fightModule.view().frame}));
 await page.goto(base+'?look=ink');await ready();await page.waitForTimeout(500);
 assert.equal((await metrics()).environment.style,'ink');assert.equal((await metrics()).environment.bearTriangles,8610);assert.deepEqual((await metrics()).environment.groundSize,[1024,1024]);
 const box=await page.locator('#art-toggle').boundingBox();assert(box.width>=44&&box.height>=44);
 // Both looks compile before checking repeated switching for resource growth.
 const before=await state();await tap('#art-toggle');await page.waitForTimeout(320);assert.deepEqual(await state(),before);const warm=await metrics();
 for(let i=0;i<6;i++){await tap('#art-toggle');await page.waitForTimeout(280);}const after=await metrics();assert.equal(after.geometries,warm.geometries);assert.equal(after.textures,warm.textures);assert.deepEqual(await state(),before);
 assert.equal(new URL(page.url()).searchParams.get('look'),'cold');await page.screenshot({path:output+'/'+spec.name+'-cold.png'});await page.reload();await ready();assert.equal((await metrics()).environment.style,'cold');assert.deepEqual(await state(),before);
 await tap('#art-toggle');await page.waitForTimeout(350);await page.screenshot({path:output+'/'+spec.name+'-ink.png'});
 await tap('[data-story="talk"]');await tap('[data-story="hold-path"]');await ready();await tap('[data-action="brace"]');assert(await page.locator('#art-toggle').isDisabled());await ready();const battle=await state();
 await tap('#art-toggle');await page.waitForTimeout(320);assert.deepEqual(await state(),battle);
 await page.evaluate(()=>{window.gpu=document.querySelector('#scene').getContext('webgl2').getExtension('WEBGL_lose_context');gpu.loseContext()});await page.waitForFunction(()=>fightModule.metrics().graphicsLost);assert(await page.locator('#art-toggle').isDisabled());await page.evaluate(()=>gpu.restoreContext());await ready();assert.equal((await metrics()).environment.style,'cold');assert.deepEqual(await state(),battle);await page.waitForTimeout(350);await page.screenshot({path:output+'/'+spec.name+'-cold-battle.png'});
 const recovered=await metrics();assert.equal(recovered.models,4);assert(recovered.finite);if(spec.touch){assert(recovered.drawingBuffer[0]*recovered.drawingBuffer[1]<=650000);assert(!recovered.shadows);assert.equal(recovered.edgeSmoothing.method,'fxaa');}
 assert.deepEqual(errors,[]);report.push({viewport:spec.name,physicalDevice:false,checks:['two art directions','same camera/story/turn','saved look reload','six switches without resource growth','44px control','input locked during action/loss','graphics recovery preserves look and turn'],metrics:recovered,errors});await ctx.close();
 }
 const ctx=await browser.newContext(),page=await ctx.newPage();await page.goto(base+'?look=unknown');await page.waitForFunction(()=>window.bearPath&&!fightModule.metrics().busy);assert.equal(await page.evaluate(()=>fightModule.metrics().environment.style),'ink');
 await page.route('**/bear-landmark-v01.glb',route=>route.fulfill({status:200,body:'incomplete'}));await page.reload();await page.waitForFunction(()=>document.querySelector('#loading-message').textContent.includes('Incomplete park asset'));assert(await page.locator('#art-toggle').isDisabled());report.push({checks:['invalid look defaults safely','truncated environment asset shows explicit load failure']});await ctx.close();
 fs.writeFileSync(output+'/art-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({result:'PASS',viewports:report.slice(0,4).map(x=>({viewport:x.viewport,metrics:x.metrics})),assetFailureChecked:true}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
