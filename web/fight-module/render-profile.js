// Conservative startup budgets. A fast desktop test is not a mobile GPU test.
export function renderProfile({touch=false,recovered=false}={}) {
  const light=touch||recovered;
  return {name:light?'mobile':'desktop',fps:light?30:60,pixelRatio:light?1:1.5,
    maxPixels:light?650000:1800000,textureSize:light?1024:2048,
    shadows:!light,antialias:!light,edgeSmoothing:light};
}
export function pixelRatioFor(profile,width,height,dpr=1) {
  return Math.min(dpr,profile.pixelRatio,Math.sqrt(profile.maxPixels/Math.max(1,width*height)));
}

// Keep a bounded CPU source for context restoration, shared by both teams.
// Original registered GLBs and their hashes are never changed.
export function limitTextures(scene,maxSize) {
  const images=new Map(),textures=new Set();
  scene.traverse(node=>{for(const mat of [].concat(node.material||[]))for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);});
  for(const texture of textures) {
    const source=texture.image;
    if(!source?.width||!source.height||Math.max(source.width,source.height)<=maxSize)continue;
    if(!images.has(source)) {
      const scale=maxSize/Math.max(source.width,source.height),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('Unable to prepare character textures');
      ctx.drawImage(source,0,0,canvas.width,canvas.height);images.set(source,canvas);
    }
    texture.image=images.get(source);texture.needsUpdate=true;
  }
  for(const source of images.keys())source.close?.();
}
