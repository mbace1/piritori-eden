const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.FIGHT_MODULE_URL||'http://127.0.0.1:8796/work/piritori-fight-module/web/fight-module/';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});const reports=[];
 for(const [name,width,height,touch] of [['desktop',1180,820,false],['phone',412,915,true],['tablet',834,1194,true],['landscape',915,412,true]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,deviceScaleFactor:1});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto(base);await page.waitForFunction(()=>window.fightModule);const ready=()=>page.waitForFunction(()=>!window.fightModule.metrics().busy);const tap=async sel=>{const l=page.locator(sel);await(touch?l.tap():l.click());};
  await tap('[data-action="move"]');await tap('[data-cell="2,3"]');await ready();let s=await page.evaluate(()=>fightModule.snapshot());assert.equal(s.units.find(u=>u.id==='f01').cell,'2,3');assert(s.acted.includes('f01'));
  await tap('[data-action="brace"]');await ready();await tap('#end');await ready();assert.equal(await page.evaluate(()=>fightModule.snapshot().round),2);
  await tap('#talk');await ready();assert.equal(await page.evaluate(()=>fightModule.snapshot().result),'partial');await tap('#again');await ready();
  await tap('[data-action="item"]');await ready();s=await page.evaluate(()=>fightModule.snapshot());assert.equal(s.units.find(u=>u.id==='f01').itemIds.length,0);
  await tap('#withdraw');await ready();assert.equal(await page.evaluate(()=>fightModule.snapshot().result),'withdraw');await tap('#again');await ready();
  await tap('[data-action="attack"]');await tap('[data-target="op-f01"]');await ready();s=await page.evaluate(()=>fightModule.snapshot());assert(s.units.find(u=>u.id==='op-f01').guard<2);assert(s.acted.includes('f01'));
  await tap('#restart');await ready();await page.selectOption('#loadout','ranged');await tap('[data-action="attack"]');await tap('[data-target="op-f01"]');await ready();assert.equal(await page.evaluate(()=>fightModule.metrics().mode),'ranged');
  await tap('#restart');await ready();await tap('#showcase');await page.waitForFunction(()=>!fightModule.metrics().busy,{},{timeout:35000});assert(await page.evaluate(()=>fightModule.metrics().finite));
  await tap('#rotate');await tap('#zoomin');await tap('#resetcam');const sizes=await page.locator('#actions button').evaluateAll(es=>es.map(e=>({h:e.getBoundingClientRect().height,w:e.getBoundingClientRect().width})));assert(sizes.every(s=>s.h>=43.99&&s.w>=43.99));
  await page.screenshot({path:`outputs/fight-module-${name}.png`});reports.push({name,errors,metrics:await page.evaluate(()=>fightModule.metrics()),touchTargets:sizes});assert.deepEqual(errors,[]);
  if(name==='desktop'){
   // Real buttons resolve a defeat; no state mutation or model calls.
   await page.selectOption('#loadout','mixed');for(let i=0;i<15&&await page.evaluate(()=>fightModule.snapshot().status==='active');i++){await tap('#end');await ready();}assert.equal(await page.evaluate(()=>fightModule.snapshot().result),'loss');await tap('#again');await ready();await tap('#auto');await page.waitForFunction(()=>fightModule.snapshot().status!=='active'&&!fightModule.metrics().busy,{},{timeout:120000});reports[0].autoResult=await page.evaluate(()=>fightModule.snapshot().result);
  }
  await context.close();
 }
 fs.writeFileSync('outputs/fight-module-browser-report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
