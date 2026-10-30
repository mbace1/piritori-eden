import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/jsm/loaders/GLTFLoader.js';
import { assetUrl, loadGameData } from './content.js?v=1';

const PILOTS = [
  {
    id: 'f01',
    body: 'cast3d-f01-heavy-bruiser-v03',
    clipPack: 'cast3d-f01-heavy-bruiser-clips-v03',
    x: -0.82,
  },
  {
    id: 'f02',
    body: 'cast3d-f02-wiry-skirmisher-v03',
    clipPack: 'cast3d-f02-wiry-skirmisher-clips-v03',
    x: 0.82,
  },
];

const canvas = document.querySelector('#fighterCanvas');
const stage = document.querySelector('#fighterStage');
const status = document.querySelector('#loadStatus');
const runtimeReadout = document.querySelector('#runtimeReadout');
const motionButtons = [...document.querySelectorAll('[data-motion]')];
const handButtons = [...document.querySelectorAll('[data-hand-pose]')];
const pauseButton = document.querySelector('#pauseMotion');
const loader = new GLTFLoader();

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-2, 2, 2.25, -0.35, 0.01, 30);
camera.position.set(0, 1.05, 8.5);
camera.lookAt(0, 1.05, 0);

scene.add(new THREE.HemisphereLight(0x99c7d8, 0x17130e, 1.4));
const key = new THREE.DirectionalLight(0xffd49a, 2.4);
key.position.set(-3.5, 5.5, 5.0);
key.castShadow = true;
scene.add(key);
const rim = new THREE.DirectionalLight(0x57c8e8, 1.1);
rim.position.set(4.0, 3.4, -3.0);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(2.7, 48),
  new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.38 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.015;
floor.receiveShadow = true;
scene.add(floor);

const clock = new THREE.Clock();
const players = new Map();
const BODY_CLIP_NAMES = ['alert-idle', 'casual-walk'];
const HAND_CLIP_NAMES = ['hands-open', 'hands-relaxed', 'hands-fist', 'hands-prop-grip'];
const ALL_CLIP_NAMES = [...BODY_CLIP_NAMES, ...HAND_CLIP_NAMES];
const LEGACY_BODY_BONE_COUNT = 24;
const FINGER_BONE_COUNT = 20;
const allowedMotions = new Set(BODY_CLIP_NAMES);
const allowedHandPoses = new Set(HAND_CLIP_NAMES);
const query = new URLSearchParams(location.search);
const currentMotion = Object.fromEntries(PILOTS.map(pilot => {
  const requested = query.get(pilot.id);
  return [pilot.id, allowedMotions.has(requested) ? requested : 'alert-idle'];
}));
const currentHandPose = Object.fromEntries(PILOTS.map(pilot => {
  const requested = query.get(`${pilot.id}hands`);
  return [pilot.id, allowedHandPoses.has(requested) ? requested : 'hands-relaxed'];
}));
let paused = false;
const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = reducedMotionQuery.matches;
let suspended = false;
let destroyed = false;
let frameRequest = 0;

globalThis.__fighterTest = {
  version: 'v4.49',
  sampleBones(pilotId) {
    const player = players.get(pilotId);
    if (!player) return null;
    player.model.updateMatrixWorld(true);
    return player.bones.map(bone => ({
      name: bone.name,
      matrix: bone.matrixWorld.toArray().map(value => Number(value.toFixed(6))),
    }));
  },
  sampleLocalBones(pilotId, layer = 'all') {
    const player = players.get(pilotId);
    if (!player) return null;
    const names = layer === 'body'
      ? player.bodyBoneNames
      : layer === 'hands' ? player.handBoneNames : null;
    return player.bones
      .filter(bone => !names || names.has(bone.name))
      .map(bone => ({
        name: bone.name,
        position: bone.position.toArray().map(value => Number(value.toFixed(6))),
        quaternion: bone.quaternion.toArray().map(value => Number(value.toFixed(6))),
        scale: bone.scale.toArray().map(value => Number(value.toFixed(6))),
      }));
  },
  view() {
    return Object.fromEntries([...players].map(([id, player]) => [id, screenBounds(player)]));
  },
  appearance(pilotId) {
    const player = players.get(pilotId);
    if (!player) return null;
    const materials = [];
    player.model.traverse(node => {
      if (!node.isMesh) return;
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (!material) continue;
        materials.push({
          emissive: material.emissive?.getHexString?.() ?? null,
          emissiveIntensity: material.emissiveIntensity ?? null,
          hasEmissiveMap: Boolean(material.emissiveMap),
        });
      }
    });
    return materials;
  },
  state() {
    return {
      ready: document.body.dataset.ready === 'true',
      f01: currentMotion.f01,
      f02: currentMotion.f02,
      f01Hands: currentHandPose.f01,
      f02Hands: currentHandPose.f02,
      paused,
      reducedMotion,
      suspended,
      destroyed,
      rendering: frameRequest !== 0,
    };
  },
  activeDuration() {
    return Math.max(0, ...[...players].map(([id, player]) => (
      player.bodyActions[currentMotion[id]]?.getClip().duration ?? 0
    )));
  },
};

