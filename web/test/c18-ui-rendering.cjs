const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.CREW_RUN_URL||'http://127.0.0.1:8781/web/crew-run/';
const out=process.env.C18_OUTPUT||'/tmp/c18-review';
fs.mkdirSync(out,{recursive:true});

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const results=[];
 try{
  for(const spec of [
   {name:'phone',width:412,height:915,touch:true},
   {name:'compact',width:360,height:640,touch:true},
   {name:'landscape',width:844,height:390,touch:true},
   {name:'tablet',width:1194,height:834,touch:true},
   {name:'desktop',width:1366,height:768},
   {name:'phone-safe',width:412,height:915,touch:true,safe:true},
  ]){
   const ctx=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:!!spec.touch,isMobile:!!spec.touch});
   const p=await ctx.newPage(),errors=[],externalModels=[];
   p.on('pageerror',e=>errors.push(e.message));
   p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   p.on('request',r=>{if(/(?:cast3d|fighters|meshy).*\.glb/i.test(r.url()))externalModels.push(r.url());});
   const tap=async locator=>{await locator.scrollIntoViewIfNeeded();await locator[spec.touch?'tap':'click']();};
   const idle=()=>p.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy&&!fightModule.metrics().layoutPaused,null,{timeout:90000});
   // Screenshot generation is not a frame-rate benchmark. Software-rendered
   // hosted runners get a bounded capture deadline; all pixel and input gates
   // remain mandatory. Write diagnostics before a capture, including on failure.
   const shot=async state=>{
    const info=await p.evaluate(()=>({metrics:window.fightModule?.metrics(),arena:document.getElementById('arena').getBoundingClientRect().toJSON(),panel:document.getElementById('panel').getBoundingClientRect().toJSON()}));
    fs.writeFileSync(`${out}/${spec.name}-${state}.json`,JSON.stringify(info,null,2));
    console.log(`${spec.name}: capture ${state}`);
    await p.screenshot({path:`${out}/${spec.name}-${state}.png`,timeout:90000});
   };
   try{
    await p.goto(base+'?campaign=1&release=19'+(spec.safe?'&graphics=safe':''));await idle();
    await shot('prep');await tap(p.locator('#crew-deploy'));await idle();
    await p.waitForFunction(()=>fightModule.metrics().renderedFrames>2);await shot('battle');
    const layout=await p.evaluate(()=>{
     const box=id=>document.getElementById(id).getBoundingClientRect().toJSON();
     return {world:box('arena'),end:box('end'),overflow:document.body.scrollWidth>innerWidth,styles:document.querySelectorAll('link[rel=stylesheet]').length,portrait:!!document.querySelector('#selected-unit img'),targets:[...document.querySelectorAll('#actions button:not([hidden]),#end,#crew-picker,header button,header a')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({text:e.textContent,rect:e.getBoundingClientRect().toJSON()}))};
    });
    assert.equal(layout.styles,1);assert.equal(layout.overflow,false);
    assert.ok(layout.world.height>=spec.height*.5,'at least half of viewport remains arena');
    assert.ok(layout.end.bottom<=spec.height+1,'End round visible');
    assert.ok(layout.portrait,'actual character portrait restored');
    for(const t of layout.targets)assert.ok(t.rect.width>=44&&t.rect.height>=44,`44px target: ${t.text}`);
    assert.equal(await p.getByRole('button',{name:'Retreat with standing crew',exact:true}).isVisible(),false,'withdraw is secondary');
    assert.ok(await p.locator('.enemy-plan').count()>0,'enemy intentions visible by default');
    assert.ok(await p.locator('#enemy-plans').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1),'intent scroll area remains inside viewport');
    const before=await p.evaluate(()=>fightModule.snapshot());
    await tap(p.locator('[data-action=move]'));await tap(p.locator('#choices [data-cell]').first());
    assert.equal(await p.locator('#choices').isVisible(),false,'no coordinate grid under the confirmation sheet');
    if(spec.name==='landscape')assert.ok(await p.evaluate(()=>document.getElementById('tactical-preview').getBoundingClientRect().top>=document.getElementById('arena').getBoundingClientRect().bottom),'short landscape forecast stays below the scene');
    assert.ok(await p.locator('#commit-preview').isVisible());await shot('move');
    await tap(p.locator('#tactical-preview').getByRole('button',{name:'Cancel',exact:true}));
    assert.deepEqual(await p.evaluate(()=>fightModule.snapshot()),before,'preview and cancel are free');
    await tap(p.locator('#help'));
    assert.ok(await p.getByRole('button',{name:'Retreat with standing crew',exact:true}).isVisible());
    await tap(p.getByRole('button',{name:'Retreat with standing crew',exact:true}));
    assert.equal(await p.locator('dialog[open]').count(),1,'no stacked dialogs');
    await tap(p.getByRole('button',{name:'Stay here',exact:true}));
    assert.deepEqual(await p.evaluate(()=>fightModule.snapshot()),before);
    // Read actual scene pixels after a naturally rendered frame, not DOM labels
    // or a synthetic forced render. No extra context, framebuffer or art is used.
    const pixels=await p.evaluate(()=>new Promise((resolve,reject)=>{
     const start=fightModule.metrics().renderedFrames,until=performance.now()+15000;
     function sample(){
      if(fightModule.metrics().renderedFrames<=start){
       if(performance.now()>until){reject(Error('No new scene frame'));return;}
       requestAnimationFrame(sample);return;
      }
      try{
       const gl=document.getElementById('scene').getContext('webgl2');
       if(!gl||gl.isContextLost())throw Error('Scene graphics context unavailable');
       if(gl.getParameter(gl.FRAMEBUFFER_BINDING)!==null)throw Error('Scene did not finish on the default framebuffer');
       const width=gl.drawingBufferWidth,height=gl.drawingBufferHeight,data=new Uint8Array(width*height*4);
       gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,data);
       const error=gl.getError();if(error!==gl.NO_ERROR)throw Error(`Pixel readback error ${error}`);
       let lit=0,bright=0,n=0;const colors=new Set();
       for(let i=0;i<data.length;i+=64){const r=data[i],g=data[i+1],b=data[i+2],v=(r+g+b)/3;if(v>12)lit++;if(v>32)bright++;colors.add([r>>4,g>>4,b>>4].join(','));n++;}
       resolve({width,height,lit:lit/n,bright:bright/n,colors:colors.size});
      }catch(e){reject(e);}
     }
     requestAnimationFrame(sample);
    }));
    assert.ok(pixels.lit>.15&&pixels.bright>.03&&pixels.colors>32,`nonblank ${spec.name} arena: ${JSON.stringify(pixels)}`);
    const metrics=await p.evaluate(()=>fightModule.metrics());
    assert.equal(metrics.edgeSmoothing.method,'none');
    assert.equal(metrics.graphicsMode,spec.safe?'safe':'direct');
    assert.deepEqual(errors,[]);assert.deepEqual(externalModels,[]);
    results.push({canvasPixels:true,readback:'WebGL RGBA',view:spec.name,worldHeight:layout.world.height,...pixels,frames:metrics.renderedFrames,draws:metrics.draws,graphics:metrics.graphicsMode,errors});
    fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results.at(-1)));
   }finally{await ctx.close();}
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
