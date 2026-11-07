// Run from repo root: node art-src/reviews/scene-club-2026-11-07/capture.cjs
// Captures actual browser output; the map image is a fixture capture of the existing game.
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const DIR=__dirname,ROOT=path.resolve(DIR,'../../..');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let f=path.resolve(ROOT,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});res.end(b);});});
const log=[];
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
 try {
  // Separate fresh browser context: this never touches any owner's campaign.
  const mapContext=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  const p=await mapContext.newPage();
  await p.goto(base+'/web/?skip');await p.waitForFunction(()=>window.__ptv3?.data);
  await p.locator('#beginButton').click();await p.waitForSelector('.city-map');
  await p.evaluate(()=>{const s=structuredClone(window.__ptv3.state);s.mode='route';s.scheduleIndex=2;s.selectedAnchor='makelansilta';s.choices['enc-jaska-receipt']='ask-envelope';window.__ptv3.debug.setState(s);});
  await p.locator('.map-stage').screenshot({path:path.join(DIR,'map-reference.png'),timeout:60000});
  await mapContext.close();
  for(const [label,width,height] of [['phone',390,844],['desktop',1280,800],['landscape',844,390]]){
   const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
   await page.goto(base+'/art-src/reviews/scene-club-2026-11-07/');await page.waitForFunction(()=>window.__sceneClubReview?.ready);
   const before=await page.evaluate(()=>Object.keys(localStorage));
   await page.evaluate(()=>window.__sceneClubReview.setFrame('arriving',1.3));await page.waitForTimeout(60);
   await page.screenshot({path:path.join(DIR,`arrival-${label}.png`)});
   await page.evaluate(()=>window.__sceneClubReview.setFrame('ask',1.7));await page.waitForTimeout(60);
   const measures=await page.evaluate(()=>{
    const word=document.querySelector('#words'),wb=word.getBoundingClientRect(),opts=[...document.querySelectorAll('#options button')];
    return {font:parseFloat(getComputedStyle(word).fontSize),dialogueFits:word.scrollHeight<=word.clientHeight,buttons:opts.map(e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,height:b.height,font:parseFloat(getComputedStyle(e).fontSize)}}),noOverflow:document.documentElement.scrollWidth<=innerWidth,wordsChoicesClear:opts.every(e=>{const b=e.getBoundingClientRect();return wb.right<=b.left||wb.left>=b.right||wb.bottom<=b.top||wb.top>=b.bottom}),bubbleBottom:wb.bottom,choicesTop:opts[0].getBoundingClientRect().top};
   });
   assert(measures.font>=12);assert(measures.dialogueFits,`${label} dialogue clipped`);assert(measures.noOverflow);assert(measures.wordsChoicesClear,`${label} words and choices overlap`);
   for(const b of measures.buttons)assert(b.height>=44&&b.font>=12&&b.top>=0&&b.bottom<=height,`${label} choice outside viewport`);
   assert.equal(await page.locator('#options button').count(),3);
   await page.screenshot({path:path.join(DIR,`conversation-${label}.png`)});
   await page.evaluate(()=>window.__sceneClubReview.setFrame('ask',4.9));await page.waitForFunction(()=>window.__sceneClubReview.lastClip==='idle'&&window.__sceneClubReview.lastPose.blink===1);
   assert.equal(await page.evaluate(()=>window.__sceneClubReview.lastClip),'idle');
   assert.equal(await page.evaluate(()=>window.__sceneClubReview.lastPose.blink),1);
   if(label==='phone')await page.screenshot({path:path.join(DIR,'idle-blink-phone.png')});
   await page.locator('#options button').first().click();
   await page.waitForFunction(()=>window.__sceneClubReview.phase==='answer');
   await page.evaluate(()=>window.__sceneClubReview.setFrame('answer',1.1));await page.waitForTimeout(60);
   await page.screenshot({path:path.join(DIR,`response-${label}.png`)});
   await page.evaluate(()=>{window.__sceneClubReview.setFrame('outcome',.8);window.__sceneClubReview.resume();});
   await page.getByRole('button',{name:'Back to Kallio',exact:true}).click();
   await page.waitForFunction(()=>window.__sceneClubReview.phase==='returned');
   await page.screenshot({path:path.join(DIR,`return-${label}.png`)});
   assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),before,'review must not write campaign storage');assert.deepEqual(errors,[]);
   log.push({label,viewport:{width,height},...measures,errors,storageUnchanged:true});console.log('PASS review',label,JSON.stringify(measures));await context.close();
  }
  const reducedContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),reduced=await reducedContext.newPage();
  await reduced.goto(base+'/art-src/reviews/scene-club-2026-11-07/');await reduced.waitForFunction(()=>window.__sceneClubReview?.ready);assert(await reduced.evaluate(()=>window.__sceneClubReview.reducedMotion));
  await reduced.evaluate(()=>window.__sceneClubReview.setFrame('ask',1.7));await reduced.waitForTimeout(60);await reduced.screenshot({path:path.join(DIR,'reduced-motion-phone.png')});
  const still=await reduced.locator('canvas').evaluate(c=>c.toDataURL());await reduced.evaluate(()=>window.__sceneClubReview.setFrame('ask',4.9));await reduced.waitForTimeout(60);assert.equal(await reduced.locator('canvas').evaluate(c=>c.toDataURL()),still,'reduced motion holds the rest frame');await reducedContext.close();
  const videoContext=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir:DIR,size:{width:390,height:844}}});
  const v=await videoContext.newPage();await v.goto(base+'/art-src/reviews/scene-club-2026-11-07/');await v.waitForFunction(()=>window.__sceneClubReview?.ready);
  await v.waitForTimeout(750);await v.getByRole('button',{name:'Arrive at Scene Club',exact:true}).click();
  await v.waitForFunction(()=>window.__sceneClubReview.phase==='ask');await v.waitForTimeout(5500);await v.locator('#options button').first().click();
  await v.waitForFunction(()=>window.__sceneClubReview.phase==='outcome');await v.waitForTimeout(2000);await v.getByRole('button',{name:'Back to Kallio',exact:true}).click();
  await v.waitForFunction(()=>window.__sceneClubReview.phase==='returned');await v.waitForTimeout(1000);
  const video=v.video();await videoContext.close();await video.saveAs(path.join(DIR,'scene-club-baseline.webm'));const generated=await video.path();if(generated!==path.join(DIR,'scene-club-baseline.webm'))fs.unlinkSync(generated);
  fs.writeFileSync(path.join(DIR,'verification.json'),JSON.stringify({source:'actual browser capture',reviewOnly:true,newImageGeneration:false,sharedRigClips:true,visualAcceptance:false,knownVisualIssues:['Existing Jaska eyelid patches extend rectangular skin-colored tabs at full blink; see idle-blink-phone.png. No source rig modified.'],checks:log,reducedMotion:true,physicalDeviceAcceptance:false},null,2));
  console.log('PASS reduced motion and actual animated output');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
