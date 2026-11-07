// Authored Scene Club stakes remain visible and settle once through the campaign.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try { for(const [name,width,height] of [['phone',390,844],['desktop',1280,800],['landscape',844,390]]) {
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.PIRITORI_TEST_URL||'http://127.0.0.1:8781/web/');
 await page.waitForFunction(()=>window.__ptv3?.data);
 await page.evaluate(async()=>{
 const {createState,SAVE_KEY}=await import('./js/v3/state.js');
 const c=await(await fetch('../content/era1-slice-v1.json')).json();
 const s=createState(c);s.scheduleIndex=2;s.mode='encounter';s.selectedAnchor=c.schedule[2].anchor_id;
 localStorage.setItem(SAVE_KEY,JSON.stringify(s));
 });
 await page.reload();await page.locator('#resumeButton').click();
 await page.waitForSelector('.cutin canvas[data-status="ready"]');
 const notes=page.locator('.cutin-options small');assert.equal(await notes.count(),3);
 assert.match(await notes.first().innerText(),/preserve trust/);
 const boxes=await page.locator('.cutin-options button').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}}));
 // Landscape may scroll within its bounded decision panel; portrait and desktop fit all choices.
 if(name!=='landscape') for(const r of boxes) assert(r.top>=0&&r.bottom<=height&&r.height>=44,JSON.stringify(r));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(process.env.PIRITORI_CAPTURE_DIR){fs.mkdirSync(process.env.PIRITORI_CAPTURE_DIR,{recursive:true});await page.screenshot({path:`${process.env.PIRITORI_CAPTURE_DIR}/scene-after-${name}.png`});}
 const initial=await page.evaluate(()=>JSON.parse(localStorage.getItem('piritori-to-eden:v3')));
 await page.locator('.cutin-options button').first().click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.waitForSelector('.city-map');
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('piritori-to-eden:v3')));
 const before=await saved();assert.equal(before.choices['enc-jaska-receipt'],'ask-envelope');
 await page.reload();await page.locator('#resumeButton').click();await page.waitForSelector('.city-map');
 const after=await saved();assert.deepEqual(after.relationships,before.relationships);assert.equal(after.markka,before.markka);assert.equal(before.markka,initial.markka+300);assert.equal(before.relationships.jaska,(initial.relationships.jaska||0)+1);assert(before.flags.includes('markka-explained'));
 assert.equal(await page.locator('.cutin[data-talk]').count(),0);assert.deepEqual(errors,[]);
 console.log(`PASS Scene Club ${name}: forecasts, layout, choice, map, reload`);await page.close();
 }} finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
