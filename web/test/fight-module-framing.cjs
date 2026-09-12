const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.FIGHT_MODULE_URL||'http://127.0.0.1:8796/work/piritori-fight-module/web/fight-module/';
const out='.private/c06';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),reports=[];
 try{for(const [name,width,height,touch,dpr] of [['compact-portrait',360,640,true,2],['phone-portrait',412,915,true,2.625],['compact-landscape',844,390,true,2],['phone-landscape',915,412,true,2.625],['tablet-portrait',834,1194,true,2],['tablet-landscape',1194,834,true,2],['desktop',1366,768,false,1]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,deviceScaleFactor:dpr,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(base);const ready=()=>page.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy&&!fightModule.metrics().layoutPaused);await ready();
  const tap=async s=>page.locator(s)[touch?'tap':'click']();
  const measure=()=>page.evaluate(()=>{
   const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};},a=box(document.querySelector('#arena'));
   const local=e=>{const b=box(e);return {...b,x:b.x-a.x,y:b.y-a.y};};
   const labels=[...document.querySelectorAll('.actor-label')].map(e=>({id:e.dataset.unit,...local(e)}));
   const hit=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
   const hud=['roundbar','camera-tools','perf'].map(id=>local(document.getElementById(id)));
   return {arena:a,labels,pairs:labels.flatMap((a,i)=>labels.slice(i+1).filter(b=>hit(a,b)).map(b=>[a.id,b.id])),hudHits:labels.filter(a=>hud.some(b=>hit(a,b))).map(a=>a.id),overflow:document.documentElement.scrollWidth>innerWidth,targets:[...document.querySelectorAll('#actions button,#camera-tools button')].map(box),view:fightModule.view(),metrics:fightModule.metrics()};
  });
  const samples=[];let checks=0;
  async function verify(label,fullBoard=true){await page.waitForTimeout(340);const r=await measure();assert.equal(r.labels.length,4);assert.deepEqual(r.pairs,[],`${name}/${label}: tags overlap`);assert.deepEqual(r.hudHits,[],`${name}/${label}: tag covers HUD`);assert(!r.overflow);assert(r.metrics.finite);assert(r.targets.every(t=>t.width>=43.99&&t.height>=43.99));for(const b of r.labels)assert(b.x>=0&&b.y>=0&&b.x+b.width<=r.arena.width+.5&&b.y+b.height<=r.arena.height+.5,`${label}: clipped label`);if(fullBoard)for(const cell of r.view.cells)for(const p of [cell,cell.head])assert(p.x>=8&&p.x<=r.arena.width-8&&p.y>=38&&p.y<=r.arena.height-10,`${name}/${label}: clipped formation cell ${cell.cell}`);checks++;return r;}
  const before=await page.evaluate(()=>fightModule.snapshot());
  let r=await verify('overview');samples.push({view:'overview',frame:r.view.frame,arena:r.arena});
  assert(r.view.frame.span>Math.max(10.9,13.8/(r.arena.width/r.arena.height)),'C.06 overview must be wider than C.05');
  await page.screenshot({path:`${out}/${name}.png`});
  for(let i=0;i<8;i++){await tap('#rotate');await verify(`orbit-${i+1}`);}
  await tap('#zoomout');await verify('zoom-out');await tap('#zoomout');await verify('minimum-zoom');
  await tap('#resetcam');await verify('fit');
  for(let i=0;i<5;i++){await tap('#zoomin');await verify(`manual-close-${i+1}`,false);}
  await tap('#resetcam');await verify('fit-after-close');assert.deepEqual(await page.evaluate(()=>fightModule.snapshot()),before);
  // The board itself, not the coordinate button, must still resolve the cell.
  await tap('[data-action="move"]');await verify('move-preview');
  const cell=await page.evaluate(()=>fightModule.view().cells.find(c=>c.cell==='2,3')),arena=await page.locator('#arena').boundingBox();
  if(touch)await page.touchscreen.tap(arena.x+cell.x,arena.y+cell.y);else await page.mouse.click(arena.x+cell.x,arena.y+cell.y);
  const committed=await page.evaluate(()=>fightModule.snapshot());assert.equal(committed.units.find(u=>u.id==='f01').cell,'2,3');
  // Rotate while the move is being presented. Reflow pauses input/presentation.
  await page.setViewportSize({width:height,height:width});await page.waitForFunction(()=>fightModule.metrics().layoutPaused);assert(await page.locator('#end').isDisabled());assert.deepEqual(await page.evaluate(()=>fightModule.snapshot()),committed);await ready();await verify('orientation-during-move');
  await tap('[data-action="brace"]');await ready();await tap('#end');await ready();await verify('enemy-round');assert.equal(await page.evaluate(()=>fightModule.snapshot().round),2);
  await tap('#restart');await ready();await verify('restart');assert.deepEqual(errors,[]);
  reports.push({name,viewport:{width,height},emulatedDpr:dpr,checks,samples,tagOverlaps:0,hudOverlaps:0,fullBoardFits:true,boardTap:true,orientationPause:true,cameraPreservesBattle:true,errors,physicalDevice:false});console.log(JSON.stringify({name,checks,tagOverlaps:0,boardTap:true,orientationPause:true}));await context.close();
 }
 fs.writeFileSync('work/piritori-fight-module/web/fight-module/c06-framing-report.json',JSON.stringify(reports,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
