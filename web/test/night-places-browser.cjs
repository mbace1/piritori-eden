const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.CREW_RUN_URL||'http://127.0.0.1:8796/work/piritori-fight-module/web/crew-run/',out=process.env.PLACES_OUTPUT||'.private/c15-places';fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true,args:['--enable-unsafe-swiftshader']});try{for(const spec of [{name:'desktop',width:1440,height:1000},{name:'phone',width:412,height:915,t:true},{name:'landscape',width:915,height:412,t:true},{name:'tablet',width:1194,height:834,t:true}]){
 for(const arena of ['courtyard','yard','park']){
  const ctx=await b.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:!!spec.t,isMobile:!!spec.t}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});const tap=async q=>{await p.waitForTimeout(280);await q.scrollIntoViewIfNeeded();await q[spec.t?'tap':'click']();};const idle=()=>p.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy&&!fightModule.metrics().layoutPaused,{},{timeout:90000});
  const url=new URL(base);url.searchParams.set('arena',arena);await p.goto(url.href);await idle();await tap(p.locator('#crew-deploy'));await idle();const before=await p.evaluate(()=>fightModule.snapshot());let last;
  for(const preset of ['tactical','oblique','overhead']){
   await tap(p.locator('#camera-menu'));await tap(p.locator(`[data-camera-preset="${preset}"]`));await tap(p.locator('#camera-menu'));await idle();
   const view=await p.evaluate(()=>({view:fightModule.view(),metrics:fightModule.metrics(),w:document.getElementById('arena').clientWidth,h:document.getElementById('arena').clientHeight}));assert.equal(view.metrics.camera.preset,preset);if(last)assert.notDeepEqual(view.view.points,last,'preset changes actual projection');last=view.view.points;
   for(const cell of view.view.cells)for(const at of [cell,cell.head])assert.ok(at.x>=0&&at.x<=view.w&&at.y>=0&&at.y<=view.h,`${spec.name}/${arena}/${preset}/${cell.cell} is framed`);
   assert.deepEqual(await p.evaluate(()=>fightModule.snapshot()),before,'camera spends no game resources');assert.ok(await p.evaluate(()=>document.body.scrollWidth<=innerWidth));
   await p.screenshot({path:`${out}/${spec.name}-${arena}-${preset}.png`});
  }
  await tap(p.locator('#crew-picker'));await tap(p.locator('[data-unitid="crew-1"]'));await tap(p.locator('#crew-picker'));const hitboxes=await p.locator('#actions button:not([hidden])').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{action:e.dataset.action,width:r.width,height:r.height,hit:hit===e||e.contains(hit)};}));for(const q of hitboxes){assert.ok(q.width>=44&&q.height>=44,JSON.stringify(q));assert.ok(q.hit,'unobstructed '+JSON.stringify(q));}
  const saved=await p.evaluate(()=>fightModule.snapshot());await p.reload();await idle();assert.deepEqual(await p.evaluate(()=>fightModule.snapshot()),saved,'location reload preserves mission');assert.deepEqual(errors,[]);console.log(JSON.stringify({layout:spec.name,arena,presets:3,hitboxes,errors}));await ctx.close();
 }
}}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
