// Actual compatibility UI and C.19 bridge after deletion of the obsolete art.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
const OUT=process.env.RESET_CLEANUP_DIR||'/tmp/piritori-visual-reset-cleanup';
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary'};
const server=http.createServer((req,res)=>{
  let file=path.resolve(ROOT,'.'+decodeURIComponent(req.url.split('?')[0]));
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404).end('missing');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}/web/`;
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={date:new Date().toISOString(),limits:['Browser emulation and software rendering; no physical Pixel/iPad acceptance.','Compatibility campaign CSS; no new visual or animation approval.'],viewports:[]};
 try{for(const [width,height] of [[390,844],[1280,800]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true});const page=await context.newPage();
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(new URL(r.url()).pathname));
  page.on('response',r=>{if(r.status()>=400&&!/\/hub\/shell\.js|favicon/.test(r.url()))errors.push(`HTTP ${r.status()} ${r.url()}`);});
  const fit=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
  await page.goto(base);await page.waitForFunction(()=>window.__ptv3);
  const savedBefore=await page.evaluate(()=>{
    const s=structuredClone(__ptv3.state);s.mode='ledger';s.recruited=__ptv3.data.content.crew.map(c=>c.id);s.deployed=s.recruited.slice(0,3);
    // Old generated hires carry deleted asset IDs; rendering must ignore them.
    const person={...__ptv3.data.content.crew[0],id:'legacy-hire',name:'Legacy Crew',portrait_asset_id:'head-kallio-01-v03',torso_asset_id:'torso-runner-v03',legs_asset_id:'legs-runner-v03'};
    s.hiredCrew[person.id]=person;s.recruited.push(person.id);s.crewStatus[person.id]={condition:5,maxCondition:5,status:'available'};
    const saved=JSON.stringify(s);localStorage.setItem('piritori-to-eden:v3',saved);
    const other={'piritori-c12-crew-v1':'{"sentinel":"standalone roster"}','piritori-c19-outing-v1':'{"sentinel":"old receipt"}'};
    for(const [key,value] of Object.entries(other))localStorage.setItem(key,value);
    return {'piritori-to-eden:v3':saved,...other};
  });
  await page.reload();await page.getByRole('button',{name:'RESUME DAY',exact:true}).click();
  assert.deepEqual(await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(savedBefore)),savedBefore,'Opening old campaign and rendering identities leaves all three saves byte-identical');
  assert(await page.locator('.crew-card .identity-badge').count()>=6,'Crew and hiring use neutral identities');
  assert.equal(await page.locator('.crew-card img').count(),0);await fit();
  await page.locator('.crew-card').first().scrollIntoViewIfNeeded();
  const identity=await page.locator('.crew-card').first().evaluate(card=>({name:card.querySelector('h3').textContent.trim(),initials:card.querySelector('.identity-badge').textContent.trim(),badgeRight:card.querySelector('.identity-badge').getBoundingClientRect().right,nameLeft:card.querySelector('h3').getBoundingClientRect().left}));
  assert(identity.name&&identity.initials.length>=2,'Authored crew use their existing roster name and initials');
  assert(identity.badgeRight<=identity.nameLeft,'Identity badge does not overlap the nameplate');
  await page.screenshot({path:path.join(OUT,`crew-${width}.png`)});
  await page.evaluate(()=>{const s=structuredClone(__ptv3.state);s.mode='news';s.scheduleIndex=4;__ptv3.debug.setState(s);});
  await page.locator('[data-news-identity="arvo"]').waitFor();assert.equal(await page.locator('.scene-speaker').count(),0);await fit();
  await page.screenshot({path:path.join(OUT,`news-${width}.png`)});
  await page.goto(base+'?encounter=enc-jaska-receipt');await page.locator('#sceneClubEncounter .scene-club[data-ready="true"][data-budget-ready="true"]').waitFor({timeout:30000});await fit();
  assert.equal(await page.locator('#sceneClubEncounter canvas.actor').count(),2,'The approved Aatami/Jaska pair replaces the old Scene Club cut-in');
  await page.screenshot({path:path.join(OUT,`jaska-${width}.png`)});
  await page.goto(base+'?play=g0-door');await page.waitForFunction(()=>window.__ptv3?.state?.mode==='encounter');
  const first=await page.locator('.choice-card:not([disabled])').first().boundingBox();assert(first&&first.y+first.height<=height,'First playable choice is on screen');
  await Promise.all([page.waitForURL(/crew-run\/\?campaign=1&outing=/),page.locator('.choice-card[data-choice="take-it"]').tap()]);
  await page.getByRole('button',{name:'Fight',exact:true}).click();
  await page.waitForFunction(()=>window.fightModule?.metrics().models===3||window.fightModule?.metrics().models===6,null,{timeout:30000});
  const metrics=await page.evaluate(()=>fightModule.metrics());assert.equal(metrics.characterProvider,'development stand-ins');assert(metrics.renderedFrames>0);await fit();
  await page.screenshot({path:path.join(OUT,`c19-${width}.png`)});
  assert(!requests.some(url=>/\/art\/v3\/(characters|cast|ui)\/|\/lantern\.css|\/chrome\.js|\/scene-speaker\.js/.test(url)),'No deleted visual dependency was requested');
  assert.deepEqual(errors,[]);
  report.viewports.push({width,height,crewIdentity:'neutral initials',newsIdentity:'Arvo Linde nameplate',approvedJaska:'actual retained rig',c19:{models:metrics.models,characterProvider:metrics.characterProvider,renderedFrames:metrics.renderedFrames},errors,deletedAssetRequests:0,oldSavesUnchanged:true});
  await context.close();console.log(`PASS ${width}×${height}: neutral crew/news, retained Jaska, on-screen first choice, actual C19 stand-ins, no missing/deleted assets`);
 }}finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
