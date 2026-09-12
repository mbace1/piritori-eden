const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.BEAR_PATH_URL||'http://127.0.0.1:8796/work/piritori-fight-module/web/bear-path/';
const output=process.env.BEAR_PATH_OUTPUT||'.private/bear-path';fs.mkdirSync(output,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});const report=[];
try{for(const spec of [{name:'desktop',width:1280,height:850},{name:'phone',width:412,height:915,touch:true,dpr:2.625},{name:'tablet',width:834,height:1194,touch:true,dpr:2},{name:'landscape',width:915,height:412,touch:true,dpr:2.625,reduced:true}]){
 const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:!!spec.touch,isMobile:!!spec.touch,deviceScaleFactor:spec.dpr||1,reducedMotion:spec.reduced?'reduce':'no-preference'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const ready=()=>page.waitForFunction(()=>window.bearPath&&!fightModule.metrics().busy&&!fightModule.metrics().graphicsLost),snap=()=>page.evaluate(()=>bearPath.snapshot()),metric=()=>page.evaluate(()=>fightModule.metrics());
 const tap=async s=>page.locator(s)[spec.touch?'tap':'click']();
 const loss=async()=>{await page.evaluate(()=>{window.gpu=document.querySelector('#scene').getContext('webgl2').getExtension('WEBGL_lose_context');gpu.loseContext()});await page.waitForFunction(()=>fightModule.metrics().graphicsLost);};
 const restore=async()=>{await page.evaluate(()=>gpu.restoreContext());await ready();};
 await page.goto(base);await ready();await page.waitForTimeout(200);
 assert.equal((await snap()).state.phase,'approach');assert.equal(await page.locator('#battle-controls').isVisible(),false);
 const bounds=await page.locator('#story-hotspots button').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}));
 assert(bounds.every(b=>b.w>=44&&b.h>=44));for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){const a=bounds[i],b=bounds[j];assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),'Hotspots overlap');}
 await tap('[data-hotspot="note"]');assert.equal((await snap()).state.timeSpent,0);await page.screenshot({path:`${output}/${spec.name}-arrival.png`});
 await tap('[data-story="talk"]');assert.equal((await snap()).state.phase,'dialogue');assert.equal(await page.locator('[data-story="send-fixer"]').isDisabled(),true);
 assert(await page.locator('.speaker-cutout').evaluate(e=>e.complete&&e.naturalWidth===192));await page.screenshot({path:`${output}/${spec.name}-dialogue.png`});
 await tap('[data-story="name-empty-van"]');assert.equal((await snap()).state.cash,70);const peaceful=await snap();await page.reload();await ready();assert.deepEqual(await snap(),peaceful);
 await tap('[data-story="return"]');assert.equal((await snap()).state.settlements,1);assert.equal((await snap()).state.cash,70);await page.screenshot({path:`${output}/${spec.name}-aftermath.png`});
 await tap('[data-story="restart"]');await ready();await tap('[data-story="talk"]');await tap('[data-story="withdraw"]');assert.equal((await snap()).state.contactOpen,false);assert.equal((await snap()).state.cash,35);await tap('[data-story="return"]');assert.equal((await snap()).state.cash,35);
 await tap('[data-story="restart"]');await ready();await tap('[data-story="talk"]');await tap('[data-story="hold-path"]');await ready();assert.equal((await snap()).state.phase,'battle');assert.equal((await snap()).state.timeSpent,1);assert.equal((await metric()).models,4);
 await tap('[data-action="move"]');await tap('[data-cell]:first-child');const moved=await page.evaluate(()=>fightModule.snapshot());await loss();assert.equal(await page.locator('#end').isDisabled(),true);await restore();assert.deepEqual(await page.evaluate(()=>fightModule.snapshot()),moved);assert.equal((await snap()).state.phase,'battle');
 const baseline=await metric();for(let i=0;i<2;i++){await loss();await restore();}const stable=await metric();assert.equal(stable.geometries,baseline.geometries);assert.equal(stable.textures,baseline.textures);
 await page.screenshot({path:`${output}/${spec.name}-battle.png`});
 if(spec.name==='phone'){const before=await snap();await page.setViewportSize({width:915,height:412});await page.waitForTimeout(400);assert.deepEqual(await snap(),before);await page.setViewportSize({width:412,height:915});await page.waitForTimeout(400);}
 await tap('#end');await ready();await tap('#talk');await loss();await restore();assert.equal((await snap()).state.phase,'aftermath');assert.equal((await snap()).state.settlements,1);assert.equal((await snap()).state.timeSpent,1);const settled=await snap();await page.reload();await ready();assert.deepEqual(await snap(),settled);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 if(spec.touch){assert(stable.drawingBuffer[0]*stable.drawingBuffer[1]<=650000);assert.equal(stable.edgeSmoothing.method,'fxaa');assert.equal(stable.shadows,false);}
 report.push({name:spec.name,checks:['inspection free','nonoverlapping touch targets','live-model portrait','peaceful handover','single settlement and reload','withdrawal and closed contact','same-scene battle','move interrupted by real GL loss','repeated recovery allocations','negotiated battle outcome during graphics loss',...(spec.name==='phone'?['orientation preserves state']:[])],metrics:stable,errors,physicalDevice:false});await context.close();
}fs.writeFileSync(output+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
