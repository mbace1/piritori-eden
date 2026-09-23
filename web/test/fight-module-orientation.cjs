const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:915,height:412},hasTouch:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.FIGHT_MODULE_URL||'http://127.0.0.1:8796/work/piritori-fight-module/web/fight-module/');
  const ready=()=>page.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy&&!fightModule.metrics().layoutPaused);await ready();
  await page.locator('#withdraw').tap();await ready();const result=await page.evaluate(()=>fightModule.snapshot());
  await page.setViewportSize({width:412,height:915});await page.waitForFunction(()=>fightModule.metrics().layoutPaused);await ready();assert.deepEqual(await page.evaluate(()=>fightModule.snapshot()),result);assert.equal(await page.locator('#again').isEnabled(),true);await page.locator('#again').tap();await ready();assert.equal(await page.evaluate(()=>fightModule.snapshot().round),1);
  await page.locator('#auto').tap();await ready();const count=await page.evaluate(()=>fightModule.metrics().history.length);
  await page.setViewportSize({width:915,height:412});await page.waitForFunction(()=>fightModule.metrics().layoutPaused);await page.waitForFunction(n=>fightModule.metrics().history.length>n,count,{timeout:15000});await ready();await page.locator('#auto').tap();await ready();assert.equal(await page.locator('#auto').getAttribute('aria-pressed'),'false');
  await page.locator('#restart').tap();await ready();assert.deepEqual(errors,[]);
  const report={build:'C.06',completedOutcomePreserved:true,fightAgainEnabledAfterReflow:true,autoContinuesAfterReflow:true,errors,physicalDevice:false};
  fs.writeFileSync('work/piritori-fight-module/web/fight-module/c06-orientation-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
