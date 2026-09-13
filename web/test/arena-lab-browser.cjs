const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.ARENA_LAB_URL||'http://127.0.0.1:8796/work/piritori-fight-module/web/arena-lab/',out=process.env.ARENA_LAB_OUTPUT||'.private/c09-qa';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});const report={physicalDevice:false,views:[]};try{
  for(const spec of [{name:'desktop',width:1440,height:1000,count:6},{name:'phone',width:412,height:915,count:12,touch:true},{name:'phone-landscape',width:915,height:412,count:2,touch:true},{name:'tablet',width:1194,height:834,count:12,touch:true}]){
    const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:!!spec.touch,isMobile:!!spec.touch}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    await page.route('**/fight-module/main.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\n'+fs.readFileSync(path.join(__dirname,'arena-lab-hooks.js'),'utf8')});});
    await page.goto(base+'?actors='+spec.count);await page.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy);await page.waitForTimeout(8000);
    assert.equal(await page.evaluate(()=>fightModule.metrics().models),spec.count);assert.equal(await page.locator('#roster button').count(),spec.count/2);
    const metrics=await page.evaluate(()=>fightModule.metrics()),before=await page.evaluate(()=>fightModule.snapshot());
    await page.screenshot({path:out+'/'+spec.name+'.png'});
    await page.locator('[data-action="move"]').click();await page.locator('[data-cell]').first().click();await page.waitForFunction(()=>!fightModule.metrics().busy);
    assert.equal(await page.evaluate(()=>fightModule.metrics().history[0]?.type),'move');assert.equal(await page.evaluate(()=>labAudit.replay()),true);
    await page.locator('#end').click();await page.waitForFunction(()=>!fightModule.metrics().busy,{},{timeout:45000});assert.ok(await page.evaluate(()=>fightModule.snapshot().round>=2));
    const committed=await page.evaluate(()=>fightModule.snapshot());await page.evaluate(()=>labAudit.lose());await page.waitForFunction(()=>fightModule.metrics().graphicsLost);await page.waitForTimeout(400);await page.evaluate(()=>labAudit.restore());await page.waitForFunction(()=>!fightModule.metrics().graphicsLost&&!fightModule.metrics().busy);assert.deepEqual(await page.evaluate(()=>fightModule.snapshot()),committed);
    await page.locator('#restart').click();await page.waitForFunction(()=>!fightModule.metrics().busy);assert.deepEqual(await page.evaluate(()=>fightModule.snapshot()),before);
    await page.selectOption('#loadout','ranged');await page.locator('[data-action="attack"]').click();await page.locator('[data-target]:enabled').first().click();await page.waitForFunction(()=>!fightModule.metrics().busy);assert.equal(await page.evaluate(()=>fightModule.metrics().history[0]?.type),'attack');
    await page.locator('#restart').click();
    if(spec.name==='desktop'){report.motion=await page.evaluate(()=>labAudit.motion());for(const m of report.motion){assert.ok(m.minY>=-.002,JSON.stringify(m));assert.ok(m.maxLowestVertex<.06,JSON.stringify(m));}report.visibility=await page.evaluate(()=>labAudit.visibility());for(const v of report.visibility)assert.ok(v.sceneryFraction>.9,JSON.stringify(v));}
    assert.deepEqual(errors,[]);report.views.push({...spec,metrics,errors,move:true,enemyRound:true,replay:true,contextRestore:true,restart:true});fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({view:spec.name,fps:metrics.fps,draws:metrics.draws,models:metrics.models,errors}));await context.close();
  }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
