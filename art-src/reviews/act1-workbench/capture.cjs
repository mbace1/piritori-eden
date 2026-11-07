// Validate the review hub and, with --integrated, every sibling preview route.
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../../..'),OUT=process.env.WORKBENCH_CAPTURE_DIR||path.join(__dirname,'evidence');
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.md':'text/plain','.mp4':'video/mp4','.webm':'video/webm'};
const server=http.createServer((req,res)=>{let file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':MIME[path.extname(file)]||'application/octet-stream'});res.end(data);});});
const integrated=process.argv.includes('--integrated'),SENTINEL=JSON.stringify({ownerSave:'workbench must preserve this byte-for-byte',cash:12345});
const errorsFor=p=>{const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});return errors;};
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const base=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch({headless:true});
 try{
  fs.mkdirSync(OUT,{recursive:true});const report=[];
  for(const [name,width,height] of [['phone',390,844],['desktop',1280,800]]){
   const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',acceptDownloads:true});
   await context.addInitScript(({sentinel})=>{if(!localStorage.getItem('piritori:review:test-seeded')){localStorage.setItem('piritori-to-eden:v3',sentinel);localStorage.setItem('piritori:review:test-seeded','1');}},{sentinel:SENTINEL});
   const p=await context.newPage(),errors=errorsFor(p);await p.goto(base+'/art-src/reviews/act1-workbench/');await p.waitForFunction(()=>window.__act1Workbench?.ready);
   assert.equal(await p.locator('.preview-card').count(),6);assert.equal(await p.locator('.task').count(),36);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await p.screenshot({path:path.join(OUT,`workbench-${name}.png`)});
   await p.locator('#milestone').selectOption('4');assert((await p.locator('.task').count())>0);assert((await p.locator('.task').count())<36);
   await p.locator('#search').fill('eyelid');assert.equal(await p.locator('.task').count(),1);assert.equal(await p.locator('.task').getAttribute('data-task'),'A02');
   await p.locator('.task button').click();await p.locator('#review-notes').fill('Keep the existing artwork; prioritize readable decisions.');
   await p.reload();await p.waitForFunction(()=>window.__act1Workbench?.ready);assert.equal(await p.locator('#review-notes').inputValue(),'Keep the existing artwork; prioritize readable decisions.');
   await p.locator('#only-shortlist').check();assert.equal(await p.locator('.task').count(),1);assert.equal(await p.locator('.task').getAttribute('data-task'),'A02');
   const downloadPromise=p.waitForEvent('download');await p.locator('#export').click();const download=await downloadPromise;const file=path.join(OUT,`review-export-${name}.json`);await download.saveAs(file);const exported=JSON.parse(fs.readFileSync(file));fs.unlinkSync(file);assert.deepEqual(exported.shortlist,['A02']);assert.equal(exported.estimate,48);assert.match(exported.kind,/not approvals/);
   assert.equal(await p.evaluate(()=>localStorage.getItem('piritori-to-eden:v3')),SENTINEL);assert.deepEqual(errors,[]);
   const links=await p.locator('.preview-card .launch').evaluateAll(els=>els.map(a=>a.href));
   if(integrated){
    for(const url of links){const response=await p.request.get(url);assert.equal(response.status(),200,url);}
    // Actually load sibling tools, not only their HTML. Each tool must preserve
    // the campaign sentinel and draw a nonempty visible review surface.
    for(const url of links){const page=await context.newPage(),childErrors=errorsFor(page);await page.goto(url);await page.waitForFunction(route=>{if(route.includes('/scene-club-'))return window.__sceneClubReview?.ready;if(route.includes('/act1-encounters/'))return window.__encounterGallery?.ready;if(route.includes('/act1-combat/'))return window.__combatReview?.ready;if(route.includes('/act1-consequences/'))return Boolean(window.__consequenceReview?.id);if(route.includes('/act1-chapter/'))return window.__chapterReview?.ready;if(route.includes('/map-preview.html'))return document.querySelector('#before')?.naturalWidth>0&&document.querySelector('#after')?.naturalWidth>0;return false;},new URL(url).pathname);await page.waitForLoadState('networkidle',{timeout:15000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),url);assert.equal(await page.evaluate(()=>localStorage.getItem('piritori-to-eden:v3')),SENTINEL,url);assert.deepEqual(childErrors,[],url);await page.close();}
   }
   if(integrated){await p.reload();await p.waitForFunction(()=>window.__act1Workbench?.ready);assert.equal(await p.locator('#review-notes').inputValue(),'Keep the existing artwork; prioritize readable decisions.');await p.locator('#only-shortlist').check();assert.equal(await p.locator('.task').count(),1);}
   await p.locator('#reset').click();assert.equal(await p.locator('#review-notes').inputValue(),'');assert.equal(await p.locator('.task').count(),0); // shortlist-only remains selected
   assert.equal(await p.evaluate(()=>localStorage.getItem('piritori-to-eden:v3')),SENTINEL);
   report.push({viewport:{width,height},cards:6,tasks:36,filters:true,reviewPersistence:true,export:true,campaignUnchanged:true,integrated,errors});
   console.log(`PASS workbench ${name}: filters, review persistence/export/reset, campaign sentinel${integrated?', six actual sibling routes':''}`);await context.close();
  }
  fs.writeFileSync(path.join(OUT,'verification.json'),JSON.stringify({source:'actual browser verification',physicalDeviceAcceptance:false,checks:report},null,2)+'\n');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
