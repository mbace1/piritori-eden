// Actual C.19 portrait UI coverage: every dock/menu/target state stays under
// half the viewport. Panels are counted once with fighter/exit badges; the
// arena and empty label container are not UI rectangles.
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const ROOT='/workspace/piritori-visual-reset',OUT='/workspace/evidence/c19-mission-budget/after';
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
 const selectors=['body > header','#mission-bar','#mission-goal','#mission-count','#mission-pressure','#roundbar','#panel','#choices','#tactical-preview','#roster','#camera-panel','#labels > .actor-label','#exit-marker','.combat-callout','dialog[open]','#crew-screen'];
 const panels=[...new Set(selectors.flatMap(selector=>[...document.querySelectorAll(selector)]))].filter(painted).map(e=>({name:e.id||e.tagName,rect:clipped(e)})).filter(v=>v.rect.width&&v.rect.height);
 const xs=[...new Set(panels.flatMap(v=>[v.rect.x,v.rect.x+v.rect.width]))].sort((a,b)=>a-b);let area=0;
 for(let i=0;i+1<xs.length;i++){const spans=panels.map(v=>v.rect).filter(r=>r.x<xs[i+1]&&r.x+r.width>xs[i]).map(r=>[r.y,r.y+r.height]).sort((a,b)=>a[0]-b[0]);let length=0,start=null,end=null;for(const[a,b]of spans){if(start===null){start=a;end=b}else if(a>end){length+=end-start;start=a;end=b}else end=Math.max(end,b);}if(start!==null)length+=end-start;area+=(xs[i+1]-xs[i])*length;}
 return{viewport,panels,area,coverage:area/(innerWidth*innerHeight),arena:rect(document.querySelector('#arena')),targets:[...document.querySelectorAll('button')].filter(painted).map(e=>({name:e.id||e.dataset.cell||e.dataset.target||e.textContent.trim(),rect:rect(e),clipped:clipped(e)})),previewText:document.querySelector('#tactical-preview').textContent,canvas:rect(document.querySelector('#scene'))};
});}
const inside=(a,b)=>a.x>=b.x-1&&a.y>=b.y-1&&a.x+a.width<=b.x+b.width+1&&a.y+a.height<=b.y+b.height+1;
function scenePixels(bytes,value){
 const png=PNG.sync.read(bytes),scale=png.width/value.viewport.width,arena=value.arena;let samples=0,lit=0;const colors=new Set();
 for(let y=Math.ceil(arena.y);y<Math.min(value.viewport.height,arena.y+arena.height);y+=4)for(let x=Math.ceil(arena.x);x<Math.min(value.viewport.width,arena.x+arena.width);x+=4){
  if(value.panels.some(({rect:r})=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height))continue;
  const i=(Math.floor(y*scale)*png.width+Math.floor(x*scale))*4,r=png.data[i],g=png.data[i+1],b=png.data[i+2];samples++;if((r+g+b)/3>12)lit++;colors.add([r>>4,g>>4,b>>4].join(','));
 }
 return{samples,litFraction:lit/samples,colors:colors.size};
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 report.scope+=' Actual authored campaign outings created by existing state/places/outing helpers, entered through campaign save and C19 URL; gameplay proceeds only through native UI taps. Browser emulation, not physical-device acceptance.';
 try{for(const [fixture,heat]of[['getaway-extract',0],['police-high-pressure',3]]){
  const entry={fixture,heat,viewport:{width:360,height:640},states:[],errors:[],commands:[]};report.cases.push(entry);
  const context=await browser.newContext({viewport:entry.viewport,hasTouch:true,isMobile:true});context.setDefaultTimeout(120000);context.setDefaultNavigationTimeout(120000);
  const page=await context.newPage();page.on('pageerror',e=>entry.errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!/\/hub\/shell\.js|favicon/.test(r.url()))entry.errors.push(r.status()+' '+r.url())});
  const idle=()=>page.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy&&!fightModule.metrics().layoutPaused,null,{timeout:180000});
  const tap=async(selector)=>{const el=page.locator(selector);await el.scrollIntoViewIfNeeded();await el.tap();await idle();entry.commands.push(selector);};
  const snapshot=()=>page.evaluate(()=>fightModule.snapshot());
  const check=async(name,critical)=>{
   await page.evaluate(()=>new Promise(resolve=>{let n=4;function tick(){if(--n)requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)}));
   const value=await measure(page);entry.states.push({name,...value,battle:await snapshot()});
   const failures=[];
   const mission=await page.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}},bar=document.getElementById('mission-bar');return{bar:rect(bar),children:['mission-goal','mission-count','mission-pressure','roundbar'].map(id=>document.getElementById(id)).filter(e=>e.getClientRects().length&&getComputedStyle(e).display!=='none').map(e=>({id:e.id,rect:rect(e)}))}});
   entry.states.at(-1).mission=mission;for(const child of mission.children)if(!inside(child.rect,mission.bar))failures.push(child.id+' paints outside mission strip');
   if(value.coverage>.5+1/(360*640))failures.push(`${(100*value.coverage).toFixed(2)}% UI exceeds50`);
   for(const target of value.targets)if(target.rect.width<44||target.rect.height<44)failures.push(`${target.name} smaller than44`);
   for(const selector of critical){const control=page.locator(selector);const geometry=await control.evaluate(e=>{const r=e.getBoundingClientRect();let visible={x:r.x,y:r.y,right:r.right,bottom:r.bottom};for(let n=e.parentElement;n;n=n.parentElement){const c=getComputedStyle(n),b=n.getBoundingClientRect();if(/hidden|clip|auto|scroll/.test(c.overflowX+' '+c.overflowY)){visible.x=Math.max(visible.x,b.x);visible.y=Math.max(visible.y,b.y);visible.right=Math.min(visible.right,b.right);visible.bottom=Math.min(visible.bottom,b.bottom)}}return{rect:{x:r.x,y:r.y,width:r.width,height:r.height},unclipped:r.x>=visible.x-1&&r.y>=visible.y-1&&r.right<=visible.right+1&&r.bottom<=visible.bottom+1,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),disabled:e.disabled,text:e.textContent}});entry.states.at(-1).critical??=[];entry.states.at(-1).critical.push({selector,...geometry});if(!inside(geometry.rect,value.viewport)||!geometry.unclipped||!geometry.hit||geometry.disabled)failures.push(selector+' unavailable: '+JSON.stringify(geometry));}
   const bytes=await page.screenshot({path:path.join(OUT,`${fixture}-${name}.png`)});entry.states.at(-1).scenePixels=scenePixels(bytes,value);
   if(failures.length){entry.states.at(-1).failures=failures;report.failures.push(...failures.map(f=>`${fixture}/${name}: ${f}`));}
   console.log(JSON.stringify({fixture,name,coverage:value.coverage,failures}));
  };
  try{
   await page.goto(base+'/web/?skip');await page.waitForFunction(()=>window.__ptv3?.data);
   const setup=await page.evaluate(async({heat,fixture})=>{
    const S=await import('./js/v3/state.js?v=16'),P=await import('./js/v3/places.js?v=1'),O=await import('./js/v3/outing.js?v=7');
    const {content}=__ptv3.data,places=await(await fetch('../content/places-v1.json')).json(),doors=await(await fetch('../content/doors-v1.json')).json();
    const state=S.createState(content);state.scheduleIndex=15;state.recruited=content.crew.slice(0,2).map(p=>p.id);state.deployed=[...state.recruited];state.pressure.linjat_yard=heat;
    const template=doors.templates.find(t=>t.id==='pickup-yard-van'),encounter={id:'door-15-'+template.id,door:template.id,anchor_override_id:'linjat_yard'};
    const team=S.fighters(state,__ptv3.data),authored=content.battles.find(b=>b.id===template.fight.battle),staged=P.stageFight(authored,P.doorFightStage(encounter,template),places,team.map(p=>p.name));
    const outing=O.doorOuting(state,encounter,staged,team.slice(0,authored.player_deployed).map(p=>p.id),{nonce:'mission-budget-'+fixture,goal:template.fight.goal});state.outing=outing;S.recordFight(state,content);
    localStorage.setItem(S.SAVE_KEY,JSON.stringify(state));localStorage.setItem('piritori-c12-crew-v1','{"sentinel":"untouched standalone roster"}');localStorage.removeItem('piritori-c19-outing-v1');return{url:O.outingUrl(outing),outing};
   },{heat,fixture});entry.setup=setup;
   await page.goto(base+'/web/'+setup.url);await idle();await tap('#crew-deploy');await page.waitForFunction(()=>fightModule.metrics().renderedFrames>5);entry.metrics=await page.evaluate(()=>fightModule.metrics());
   await check('opening',['#crew-picker','#end']);
   if(fixture==='getaway-extract'){
    for(let i=0;i<5;i++){
     const b=await snapshot(),p=b.units.find(p=>p.id===b.selectedId);if(p.cell.endsWith(',0'))break;
     await tap('[data-action="move"]');const cells=await page.locator('#choices [data-cell]').evaluateAll(es=>es.map(e=>e.dataset.cell).sort((a,b)=>+a.split(',')[1]-+b.split(',')[1]));assert(cells.length,'Legal getaway move exists');
     await tap(`[data-cell="${cells[0]}"]`);await tap('#commit-preview');
     if((await snapshot()).units.find(p=>p.id===b.selectedId).cell.endsWith(',0'))break;
     await tap('#end');
    }
    assert(await page.locator('[data-mission-action="extract"]').isVisible(),'Legal getaway route reaches useful Extract');await check('extract-ready',['[data-mission-action="extract"]','#end','#crew-picker']);
    const before=await snapshot();await tap('#crew-picker');await check('crew-open-at-exit',['#target-back','#crew-picker']);assert(await page.locator('#roster').isVisible(),'Native Crew opens at exit');await tap('#target-back');assert.deepEqual(await snapshot(),before,'Opening/closing Crew at exit spends no Move or Action');await tap('[data-mission-action="extract"]');const after=await snapshot();assert(after.units.find(p=>p.id===before.selectedId).extracted,'Native Extract commits real mission action');entry.extractCommitted=true;
   }else{
    for(let i=0;i<6&&!await page.locator('[data-police]').count();i++){await tap('#end');await check('turn-'+(i+1),await page.locator('[data-police]').count()?['[data-police="BACK_OFF"]']:['#end']);}
    assert(await page.locator('[data-police]').count(),'Natural high-pressure police prompt reached');
    const buttons=await page.locator('[data-police]').evaluateAll(es=>es.map(e=>e.dataset.police));entry.postures=buttons;
    await check('police-prompt',buttons.map(p=>`[data-police="${p}"]`));entry.naturallyFallen=(await snapshot()).units.filter(p=>p.side==='player'&&!p.alive&&!p.evacuated).map(p=>p.id);
    const selected=buttons.includes('HELP_FRIENDS')?'HELP_FRIENDS':'BACK_OFF';await tap(`[data-police="${selected}"]`);entry.answered=selected;entry.aftermath=await page.locator('#crew-content').innerText();
   }
   assert.equal(await page.evaluate(()=>localStorage.getItem('piritori-c12-crew-v1')),'{"sentinel":"untouched standalone roster"}','Mission does not replace standalone roster');assert.equal(entry.errors.length,0,entry.errors.join('\n'));entry.passed=true;
  }catch(error){entry.failure=error.stack;report.failures.push(fixture+': '+error.stack);console.error(error);await page.screenshot({path:path.join(OUT,fixture+'-failure.png')}).catch(()=>{});}
  finally{await context.close();}
 }}finally{await browser.close();await new Promise(resolve=>server.close(resolve));report.finalSourceHashes=hashes();report.sourceStable=JSON.stringify(report.sourceHashes)===JSON.stringify(report.finalSourceHashes);if(!report.sourceStable)report.failures.push('Source changed during diagnostic.');report.passed=report.failures.length===0;fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,sourceStable:report.sourceStable,failures:report.failures}));if(!report.passed)process.exitCode=1;}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
