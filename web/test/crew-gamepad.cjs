const {chromium}=require('playwright'),assert=require('node:assert/strict');
const url=process.env.CREW_RUN_URL||'http://127.0.0.1:8788/web/crew-run/';
(async()=>{const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':'chromium',headless:true,args:['--enable-unsafe-swiftshader',...(process.env.PIRITORI_SOFTWARE_RENDERER==='1'?['--use-angle=swiftshader']:[])]});try{
 const p=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:.5}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 // Supply hardware input only. Every selection/activation is handled by the
 // game's normal controller polling and its real DOM controls.
 await p.addInitScript(()=>{
  window.padDevice={buttons:Array.from({length:18},()=>({pressed:false,value:0})),axes:[0,0,0,0],connected:true,index:0,id:'QA gamepad',mapping:'standard'};
  window.padPolls=0;Object.defineProperty(navigator,'getGamepads',{value:()=>{padPolls++;return [padDevice]}});
 });
 await p.goto(url);await p.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy&&fightModule.metrics().renderedFrames>0);
 await p.waitForTimeout(1500);const frames=await p.evaluate(()=>fightModule.metrics().renderedFrames);
 await p.waitForTimeout(800);assert.equal(await p.evaluate(()=>fightModule.metrics().renderedFrames),frames,'planning keeps its static scene');
 async function press(index){
  const first=await p.evaluate(i=>{padDevice.buttons[i]={pressed:true,value:1};return padPolls},index);
  await p.waitForFunction(n=>padPolls>n+1,first,{timeout:10000});
  const released=await p.evaluate(i=>{padDevice.buttons[i]={pressed:false,value:0};return padPolls},index);
  await p.waitForFunction(n=>padPolls>n+1,released,{timeout:10000});await p.waitForTimeout(180);
 }
 async function navigate(selector){
  for(let i=0;i<65;i++){
   if(await p.evaluate(s=>document.activeElement?.matches(s),selector))return;
   await press(13);
  }
  throw Error('Controller did not reach '+selector);
 }
 await navigate('[aria-label="Equip Sanna Heikkilä"]');await press(0);
 assert.ok(await p.locator('#loadout-dialog').isVisible());
 await navigate('[aria-label="Sanna Heikkilä Knife"]');await press(0);
 assert.equal(await p.evaluate(()=>crewRun.snapshot().crew.find(c=>c.id==='crew-1').equipment),'folding-knife');
 await press(1);assert.equal(await p.locator('#loadout-dialog').isVisible(),false);
 await navigate('#crew-deploy');await press(0);await p.waitForFunction(()=>crewRun.snapshot().phase==='battle'&&!fightModule.metrics().busy);
 await navigate('#crew-picker');await press(0);assert.ok(await p.locator('#roster').isVisible());
 await navigate('[data-unitid="crew-1"]');await press(0);
 assert.equal(await p.evaluate(()=>fightModule.snapshot().selectedId),'crew-1');
 assert.equal(await p.locator('#roster').isVisible(),false,'controller selection closes the drawer');assert.equal(await p.locator('#crew-picker').getAttribute('aria-expanded'),'false');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({controller:true,staticPlanning:true,equipment:true,modalCancel:true,deployment:true,roster:true,errors}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
