const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.CREW_RUN_URL||'http://127.0.0.1:8796/work/piritori-fight-module/web/crew-run/';
const out=process.env.AIM_OUTPUT||'.private/c14-aim-qa';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true,args:['--enable-unsafe-swiftshader']});try{
 for(const spec of [{name:'desktop',width:1440,height:1000},{name:'phone',width:412,height:915,touch:true},{name:'landscape',width:915,height:412,touch:true},{name:'tablet',width:1194,height:834,touch:true}]){
  const ctx=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:Number(process.env.ARENA_LAB_DPR||1),hasTouch:!!spec.touch,isMobile:!!spec.touch}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.addInitScript(()=>{window.testPad={buttons:Array.from({length:16},()=>({pressed:false})),axes:[]};Object.defineProperty(navigator,'getGamepads',{value:()=>[testPad]});});
  // Inject context-loss handles for setup only; all aiming/shots use UI.
  await p.route('**/fight-module/main.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+"\nlet gl;window.aimAudit={lose:()=>{gl=renderer.getContext().getExtension('WEBGL_lose_context');gl.loseContext();},restore:()=>gl.restoreContext(),programs:()=>{const seen=new Set(),out=[],gl=renderer.getContext();world.traverse(o=>{for(const m of [].concat(o.material||[])){if(seen.has(m))continue;seen.add(m);const key=m.customProgramCacheKey();if(!key.includes('-c14-cutaway'))continue;for(const program of renderer.properties.get(m).programs?.values()||[]){const shaders=gl.getAttachedShaders(program.program)||[];const fragment=shaders.find(s=>gl.getShaderParameter(s,gl.SHADER_TYPE)===gl.FRAGMENT_SHADER);out.push({key,corridor:(fragment?gl.getShaderSource(fragment):'').includes('labFocusStart.w>0.0')});}}});return out;}};"});});
  const tap=async q=>{await p.waitForTimeout(280);await q.scrollIntoViewIfNeeded();await q[spec.touch?'tap':'click']();};
  const idle=()=>p.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy,{},{timeout:120000});
  const snap=()=>p.evaluate(()=>fightModule.snapshot()),view=()=>p.evaluate(()=>fightModule.view().points);
  const readyAim=()=>p.waitForFunction(()=>fightModule.metrics().camera.mode==='gun'&&fightModule.metrics().camera.strength===1);
  async function preview(){if(await p.locator('[data-action=attack]').getAttribute('aria-pressed')!=='true')await tap(p.locator('[data-action=attack]'));await tap(p.locator('[data-target]:enabled').first());}
  await p.goto(base);await idle();await tap(p.locator('#crew-deploy'));await idle();await tap(p.locator('[data-unitid="crew-1"]'));
  const before=await snap(),overview=await view();await preview();const forecast=await p.locator('#tactical-preview p').innerText();
  await tap(p.locator('#aim-preview'));await readyAim();assert.notDeepEqual(await view(),overview,'Aim view changes real framing');assert.deepEqual(await snap(),before,'aim spends no resources/RNG');
  assert.equal(await p.locator('#tactical-preview p').innerText(),forecast,'camera preserves true forecast');
  const bounds=await p.evaluate(()=>{const m=fightModule.metrics(),v=fightModule.view(),r=document.getElementById('arena').getBoundingClientRect();return {width:r.width,height:r.height,points:v.points.filter(p=>m.camera.ids.includes(p.id))};});
  for(const unit of bounds.points)for(const point of [unit.head,unit.feet]){assert.ok(point.x>=0&&point.x<=bounds.width&&point.y>=0&&point.y<=bounds.height,`${spec.name} ${unit.id} visible`);}
  const programs=await p.evaluate(()=>aimAudit.programs());assert.ok(programs.some(v=>v.key.endsWith('-foliage'))&&programs.some(v=>v.key.endsWith('-solid')),'both material families compiled');for(const v of programs)assert.equal(v.corridor,v.key.endsWith('-foliage'),'linked foliage corridor must never leak into solid scenery');
  assert.equal(bounds.points.length,2);assert.ok(await p.evaluate(()=>document.body.scrollWidth<=innerWidth));
  await p.screenshot({path:`${out}/${spec.name}-aim.png`});
  await tap(p.locator('#aim-preview'));assert.deepEqual(await view(),overview,'Overview restores exact view');
  await tap(p.locator('#aim-preview'));await readyAim();await p.keyboard.press('Escape');assert.deepEqual(await snap(),before);assert.deepEqual(await view(),overview,'Escape restores overview');
  await preview();await tap(p.locator('#aim-preview'));await readyAim();await p.evaluate(()=>testPad.buttons[1].pressed=true);await p.waitForFunction(()=>document.getElementById('tactical-preview').hidden);await p.evaluate(()=>testPad.buttons[1].pressed=false);assert.deepEqual(await view(),overview,'controller B cancels');assert.deepEqual(await snap(),before);
  await preview();await tap(p.locator('#aim-preview'));await readyAim();
  if(await p.locator('#rotate').isVisible())await tap(p.locator('#rotate'));
  else {const b=await p.locator('#scene').boundingBox();await p.mouse.move(b.x+b.width*.35,b.y+b.height*.6);await p.mouse.down();await p.mouse.move(b.x+b.width*.65,b.y+b.height*.6,{steps:8});await p.mouse.up();}
  const manual=await view();await p.waitForTimeout(400);assert.deepEqual(await view(),manual,'manual camera interrupts aiming');await tap(p.getByRole('button',{name:'Cancel',exact:true}));assert.deepEqual(await view(),manual,'cancel retains manual overview');await tap(p.locator('#resetcam'));
  await p.emulateMedia({reducedMotion:'reduce'});await preview();await tap(p.locator('#aim-preview'));await readyAim();assert.deepEqual(await snap(),before,'explicit static view works with reduced motion');await tap(p.getByRole('button',{name:'Cancel',exact:true}));await p.emulateMedia({reducedMotion:'no-preference'});
  await preview();await tap(p.locator('#aim-preview'));await readyAim();await p.evaluate(()=>aimAudit.lose());await p.waitForFunction(()=>fightModule.metrics().graphicsLost);await p.waitForTimeout(300);await p.evaluate(()=>aimAudit.restore());await idle();assert.deepEqual(await snap(),before,'context recovery while aiming preserves state');assert.equal(await p.evaluate(()=>fightModule.metrics().camera.mode),'overview');
  await preview();await tap(p.locator('#aim-preview'));await readyAim();const target=await p.evaluate(()=>fightModule.metrics().camera.ids[1]);await tap(p.locator('#commit-preview'));await idle();
  const after=await snap(),shooter=after.units.find(u=>u.id==='crew-1');assert.equal(shooter.ammo,before.units.find(u=>u.id==='crew-1').ammo-1,'one round spent');assert.equal(after.acted.filter(id=>id==='crew-1').length,1,'one action');assert.equal(await p.evaluate(()=>fightModule.metrics().history.filter(h=>h.type==='attack').length),1,'one attack committed');assert.deepEqual(await view(),overview,'shot returns to overview');
  const stable=await snap();await p.reload();await idle();assert.deepEqual(await snap(),stable,'aimed shot persists exactly once');assert.ok(await p.evaluate(()=>fightModule.metrics().finite));assert.deepEqual(errors,[]);
  await p.screenshot({path:`${out}/${spec.name}-overview.png`});console.log(JSON.stringify({view:spec.name,target,aim:true,cancel:true,controller:true,manual:true,reducedMotion:true,recovery:true,oneShot:true,errors}));await ctx.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
