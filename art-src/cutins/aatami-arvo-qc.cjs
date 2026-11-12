// Source-only Aatami vs Arvo cut-in comparison; uses registered rig pieces.
// Does not modify manifests, approval flags, gameplay, or source art.
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..');
const OUT=path.resolve(process.argv[2]||path.join(os.tmpdir(),'aatami-arvo-review'));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp'};
const VARIANTS=['aatami','aatami-side'];
const VIEWPORTS={phone:{width:390,height:844},landscape:{width:1440,height:900}};
const TONES=['dark','kraft'];
const MOMENTS=[['idle',0.1],['blink',1.7],['aatami-talk',0.8],
  ['arvo-read',0.8],['arvo-glance',0.8],['arvo-gesture',0.8]];
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);return res.end();}
    fs.readFile(file,(err,buf)=>{
      if(err){res.writeHead(404);return res.end('Missing asset');}
      res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream'});
      res.end(buf);
    });
  }catch(e){res.writeHead(400);res.end(String(e.message));}
});
function checkPng(filename,viewport) {
  const buf=fs.readFileSync(filename);
  if(buf.length<2500||buf.toString('hex',0,8)!=='89504e470d0a1a0a')
    throw Error('Invalid screenshot '+filename);
  if(buf.readUInt32BE(16)!==viewport.width||buf.readUInt32BE(20)!==viewport.height)
    throw Error('Wrong native viewport '+filename);
}
async function ready(page,url) {
  const errors=[];
  page.on('pageerror',e=>errors.push('JS: '+e.message));
  page.on('response',r=>{
    if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))
      errors.push('HTTP '+r.status()+' '+r.url());
  });
  page.on('requestfailed',r=>{
    if(r.failure()?.errorText!=='net::ERR_ABORTED') errors.push('Request '+r.url());
  });
  await page.goto(url,{waitUntil:'load'});
  await page.waitForFunction(()=>window.__ready===true&&Boolean(window.__comparison),null,{timeout:60000});
  if(errors.length)throw Error(errors.join('\n'));
  const source=await page.evaluate(()=>window.__comparison.sourceIds);
  if(!source.includes('cutin-arvo-rig-v01'))throw Error('Did not load registered Arvo');
  if(!source.some(s=>s==='cutin-aatami-front-rig-v01'||s==='cutin-aatami-rig-v01'))
    throw Error('Did not load existing Aatami');
  return errors;
}
async function main(){
  fs.mkdirSync(OUT,{recursive:true});
  await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok);});
  let browser;
  const shots=[],motion=[];
  const root='http://127.0.0.1:'+server.address().port+'/art-src/cutins/aatami-arvo-review.html';
  try{
    browser=await chromium.launch();
    for(const variant of VARIANTS)for(const [layout,size] of Object.entries(VIEWPORTS))
      for(const tone of TONES){
        const page=await browser.newPage({viewport:size,deviceScaleFactor:1});
        const url=root+'?aatami='+encodeURIComponent(variant)+'&tone='+tone;
        try{
          await page.emulateMedia({reducedMotion:'no-preference'});
          const errors=await ready(page,url);
          for(const [moment,seconds] of MOMENTS){
            await page.evaluate(({moment,seconds})=>window.__comparison.render(moment,seconds),
              {moment,seconds});
            const name=variant+'-'+layout+'-'+tone+'-'+moment+'.png';
            const file=path.join(OUT,name);
            await page.screenshot({path:file,animations:'disabled'});
            checkPng(file,size);
            shots.push({variant,layout,tone,moment,file:name,size});
          }
          if(errors.length)throw Error(errors.join('\n'));
        }finally{await page.close();}
        const reduced=await browser.newPage({viewport:size,deviceScaleFactor:1});
        try{
          await reduced.emulateMedia({reducedMotion:'reduce'});
          const errors=await ready(reduced,url);
          const state=await reduced.evaluate(()=>{
            window.__comparison.render('arvo-read',1.2);
            return window.__poses;
          });
          if(!state.still||state.aatami.jaw!==0||state.arvo.jaw!==0||
            state.aatami.rot!==0||state.arvo.rot!==0)
            throw Error('Reduced motion did not use the registered still pose');
          await reduced.evaluate(()=>window.__comparison.render('reduced-motion-rest',3.1));
          const name=variant+'-'+layout+'-'+tone+'-reduced-motion-rest.png';
          const file=path.join(OUT,name);
          await reduced.screenshot({path:file,animations:'disabled'});
          checkPng(file,size);
          shots.push({variant,layout,tone,moment:'reduced-motion-rest',file:name,size});
          if(errors.length)throw Error(errors.join('\n'));
        }finally{await reduced.close();}
      }
    for(const variant of VARIANTS) {
      const size=VIEWPORTS.phone;
      const page=await browser.newPage({viewport:size,deviceScaleFactor:1});
      const url=root+'?aatami='+encodeURIComponent(variant)+'&tone=dark';
      try{
        const errors=await ready(page,url),frames=path.join(OUT,'frames',variant);
        fs.mkdirSync(frames,{recursive:true});
        const snapshots=[];
        for(let i=0;i<70;i++){
          await page.evaluate(s=>window.__comparison.frame(s),i/10);
          const name=path.join(frames,'frame-'+String(i).padStart(4,'0')+'.png');
          await page.screenshot({path:name,animations:'disabled'});
          checkPng(name,size);
          if(i===0||i===30||i===60)
            snapshots.push(crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex'));
        }
        if(new Set(snapshots).size<2)throw Error('Motion frames identical for '+variant);
        if(errors.length)throw Error(errors.join('\n'));
        motion.push({variant,viewport:'phone',fps:10,frames:70,durationSeconds:7,
          source:'existing cutin-stage.js poses',gif:variant+'-arvo-review.gif'});
      }finally{await page.close();}
    }
    fs.writeFileSync(path.join(OUT,'arvo-compare-manifest.json'),JSON.stringify({
      status:'review-candidate-not-production',comparison:'noncanonical source rig and ink/alpha inspection',
      sourceRigs:['cutin-aatami-front-rig-v01','cutin-aatami-rig-v01','cutin-arvo-rig-v01'],
      shots,motion,limitations:[
        'Arvo appears in a neutral comparison card, not his in-game news tab',
        'Aatami has no speaking-mouth layer; Arvo read has an existing jaw piece',
        'browser emulation is not Pixel/iPad acceptance',
        'No approval, extraction, production art, runtime scene or gameplay change'
      ]},null,2)+'\n');
    console.log('Review-only Aatami/Arvo evidence: '+shots.length+' stills and 2 x 70 phone motion frames');
  }finally{
    if(browser)await browser.close();
    await new Promise(ok=>server.close(ok));
  }
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
