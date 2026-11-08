// Native paired Toko composition checks and optional actual browser recording.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), {spawnSync} = require('node:child_process');
const ROOT = path.resolve(__dirname,'../../..');
const OUT = process.env.RESET_ENSEMBLE_DIR || path.join(__dirname,'evidence');
const mime = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const server = http.createServer((req,res) => {
  let file=path.resolve(ROOT,'.'+new URL(req.url,'http://local').pathname);
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'}).end(b);});
});
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT,p)));
const manifest = read('art/v3/manifest.json');
const allowed = new Set(['scene-toko-noodles-empty-v01','scene-toko-rig-v01','cutin-aatami-front-rig-v01','cutin-aatami-rig-v01'].flatMap(id=>{
  const asset=manifest.assets.find(a=>a.id===id);return asset.file?['/art/v3/'+asset.file]:asset.members.map(m=>'/art/v3/'+m.file);
}));
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
const hit = (a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
const report={base:'804613a3d4eaa1e5180dfb0ef2cb88952d15bd97',physicalDeviceAcceptance:false,staticMouths:true,cases:[],videos:[]};
function watch(page){const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});page.on('request',r=>{const p=new URL(r.url()).pathname;if(r.resourceType()==='image'&&!allowed.has(p))errors.push('Unretained image '+p);if(/\/(v3\.css|lantern\.css|chrome\.js)$|\/art\/v3\/(ui|characters)\//.test(p))errors.push('Legacy presentation '+p)});return errors;}
async function seed(context){await context.addInitScript(()=>{localStorage.setItem('piritori-to-eden:v3','ensemble-campaign-sentinel');localStorage.setItem('piritori-c19-outing-v1','ensemble-outing-sentinel');});}
async function geometry(page){return page.evaluate(()=>({bounds:window.__sceneReset.actors.bounds(),speech:(()=>{const r=document.querySelector('.speech').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})(),world:(()=>{const r=document.querySelector('.world').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})(),foreground:[...document.querySelectorAll('.actors canvas')].map(e=>e.dataset.actor),roomCanvases:document.querySelectorAll('.room-composite canvas').length,overflow:document.documentElement.scrollWidth>innerWidth}));}
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  const base=`http://127.0.0.1:${server.address().port}/art-src/restarts/scene-club/`,browser=await chromium.launch({headless:true});
  try{
    for(const[name,width,height]of[['phone',390,844],['landscape',844,390],['desktop',1280,800]])for(const pose of ['front','side'])for(const reducedMotion of ['reduce','no-preference']){
      const context=await browser.newContext({viewport:{width,height},reducedMotion});await seed(context);const p=await context.newPage(),errors=watch(p);
      await p.goto(base+`?pair=toko&pose=${pose}&start=scene`);await p.waitForFunction(()=>window.__sceneReset?.ready);
      const before=await p.evaluate(()=>localStorage.getItem('piritori:restart:scene-club:v1'));
      const initial=await geometry(p);assert.deepEqual(initial.foreground,['aatami']);assert.equal(initial.roomCanvases,1);assert.equal(initial.bounds.toko.source.crop.join(','),'0,0,1536,864');assert.equal(initial.bounds.toko.camera.fit,'cover');
      for(const clip of ['idle','blink','talk','nod','shake']){
        await p.evaluate(clip=>{window.__sceneReset.actors.debug.hold('toko',clip,.25);window.__sceneReset.actors.debug.hold('aatami',clip,.4)},clip);
        const g=await geometry(p);assert(!g.overflow);for(const who of ['aatami','toko']){const h=g.bounds[who].head;assert(h.x>=g.world.x-1&&h.y>=g.world.y-1&&h.x+h.width<=g.world.x+g.world.width+1&&h.y+h.height<=g.world.y+g.world.height+1,`${name}/${pose}/${who} face clipped`);assert(!hit(h,g.speech),`${name}/${pose}/${who} bubble collision`);if(who==='toko')assert(g.bounds.toko.mouth.y>=g.speech.y+g.speech.height,`${name}/${pose} bottom tail must aim toward a lower mouth`);}
      }
      await p.evaluate(()=>window.__sceneReset.actors.debug.resume());
      await p.locator('#next-line').click();assert.match(await p.locator('.speech').innerText(),/Three delivery vans/);const next=await geometry(p);assert(next.bounds.toko.mouth.y>=next.speech.y+next.speech.height,'second source line keeps bottom-tail direction');await p.locator('#next-line').click();
      const targets=await p.locator('.study-actions button').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return{height:r.height,bottom:r.bottom}}));assert(targets.every(r=>r.height>=44&&r.bottom<=height));
      if(reducedMotion==='reduce')await p.screenshot({path:path.join(OUT,`toko-${pose}-${name}.png`)});
      await p.goto(base+`?pair=toko&pose=${pose}&start=scene&scale=0.5`);await p.waitForFunction(()=>window.__sceneReset?.ready);const half=await geometry(p);for(const who of ['aatami','toko']){const h=half.bounds[who].head;assert(h.x>=half.world.x-1&&h.y>=half.world.y-1&&h.x+h.width<=half.world.x+half.world.width+1&&h.y+h.height<=half.world.y+half.world.height+1);assert(!hit(h,half.speech));}
      assert.equal(await p.evaluate(()=>localStorage.getItem('piritori:restart:scene-club:v1')),before);assert.equal(await p.evaluate(()=>localStorage.getItem('piritori-to-eden:v3')),'ensemble-campaign-sentinel');assert.equal(await p.evaluate(()=>localStorage.getItem('piritori-c19-outing-v1')),'ensemble-outing-sentinel');assert.deepEqual(errors,[]);
      report.cases.push({name,viewport:{width,height},pose,reducedMotion,nativeAndHalf:true,singleRoomCounterCamera:true,sourceHeadsClear:true,studyDoesNotApplyEffects:true,normalSavesUnchanged:true,errors});await context.close();
    }
    console.log('PASS Toko ensemble: 12 native contexts + 12 half-size views, both poses, motion samples, one room/counter camera, clear heads and untouched saves');
    if(process.argv.includes('--record'))for(const[name,width,height]of[['phone',390,844],['landscape',844,390]]){
      const context=await browser.newContext({viewport:{width,height},recordVideo:{dir:OUT,size:{width,height}}});await seed(context);const p=await context.newPage();
      await p.goto(base);await p.waitForFunction(()=>window.__sceneReset?.ready);await pause(900);await p.locator('#enter').click();await p.waitForFunction(()=>window.__sceneReset?.ready&&window.__sceneReset.view==='scene');await pause(3300);
      await p.locator('[data-choice="ask-envelope"]').click();await pause(2200);await p.locator('#return').click();await p.waitForFunction(()=>window.__sceneReset?.view==='map');await pause(1300);
      await p.goto(base+'?pair=toko&pose=front&start=scene');await p.waitForFunction(()=>window.__sceneReset?.ready);await pause(2300);await p.locator('#next-line').click();await pause(1900);
      const video=p.video();await context.close();const webm=path.join(OUT,`visual-restart-${name}.webm`);await video.saveAs(webm);const raw=await video.path();if(raw!==webm)fs.unlinkSync(raw);
      const mp4=webm.replace(/\.webm$/,'.mp4'),encoded=spawnSync('ffmpeg',['-y','-i',webm,'-an','-c:v','libx264','-preset','veryfast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});assert.equal(encoded.status,0,encoded.stderr);report.videos.push({viewport:{width,height},webm:path.basename(webm),mp4:path.basename(mp4),source:'actual browser recording, source mouth stays static'});
    }
  }finally{await browser.close();server.close();}
  fs.writeFileSync(path.join(OUT,'ensemble-results.json'),JSON.stringify(report,null,2)+'\n');
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
