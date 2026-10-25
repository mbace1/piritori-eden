const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
// Toko is the cut-card stage over the empty bar (owner, 2026-10-21). Jaska is the waist-up cut-in over the scene, his
// conversation in its bubble and talk options (owner, 2026-10-23; cutin-stage.js). Arvo is still the 3D speaker.
const ready=p=>p==='toko'?'[data-toko-stage][data-status="ready"]':p==='jaska'?'.cutin[data-talk] canvas[data-status="ready"]':`[data-speaker="${p}"][data-status="ready"]`;
const drawn=p=>p==='toko'?'canvas.toko-stage':p==='jaska'?'.cutin-canvas':'.scene-speaker canvas';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const width of [412,1180]){
 const page=await browser.newPage({viewport:{width,height:width===412?915:820},hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.PIRITORI_TEST_URL || 'http://127.0.0.1:8781/web/'));
 for(const [person,index,mode] of [['jaska',2,'encounter'],['toko',5,'encounter'],['arvo',4,'news']]) {
 await page.evaluate(async({index,mode})=>{const {createState,SAVE_KEY}=await import('./js/v3/state.js');const c=await(await fetch('../content/era1-slice-v1.json')).json();const s=createState(c);s.scheduleIndex=index;s.mode=mode;s.selectedAnchor=c.schedule[index].anchor_id;localStorage.setItem(SAVE_KEY,JSON.stringify(s));},{index,mode});
 await page.reload();
 await page.getByRole('button',{name:'RESUME DAY'}).click();
 await page.locator(ready(person)).waitFor({timeout:30000});
 await page.waitForTimeout(700);
 if(mode==='encounter') assert.equal(await page.locator('.choice-card strong').first().evaluate(el=>getComputedStyle(el).color),'rgb(22, 25, 27)','Dark ink on the cream choice face');
 await page.screenshot({path:path.resolve(process.env.PIRITORI_CAPTURE_DIR || '.',`act1-${person}-${width}.png`),fullPage:true});
 assert.equal(await page.locator(drawn(person)).count(),1);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 console.log('READY',person,width);
 }
 for(const person of ['jaska','toko']) {
 await page.evaluate(async person=>{const {createState,SAVE_KEY}=await import('./js/v3/state.js');const c=await(await fetch('../content/era1-slice-v1.json')).json();const map=await(await fetch('../map/kallio-era1-2003-v1.json')).json();const v=c.optional_visits.find(v=>v.participants.includes(person));const s=createState(c);s.scheduleIndex=6;s.choices[v.requires_encounter]='met';s.selectedAnchor=map.sites.find(x=>x.id===v.site_id).anchorId;localStorage.setItem(SAVE_KEY,JSON.stringify(s));},person);
 await page.reload();await page.getByRole('button',{name:'RESUME DAY'}).click();
 await page.locator('[data-action="open-visit"]').tap();
 await page.locator(ready(person)).waitFor();
 await page.reload();await page.getByRole('button',{name:'RESUME DAY'}).click();
 if(person==='jaska'){ // the cut-in carries the choice: answer, Aatami says it, Jaska reacts, CONTINUE returns to the map
  await page.locator('.cutin-options button:not([disabled])').first().tap();
  await page.locator('.cutin-options button',{hasText:/continue/i}).tap({timeout:8000});
 } else {
  await page.locator('[data-action="choose"]').first().tap();
  await page.getByRole('button',{name:'RETURN TO MAP'}).tap();
 }
 assert.equal(await page.locator('[data-action="open-visit"]').count(),0);
 assert.equal(await page.locator(drawn(person)).count(),0,'Speaker disposed on leaving');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('piritori-to-eden:v3')));
 assert.equal(saved.scheduleIndex,6);assert.equal(saved.cash,160);assert.equal(saved.intel,0);
 console.log('VISIT + RELOAD + LEAVE',person,width);
 }
 assert.deepEqual(errors,[]);await page.close();}
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

