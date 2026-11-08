// Review-only, deterministic Aatami + Jaska ensemble captures.
// Requires Playwright; never edits manifest, runtime, art approvals or game save.
// NODE_PATH=/tmp/aatami-review-tools/node_modules node art-src/cutins/ensemble-qc.cjs /tmp/ensemble-evidence
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const os=require('node:os');
const ROOT=path.resolve(__dirname,'../..');
const OUT=path.resolve(process.argv[2]||path.join(os.tmpdir(),'piritori-ensemble-review'));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png'};
const VARIANTS=['aatami','aatami-side'];
const SIZES={phone:{width:390,height:844},desktop:{width:1440,height:900}};
const MOMENTS=[['idle',0.1],['blink',1.7],['aatami-talk',0.85],['jaska-talk',0.85],
  ['aatami-nod',0.55],['jaska-shake',0.55]];
const server=http.createServer((req,res)=>{
  try{
    const request=new URL(req.url,'http://127.0.0.1');
    const file=path.resolve(ROOT,'.'+decodeURIComponent(request.pathname));
    if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);return res.end();}
    fs.readFile(file,(err,data)=>{
      if(err){res.writeHead(404);return res.end('missing');}
      res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream'});res.end(data);
    });
  }catch(err){res.writeHead(400);res.end(err.message);}
});
function checkImage(file,width,height){
  const png=fs.readFileSync(file);
  if(png.length<3000 || png.toString('hex',0,8)!=='89504e470d0a1a0a')
    throw Error('Not a real screenshot: '+file);
  const w=png.readUInt32BE(16),h=png.readUInt32BE(20);
  if(w!==width||h!==height)throw Error('Bad viewport dimensions: '+file+' '+w+'x'+h);
}
async function setup(page,url){
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('response',r=>{
    if(r.status()>=400 && !r.url().endsWith('/favicon.ico'))errors.push('HTTP '+r.status()+': '+r.url());
  });
  page.on('requestfailed',r=>{
    const why=r.failure()?.errorText||'unknown';
    if(why!=='net::ERR_ABORTED')errors.push('requestfailed: '+r.url()+' ('+why+')');
  });
  await page.goto(url,{waitUntil:'load'});
  await page.waitForFunction(()=>window.__ready===true && Boolean(window.__ensemble),null,{timeout:60000});
  if(errors.length)throw Error(errors.join('\n'));
  return errors;
}
async function fit(page,size){
  const scale=Math.min(size.width/1080,size.height/1920);
  await page.evaluate(dim=>{
    const stage=document.getElementById('s');
    stage.style.width=dim.w+'px';stage.style.height=dim.h+'px';
    document.body.style.width='100vw';document.body.style.height='100vh';
    document.body.style.minHeight='0';
  },{w:Math.floor(1080*scale),h:Math.floor(1920*scale)});
}
async function main(){
  fs.mkdirSync(OUT,{recursive:true});
  await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok);});
  let browser;
  const shots=[],motion=[];
  const root='http://127.0.0.1:'+server.address().port+'/art-src/cutins/ensemble-review.html?aatami=';
  try{
    browser=await chromium.launch();
    for(const variant of VARIANTS)for(const [viewport,size] of Object.entries(SIZES)){
      const page=await browser.newPage({viewport:size,deviceScaleFactor:1});
      try{
        await page.emulateMedia({reducedMotion:'no-preference'});
        const errors=await setup(page,root+encodeURIComponent(variant));
        await fit(page,size);
        const available=await page.evaluate(()=>window.__ensemble.moments);
        for(const [moment,seconds] of MOMENTS){
          if(!available.includes(moment))throw Error('Missing pose '+moment);
          await page.evaluate(({moment,seconds})=>window.__ensemble.render(moment,seconds),{moment,seconds});
          const name=variant+'-'+viewport+'-'+moment+'.png';
          const filename=path.join(OUT,name);
          await page.screenshot({path:filename,animations:'disabled'});
          checkImage(filename,size.width,size.height);
          shots.push({variant,viewport,viewportSize:size,moment,seconds,file:name});
        }
        if(errors.length)throw Error(errors.join('\n'));
      }finally{await page.close();}
      const stillPage=await browser.newPage({viewport:size,deviceScaleFactor:1});
      try{
        await stillPage.emulateMedia({reducedMotion:'reduce'});
        const errors=await setup(stillPage,root+encodeURIComponent(variant)+'&still=1');
        await fit(stillPage,size);
        const still=await stillPage.evaluate(()=>window.__ensemble.still);
        if(!still)throw Error('Reduced-motion fallback not enabled');
        await stillPage.evaluate(()=>window.__ensemble.render('reduced-motion-rest',3.1));
        const name=variant+'-'+viewport+'-reduced-motion-rest.png';
        const filename=path.join(OUT,name);
        await stillPage.screenshot({path:filename,animations:'disabled'});
        checkImage(filename,size.width,size.height);
        shots.push({variant,viewport,viewportSize:size,moment:'reduced-motion-rest',seconds:3.1,file:name});
        if(errors.length)throw Error(errors.join('\n'));
      }finally{await stillPage.close();}
    }
    for(const variant of VARIANTS){
      const size=SIZES.phone,page=await browser.newPage({viewport:size,deviceScaleFactor:1});
      try{
        const errors=await setup(page,root+encodeURIComponent(variant));
        await fit(page,size);
        const fps=10,seconds=7,frameCount=fps*seconds,framesDir=path.join(OUT,'motion-frames',variant);
        fs.mkdirSync(framesDir,{recursive:true});
        for(let index=0;index<frameCount;index++){
          await page.evaluate(t=>window.__ensemble.frame(t),index/fps);
          const file=path.join(framesDir,'frame-'+String(index).padStart(4,'0')+'.png');
          await page.screenshot({path:file,animations:'disabled'});
          checkImage(file,size.width,size.height);
        }
        if(errors.length)throw Error(errors.join('\n'));
        motion.push({variant,fps,frameCount,seconds,viewport:'phone',viewportSize:size,
          framesDir:'motion-frames/'+variant,gif:variant+'-jaska-ensemble.gif'});
      }finally{await page.close();}
    }
    const evidence={scope:'review-only, proposed simultaneous two-speaker layout, not in-game UI or owner/device approval',
      base:'existing PR #118 cut-in reviewer and main cut-in-stage.js',
      scene:'scene-club-v01',shots,motion,
      limitations:['desktop is a letterboxed portrait composition, not native landscape game layout',
        'Aatami rigs lack a jaw/viseme layer; mouth remains static during talk',
        'simulated browser viewports do not constitute physical Pixel/iPad acceptance']};
    fs.writeFileSync(path.join(OUT,'ensemble-manifest.json'),JSON.stringify(evidence,null,2)+'\n');
    const cards=shots.map(s=>'<figure><img loading="lazy" src="'+s.file+'"><figcaption>'+
      s.variant+' / Jaska · '+s.viewport+' · '+s.moment+'</figcaption></figure>').join('\n');
    const index='<!doctype html><meta charset="utf-8"><title>Aatami + Jaska ensemble review</title>'+
      '<style>body{background:#202020;color:#eee;font:16px system-ui;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}figure{margin:0}img{display:block;width:100%;max-height:760px;object-fit:contain}figcaption{margin:8px}</style>'+
      '<h1>Aatami + Jaska — review-only composite</h1>'+
      '<p><a href="aatami-jaska-ensemble.gif">Front GIF</a> · <a href="aatami-side-jaska-ensemble.gif">Side GIF</a></p>'+
      '<p>Existing animated paper cut-ins, composited side by side in Scene Club. This is a proposal, not an implemented gameplay layout. Desktop images letterbox the portrait design; native landscape, physical device, mouth animation, full seam QC and owner approval are still open.</p><main>'+cards+'</main>';
    fs.writeFileSync(path.join(OUT,'index.html'),index);
    console.log('Ensemble evidence: '+shots.length+' screenshots, '+motion.map(m=>m.frameCount).join('+')+' actual rendered animation frames; NO art approval.');
  }finally{
    if(browser)await browser.close();
    await new Promise(ok=>server.close(ok));
  }
}
main().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
