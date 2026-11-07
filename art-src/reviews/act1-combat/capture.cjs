// Actual evidence/dashboard capture. No broad suite or bot simulation is run.
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const DIR=__dirname,ROOT=path.resolve(DIR,'../../..');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{let file=path.resolve(ROOT,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream'}).end(data);});});
const report={sourceCommit:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),capturedAt:null,reviewOnly:true,physicalDeviceAcceptance:false,realC19Frames:[],dashboard:[]};
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
  if(process.argv.includes('--real-frames')) for(const [name,width,height] of [['phone',390,844],['desktop',1280,800]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:name==='phone',isMobile:name==='phone'});context.setDefaultNavigationTimeout(180000);context.setDefaultTimeout(120000);
   const page=await context.newPage(),errors=[],missing=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!new URL(r.url()).pathname.endsWith('/hub/shell.js'))missing.push(r.status()+':'+r.url());});
   await page.goto(base+'/web/?play=g0-door');await page.waitForFunction(()=>window.__ptv3?.state?.mode==='encounter');
   await page.locator('.choice-card[data-choice="take-it"]').click();await page.waitForURL(/crew-run\/\?campaign=1&outing=/);
   await page.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy,null,{timeout:180000});
   await page.locator('#crew-deploy').click();await page.waitForFunction(()=>window.crewRun?.snapshot().phase==='battle'&&!fightModule.metrics().busy,null,{timeout:180000});
   await page.waitForTimeout(700);
   const measured=await page.evaluate(()=>({location:fightModule.metrics().environment?.location,goal:document.querySelector('#mission-goal').textContent,pressure:document.querySelector('#mission-pressure').textContent,players:fightModule.snapshot().units.filter(u=>!u.rival).length,enemies:fightModule.snapshot().units.filter(u=>u.rival).length}));
   assert.equal(measured.location,'courtyard');assert.equal(measured.players,3);assert.equal(measured.enemies,3);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
   await page.screenshot({path:path.join(DIR,`c19-courtyard-${name}.png`)});
   report.realC19Frames.push({name,viewport:{width,height},...measured,pageErrors:errors,HTTPFailures:missing,source:'Actual g0-door campaign → C.19 opening; fresh isolated browser context; no mock battle data'});
   console.log('PASS actual C19 frame',name,JSON.stringify(measured));await context.close();
  }
  for(const [name,width,height] of [['phone',390,844],['desktop',1280,800]]){
   const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+':'+r.url())});
   await page.goto(base+'/art-src/reviews/act1-combat/');await page.waitForFunction(()=>window.__combatReview?.ready);
   const before=await page.evaluate(()=>JSON.stringify(Object.entries(localStorage)));
   assert.equal(await page.locator('#scenario option').count(),15);assert.equal(await page.locator('#source option').count(),4);
   assert.equal(await page.locator('#policy-table tr').count(),3);assert.match(await page.locator('#metrics').innerText(),/Not measured/);
   await page.locator('#source').selectOption('baseline12');assert.equal((await page.evaluate(()=>__combatReview.row.braces)),'0.0');
   await page.locator('#scenario').selectOption('door:pickup-fish-stall');assert.equal(await page.locator('#policy-table tr').count(),4);
   await page.locator('#heat').selectOption('3');await page.locator('#policy').selectOption('escort');
   assert.equal((await page.evaluate(()=>__combatReview.selected.policy)),'escort');
   await page.locator('#source').selectOption('dodge30');assert.match(await page.locator('#source-note').innerText(),/EXPERIMENT/);
   for(const id of ['intent','target','move','pressure','exit']){await page.locator(`[data-proposal="${id}"]`).first().click();assert.equal(await page.locator('#proposal-overlay').getAttribute('data-proposal'),id);}
   await page.locator('[data-proposal="original"]').click();assert(await page.locator('#proposal-overlay').isHidden());await page.locator('[data-proposal="intent"]').first().click();
   await page.locator('#source').selectOption('baseline30');await page.locator('#scenario').selectOption('door:hit-courtyard-ledger');await page.locator('#heat').selectOption('0');await page.locator('#policy').selectOption('careful');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const targets=await page.locator('button,select').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));assert(targets.every(height=>height>=44));
   await page.screenshot({path:path.join(DIR,`dashboard-${name}.png`),fullPage:true});
   await page.locator('.arena-study').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(DIR,`proposal-${name}.png`)});
   assert.equal(await page.evaluate(()=>JSON.stringify(Object.entries(localStorage))),before);assert.deepEqual(errors,[]);
   report.dashboard.push({name,viewport:{width,height},scenarios:15,sources:4,policiesFiltered:true,proposals:5,minimumTargetHeight:Math.min(...targets),noHorizontalOverflow:true,storageUnchanged:true,errors});
   console.log('PASS dashboard',name,'filters, missing telemetry, proposals, layout, no storage/errors');await context.close();
  }
  report.capturedAt=new Date().toISOString();
  // Preserve real-frame provenance when running only the faster dashboard check.
  const old=path.join(DIR,'verification.json');if(!report.realC19Frames.length&&fs.existsSync(old))report.realC19Frames=JSON.parse(fs.readFileSync(old)).realC19Frames||[];
  fs.writeFileSync(old,JSON.stringify(report,null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