function load(url) {
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
}

function sameNames(left, right) {
  return left.size === right.size && [...left].every(name => right.has(name));
}

function targetsForClip(pilotId, clip, boneNames, requiredProperty = null) {
  const targets = new Set();
  const bindings = new Set();
  for (const track of clip.tracks) {
    let parsed;
    try {
      parsed = THREE.PropertyBinding.parseTrackName(track.name);
    } catch {
      throw new Error(`${pilotId.toUpperCase()} ${clip.name} has an invalid track ${track.name}`);
    }
    if (!boneNames.has(parsed.nodeName)) {
      throw new Error(`${pilotId.toUpperCase()} ${clip.name} targets non-skeleton node ${parsed.nodeName}`);
    }
    if (requiredProperty && parsed.propertyName !== requiredProperty) {
      throw new Error(`${pilotId.toUpperCase()} ${clip.name} targets ${parsed.propertyName}, expected ${requiredProperty}`);
    }
    const binding = `${parsed.nodeName}:${parsed.propertyName}:${parsed.propertyIndex ?? ''}`;
    if (bindings.has(binding)) {
      throw new Error(`${pilotId.toUpperCase()} ${clip.name} has duplicate track ${track.name}`);
    }
    bindings.add(binding);
    targets.add(parsed.nodeName);
  }
  return targets;
}

function validateClipLayers(pilotId, clips, bones, expectedBoneCount) {
  if (!Number.isInteger(expectedBoneCount) || expectedBoneCount < 1) {
    throw new Error(`${pilotId.toUpperCase()} manifest has no valid bone_count`);
  }
  if (bones.length !== expectedBoneCount) {
    throw new Error(`${pilotId.toUpperCase()} body has ${bones.length} bones, expected ${expectedBoneCount} from manifest`);
  }
  const boneNames = new Set(bones.map(bone => bone.name));
  if (boneNames.size !== bones.length) {
    throw new Error(`${pilotId.toUpperCase()} body contains duplicate bone names`);
  }

  const bodyTargets = BODY_CLIP_NAMES.map(name => targetsForClip(pilotId, clips[name], boneNames));
  for (const name of BODY_CLIP_NAMES) {
    if (clips[name].tracks.length !== 72) {
      throw new Error(`${pilotId.toUpperCase()} ${name} has ${clips[name].tracks.length} tracks, expected 72 legacy body tracks`);
    }
  }
  if (bodyTargets.some(targets => targets.size !== LEGACY_BODY_BONE_COUNT)
      || !sameNames(bodyTargets[0], bodyTargets[1])) {
    throw new Error(`${pilotId.toUpperCase()} body clips do not share the same ${LEGACY_BODY_BONE_COUNT} legacy bones`);
  }

  const handTargets = HAND_CLIP_NAMES.map(name => {
    const clip = clips[name];
    if (clip.tracks.length !== FINGER_BONE_COUNT) {
      throw new Error(`${pilotId.toUpperCase()} ${name} has ${clip.tracks.length} tracks, expected one quaternion track per finger bone`);
    }
    return targetsForClip(pilotId, clip, boneNames, 'quaternion');
  });
  if (handTargets.some(targets => targets.size !== FINGER_BONE_COUNT)
      || handTargets.slice(1).some(targets => !sameNames(handTargets[0], targets))) {
    throw new Error(`${pilotId.toUpperCase()} hand clips do not share the same ${FINGER_BONE_COUNT} finger bones`);
  }
  if ([...bodyTargets[0]].some(name => handTargets[0].has(name))) {
    throw new Error(`${pilotId.toUpperCase()} body and hand clips target overlapping bones`);
  }
  const animatedBones = new Set([...bodyTargets[0], ...handTargets[0]]);
  if (animatedBones.size !== expectedBoneCount || !sameNames(animatedBones, boneNames)) {
    throw new Error(`${pilotId.toUpperCase()} body and hand layers do not cover the manifest skeleton`);
  }
  return { bodyBoneNames: bodyTargets[0], handBoneNames: handTargets[0] };
}

