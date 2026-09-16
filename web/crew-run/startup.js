const canvas=document.getElementById('scene');
const message=document.getElementById('loading-message');
const detail=document.getElementById('loading-detail');
const retry=document.getElementById('reload-graphics');

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const attrs={
  alpha:false,
  antialias:false,
  depth:true,
  stencil:false,
  failIfMajorPerformanceCaveat:false,
  powerPreference:'low-power',
  preserveDrawingBuffer:false,
};

let status='';
const contextError=e=>{status=e.statusMessage||status;};
canvas.addEventListener('webglcontextcreationerror',contextError);

let gl=null;
for(const delay of [0,350,900]){
  if(delay){
    message.textContent='Graphics busy. Retrying with a lighter renderer…';
    detail.textContent='C.18 mobile startup recovery';
    await wait(delay);
  }
  try{gl=canvas.getContext('webgl2',attrs);}catch{}
  if(gl)break;
}
canvas.removeEventListener('webglcontextcreationerror',contextError);

if(!gl){
  message.textContent='Unable to start 3D graphics.';
  detail.textContent=status||'Chrome could not create a WebGL2 context. Close other 3D/game tabs if needed, then retry.';
  retry.textContent='Retry graphics';
  retry.hidden=false;
  retry.addEventListener('click',()=>location.reload(),{once:true});
  throw new Error(status||'WebGL2 context unavailable after retry');
}

canvas.__piritoriGL=gl;
await import('../fight-module/main.js?v=28');
