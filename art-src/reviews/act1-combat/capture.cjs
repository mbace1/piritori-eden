// Actual evidence/dashboard capture. No broad suite or bot simulation is run.
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const DIR=__dirname,ROOT=path.resolve(DIR,'../../..');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{let file=path.resolve(ROOT,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream'}).end(data);});});
const report={sourceCommit:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),reviewChangesUncommittedAtCapture:require('node:child_process').execFileSync('git',['status','--porcelain','--','art-src/reviews/act1-combat/'],{cwd:ROOT,encoding:'utf8'}).trim().length>0,capturedAt:null,reviewOnly:true,physicalDeviceAcceptance:false,realC19Frames:[],dashboard:[],note:'New defensive dashboard captures; original screenshots and verification.json remain historical. No simulation or arena recapture unless explicitly requested.'};
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
   await page.screenshot({path:path.join(DIR,`defensive-c19-courtyard-${name}.png`)});
   report.realC19Frames.push({name,viewport:{width,height},...measured,pageErrors:errors,HTTPFailures:missing,source:'Actual g0-door campaign → C.19 opening; fresh isolated browser context; no mock battle data'});
   console.log('PASS actual C19 frame',name,JSON.stringify(measured));await context.close();
  }
  const defensiveRows=JSON.parse(fs.readFileSync(path.join(ROOT,'design/evidence/defensive-policy-2026-11-07/integrated-v497/defensive-30.json'),'utf8'));
  const {comparison}=await import('./model.mjs');
  for(const [name,width,height] of [['phone',390,844],['desktop',1280,800]]){
   const context=await browser.newContext({viewport:{width,height}});await context.addInitScript(()=>{localStorage.setItem('piritori-to-eden:v3','defensive-dashboard-campaign-sentinel');localStorage.setItem('other-review-sentinel','preserve');});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+':'+r.url())});page.on('requestfailed',r=>errors.push(r.failure()?.errorText+':'+r.url()));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   await page.goto(base+'/art-src/reviews/act1-combat/?source=defensive30');await page.waitForFunction(()=>window.__combatReview?.ready);
   const before=await page.evaluate(()=>JSON.stringify(Object.entries(localStorage)));
   assert.equal(await page.locator('#scenario option').count(),15);assert.equal(await page.locator('#source option').count(),5);
   assert.equal(await page.locator('#source').inputValue(),'defensive30');assert.equal((await page.evaluate(()=>__combatReview.selected.policy)),'defensive');assert.equal((await page.evaluate(()=>__combatReview.rows)),192);assert.equal((await page.evaluate(()=>__combatReview.sourceVersion)),'v4.97');
   assert.match(await page.locator('#sample').innerText(),/5,760 simulations/);assert.equal(await page.locator('#policy-table tr').count(),4);
   assert.match(await page.locator('#source-note').innerText(),/integrated v4.97/);assert.match(await page.locator('#provenance').textContent(),/not an independent default run/);assert.match(await page.locator('#provenance').textContent(),/3d18d8adc3c0de1375c85a1ce826dc48523e589d/);assert.match(await page.locator('[data-comparison="defensive"]').innerText(),/net HP saved/);assert.match(await page.locator('#comparison').innerText(),/does not isolate Brace/);
   let defensiveCohorts=0;
   for(const fight of new Set(defensiveRows.map(r=>r.fight)))for(const heat of [0,2,3]){
    await page.locator('#scenario').selectOption(fight);await page.locator('#heat').selectOption(String(heat));await page.locator('#policy').selectOption('defensive');
    const row=defensiveRows.find(r=>r.fight===fight&&r.heat===heat&&r.policy==='defensive');assert.deepEqual(await page.evaluate(()=>__combatReview.row),row);assert.deepEqual(await page.evaluate(()=>__combatReview.defensiveDelta),comparison(defensiveRows,fight,heat,'defensive'));assert.equal(await page.locator('#policy-table tr').count(),row.goal==='fight'?4:5);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));defensiveCohorts++;
   }
   for(const source of ['baseline12','baseline30','dodge12','dodge30']){await page.locator('#source').selectOption(source);assert.equal(await page.evaluate(()=>__combatReview.rows),147);assert.equal(await page.locator('#policy option[value="defensive"]').count(),0);assert.equal(await page.locator('[data-comparison="defensive"]').count(),0);assert.match(await page.locator('#provenance').textContent(),/Historical v4.96 rules/);assert.equal(await page.locator('.metric').filter({hasText:'Brace commands'}).locator('strong').innerText(),source==='baseline30'?'Not measured':'0.0');}
   await page.locator('#source').selectOption('baseline30');assert.equal(await page.locator('.metric').filter({hasText:'Move commands'}).locator('strong').innerText(),'Not measured');assert.equal(await page.locator('.metric').filter({hasText:'Attack commands'}).locator('strong').innerText(),'Not measured');
   await page.locator('#source').selectOption('baseline12');assert.equal((await page.evaluate(()=>__combatReview.row.braces)),'0.0');
   await page.locator('#scenario').selectOption('door:pickup-fish-stall');assert.equal(await page.locator('#policy-table tr').count(),4);
   await page.locator('#heat').selectOption('3');await page.locator('#policy').selectOption('escort');
   assert.equal((await page.evaluate(()=>__combatReview.selected.policy)),'escort');
   await page.locator('#source').selectOption('dodge30');assert.match(await page.locator('#source-note').innerText(),/EXPERIMENT/);
   for(const id of ['intent','target','move','pressure','exit']){await page.locator(`[data-proposal="${id}"]`).first().click();assert.equal(await page.locator('#proposal-overlay').getAttribute('data-proposal'),id);}
   await page.locator('[data-proposal="original"]').click();assert(await page.locator('#proposal-overlay').isHidden());await page.locator('[data-proposal="intent"]').first().click();
   await page.locator('#source').selectOption('defensive30');await page.locator('#scenario').selectOption('door:hit-courtyard-ledger');await page.locator('#heat').selectOption('0');await page.locator('#policy').selectOption('careful');assert.equal(await page.locator('.metric').filter({hasText:'Brace with incoming'}).locator('strong').innerText(),'Not measured');await page.locator('#policy').selectOption('defensive');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const targets=await page.locator('button,select').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));assert(targets.every(height=>height>=44));
   await page.locator('details').first().evaluate(el=>el.open=true);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(DIR,`defensive-dashboard-${name}.png`),fullPage:true});
   await page.locator('#comparison').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(DIR,`defensive-comparison-${name}.png`)});
   await page.reload();await page.waitForFunction(()=>window.__combatReview?.ready);assert.equal(await page.locator('#source').inputValue(),'defensive30');assert.equal(await page.evaluate(()=>__combatReview.selected.policy),'defensive');
   await page.goto(base+'/art-src/reviews/act1-combat/?source=not-a-dataset');await page.waitForFunction(()=>window.__combatReview?.ready);assert.equal(await page.locator('#source').inputValue(),'baseline30');
   assert.equal(await page.evaluate(()=>JSON.stringify(Object.entries(localStorage))),before);assert.deepEqual(errors,[]);
   report.dashboard.push({name,viewport:{width,height},scenarios:15,sources:5,selectedDatasetRows:192,defensiveRows:45,defensiveCohorts,exactSourceRowsAndDeltas:true,deepLinkAndReload:true,invalidSourceFallsBackToBaseline:true,policiesFiltered:true,proposals:5,minimumTargetHeight:Math.min(...targets),historicalMissingCountersPreserved:true,sourceProvenanceChecked:true,noHorizontalOverflow:true,storageUnchanged:true,campaignSentinel:'unchanged',errors});
   console.log('PASS defensive dashboard',name,'5 sources / 45 exact defensive cohorts, deltas, missing telemetry, deep link, provenance, proposals, layout, no storage/errors');await context.close();
  }
  report.capturedAt=new Date().toISOString();
  // Keep every historical screenshot/log/verification file unchanged.
  fs.writeFileSync(path.join(DIR,'defensive-verification.json'),JSON.stringify(report,null,2));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