function styleModel(model) {
  model.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (!material) continue;
      if ('metalness' in material) material.metalness = 0;
      if ('roughness' in material) material.roughness = 0.92;
      // Meshy exports the albedo as a full-strength emissive map as well as the
      // base colour. In a lit scene that doubles the texture and blows skin out
      // to paper white. Keep the accepted albedo, but neutralise that export
      // artefact for the runtime derivative.
      if (material.emissive) material.emissive.set(0x000000);
      if ('emissiveMap' in material) material.emissiveMap = null;
      if ('emissiveIntensity' in material) material.emissiveIntensity = 0;
      if ('specularIntensity' in material) material.specularIntensity = 0.5;
      if (material.specularColor) material.specularColor.set(0xffffff);
      material.needsUpdate = true;
    }
  });
}

function posedBounds(model) {
  model.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(model, true);
}

function normalizeModel(model) {
  const box = posedBounds(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = 1.95 / Math.max(size.y, 0.001);
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);
}

function anchorPlayer(player) {
  const { holder, model, x } = player;
  holder.position.set(x, 0, 0);
  holder.updateMatrixWorld(true);
  const box = posedBounds(model);
  const center = box.getCenter(new THREE.Vector3());
  holder.position.y = -box.min.y;
  holder.position.z = -center.z;
  holder.updateMatrixWorld(true);
}

function combinedPlayerBounds() {
  const combined = new THREE.Box3();
  for (const player of players.values()) {
    player.holder.updateMatrixWorld(true);
    combined.union(posedBounds(player.model));
  }
  return combined;
}

function fitCamera() {
  if (!players.size) return;
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  const aspect = width / height;
  const box = combinedPlayerBounds();
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const verticalSpan = Math.max(size.y, size.x / Math.max(aspect, 0.001), 1) * 1.34;
  camera.position.set(center.x, center.y, 8.5);
  camera.lookAt(center.x, center.y, 0);
  camera.top = verticalSpan * 0.5;
  camera.bottom = -verticalSpan * 0.5;
  camera.left = -verticalSpan * aspect * 0.5;
  camera.right = verticalSpan * aspect * 0.5;
  camera.updateProjectionMatrix();
}

function screenBounds(player) {
  player.holder.updateMatrixWorld(true);
  const box = posedBounds(player.model);
  const corners = [];
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z).project(camera));
    }
  }
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  const xs = corners.map(point => (point.x + 1) * width * 0.5);
  const ys = corners.map(point => (1 - point.y) * height * 0.5);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return {
    left, right, top, bottom,
    width: right - left,
    height: bottom - top,
    canvasWidth: width,
    canvasHeight: height,
    holderX: player.holder.position.x,
    worldWidth: box.max.x - box.min.x,
    worldHeight: box.max.y - box.min.y,
  };
}

function setLabel(id, value) {
  const node = document.querySelector(`#${id}State`);
  if (node) node.textContent = value;
}

function motionLabel(name) {
  return name === 'casual-walk' ? 'CASUAL WALK' : 'ALERT IDLE';
}

function handPoseLabel(name) {
  return ({
    'hands-open': 'OPEN HANDS',
    'hands-relaxed': 'RELAXED HANDS',
    'hands-fist': 'FISTS',
    'hands-prop-grip': 'PROP GRIP',
  })[name] ?? 'RELAXED HANDS';
}

