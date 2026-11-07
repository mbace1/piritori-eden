import {REST,pose,rigParts,drawFigure} from '../../../web/js/v3/cutin-stage.js';
import {makeJaskaBlinkRepair,makeAatamiBlinkRepair,EYE_OPENINGS,AATAMI_EYE_OPENINGS} from './blink-repair.js';
const who=new URLSearchParams(location.search).get('who')==='aatami'?'aatami':'jaska';
const openings=who==='aatami'?AATAMI_EYE_OPENINGS:EYE_OPENINGS;
if(who==='aatami'){document.querySelector('h1').textContent='Aatami blink — review-only repair';document.querySelectorAll('figcaption small')[1].textContent='Same head, brow and skin source';}
const root=new URL('../../../',location.href),manifest=await fetch(new URL('art/v3/manifest.json',root)).then(r=>r.json()),asset=manifest.assets.find(a=>a.id===(who==='aatami'?'cutin-aatami-front-rig-v01':'cutin-jaska-rig-v01'));
const images={};await Promise.all(asset.members.map(async m=>{images[m.part]=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=new URL('art/v3/'+m.file,root);});}));
const baseline=rigParts(asset,images),repaired=(who==='aatami'?makeAatamiBlinkRepair:makeJaskaBlinkRepair)(baseline),before=document.querySelector('#before'),after=document.querySelector('#after');
for(const c of[before,after]){c.width=(baseline.parts.head.w+24)*2;c.height=(baseline.parts.head.h+24)*2;}
function draw(canvas,rig,p){const g=canvas.getContext('2d');g.clearRect(0,0,canvas.width,canvas.height);g.fillStyle='#121719';g.fillRect(0,0,canvas.width,canvas.height);g.save();g.scale(2,2);drawFigure(g,rig,p,12-baseline.parts.head.x,12-baseline.parts.head.y,1);g.restore();}
function full(rig,blink){const c=document.createElement('canvas');c.width=520;c.height=700;drawFigure(c.getContext('2d'),rig,{...REST,blink},0,0,1);return c;}
// Pixel assertions on fixed registration, independently of screenshot/layout timing.
const open=full(baseline,0),repairOpen=full(repaired,0),repairClosed=full(repaired,1),a=open.getContext('2d').getImageData(0,0,520,700).data,b=repairOpen.getContext('2d').getImageData(0,0,520,700).data,c=repairClosed.getContext('2d').getImageData(0,0,520,700).data;
let restChanges=0,outsideEyeChanges=0,eyeChanges=0;
const head=baseline.parts.head;
for(let i=0;i<a.length;i+=4){const x=(i/4)%520,y=Math.floor(i/4/520);if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])restChanges++;
 if(b[i]!==c[i]||b[i+1]!==c[i+1]||b[i+2]!==c[i+2]||b[i+3]!==c[i+3]){const inside=openings.some(e=>x>=head.x+e.x&&x<head.x+e.x+e.w&&y>=head.y+e.y&&y<head.y+e.y+e.h);if(inside)eyeChanges++;else outsideEyeChanges++;}}
const checks={restChanges,outsideEyeChanges,eyeChanges,headLocalEyeBounds:openings.map(({x,y,w,h})=>({x,y,w,h}))};
if(restChanges||outsideEyeChanges||!eyeChanges)throw Error('Blink mask registration failed: '+JSON.stringify(checks));
document.querySelector('#status').textContent=`Pixel checks: unchanged rest; ${eyeChanges} changed eye pixels; zero changed pixels outside eye openings. ${who==='aatami'?'Brow':'Glasses'} and face boundary remain source pixels.`;
let hold=true,start=performance.now()/1000;
document.querySelector('#animate').onclick=()=>{hold=!hold;start=performance.now()/1000;document.querySelector('#animate').textContent=hold?'Animate both':'Hold full blink';};
function render(){const p=hold?{...REST,blink:1}:pose(who,'idle',performance.now()/1000-start);draw(before,baseline,p);draw(after,repaired,p);requestAnimationFrame(render);}render();
window.__blinkComparison={ready:true,checks,holdFull(){hold=true;}};
