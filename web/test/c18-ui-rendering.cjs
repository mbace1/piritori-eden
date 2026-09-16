const {chromium}=require('playwright'),{PNG}=require('pngjs'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.CREW_RUN_URL||'http://127.0.0.1:8781/web/crew-run/';
const out=process.env.C18_OUTPUT||'/tmp/c18-review';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});try{
 const results=[];
 for(const spec of [{name:'phone',width:412,height:915,touch:true},{name:'compact',width:360,height:640,touch:true},{name:'landscape',width:844,height:390,touch:true},{name:'tablet',width:1194,height:834,touch:true},{name:'desktop',width:1366,height:768},{name:'phone-safe',width:412,height:915,touch:true,safe:true}]){
  const ctx=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:!!spec.touch,isMobile:!!spec.touch}),p=await ctx.newPage(),errors=[],externalModels=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('request',r=>{if(/(?:cast3d|fighters|meshy).*\.glb/i.test(r.url()))externalModels.push(r.url());});
  const tap=async locator=>{await locator.scrollIntoViewIfNeeded();await locator[spec.touch?'tap':'click']();};
  const idle=()=>p.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy&&!fightModule.metrics().layoutPaused,null,{timeout:90000});
  await p.goto(base+'?campaign=1&release=18'+(spec.safe?'&graphics=safe':''));await idle();
  await p.screenshot({path:`${out}/${spec.name}-prep.png`});await tap(p.locator('#crew-deploy'));await idle();
  await p.waitForFunction(()=>fightModule.metrics().renderedFrames>2);await p.screenshot({path:`${out}/${spec.name}-battle.png`});
  const png=PNG.sync.read(await p.locator('#scene').screenshot());let lit=0,bright=0,n=0;const colors=new Set();
  for(let i=0;i<png.data.length;i+=64){const r=png.data[i],g=png.data[i+1],b=png.data[i+2],v=(r+g+b)/3;if(v>12)lit++;if(v>32)bright++;colors.add([r>>4,g>>4,b>>4].join(','));n++;}
  assert.ok(lit/n>.15&&bright/n>.03&&colors.size>32,`nonblank ${spec.name} arena: ${lit/n}, ${bright/n}, ${colors.size}`);
  const layout=await p.evaluate(()=>{const box=id=>document.getElementById(id).getBoundingClientRect().toJSON();return {world:box('arena'),end:box('end'),overflow:document.body.scrollWidth>innerWidth,styles:document.querySelectorAll('link[rel=stylesheet]').length,portrait:!!document.querySelector('#selected-unit img'),targets:[...document.querySelectorAll('#actions button:not([hidden]),#end,#crew-picker,header button,header a')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({text:e.textContent,rect:e.getBoundingClientRect().toJSON()}))};});
  assert.equal(layout.styles,1);assert.equal(layout.overflow,false);assert.ok(layout.world.height>=spec.height*.5,'at least half of viewport remains arena');assert.ok(layout.end.bottom<=spec.height+1,'End round visible');assert.ok(layout.portrait,'actual character portrait restored');
  for(const t of layout.targets)assert.ok(t.rect.width>=44&&t.rect.height>=44,`44px target: ${t.text}`);
  assert.equal(await p.getByRole('button',{name:'Retreat with standing crew',exact:true}).isVisible(),false,'withdraw is secondary');
  assert.ok(await p.locator('.enemy-plan').count()>0,'enemy intentions visible by default');
  const before=await p.evaluate(()=>fightModule.snapshot());await tap(p.locator('[data-action=move]'));await tap(p.locator('#choices [data-cell]').first());
  assert.equal(await p.locator('#choices').isVisible(),false,'no coordinate grid under the confirmation sheet');assert.ok(await p.locator('#commit-preview').isVisible());await p.screenshot({path:`${out}/${spec.name}-move.png`});await tap(p.locator('#tactical-preview').getByRole('button',{name:'Cancel',exact:true}));assert.deepEqual(await p.evaluate(()=>fightModule.snapshot()),before,'preview and cancel are free');
  await tap(p.locator('#help'));assert.ok(await p.getByRole('button',{name:'Retreat with standing crew',exact:true}).isVisible());await tap(p.getByRole('button',{name:'Retreat with standing crew',exact:true}));assert.equal(await p.locator('dialog[open]').count(),1,'no stacked dialogs');await tap(p.getByRole('button',{name:'Stay here',exact:true}));assert.deepEqual(await p.evaluate(()=>fightModule.snapshot()),before);
  const metrics=await p.evaluate(()=>fightModule.metrics());assert.equal(metrics.edgeSmoothing.method,'none');assert.equal(metrics.graphicsMode,spec.safe?'safe':'direct');assert.deepEqual(errors,[]);assert.deepEqual(externalModels,[]);
  results.push({view:spec.name,worldHeight:layout.world.height,lit:lit/n,bright:bright/n,colors:colors.size,frames:metrics.renderedFrames,draws:metrics.draws,graphics:metrics.graphicsMode,errors});console.log(JSON.stringify(results.at(-1)));await ctx.close();
 }
 fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
