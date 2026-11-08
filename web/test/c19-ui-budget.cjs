// Actual C.19 portrait UI coverage: every dock/menu/target state stays under
// half the viewport. Panels are counted once with fighter/exit badges; the
// arena and empty label container are not UI rectangles.
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..'),OUT=process.env.C19_BUDGET_OUTPUT||'/tmp/piritori-c19-ui-budget';
const files=['web/crew-run/index.html','web/crew-run/style.css','web/crew-run/startup.js','web/fight-module/main.js','web/test/c19-ui-budget.cjs'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,file))).digest('hex')]));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.woff2':'font/woff2','.ttf':'font/ttf'};
const report={sourceHashes:hashes(),cases:[],failures:[],scope:'Visible panel and badge rectangle union; excludes 3D terrain and thin projected leader/selection lines.'};
const server=http.createServer((req,res)=>{let file=path.resolve(ROOT,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(ROOT+path.sep))return res.writeHead(403).end();if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.readFile(file,(error,bytes)=>{if(error)return res.writeHead(404).end();res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'}).end(bytes)});});
async function measure(page){return page.evaluate(()=>{
 const viewport={x:0,y:0,width:innerWidth,height:innerHeight};
 const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};
 const hit=(a,b)=>{const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y),right=Math.min(a.x+a.width,b.x+b.width),bottom=Math.min(a.y+a.height,b.y+b.height);return{x,y,width:Math.max(0,right-x),height:Math.max(0,bottom-y)}};
 const painted=e=>{for(let n=e;n instanceof Element;n=n.parentElement){const c=getComputedStyle(n);if(c.display==='none'||c.visibility!=='visible'||+c.opacity===0)return false;}const r=rect(e);return r.width>0&&r.height>0};
 const clipped=e=>{let r=hit(rect(e),viewport);for(let n=e.parentElement;n;n=n.parentElement){const c=getComputedStyle(n);if(/hidden|clip|auto|scroll/.test(c.overflowX+' '+c.overflowY))r=hit(r,rect(n));}return r};
 const selectors=['body > header','#mission-bar','#mission-goal','#mission-count','#mission-pressure','#roundbar','#panel','#panel button','#choices','#tactical-preview','#roster','#camera-panel','#labels > .actor-label','#exit-marker','.combat-callout','dialog[open]','#crew-screen'];
 const panels=[...new Set(selectors.flatMap(selector=>[...document.querySelectorAll(selector)]))].filter(painted).map(e=>({name:e.id||e.tagName,rect:clipped(e)})).filter(v=>v.rect.width&&v.rect.height);
 const xs=[...new Set(panels.flatMap(v=>[v.rect.x,v.rect.x+v.rect.width]))].sort((a,b)=>a-b);let area=0;
 for(let i=0;i+1<xs.length;i++){const spans=panels.map(v=>v.rect).filter(r=>r.x<xs[i+1]&&r.x+r.width>xs[i]).map(r=>[r.y,r.y+r.height]).sort((a,b)=>a[0]-b[0]);let length=0,start=null,end=null;for(const[a,b]of spans){if(start===null){start=a;end=b}else if(a>end){length+=end-start;start=a;end=b}else end=Math.max(end,b);}if(start!==null)length+=end-start;area+=(xs[i+1]-xs[i])*length;}
 return{viewport,panels,area,coverage:area/(innerWidth*innerHeight),missionDetails:[...document.querySelectorAll('#mission-goal,#mission-count,#mission-pressure,#roundbar')].filter(painted).map(e=>({name:e.id,rect:rect(e)})),arena:rect(document.querySelector('#arena')),targets:[...document.querySelectorAll('button')].filter(painted).map(e=>({name:e.id||e.dataset.cell||e.dataset.target||e.textContent.trim(),rect:rect(e),clipped:clipped(e)})),previewText:document.querySelector('#tactical-preview').textContent,canvas:rect(document.querySelector('#scene'))};
});}
const inside=(a,b)=>a.x>=b.x-1&&a.y>=b.y-1&&a.x+a.width<=b.x+b.width+1&&a.y+a.height<=b.y+b.height+1;
function scenePixels(bytes,value){
 const png=PNG.sync.read(bytes),scale=png.width/value.viewport.width,arena=value.arena;let samples=0,lit=0;const colors=new Set();
 for(let y=Math.ceil(arena.y);y<Math.min(value.viewport.height,arena.y+arena.height);y+=4)for(let x=Math.ceil(arena.x);x<Math.min(value.viewport.width,arena.x+arena.width);x+=4){
  if(value.panels.some(({rect:r})=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height))continue;
  const i=(Math.floor(y*scale)*png.width+Math.floor(x*scale))*4,r=png.data[i],g=png.data[i+1],b=png.data[i+2];samples++;if((r+g+b)/3>12)lit++;colors.add([r,g,b].join(','));
 }
 return{samples,litFraction:lit/samples,colors:colors.size};
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const specs=[[450,800,'outing'],[390,844,'outing'],[360,640,'outing'],[360,640,'standalone'],[360,640,'getaway'],[360,640,'police']];
 const selected=process.env.C19_BUDGET_CASES?.split(',');if(selected)assert(selected.every(key=>specs.some(([w,,f])=>`${w}-${f}`===key)),'C19_BUDGET_CASES names existing cases');
 try{for(const[width,height,fixture]of specs.filter(([w,,f])=>!selected||selected.includes(`${w}-${f}`))){
  const entry={viewport:{width,height},fixture,states:[],errors:[]};report.cases.push(entry);
  const context=await browser.newContext({viewport:entry.viewport,hasTouch:true,isMobile:true});context.setDefaultNavigationTimeout(120000);context.setDefaultTimeout(90000);
  const page=await context.newPage();page.on('pageerror',error=>entry.errors.push(error.message));page.on('response',response=>{if(response.status()>=400&&!/\/hub\/shell\.js|favicon/.test(response.url()))entry.errors.push(response.status()+' '+response.url());});
  const tap=async selector=>{const target=page.locator(selector);await target.scrollIntoViewIfNeeded();await target.tap();};
  const idle=()=>page.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy&&!fightModule.metrics().layoutPaused,null,{timeout:180000});
  const snapshot=()=>page.evaluate(()=>fightModule.snapshot());
  const saves=()=>page.evaluate(()=>['piritori-to-eden:v3','piritori-c19-outing-v1'].map(key=>localStorage.getItem(key)));
  const check=async(name,critical=[])=>{
   // ResizeObserver must fit the real canvas and render before its compositor
   // screenshot; no forced render or replacement image is used.
   await page.evaluate(()=>new Promise(resolve=>{let frames=4;const step=()=>--frames?requestAnimationFrame(step):resolve();requestAnimationFrame(step)}));
   const value=await measure(page);entry.states.push({name,...value});
   assert(value.coverage<=.5+1/(width*height),`${width}/${name}: ${(value.coverage*100).toFixed(2)}% exceeds 50% UI`);
   assert(value.arena.width*value.arena.height>=width*height*.5,`${width}/${name}: the arena still occupies at least half the screen`);
   for(const detail of value.missionDetails)assert(inside(detail.rect,value.panels.find(p=>p.name==='mission-bar').rect),`${width}/${name}: ${detail.name} stays within the mission strip`);
   for(const target of value.targets){assert(target.rect.width>=44&&target.rect.height>=44,`${width}/${name}: ${target.name} native 44px control`);}
   for(const id of critical){const control=id.startsWith('[')?page.locator(id):id==='Cancel'?page.getByRole('button',{name:id,exact:true}):page.locator('#'+id),name=await control.evaluate(e=>e.id||e.dataset.cell||e.dataset.target||e.textContent.trim()),target=value.targets.find(t=>t.name===name);assert(target&&inside(target.rect,value.viewport)&&inside(target.rect,target.clipped),`${width}/${name}: ${id} fully in frame and unclipped`);assert(await control.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),`${width}/${name}: ${id} receives native pointer input`);}
   const bytes=await page.screenshot({path:path.join(OUT,`${width}-${fixture}-${name}.png`)}),pixels=scenePixels(bytes,value);entry.states.at(-1).scenePixels=pixels;
   assert(pixels.samples>100&&pixels.litFraction>.1&&pixels.colors>32,`${width}/${name}: actual 3D arena pixels remain visible outside UI: ${JSON.stringify(pixels)}`);
   console.log(`PASS C19 ${width}×${height} ${name}: ${(value.coverage*100).toFixed(2)}% UI`);
  };
  const fullStats=async()=>{await tap('#camera-menu');await tap('#label-mode');assert.equal(await page.locator('#label-mode').getAttribute('aria-pressed'),'true');await tap('#camera-menu');};
  try{
   if(['getaway','police'].includes(fixture)){
    await page.goto(`http://127.0.0.1:${server.address().port}/web/?skip`);await page.waitForFunction(()=>window.__ptv3?.data);
    const url=await page.evaluate(async({heat,fixture})=>{
     const S=await import('./js/v3/state.js?v=16'),P=await import('./js/v3/places.js?v=1'),O=await import('./js/v3/outing.js?v=7'),{content}=__ptv3.data;
     const places=await(await fetch('../content/places-v1.json')).json(),doors=await(await fetch('../content/doors-v1.json')).json(),state=S.createState(content);state.scheduleIndex=15;state.recruited=content.crew.slice(0,2).map(p=>p.id);state.deployed=[...state.recruited];state.pressure.linjat_yard=heat;
     const template=doors.templates.find(t=>t.id==='pickup-yard-van'),encounter={id:'door-15-'+template.id,door:template.id,anchor_override_id:'linjat_yard'},team=S.fighters(state,__ptv3.data),authored=content.battles.find(b=>b.id===template.fight.battle),staged=P.stageFight(authored,P.doorFightStage(encounter,template),places,team.map(p=>p.name));
     const outing=O.doorOuting(state,encounter,staged,team.slice(0,authored.player_deployed).map(p=>p.id),{nonce:'mission-budget-'+(fixture==='getaway'?'getaway-extract':'police-high-pressure'),goal:template.fight.goal});state.outing=outing;S.recordFight(state,content);localStorage.setItem(S.SAVE_KEY,JSON.stringify(state));localStorage.setItem('piritori-c12-crew-v1','{"sentinel":"untouched standalone roster"}');localStorage.removeItem('piritori-c19-outing-v1');return O.outingUrl(outing);
    },{fixture,heat:fixture==='police'?3:0});
    await page.goto(`http://127.0.0.1:${server.address().port}/web/`+url);await idle();await tap('#crew-deploy');await idle();await page.waitForFunction(()=>fightModule.metrics().renderedFrames>5);await fullStats();await check('mission-opening',['crew-picker','end']);
    if(fixture==='getaway'){
     for(const cell of ['3,3','3,0']){await tap('[data-action="move"]');await tap(`[data-cell="${cell}"]`);await tap('#commit-preview');await idle();if(cell==='3,3'){await tap('#end');await idle();}}
     await check('extract-ready',['[data-mission-action="extract"]','end','crew-picker']);const before=await snapshot();await tap('#crew-picker');await tap('#target-back');assert.deepEqual(await snapshot(),before,'Crew inspection at EXIT spends nothing');await tap('[data-mission-action="extract"]');await idle();assert((await snapshot()).units.find(p=>p.id===before.selectedId).extracted,'native Extract commits the mission action');
    }else{
     for(let turn=0;turn<6&&!await page.locator('[data-police]').count();turn++){await tap('#end');await idle();}
     const postures=await page.locator('[data-police]').evaluateAll(es=>es.map(e=>e.dataset.police));assert(postures.length,'natural police prompt reached');assert(postures.includes('HELP_FRIENDS'),'real fallen crew expose the meaningful police choice');await check('police-prompt',postures.map(p=>`[data-police="${p}"]`));await tap('[data-police="HELP_FRIENDS"]');await idle();assert.equal(await page.evaluate(()=>crewRun.snapshot().phase),'aftermath','native police answer settles the outing');
    }
    assert.equal(await page.evaluate(()=>localStorage.getItem('piritori-c12-crew-v1')),'{"sentinel":"untouched standalone roster"}','campaign UI preserves the separate standalone roster');assert.equal(entry.errors.length,0,entry.errors.join('\n'));continue;
   }
   if(fixture==='standalone'){
    await page.goto(`http://127.0.0.1:${server.address().port}/web/crew-run/?release=19`);await idle();await tap('#crew-deploy');await idle();await page.waitForFunction(()=>fightModule.metrics().renderedFrames>5);
    await check('downed-focused',['end','crew-picker']);await fullStats();await check('downed-full-stats',['end','crew-picker']);
    await tap('#crew-picker');await tap('[data-unitid="crew-1"]');const before=await snapshot();
    await tap('[data-action="attack"]');await tap('#choices [data-target]:not([disabled]):first-child');
    await check('gun-preview',['aim-preview','commit-preview','Cancel','target-back','end']);
    await tap('#aim-preview');await check('aim-view',['aim-preview','commit-preview','Cancel','target-back','end']);
    await tap('#tactical-preview button:last-child');assert.deepEqual(await snapshot(),before,'Aim and Cancel spend no Move or Action');await tap('#target-back');
    assert.equal(entry.errors.length,0,entry.errors.join('\n'));continue;
   }
   await page.goto(`http://127.0.0.1:${server.address().port}/web/?skip`);await page.waitForFunction(()=>window.__ptv3?.data&&window.__ptv3.story?.case);await page.locator('#beginButton').click();await page.waitForSelector('.city-map');
   await page.evaluate(()=>{const s=structuredClone(__ptv3.state),crew=__ptv3.data.content.crew.map(c=>c.id);s.scheduleIndex=15;s.selectedAnchor='torkkelinmaki';s.recruited=crew.slice(0,2);s.deployed=[...s.recruited];s.pressure.torkkelinmaki=0;s.doors={offers:{15:[{template:'hit-courtyard-ledger',anchor:'torkkelinmaki'},{template:'gig-rauno-cart',anchor:'harju'}]},taken:{}};s.fightsByDay={};__ptv3.debug.setState(s);});
   await tap('[data-action="take-door"][data-door="hit-courtyard-ledger"]');await tap('[data-action="next-step"][data-step="enter"]');await page.evaluate(()=>Date.now=()=>1761900000000);await tap('[data-action="choose"][data-choice="take-it"]');await page.waitForURL(/crew-run\/\?campaign=1&outing=/);await idle();
   await check('brief',['crew-deploy']);await tap('#crew-deploy');await idle();await page.waitForFunction(()=>fightModule.metrics().renderedFrames>5);
   entry.metrics=await page.evaluate(()=>fightModule.metrics());assert.equal(entry.metrics.environment.location,'courtyard');assert.equal(entry.metrics.models,6);
   const start=await snapshot(),saved=await saves();await check('normal',['crew-picker','end']);await fullStats();await check('full-stats',['crew-picker','end']);
   await tap('[data-action="move"]');await check('move-choices',['target-back','crew-picker','end']);
   // Every coordinate remains reachable by normal native scrolling.
   for(const choice of await page.locator('#choices [data-cell]').all()){await choice.scrollIntoViewIfNeeded();assert(await choice.evaluate(e=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.top>=b.top-1&&a.bottom<=b.bottom+1}),`${width}: every Move choice can be fully scrolled into view`);}
   await tap('[data-cell="2,3"]');await check('move-preview',['commit-preview','Cancel','target-back','end']);
   const preview=await page.locator('#tactical-preview').innerText();
   await tap('#crew-picker');await check('crew-picker',['target-back','crew-picker']);
   assert(await page.locator('#tactical-preview').isHidden(),'roster does not stack over preview');
   await tap('#camera-menu');await check('camera-menu',['camera-menu']);
   assert(await page.locator('#roster').isHidden(),'camera and crew menus are exclusive');
   await page.keyboard.press('Escape');assert.equal(await page.locator('#tactical-preview').innerText(),preview,'closing VIEW restores the exact pending preview');
   assert.deepEqual(await snapshot(),start,'menus/previews spend no Move or Action');assert.deepEqual(await saves(),saved,'menus/previews do not rewrite campaign or receipt saves');
   await tap('#target-back');await check('back-to-actions',['end','crew-picker']);assert(await page.locator('[data-action="move"]').isVisible(),'Back restores actions');assert.deepEqual(await snapshot(),start,'Back spends no Move or Action');
   await tap('[data-action="move"]');await tap('[data-cell="2,3"]');await tap('#commit-preview');await idle();assert((await snapshot()).moved.includes('aatami'),'real confirmation commits the move');
   const moved=await snapshot(),movedSaves=await saves();await tap('[data-action="attack"]');await check('attack-choices',['target-back','end']);await tap('[data-target="opp-door-15-hit-courtyard-ledger-1"]');await check('attack-preview',['commit-preview','Cancel','target-back','end']);
   await tap('#target-back');assert.deepEqual(await snapshot(),moved,'Back from attack preview spends no Action');assert.deepEqual(await saves(),movedSaves,'cancelled targeting preserves saves');
   await tap('#help');await check('help-menu');await page.keyboard.press('Escape');assert.deepEqual(await snapshot(),moved,'help menu does not alter battle');
   await tap('#help');await tap('#outing-options .withdraw-command');await check('retreat-menu');await page.keyboard.press('Escape');assert.deepEqual(await snapshot(),moved,'cancelled retreat does not alter battle');
   await tap('[data-action="attack"]');await tap('[data-target="opp-door-15-hit-courtyard-ledger-1"]');await tap('#commit-preview');await idle();assert((await snapshot()).acted.includes('aatami'),'real confirmation commits the Action');await check('after-confirm',['end']);
   assert.equal(entry.errors.length,0,entry.errors.join('\n'));
  }catch(error){entry.failure=error.stack;report.failures.push(`${width}: ${error.stack}`);console.error(error);}
  finally{await context.close();}
 }}finally{
  await browser.close();await new Promise(resolve=>server.close(resolve));report.finalSourceHashes=hashes();
  if(JSON.stringify(report.sourceHashes)!==JSON.stringify(report.finalSourceHashes))report.failures.push('C19 source changed during the browser run; capture stable inputs again.');
  report.passed=report.failures.length===0;fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`${report.passed?'PASS':'FAIL'} C19 UI budget: ${report.cases.length} portrait contexts; ${report.cases.reduce((n,c)=>n+c.states.length,0)} measured states; ${report.failures.length} failures.`);if(!report.passed)process.exitCode=1;
 }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
