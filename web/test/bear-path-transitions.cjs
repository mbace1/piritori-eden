const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.BEAR_PATH_URL||'http://127.0.0.1:8796/work/piritori-fight-module/web/bear-path/';
const seed=JSON.parse(fs.readFileSync('.private/bear-path/police-fixture.json'));
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});const checks=[];
try{for(const posture of ['BACK_OFF','HELP_FRIENDS']){
 const ctx=await browser.newContext({viewport:{width:412,height:915},hasTouch:true,isMobile:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(seed=>{if(!sessionStorage.getItem('fixture-seeded')){localStorage.setItem('piritori-bear-path-preview-v1',JSON.stringify(seed));sessionStorage.setItem('fixture-seeded','1');}},seed);
 await page.goto(base);await page.waitForFunction(()=>window.bearPath&&!fightModule.metrics().busy);
 assert(await page.locator('#police-panel').isVisible());assert(await page.locator('#end').isDisabled());await page.waitForFunction(()=>document.querySelectorAll('#police-markers span').length===2);assert.equal(await page.locator('#police-markers span').count(),2);
 await page.locator(`[data-police="${posture}"]`).tap();await page.waitForFunction(()=>bearPath.snapshot().state.phase==='aftermath');
 const state=await page.evaluate(()=>bearPath.snapshot());assert.equal(state.state.settlements,1);assert.equal(state.state.outcome,'withdraw');
 await page.reload();await page.waitForFunction(()=>window.bearPath&&!fightModule.metrics().busy);assert.deepEqual(await page.evaluate(()=>bearPath.snapshot()),state);assert.deepEqual(errors,[]);checks.push(posture+' real controls and settled reload');await ctx.close();
}
const ctx=await browser.newContext({viewport:{width:915,height:412},hasTouch:true,isMobile:true}),page=await ctx.newPage();
await page.addInitScript(()=>{if(!sessionStorage.getItem('fixture-seeded')){localStorage.setItem('piritori-bear-path-preview-v1','{"fight":{},"story":{}}');sessionStorage.setItem('fixture-seeded','1');}});
await page.goto(base);await page.waitForFunction(()=>window.bearPath&&!fightModule.metrics().busy);assert.equal(await page.evaluate(()=>bearPath.snapshot().state.phase),'approach');checks.push('corrupt local save resets only preview');
await page.locator('[data-story="talk"]').tap();await page.locator('[data-story="hold-path"]').tap();
await page.evaluate(()=>{window.gpu=document.querySelector('#scene').getContext('webgl2').getExtension('WEBGL_lose_context');gpu.loseContext()});await page.waitForFunction(()=>fightModule.metrics().graphicsLost);await page.evaluate(()=>gpu.restoreContext());await page.waitForFunction(()=>!fightModule.metrics().graphicsLost&&!fightModule.metrics().busy);
assert.equal(await page.evaluate(()=>bearPath.snapshot().state.phase),'battle');assert.equal(await page.evaluate(()=>bearPath.snapshot().state.timeSpent),1);await page.locator('[data-action="brace"]').tap();await page.waitForFunction(()=>!fightModule.metrics().busy);checks.push('graphics loss during camera pullback resumes playable turn');
await ctx.close();fs.writeFileSync('.private/bear-path/transition-report.json',JSON.stringify({result:'PASS',checks,physicalDevice:false},null,2));console.log(JSON.stringify({result:'PASS',checks}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
