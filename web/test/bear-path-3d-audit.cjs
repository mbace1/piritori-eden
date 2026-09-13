const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=process.env.BEAR_PATH_OUTPUT||'.private/c08-3d-audit',base=process.env.BEAR_PATH_URL||'http://127.0.0.1:8796/work/piritori-fight-module/web/bear-path/?look=cold';
fs.mkdirSync(root,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});try{
 const report={date:new Date().toISOString(),baseline:'C.08 r2; check actual source and asset hashes before interpreting a later build',physicalDevice:false,views:[]};
 for(const spec of [{name:'desktop',width:1280,height:850},{name:'phone-portrait',width:412,height:915,touch:true},{name:'tablet-landscape',width:1194,height:834,touch:true}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:!!spec.touch,isMobile:!!spec.touch}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.route('**/fight-module/main.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+fs.readFileSync(require('node:path').join(__dirname,'three-audit-hooks.js'),'utf8')});});
  await page.goto(base);await page.waitForFunction(()=>window.bearPath&&!fightModule.metrics().busy);
  await page.locator('[data-story="talk"]').click();await page.locator('[data-story="hold-path"]').click();await page.waitForFunction(()=>!fightModule.metrics().busy);
  const before=await page.evaluate(()=>fightModule.snapshot()),vis=await page.evaluate(()=>audit3d.visibility());assert.deepEqual(await page.evaluate(()=>fightModule.snapshot()),before);
  const worst=vis.rows.reduce((a,b)=>a.visibleFraction<b.visibleFraction?a:b);const row={...spec,visibility:vis,worst,metrics:await page.evaluate(()=>fightModule.metrics()),errors};
  for(let n=0;n<worst.step;n++){await page.locator('#rotate').click();await page.waitForTimeout(290);}await page.waitForTimeout(200);await page.screenshot({path:root+'/'+spec.name+'-worst-camera.png'});
  await page.locator('#resetcam').click();await page.waitForTimeout(300);await page.screenshot({path:root+'/'+spec.name+'-fit.png'});
  if(spec.name==='desktop'){report.motion=await page.evaluate(()=>audit3d.motions());}
  assert.deepEqual(errors,[]);report.views.push(row);fs.writeFileSync(root+'/audit-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({viewport:spec.name,worst}));await context.close();
 }
 console.log(JSON.stringify({ground:report.motion.results.map(r=>({id:r.id,modes:r.modes.map(m=>({mode:m.mode,minY:+m.minY.toFixed(3),maxBelowFloorFraction:+m.maxBelowFloorFraction.toFixed(3)}))})),physicalDevice:false}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
