const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.CREW_RUN_URL||'http://127.0.0.1:8796/work/piritori-fight-module/web/crew-run/',out=process.env.CREW_RUN_OUTPUT||'.private/c12-qa';fs.mkdirSync(out,{recursive:true});
async function selectCrew(p,tap,id){if(await p.locator('#crew-picker').count()&&!await p.locator('#roster').isVisible())await tap(p.locator('#crew-picker'));await tap(p.locator(`[data-unitid="${id}"]`));if(await p.locator('#crew-picker').count()&&await p.locator('#roster').isVisible())await tap(p.locator('#crew-picker'));}
const route=[['select','crew-1'],['move','2,5'],['help','crew-5'],['select','crew-5'],['move','3,2'],['select','crew-0'],['move','1,0'],['extract'],['select','crew-2'],['move','3,0'],['extract'],['end'],['select','crew-5'],['move','3,0'],['extract'],['select','crew-1'],['move','2,1'],['brace'],['end'],['move','2,0'],['extract']];
(async()=>{const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':'chromium',headless:true,args:['--enable-unsafe-swiftshader',...(process.env.PIRITORI_SOFTWARE_RENDERER==='1'?['--use-angle=swiftshader']:[])]});try{
 for(const spec of [{name:'desktop',width:1440,height:1000},{name:'phone',width:412,height:915,touch:true},{name:'phone-landscape',width:915,height:412,touch:true},{name:'tablet',width:1194,height:834,touch:true}]){
  const ctx=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:Number(process.env.ARENA_LAB_DPR||1),hasTouch:!!spec.touch,isMobile:!!spec.touch}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>{errors.push(e.stack);console.error(e.stack)});p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.route('**/fight-module/main.js*',async r=>{const response=await r.fetch();await r.fulfill({response,body:await response.text()+"\nlet crewGL;window.crewAudit={lose:()=>{crewGL=renderer.getContext().getExtension('WEBGL_lose_context');crewGL.loseContext();},restore:()=>crewGL.restoreContext()};"});});
  const tap=async el=>{await el.scrollIntoViewIfNeeded();await el[spec.touch?'tap':'click']();},idle=()=>p.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy,{},{timeout:120000});
  await p.goto(base);await idle();assert.equal(await p.locator('.crew-card').count(),6);
  await p.waitForFunction(()=>fightModule.metrics().renderedFrames>0);
  await p.waitForTimeout(1000);const menuFrames=await p.evaluate(()=>fightModule.metrics().renderedFrames);
  await p.waitForTimeout(1000);assert.equal(await p.evaluate(()=>fightModule.metrics().renderedFrames),menuFrames,'planning keeps a static scene behind scrolling controls');
  await p.evaluate(()=>document.fonts.ready);
  await p.waitForFunction(()=>[...document.querySelectorAll('.crew-card img')].length===6&&[...document.querySelectorAll('.crew-card img')].every(i=>i.complete&&i.naturalWidth>0));
  assert.ok(await p.evaluate(()=>document.fonts.check('600 24px "Barlow Condensed"')),'bundled display face loaded');
  await tap(p.getByRole('button',{name:'Equip Sanna Heikkilä',exact:true}));
  await tap(p.getByRole('button',{name:'Sanna Heikkilä Knife',exact:true}));
  assert.equal(await p.evaluate(()=>crewRun.snapshot().crew.find(c=>c.id==='crew-1').equipment),'folding-knife');
  await tap(p.getByRole('button',{name:'Sanna Heikkilä Handgun',exact:true}));
  assert.equal(await p.evaluate(()=>crewRun.snapshot().crew.find(c=>c.id==='crew-1').equipment),'first-handgun');
  await p.screenshot({path:`${out}/${spec.name}-equipment.png`});await tap(p.getByRole('button',{name:'Done',exact:true}));
  await p.locator('#crew-screen').evaluate(el=>el.scrollTop=0);
  assert.ok(await p.evaluate(()=>document.body.scrollWidth<=innerWidth),'no horizontal page overflow');
  await p.screenshot({path:`${out}/${spec.name}-crew.png`});
  await tap(p.locator('#crew-deploy'));await idle();assert.equal(await p.evaluate(()=>crewRun.snapshot().phase),'battle');
  assert.ok(await p.locator('#selected-unit').innerText().then(t=>t.includes('Ivana Savić')),'identity and condition share the console');
  const layout=await p.evaluate(()=>({world:document.getElementById('arena').getBoundingClientRect().toJSON(),end:document.getElementById('end').getBoundingClientRect().toJSON(),height:innerHeight}));
  assert.ok(layout.world.height>=layout.height*.5,'world remains at least half the viewport');
  assert.ok(layout.end.bottom<=layout.height+1,'end round visible without panel scrolling');
  await p.screenshot({path:`${out}/${spec.name}-battle.png`});
  for(const [index,[type,value]]of route.entries()){
   const actionStarted=Date.now();console.log(JSON.stringify({view:spec.name,step:index,action:type,value}));
   if(type==='select')await selectCrew(p,tap,value);
   else if(type==='move'){await tap(p.locator('[data-action="move"]'));await tap(p.locator(`[data-cell="${value}"]`));await tap(p.locator('#commit-preview'));}
   else if(type==='end')await tap(p.locator('#end'));
   else if(type==='brace')await tap(p.locator('[data-action="brace"]'));
   else await tap(p.locator(`[data-mission-action="${type}"]`).first());
   await idle();
   assert.ok(Date.now()-actionStarted<30000,`bounded ${spec.name} ${type} presentation`);
   console.log(JSON.stringify({view:spec.name,step:index,elapsedMs:Date.now()-actionStarted,metrics:await p.evaluate(()=>{const m=fightModule.metrics();return {fps:m.fps,renderedFrames:m.renderedFrames,drawingBuffer:m.drawingBuffer,profile:m.profile};})}));
   if(index===2){const before=await p.evaluate(()=>fightModule.snapshot());assert.equal(before.units.find(v=>v.id==='crew-5').hp,3);await p.reload();await idle();assert.deepEqual(await p.evaluate(()=>fightModule.snapshot()),before,'rescue restored exactly');
    await p.evaluate(()=>crewAudit.lose());await p.waitForFunction(()=>fightModule.metrics().graphicsLost);await p.waitForTimeout(300);await p.evaluate(()=>crewAudit.restore());await idle();assert.deepEqual(await p.evaluate(()=>fightModule.snapshot()),before,'graphics restore preserves rescue');
   }
  }
  const result=await p.evaluate(()=>crewRun.snapshot());assert.equal(result.phase,'aftermath');assert.equal(result.last.success,true);assert.equal(result.last.changes.length,4);assert.equal(result.last.changes.filter(c=>c.state.includes('Wounded')).length,2);
  await p.screenshot({path:`${out}/${spec.name}-aftermath.png`});await p.reload();await idle();assert.equal(await p.evaluate(()=>JSON.stringify(crewRun.snapshot())),JSON.stringify(result),'no duplicate aftermath');
  await tap(p.locator('#crew-next'));const history=await p.evaluate(()=>crewRun.snapshot().crew);for(const person of history){const record=await p.locator(`[data-person="${person.id}"] .crew-record`).innerText();assert.ok(record.includes(`${person.fights} outings survived · ${person.wounds} wounds`));assert.ok(record.includes(person.aptitudes.slice(0,2).join(' / ')));if(person.memories[0])assert.ok(record.includes(person.memories[0]));}assert.equal(await p.locator('[data-crew="crew-1"]').count(),0,'wounded cannot deploy');await tap(p.locator('#crew-deploy'));await idle();assert.equal(await p.evaluate(()=>fightModule.snapshot().mission.objective),'recovery');
  await tap(p.getByRole('button',{name:'Retreat with standing crew',exact:true}));if(spec.name==='phone')await p.locator('#confirm-retreat').dispatchEvent('pointerup',{pointerType:'touch'});else if(spec.name==='phone-landscape')await p.locator('#confirm-retreat').dispatchEvent('touchend');else await tap(p.locator('#confirm-retreat'));await idle();assert.equal(await p.evaluate(()=>crewRun.snapshot().night),3);assert.equal(await p.evaluate(()=>crewRun.snapshot().ledger.length),2);
  if(['desktop','phone'].includes(spec.name)){
   // Fresh browser save is setup; every equipment and healing action uses UI.
   await p.evaluate(()=>localStorage.removeItem('piritori-c12-crew-v1'));await p.reload();await idle();
   await tap(p.getByRole('button',{name:'Equip Sanna Heikkilä',exact:true}));await tap(p.getByRole('button',{name:'Sanna Heikkilä Light pack',exact:true}));await tap(p.getByRole('button',{name:'Done',exact:true}));await tap(p.locator('#crew-deploy'));await idle();
   await tap(p.locator('#end'));await idle();await selectCrew(p,tap,'crew-1');
   const hurt=await p.evaluate(()=>fightModule.snapshot().units.find(u=>u.id==='crew-1'));assert.ok(hurt.hp<hurt.maxHp,'enemy turn wounded the handgun user');
   assert.ok(await p.locator('[data-action="reload"]').isVisible());assert.ok(await p.locator('[data-action="item"]').isVisible(),'light-pack bandage coexists with reload');
   await p.screenshot({path:`${out}/${spec.name}-handgun-bandage.png`});await tap(p.locator('[data-action="item"]'));await idle();
   const healed=await p.evaluate(()=>fightModule.snapshot().units.find(u=>u.id==='crew-1'));assert.equal(healed.hp,Math.min(hurt.maxHp,hurt.hp+2));assert.equal(healed.itemIds.length,0,'bandage consumed through the interface');
  }
  assert.ok(await p.evaluate(()=>fightModule.metrics().finite));assert.deepEqual(errors,[]);console.log(JSON.stringify({view:spec.name,success:true,rescue:true,individualExtraction:true,reload:true,contextRecovery:true,aftermathOnce:true,nextOuting:true,errors}));await ctx.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