function syncPlaybackPolicy() {
  const playing = !paused && !reducedMotion && !suspended && !destroyed;
  for (const player of players.values()) player.mixer.timeScale = playing ? 1 : 0;
  if (players.size !== PILOTS.length) return;
  pauseButton.disabled = reducedMotion || destroyed;
  pauseButton.classList.toggle('active', paused);
  pauseButton.setAttribute('aria-pressed', String(paused));
  pauseButton.textContent = reducedMotion
    ? 'REDUCED MOTION · STATIC'
    : paused ? 'RESUME BOTH' : 'PAUSE BOTH';
  for (const player of players.values()) {
    const bodyLabel = motionLabel(currentMotion[player.id]);
    const handsLabel = handPoseLabel(currentHandPose[player.id]);
    const playbackLabel = reducedMotion ? 'STATIC' : paused ? 'PAUSED' : bodyLabel;
    setLabel(player.id, `${playbackLabel} · ${handsLabel}`);
  }
}

function syncQuery() {
  const next = new URL(location.href);
  for (const pilot of PILOTS) {
    next.searchParams.set(pilot.id, currentMotion[pilot.id]);
    next.searchParams.set(`${pilot.id}hands`, currentHandPose[pilot.id]);
  }
  history.replaceState(null, '', next);
}

