// Existing-art Aatami + Toko comparison: no source/manifest/runtime changes.
// NODE_PATH=/tmp/aatami-review-tools/node_modules node art-src/cutins/toko-pair-qc.cjs /tmp/toko-pair
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const os=require('node:os');
const ROOT=path.resolve(__dirname,'../..');
const OUT=path.resolve(process.argv[2]||path.join(os.tmpdir(),'aatami-toko-art-review'));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png'};
const VARIANTS=['aatami','aatami-side'];
const SIZES={phone:{width:390,height:844},landscape:{width:1440,height:900}};
const MOMENTS=[['idle',0.1],['blink',1.7],['aatami-talk',0.9],
  ['toko-answer',0.5],['aatami-nod',0.65]];
const server=http.createServer((req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const file=path.resolve(ROOT,'.'+pathname);
    if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
    fs.readFile(file,(err,data)=>{
      if(err){res.writeHead(404);res.end('missing');return;}
      res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream'});res.end(data);
    });
  }catch(e){res.writeHead(400);res.end(String(e));}
});
const dimensions=file=>{
  const png=fs.readFileSync(file);
  if(png.length<3000 || png.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Bad image '+file);
  return [png.readUInt32BE(16),png.readUInt32BE(20)];
};
async function ready(page,url){
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror '+e.message));
  page.on('response',r=>{if(r.status()>=400 && !r.url().endsWith('/favicon.ico'))errors.push('HTTP '+r.status()+' '+r.url());});
  page.on('requestfailed',r=>{const reason=r.failure()?.errorText||'unknown';if(reason!=='net::ERR_ABORTED')errors.push('failed '+r.url()+' '+reason);});
  await page.goto(url,{waitUntil:'load'});
  await page.waitForFunction(()=>window.__ready===true&&Boolean(window.__pair),null,{timeout:60000});
  if(errors.length)throw Error(errors.join('\n'));
  return errors;
}
async function fit(page,viewport,layout){
  const dims=layout==='portrait'?[1080,1920]:[1600,900];
  const scale=Math.min(viewport.width/dims[0],viewport.height/dims[1]);
  await page.evaluate(([w,h])=>{
    const root=document.getElementById('stage');
    root.style.width=w+'px';root.style.height=h+'px';
    document.body.style.width='100vw';document.body.style.height='100vh';
    document.body.style.minHeight='0';
  },dims.map(n=>Math.floor(n*scale)));
}
async function capture(page,pathname,viewport){
  await page.screenshot({path:pathname,animations:'disabled'});
  const d=dimensions(pathname);
  if(d[0]!==viewport.width || d[1]!==viewport.height)throw Error('Wrong screenshot dimensions '+pathname+': '+d.join('x'));
}
async function main(){
  fs.mkdirSync(OUT,{recursive:true});
  await new Promise((res,rej)=>{server.once('error',rej);server.listen(0,'127.0.0.1',res);});
  let browser;
  const shots=[],motion=[],root='http://127.0.0.1:'+server.address().port+'/art-src/cutins/toko-pair-review.html';
  const url=(variant,layout,still=false)=>root+'?aatami='+encodeURIComponent(variant)+'&layout='+layout+(still?'&still=1':'');
  try{
    browser=await chromium.launch();
    for(const variant of VARIANTS)for(const [vp,size] of Object.entries(SIZES)){
      const layout=vp==='phone'?'portrait':'landscape';
      const page=await browser.newPage({viewport:size,deviceScaleFactor:1});
      try{
        await page.emulateMedia({reducedMotion:'no-preference'});
        const errors=await ready(page,url(variant,layout));
        await fit(page,size,layout);
        const proof=await page.evaluate(()=>window.__pair);
        if(proof.toko!=='scene-toko-rig-v01' || proof.aatami!==variant || proof.layout!==layout)
          throw Error('Wrong registered assets/layout in review');
        for(const [moment,seconds]of MOMENTS){
          if(!proof.moments.includes(moment))throw Error('Missing review motion '+moment);
          await page.evaluate(v=>window.__pair.render(v.moment,v.seconds),{moment,seconds});
          const file=variant+'-'+vp+'-'+moment+'.png';
          await capture(page,path.join(OUT,file),size);
          shots.push({variant,viewport:vp,size,moment,seconds,file});
        }
        if(errors.length)throw Error(errors.join('\n'));
      }finally{await page.close();}
      const stillPage=await browser.newPage({viewport:size,deviceScaleFactor:1});
      try{
        await stillPage.emulateMedia({reducedMotion:'reduce'});
        const errors=await ready(stillPage,url(variant,layout,true));
        await fit(stillPage,size,layout);
        const reduced=await stillPage.evaluate(()=>window.__pair.still);
        if(!reduced)throw Error('Reduced-motion fallback failed');
        await stillPage.evaluate(()=>window.__pair.render('rest',2.3));
        const file=variant+'-'+vp+'-rest.png';
        await capture(stillPage,path.join(OUT,file),size);
        shots.push({variant,viewport:vp,size,moment:'rest',seconds:2.3,file});
        if(errors.length)throw Error(errors.join('\n'));
      }finally{await stillPage.close();}
    }
    for(const variant of VARIANTS){
      const vp=SIZES.phone,page=await browser.newPage({viewport:vp,deviceScaleFactor:1});
      try{
        const errors=await ready(page,url(variant,'portrait'));
        await fit(page,vp,'portrait');
        const fps=10,frameCount=70,dir=path.join(OUT,'motion-frames',variant);
        fs.mkdirSync(dir,{recursive:true});
        for(let i=0;i<frameCount;i++){
          await page.evaluate(t=>window.__pair.frame(t),i/fps);
          await capture(page,path.join(dir,'frame-'+String(i).padStart(4,'0')+'.png'),vp);
        }
        if(errors.length)throw Error(errors.join('\n'));
        motion.push({variant,viewport:'phone',fps,frameCount,seconds:7,
          frameDir:'motion-frames/'+variant,gif:variant+'-toko-pair.gif'});
      }finally{await page.close();}
    }
    const manifest={scope:'art comparison candidate only, no live scene, no promotion',
      source:'registered Toko paper rig rest pose with existing front/side Aatami cut-in rigs',
      registeredToko:'scene-toko-rig-v01',shots,motion,
      boundaries:['The approved Toko stage is sampled in rest pose; Toko motion is not evaluated in these GIFs.',
        'The young Aatami rigs do not contain a mouth/viseme layer; talk means head/torso acting only.',
        'Phone and landscape are emulated Chromium render targets, not physical device acceptance.',
        'Text and bubble are temporary review placeholders; no canonical story/dialogue is authored.',
        'No art or engine/runtime paths are changed; owner approval remains separate.']};
    fs.writeFileSync(path.join(OUT,'pair-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    const gallery=shots.map(s=>'<figure><img loading="lazy" src="'+s.file+'"><figcaption>'+
      s.variant+' / Toko · '+s.viewport+' · '+s.moment+'</figcaption></figure>').join('\n');
    fs.writeFileSync(path.join(OUT,'index.html'),'<!doctype html><meta charset="utf-8">'+
      '<title>Aatami + Toko candidate</title><style>body{background:#202222;color:#eee;font:16px system-ui;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}figure{margin:0}img{display:block;width:100%;object-fit:contain;max-height:780px}figcaption{margin:8px}</style>'+
      '<h1>Aatami and Toko — candidate comparison, not gameplay</h1><p><a href="aatami-toko-pair.gif">Front GIF</a> · <a href="aatami-side-toko-pair.gif">Side GIF</a></p>'+
      '<p>Existing semi-approved Aatami in front of approved, static-rest Toko stage. Phone and true landscape framing; no physical device or owner approval; Aatami mouth remains static.</p><main>'+gallery+'</main>');
    console.log('Candidate evidence: '+shots.length+' real-browser screenshots, 2 x 70 rendered Aatami motion frames; no runtime art changes.');
  }finally{
    if(browser)await browser.close();
    await new Promise(res=>server.close(res));
  }
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
