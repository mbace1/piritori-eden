import * as THREE from 'three';
import {GLTFLoader} from '../../vendor/jsm/loaders/GLTFLoader.js';

let disposeCurrent = () => {};
export function disposeSceneSpeaker() { disposeCurrent(); disposeCurrent = () => {}; }

export function mountSceneSpeaker(host, url, person) {
  disposeSceneSpeaker();
  if (!host || !url) return;
  let dead = false, frame = 0, model;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({alpha:true,antialias:true}); }
  catch { host.dataset.status='unavailable'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1;
  host.append(renderer.domElement);
  host.dataset.status='loading';
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(person==='arvo'?0xe2eaf2:0xffebcf,0x33404c,2));
  const key=new THREE.DirectionalLight(person==='arvo'?0xdbe9ff:0xffe3c2,person==='arvo'?1.6:2);key.position.set(-2,3,4);scene.add(key);
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,30);
  const aim=person==='arvo'?.85:person==='jaska'?.52:.75, span=person==='arvo'?.4:person==='jaska'?1.12:.58;
  camera.position.set(0,aim,4);camera.lookAt(0,aim,0);
  const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.left=-span*w/h/2;camera.right=-camera.left;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const collect=root=>root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
  const release=()=>{geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());};
  const lost=e=>{e.preventDefault();host.dataset.status='unavailable';cancelAnimationFrame(frame);};
  renderer.domElement.addEventListener('webglcontextlost',lost);
  disposeCurrent=()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',lost);release();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
  new GLTFLoader().load(url,gltf=>{
    model=gltf.scene;collect(model);if(dead){release();return;}
    const bones=[];
    model.traverse(n=>{
      if(n.isBone) bones.push(n);
      for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[]){m.metalness=0;m.roughness=.85;if(m.emissive)m.emissive.set(0);if('specularIntensity' in m)m.specularIntensity=.3;}
    });
    model.updateMatrixWorld(true);
    // Imported rigs use different local axes. Aim the upper arm's real
    // child direction down in world space instead of guessing a Z rotation.
    for(const bone of bones.filter(b=>/arm/i.test(b.name)&&!/fore|hand|lower/i.test(b.name))) {
      const child=bone.children.find(n=>n.isBone);if(!child)continue;
      const start=bone.getWorldPosition(new THREE.Vector3());
      const direction=child.getWorldPosition(new THREE.Vector3()).sub(start).normalize();
      const target=new THREE.Vector3(/left/i.test(bone.name)?.12:-.12,-1,.08).normalize();
      const delta=new THREE.Quaternion().setFromUnitVectors(direction,target);
      const world=bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(delta);
      bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
      model.updateMatrixWorld(true);
    }
    const box=new THREE.Box3().setFromObject(model,true),height=box.max.y-box.min.y;
    if(!Number.isFinite(height)||height<=0){host.dataset.status='unavailable';return;}
    const centre=box.getCenter(new THREE.Vector3());
    const group=new THREE.Group();group.scale.setScalar(1/height);model.position.x-=centre.x;model.position.y-=box.min.y;model.position.z-=centre.z;group.add(model);scene.add(group);
    const head=bones.find(b=>/head/i.test(b.name)),chest=bones.find(b=>/spine|chest/i.test(b.name));
    const headRest=head?.quaternion.clone(),chestRest=chest?.quaternion.clone();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    host.dataset.status='ready';
    let elapsed=0,last=performance.now();
    function animate(now){if(dead)return;const dt=Math.min((now-last)/1000,.05);last=now;
      if(!document.hidden){if(!reduced.matches)elapsed+=dt;
        const period=person==='toko'?7.5:person==='jaska'?9:11;
        const cycle=elapsed%period,glance=cycle>period-2?Math.sin((cycle-(period-2))*Math.PI/2):0;
        if(head)head.quaternion.copy(headRest).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(glance*(person==='toko'?.16:.09),Math.sin(elapsed*.4)*.025,0)));
        if(chest)chest.quaternion.copy(chestRest).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.sin(elapsed*1.1)*.008));
        renderer.render(scene,camera);
      }frame=requestAnimationFrame(animate);
    }animate(performance.now());
  },undefined,()=>{if(!dead)host.dataset.status='unavailable';});
}

