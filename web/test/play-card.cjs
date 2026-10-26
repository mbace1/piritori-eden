// The play card (ROADMAP.md G0): each ?play= link stands a fresh campaign at its fight, one tap from Night Shift.
// The campaign you had is set aside (once, and only yours), and RESTORE YOUR CAMPAIGN on the title screen puts it
// back. Driven through the real interface at the owner's phone width; it stops at the hand-over to Night Shift (the
// URL and the outing written to the save), because the 3D fight itself is outing-browser's.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const BASE=process.env.PIRITORI_TEST_URL||'http://127.0.0.1:8781/web/';
const KEY='piritori-to-eden:v3',ASIDE=`${KEY}:set-aside`;
const CARDS=[
 // id, the choice that becomes the fight, what the hand-over must say
 ['g0-door','take-it',{arena:'courtyard',kind:'door',goal:'fight',crew:3}],
 ['g0-getaway','sell-two',{arena:'quay',kind:'door',goal:'getaway',crew:3}],
 ['g0-bear','hold-path',{arena:'park',kind:'mission',crew:2}],
];
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let checks=0;const ok=(c,m)=>{assert(c,m);checks+=1;};
 try{
  const page=await browser.newPage({viewport:{width:412,height:915},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // A campaign of your own, marked by its cash, to be kept aside and given back.
  await page.goto(BASE);
  await page.evaluate(async key=>{const {createState}=await import('./js/v3/state.js');const c=await(await fetch('../content/era1-slice-v1.json')).json();const s=createState(c);s.cash=4321;localStorage.clear();localStorage.setItem(key,JSON.stringify(s));},KEY);
  for(const [id,choice,expect] of CARDS){
   await page.goto(`${BASE}?play=${id}`);
   await page.waitForFunction(()=>window.__ptv3?.state?.mode==='encounter',null,{timeout:30000});
   ok(await page.locator('#splash').isHidden(),`${id}: the title screen is out of the way`);
   const st=await page.evaluate(()=>({recruited:__ptv3.state.recruited.length,cash:__ptv3.state.cash}));
   ok(st.recruited===expect.crew,`${id}: ${expect.crew} crew recruited (got ${st.recruited})`);
   ok(st.cash!==4321,`${id}: a fresh campaign, not yours`);
   ok(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null')?.cash,ASIDE)===4321,`${id}: your campaign is set aside, and only yours`);
   const card=page.locator(`.choice-card[data-choice="${choice}"]`);
   ok(await card.count()===1&&await card.isEnabled(),`${id}: "${choice}" is there and open`);
   await Promise.all([page.waitForURL(/crew-run\/\?campaign=1&outing=/,{timeout:30000}),card.tap()]);
   const url=new URL(page.url());
   ok(url.searchParams.get('arena')===expect.arena,`${id}: fought at the ${expect.arena} (got ${url.searchParams.get('arena')})`);
   const outing=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null')?.outing,KEY);
   ok(outing?.kind===expect.kind,`${id}: a ${expect.kind} outing is in the save (got ${outing?.kind})`);
   if(expect.goal)ok((outing?.goal??'fight')===expect.goal,`${id}: the job is ${expect.goal} (got ${outing?.goal})`);
   console.log('PLAY CARD',id,'->',expect.arena);
  }
  // Back to the title: RESTORE YOUR CAMPAIGN gives yours back and forgets the play card.
  await page.goto(BASE);
  const restore=page.locator('#restoreButton');
  await restore.waitFor({state:'visible',timeout:30000});
  await Promise.all([page.waitForNavigation(),restore.tap()]);
  await page.locator('#resumeButton').waitFor({state:'visible',timeout:30000});
  const back=await page.evaluate(([k,a])=>({cash:JSON.parse(localStorage.getItem(k)||'null')?.cash,aside:localStorage.getItem(a),card:localStorage.getItem(`${k}:play-card`)}),[KEY,ASIDE]);
  ok(back.cash===4321,'RESTORE puts your campaign back');
  ok(back.aside===null&&back.card===null,'nothing is left set aside');
  ok(await restore.isHidden(),'RESTORE goes away once used');
  assert.deepEqual(errors,[]);
  console.log(`play card: ${checks} checks passed`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
