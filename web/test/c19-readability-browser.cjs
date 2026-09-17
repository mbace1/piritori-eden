const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.CREW_RUN_URL||'http://127.0.0.1:8781/web/crew-run/';
const out=process.env.C19_OUTPUT||'/tmp/c19-review';fs.mkdirSync(out,{recursive:true});
const results=[];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  for(const spec of [{name:'phone',width:412,height:915},{name:'landscape',width:915,height:412}]){
   const ctx=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:true,isMobile:true}),p=await ctx.newPage(),errors=[];
   p.on('pageerror',e=>errors.push(e.stack));
   const tap=async e=>{await e.scrollIntoViewIfNeeded();await e.tap();};
   const idle=()=>p.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy&&!fightModule.metrics().layoutPaused,null,{timeout:90000});
   const same=async before=>assert.deepEqual(await p.evaluate(()=>fightModule.snapshot()),before);
   const shot=async name=>{console.log(spec.name+': '+name);await p.screenshot({path:`${out}/${spec.name}-${name}.png`,timeout:90000});};
   try{
    // A fresh isolated context; every mission command below is actual UI input.
    await p.goto(base);await idle();await tap(p.locator('#crew-deploy'));await idle();
    await p.waitForFunction(()=>fightModule.metrics().renderedFrames>2);
    assert.ok(await p.locator('#exit-marker').isVisible());assert.match(await p.locator('#mission-goal').innerText(),/Help.*EXIT/);
    assert.ok(await p.locator('.actor-label[data-detail=compact]').count()>=3);
    assert.equal(await p.locator('.actor-label.active').count(),1);
    assert.match(await p.locator('.actor-label.objective').innerText(),/SOS.*HELP/s);
    const before=await p.evaluate(()=>fightModule.snapshot()),intents=await p.locator('#enemy-plans').innerText();
    await shot('focused');
    await tap(p.locator('#camera-menu'));await tap(p.locator('#label-mode'));await tap(p.locator('#camera-menu'));
    assert.equal(await p.locator('.actor-label[data-detail=compact]').count(),0);
    await same(before);assert.equal(await p.locator('#enemy-plans').innerText(),intents);await shot('all-stats');
    await p.reload();await idle();await same(before);assert.equal(await p.locator('#label-mode').getAttribute('aria-pressed'),'true','label preference survives independently');
    await tap(p.locator('#camera-menu'));await tap(p.locator('#label-mode'));await tap(p.locator('#camera-menu'));await same(before);
    await tap(p.locator('#crew-picker'));await tap(p.locator('[data-unitid="crew-1"]'));assert.equal(await p.locator('#roster').isVisible(),false,'selection clears the target area');assert.equal(await p.locator('#crew-picker').getAttribute('aria-expanded'),'false');
    const previewBefore=await p.evaluate(()=>fightModule.snapshot());await tap(p.locator('[data-action="attack"]'));
    const target=p.locator('#choices [data-target]:not([disabled])').first();assert.ok(await target.count(),'opening handgun has a target');const id=await target.getAttribute('data-target');await tap(target);
    assert.equal(await p.locator('.actor-label.targeted').getAttribute('data-unit'),id);assert.equal(await p.locator('.actor-label.targeted').getAttribute('data-detail'),'full');
    await shot('target');await tap(p.locator('#tactical-preview').getByRole('button',{name:'Cancel',exact:true}));await same(previewBefore);assert.equal(await p.locator('.actor-label.targeted').count(),0);
    // Genuine no-action defeat. Do not mutate health or call session.command.
    for(let turn=0;turn<5;turn++){
     console.log(`${spec.name}: end round ${turn+1}`);await tap(p.locator('#end'));await idle();
     if(turn===1){const mid=await p.evaluate(()=>fightModule.snapshot());await p.reload();await idle();await same(mid);}
    }
    const lost=await p.evaluate(()=>crewRun.snapshot());assert.equal(lost.phase,'aftermath');assert.equal(lost.last.success,false);assert.equal(lost.ledger.length,1);assert.equal(lost.night,2);assert.ok(lost.last.changes.every(c=>c.state.startsWith('Missing')));
    await shot('defeat');await p.reload();await idle();assert.deepEqual(await p.evaluate(()=>crewRun.snapshot()),lost,'defeat settles once after reload');
    await tap(p.locator('#crew-next'));assert.equal(await p.evaluate(()=>crewRun.snapshot().phase),'prep');assert.equal(await p.locator('#crew-deploy').isEnabled(),true,'remaining reserves can deploy');await tap(p.locator('#crew-deploy'));await idle();assert.equal(await p.evaluate(()=>crewRun.snapshot().phase),'battle');await shot('recovery-outing');
    assert.deepEqual(errors,[]);results.push({view:spec.name,labels:true,enemyIntentUnchanged:true,targetPreviewFree:true,defeat:'five real end-round commands',midReload:true,aftermathOnce:true,onwardOuting:true,physicalDevice:false,errors});
   }catch(e){await shot('failure').catch(()=>{});throw e;}finally{await ctx.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));}
  }
  for(const count of [2,6,12]){
   const ctx=await browser.newContext({viewport:{width:412,height:915},hasTouch:true,isMobile:true}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   try{
    const url=new URL(`../arena-lab/?actors=${count}&release=19`,base);await p.goto(url.href);await p.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy,null,{timeout:90000});await p.waitForTimeout(500);
    const boxes=await p.locator('.actor-label').evaluateAll(els=>els.filter(e=>!e.hidden).map(e=>({id:e.dataset.unit,...e.getBoundingClientRect().toJSON()})));
    assert.equal(boxes.length,count);for(let i=0;i<boxes.length;i++){const a=boxes[i];assert.ok(a.x>=0&&a.y>=0&&a.right<=412&&a.bottom<=915,'label inside viewport');for(const b of boxes.slice(i+1))assert.ok(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,`no overlapping labels ${a.id}/${b.id}`);}
    assert.equal(await p.locator('.actor-label[data-detail=compact]').count(),count-1);
    await p.screenshot({path:`${out}/capacity-${count}.png`,timeout:90000});assert.deepEqual(errors,[]);results.push({capacity:count,compactLabels:true,overlap:false,physicalDevice:false,errors});
   }finally{await ctx.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));}
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
