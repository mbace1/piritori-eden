const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.ARENA_LAB_URL||'http://127.0.0.1:8796/work/piritori-fight-module/web/arena-lab/';
(async()=>{const browser=await chromium.launch({...process.platform==='win32'?{channel:'msedge'}:{},headless:true,args:['--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:Number(process.env.ARENA_LAB_DPR||1)}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.testPad={buttons:Array.from({length:16},()=>({pressed:false})),axes:[]};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.testPad]});});
 await page.goto(base+'?actors=6');await page.waitForFunction(()=>window.fightModule&&!fightModule.metrics().busy);
 const ready=()=>page.waitForFunction(()=>!fightModule.metrics().busy),view=()=>page.evaluate(()=>fightModule.view().points),snap=()=>page.evaluate(()=>fightModule.snapshot());
 async function setup(){await page.selectOption('#loadout','ranged');await page.locator('#restart').click();await ready();await page.locator('#roster button').nth(1).click();}
 async function preview(){await page.locator('[data-action=attack]').click();await page.locator('[data-target]:enabled').first().click();}
 await setup();const before=await snap();await preview();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.deepEqual(await snap(),before);
 await preview();await page.evaluate(()=>testPad.buttons[1].pressed=true);await page.waitForFunction(()=>document.querySelector('#tactical-preview').hidden);await page.evaluate(()=>testPad.buttons[1].pressed=false);assert.deepEqual(await snap(),before,'controller B cancels without committing');
 const lights=await page.evaluate(()=>fightModule.metrics().environment.lights);assert.notEqual(lights[0].color,lights[1].color,'styling retains warm/cool roles');assert.ok(lights.every(l=>l.intensity===77));
 await page.locator('#actioncam').click();let overview=await view();await preview();await page.locator('#commit-preview').click();await page.waitForTimeout(360);assert.notDeepEqual(await view(),overview,'action focus changes composition');await ready();assert.deepEqual(await view(),overview,'overview returns without drift');
 await setup();await preview();await page.locator('#commit-preview').click();await page.waitForTimeout(300);await page.locator('#rotate').click();const manual=await view();await ready();assert.deepEqual(await view(),manual,'manual orbit cancels automatic return');
 await page.locator('#resetcam').click();await setup();await page.emulateMedia({reducedMotion:'reduce'});overview=await view();await preview();await page.locator('#commit-preview').click();await page.waitForTimeout(350);assert.deepEqual(await view(),overview,'reduced motion holds overview');await ready();assert.deepEqual(errors,[]);
 console.log('PASS: cancel preview, controller B, warm/cool lights, focus/return, manual camera override and reduced motion');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