function setMotion(pilotId, name, updateQuery = true) {
  const player = players.get(pilotId);
  if (!player || !allowedMotions.has(name)) return;
  currentMotion[pilotId] = name;
  paused = false;
  const next = player.bodyActions[name];
  for (const action of Object.values(player.bodyActions)) action.stop();
  next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  player.mixer.update(0);
  fitCamera();
  for (const button of motionButtons.filter(button => button.dataset.pilot === pilotId)) {
    const active = button.dataset.motion === name;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  syncPlaybackPolicy();
  startRendering();
  document.body.dataset[`${pilotId}Motion`] = name;
  if (updateQuery) syncQuery();
}

function setHandPose(pilotId, name, updateQuery = true) {
  const player = players.get(pilotId);
  if (!player || !allowedHandPoses.has(name)) return;
  currentHandPose[pilotId] = name;
  const next = player.handActions[name];
  for (const action of Object.values(player.handActions)) {
    action.paused = false;
    action.stop();
  }
  next.reset().setLoop(THREE.LoopOnce, 1).setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  next.clampWhenFinished = true;
  next.time = Math.max(0, next.getClip().duration - 1e-6);
  next.paused = true;
  player.mixer.update(0);
  fitCamera();
  for (const button of handButtons.filter(button => button.dataset.pilot === pilotId)) {
    const active = button.dataset.handPose === name;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  syncPlaybackPolicy();
  startRendering();
  document.body.dataset[`${pilotId}Hands`] = name;
  if (updateQuery) syncQuery();
}

function togglePause() {
  if (reducedMotion || destroyed) return;
  paused = !paused;
  syncPlaybackPolicy();
  if (!paused) startRendering();
}

function resize() {
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  renderer.setSize(width, height, false);
  fitCamera();
  startRendering();
}

function animate() {
  frameRequest = 0;
  if (destroyed || suspended) return;
  const delta = Math.min(clock.getDelta(), 0.05);
  const playing = !paused && !reducedMotion;
  if (playing) for (const player of players.values()) player.mixer.update(delta);
  renderer.render(scene, camera);
  if (playing) frameRequest = requestAnimationFrame(animate);
}

function startRendering() {
  if (frameRequest || destroyed || suspended) return;
  clock.getDelta();
  frameRequest = requestAnimationFrame(animate);
}

function stopRendering() {
  if (frameRequest) cancelAnimationFrame(frameRequest);
  frameRequest = 0;
}

function handleReducedMotion(event) {
  reducedMotion = event.matches;
  paused = false;
  syncPlaybackPolicy();
  startRendering();
}

async function boot() {
  try {
    const data = await loadGameData();
    for (const pilot of PILOTS) {
      const bodyAsset = data.art.get(pilot.body);
      const clipAsset = data.art.get(pilot.clipPack);
      const urls = {
        body: assetUrl(data, pilot.body),
        clips: assetUrl(data, pilot.clipPack),
      };
      for (const [role, url] of Object.entries(urls)) {
        if (!url) throw new Error(`${pilot.id.toUpperCase()} ${role} is not registered`);
      }
      const [bodyGltf, clipGltf] = await Promise.all([
        load(urls.body),
        load(urls.clips),
      ]);

      if (bodyGltf.animations?.length) throw new Error(`${pilot.id.toUpperCase()} body still contains a base clip`);
      const clipMeshes = [];
      clipGltf.scene.traverse(node => { if (node.isMesh) clipMeshes.push(node); });
      if (clipMeshes.length) throw new Error(`${pilot.id.toUpperCase()} clip pack duplicates geometry`);
      const clipNames = clipGltf.animations.map(clip => clip.name).sort();
      if (clipNames.join('|') !== [...ALL_CLIP_NAMES].sort().join('|')) {
        throw new Error(`${pilot.id.toUpperCase()} clip names are ${clipNames.join(', ') || 'empty'}`);
      }
      if (!clipAsset || [...(clipAsset.clip_names ?? [])].sort().join('|') !== clipNames.join('|')) {
        throw new Error(`${pilot.id.toUpperCase()} manifest clip_names do not match the clip pack`);
      }
      const clips = Object.fromEntries(clipGltf.animations.map(clip => [clip.name, clip]));

      const model = bodyGltf.scene;
      const skinned = [];
      const helpers = [];
      model.traverse(node => {
        if (node.isSkinnedMesh) skinned.push(node);
        else if (node.isMesh) helpers.push(node);
      });
      if (skinned.length !== 1 || helpers.length) {
        throw new Error(`${pilot.id.toUpperCase()} body has ${skinned.length} skinned / ${helpers.length} helper meshes`);
      }
      const layers = validateClipLayers(pilot.id, clips, skinned[0].skeleton.bones, bodyAsset?.bone_count);
      styleModel(model);
      normalizeModel(model);
      const holder = new THREE.Group();
      holder.name = `${pilot.id}-runtime-holder`;
      holder.add(model);
      scene.add(holder);

      const mixer = new THREE.AnimationMixer(model);
      players.set(pilot.id, {
        id: pilot.id,
        x: pilot.x,
        holder,
        model,
        bones: skinned[0].skeleton.bones,
        ...layers,
        mixer,
        bodyActions: {
          'alert-idle': mixer.clipAction(clips['alert-idle']),
          'casual-walk': mixer.clipAction(clips['casual-walk']),
        },
        handActions: Object.fromEntries(HAND_CLIP_NAMES.map(name => [name, mixer.clipAction(clips[name])])),
      });
      anchorPlayer(players.get(pilot.id));
    }

    for (const button of motionButtons) {
      button.disabled = false;
      button.addEventListener('click', () => setMotion(button.dataset.pilot, button.dataset.motion));
    }
    for (const button of handButtons) {
      button.disabled = false;
      button.addEventListener('click', () => setHandPose(button.dataset.pilot, button.dataset.handPose));
    }
    pauseButton.addEventListener('click', togglePause);
    status.hidden = true;
    runtimeReadout.textContent = `Three.js GLTFLoader accepted 2 clean finger rigs + 2 layered clip packs · ${renderer.capabilities.isWebGL2 ? 'WebGL 2' : 'WebGL 1'}`;
    document.body.dataset.ready = 'true';
    for (const pilot of PILOTS) {
      setMotion(pilot.id, currentMotion[pilot.id], false);
      setHandPose(pilot.id, currentHandPose[pilot.id], false);
    }
    syncPlaybackPolicy();
    syncQuery();
  } catch (error) {
    console.error(error);
    status.textContent = `LOAD FAILED · ${error.message}`;
    runtimeReadout.textContent = `Importer failure: ${error.message}`;
    document.body.dataset.ready = 'false';
  }
}

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(stage);
reducedMotionQuery.addEventListener('change', handleReducedMotion);
resize();
startRendering();
boot();

addEventListener('pagehide', event => {
  stopRendering();
  suspended = event.persisted;
  syncPlaybackPolicy();
  if (event.persisted || destroyed) return;
  destroyed = true;
  for (const player of players.values()) player.mixer.stopAllAction();
  resizeObserver.disconnect();
  reducedMotionQuery.removeEventListener('change', handleReducedMotion);
  renderer.dispose();
});

addEventListener('pageshow', event => {
  if (!event.persisted || destroyed) return;
  suspended = false;
  syncPlaybackPolicy();
  startRendering();
});
