import './c18-build-identity.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const main=readFileSync(new URL('../fight-module/main.js',import.meta.url),'utf8');
const draw=main.slice(main.indexOf('function drawScene(){'),main.indexOf('function fit(){'));
for(const [isCrew,safeGraphics,smoothing,expected] of [[true,false,true,false],[true,true,true,false],[false,false,true,true]]){
 const calls=[],frameSize={x:0,y:0};
 const renderer={setRenderTarget:v=>calls.push(['target',v]),setScissorTest:v=>calls.push(['scissor',v]),getSize:v=>Object.assign(v,{x:412,y:600}),setViewport:(...v)=>calls.push(['viewport',...v]),render:()=>calls.push(['scene'])};
 vm.runInNewContext(draw+'drawScene();',{renderer,frameSize,isCrew,safeGraphics,profile:{edgeSmoothing:smoothing},stage:{beforeRender:()=>calls.push(['reflection'])},camera:{},world:{},edgeSmoothing:{render:v=>calls.push(['smoothing',v])}});
 assert.deepEqual(calls.slice(safeGraphics?0:1),[['target',null],['scissor',false],['viewport',0,0,412,600],['scene'],['smoothing',expected]]);
}
assert.ok(main.includes("function resumeGraphics(){busy=false;action='';labUI?.cancel();"),'recovery clears the interrupted preview with its action');
const html=readFileSync(new URL('../crew-run/index.html',import.meta.url),'utf8');
assert.equal((html.match(/rel="stylesheet"/g)||[]).length,1);
assert.equal((html.match(/id="roundbar"/g)||[]).length,1);
assert.equal((html.match(/id="camera-tools"/g)||[]).length,1);
assert.ok(html.includes('style.css?v=6')&&html.includes('startup.js?v=5'));
console.log('C18 renderer and UI ownership contract passed');

const arena=readFileSync(new URL('../arena-lab/index.html',import.meta.url),'utf8');
assert.ok(arena.includes('<title>Piritori \u00b7 Arena Laboratory C.19</title>'));
assert.ok(arena.includes('<h1>BEAR PARK <span>C.19</span></h1>'));
assert.ok(arena.includes('<h2>Arena laboratory \u00b7 C.19</h2>'));
assert.ok(arena.includes('C.11 tactical resolver'),'resolver version is explicitly separate from build identity');
console.log('C19 arena title/header/help agree; unchanged C11 resolver is labelled separately');
