const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.ARENA_LAB_URL||'http://127.0.0.1:8796/work/piritori-fight-module/web/arena-lab/';
const out=process.env.ARENA_LAB_OUTPUT||'.private/c091-capacity';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1194,height:834},hasTouch:true,isMobile:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/fight-module/main.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+fs.readFileSync(path.join(__dirname,'arena-lab-hooks.js'),'utf8')});});
  await page.goto(base+'?actors=12');await page.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy);await page.waitForTimeout(8000);
  const start=await page.evaluate(()=>fightModule.metrics());
  await page.waitForTimeout(45000);const idle=await page.evaluate(()=>fightModule.metrics());
  assert.ok(idle.renderedFrames-start.renderedFrames>1000,'rendering continues at idle');
  assert.ok(idle.labelLayouts-start.labelLayouts<40,'stationary labels are not relaid every frame');
  assert.equal(idle.geometries,start.geometries);assert.equal(idle.textures,start.textures);
  const tag=page.locator('.actor-label').first(),before=await tag.getAttribute('style');
  await page.locator('#rotate').click();await page.waitForTimeout(150);assert.notEqual(await tag.getAttribute('style'),before,'rotate updates label anchors');
  await page.locator('#resetcam').click();
  await page.locator('[data-action="move"]').click();await page.locator('[data-cell]').first().click();
  // Resize while the actual presentation is running; committed action survives.
  await page.setViewportSize({width:412,height:915});await page.waitForFunction(()=>!fightModule.metrics().busy&&!fightModule.metrics().layoutPaused);
  assert.equal(await page.evaluate(()=>fightModule.metrics().history[0].type),'move');
  assert.equal(await page.evaluate(()=>labAudit.replay()),true);
  await page.locator('#restart').click();await page.setViewportSize({width:1194,height:834});await page.waitForFunction(()=>!fightModule.metrics().layoutPaused);
  const visibility=await page.evaluate(()=>labAudit.visibility()),cells=await page.evaluate(()=>labAudit.visibility({sweepCells:true}));
  const result={physicalDevice:false,idleStart:start,idleEnd:idle,rotationLabels:true,resizeDuringMove:true,visibility,cells,errors};
  fs.writeFileSync(out+'/report.json',JSON.stringify(result,null,2));
  assert.equal(visibility.length,96);assert.ok(cells.length>=8*30);
  for(const item of [...visibility,...cells])assert.ok(item.sceneryFraction>.9,JSON.stringify(item));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({frames:idle.renderedFrames-start.renderedFrames,labelLayouts:idle.labelLayouts-start.labelLayouts,fps:idle.fps,fixtureViews:visibility.length,cellViews:cells.length,minScenery:Math.min(...visibility.concat(cells).map(v=>v.sceneryFraction)),minActorVisibility:Math.min(...visibility.map(v=>v.fraction)),errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
