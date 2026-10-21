// Toko at the counter, in clay — the Radio Free clay kit, unchanged, behind
// Tokon Ramen's counter.
//
// Owner, 2026-10-19: "Can you make the noodle chef (see concepts) character look,
// move, and sound exactly like the Toko ones in the claymation RFH videos?" and
// "These can technically be videos too right? Can't this be in game narration
// sequences as loops that only change as reactions."
//
// The kit is NOT copied: /kit/lib/ is radiofree/studio/art-motion/clay/dishes/lib
// and /kit/vendor/ is radiofree/studio/vendor, served from a Suds-Jack checkout of
// claude/radio-free-helsinki-pvtsw5 (render.cjs records the commit). Toko is
// built by the kit's own Toko class with the Dishes film's own materials ("TM —
// exactly the Deer film's"): the hair and bun, the clay disc mask traced from the
// master face, its strap, the hoodie, the magenta gloves.
//
// The set is the registered painted plate (scene-toko-noodles-empty-v01): one copy
// of it behind Toko and one in front, cut at the counter's top edge, so the counter
// hides him from the waist down exactly where the painting's counter is. The grade
// is near-neutral so the painting stays the painting; Toko gets the films' clay,
// light and occlusion. Puppets on twos: 12 poses a second, as in the films.
import * as THREE from 'three';
import { Post } from '/kit/lib/post.js';
import { surface, setBoil } from '/kit/lib/clay.js';
import { Toko } from '/kit/lib/toko.js';

const Q = new URLSearchParams(location.search), RES = Number(Q.get('res') || 1);
const W = Math.round(1280 * RES), H = Math.round(720 * RES), POSE_FPS = 12;
const PLATE = { w: 1536, h: 864, counterTop: 0.482 };   // the counter's top edge, as a fraction of the plate's height

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, 3, 1600);
const post = new Post(renderer, W, H);

// ── Toko: the Dishes film's materials, verbatim ─────────────────────────────
const clay = (color, o = {}) => surface({ color, wrap: 0.45, wrapTint: '#ffc6a0', rough: 0.6, bump: 1, lump: 0.05, lumpF: 0.5, thumb: 0.035, thumbCell: 2.0, ridge: 0.12, tool: 0.8, grain: 0.004, grainF: 8, mottle: 0.10, specks: 0.6, roughVar: 0.12, ...o });
const TM = {
  hoodie: clay('#44546e', { thumbCell: 1.7, thumb: 0.05, tool: 1.4 }),
  hoodie2: clay('#3d4b63', { thumbCell: 1.5, thumb: 0.05, tool: 1.2 }),
  cuff: surface({ surf: 'knit', color: '#4f5867', rough: 0.85, fibre: 0.05, fibreF: 8, knitW: 0.42, knitH: 0.3, knitAxis: [0, 0, 1], lump: 0.02, wrap: 0.4, wrapTint: '#ffc6a0' }),
  jeans: clay('#2f3d58', { thumb: 0.04, tool: 1.1 }),
  shoes: clay('#2c2a2e', { rough: 0.45 }), sole: clay('#e8e1d2', { thumb: 0.02 }),
  glove: clay('#cc1574', { thumbCell: 1.2, thumb: 0.04, tool: 1.0, specks: 0.3, speckColor: '#5a0730' }),
  hair: clay('#8a8278', { tool: 1.8, thumbCell: 0.9, thumb: 0.05 }),
  maskDisc: clay('#e2068e', { rough: 0.62, thumb: 0.03, thumbCell: 1.5, mottle: 0.06, specks: 0.3, speckColor: '#5a0730' }),
  maskInk: clay('#fbf4e6', { rough: 0.55, thumb: 0.015, thumbCell: 0.9, mottle: 0.04, specks: 0.25 }),
  strap: clay('#2a2523', { thumb: 0.01, rough: 0.5 }),
  string: clay('#e9e2d2', { thumb: 0.01 }), aglet: clay('#cfc6b4', { rough: 0.35, thumb: 0.005 }),
};
const toko = new Toko(TM); scene.add(toko.group);
toko.group.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });

// ── the set: the plate behind, and the plate's counter in front ─────────────
const CAM = { pos: [0, 34, 150], look: [0, 31, 0] };
camera.position.set(...CAM.pos); camera.lookAt(...CAM.look); camera.updateProjectionMatrix();
const camDir = new THREE.Vector3(...CAM.look).sub(new THREE.Vector3(...CAM.pos)).normalize();
function screenQuad(dist, texture, z) {   // a quad that exactly fills the frame at distance dist along the view
  const h = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), w = h * camera.aspect;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, transparent: true, depthWrite: true }));
  m.position.copy(new THREE.Vector3(...CAM.pos).addScaledVector(camDir, dist)); m.quaternion.copy(camera.quaternion); m.renderOrder = z;
  scene.add(m); return m;
}
const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
const plateImg = await loadImg('/repo/art/v3/scenes/toko-slomo-noodles-empty-v01.webp');
const sx = W / PLATE.w;                                                    // the plate fills the frame (both are 16:9)
const backTex = new THREE.CanvasTexture(plateImg); backTex.colorSpace = THREE.SRGBColorSpace;
const front = document.createElement('canvas'); front.width = PLATE.w; front.height = PLATE.h;
{ const g = front.getContext('2d'), cut = PLATE.h * PLATE.counterTop;
  g.drawImage(plateImg, 0, 0);
  g.globalCompositeOperation = 'destination-in';                       // keep only the counter and below, with a 3 px soft edge
  const gr = g.createLinearGradient(0, cut - 3, 0, cut + 3); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = gr; g.fillRect(0, 0, PLATE.w, PLATE.h); }
const frontTex = new THREE.CanvasTexture(front); frontTex.colorSpace = THREE.SRGBColorSpace;
const DIST_BACK = 260, DIST_FRONT = 76;                                  // Toko stands ~85 from the lens: his head the painting's head size
screenQuad(DIST_BACK, backTex, 0);
screenQuad(DIST_FRONT, frontTex, 2);

// ── light: the painting's own — the lantern warm from the left, the rainy window cool from the right
scene.add(new THREE.HemisphereLight('#ffe4c4', '#2a2420', 0.32));
const key = new THREE.SpotLight('#ffcf96', 26000, 0, 0.5, 0.85, 2);
key.position.set(-60, 75, 140); key.target.position.set(0, 38, 65); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; scene.add(key, key.target);
const fill = new THREE.PointLight('#9fb6d8', 1400, 160, 2); fill.position.set(60, 50, 110); scene.add(fill);
const rim = new THREE.PointLight('#ffd9a8', 1500, 120, 2); rim.position.set(-12, 62, 35); scene.add(rim);

// ── acting ───────────────────────────────────────────────────────────────────
const T = { hip: [0, 24.7, 65], yaw: 0 };
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const at = (v) => add3(T.hip, v);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const mix = (A, B, k) => A.map((v, i) => v + (B[i] - v) * k);
const TAU = Math.PI * 2;
// at rest: standing behind the counter, both gloves resting on its top edge
const rest = () => ({ hip: T.hip, yaw: 0, lean: 0.12, side: 0, knee: [0, -10.4, 0.9], foot: [0, -20.75, 0.6], hp: 0.08, hr: 0, hy: 0,
  elR: at([-7.4, 6.2, 4.0]), hdR: at([-5.4, 8.7, 9.6]), elL: at([7.4, 6.2, 4.0]), hdL: at([5.4, 8.7, 9.6]), palm: [[0, 1, 0.2], [0, 1, 0.2]] });
// CLIPS: every reaction starts and ends on idle's first pose, and the game restarts the
// idle loop from 0 after one, so a cut between any two is invisible.
const bump = (t, a, b, c, d) => smooth(a, b, t) * (1 - smooth(c, d, t));
const CLIPS = {
  // idle, 4 s: breathing, a slow weight shift, the head settling — loops seamlessly
  idle: { dur: 4, pose(t) { const P = rest(), b = Math.sin(t / 4 * TAU); P.breathe = 0.5 + 0.5 * b; P.lean = 0.12 + 0.015 * b; P.side = 0.02 * Math.sin(t / 4 * TAU + 1); P.hr = 0.04 * Math.sin(t / 4 * TAU + 2); P.hp = 0.08 + 0.03 * Math.sin(t / 4 * TAU + 0.5); return P; } },
  // a greeting as you come in: the right glove up beside the mask, two waves, back down
  wave: { dur: 2.0, pose(t) {
    const P = CLIPS.idle.pose(0), up = bump(t, 0.08, 0.42, 1.45, 1.85), w = Math.sin((t - 0.4) * TAU * 2.2) * smooth(0.35, 0.5, t) * (1 - smooth(1.3, 1.45, t));
    P.hdR = mix(P.hdR, at([-6.8 + w * 1.8, 19.5, 8.5]), up); P.elR = mix(P.elR, at([-9.2, 12.5, 5.5]), up);
    P.palm = [mix([0, 1, 0.2], [0.15 * w, 0.2, 1], up), P.palm[1]];
    P.hr += 0.10 * up * Math.sin(t * 3); P.hp -= 0.05 * up; P.side += 0.03 * up; return P; } },
  // a small bow over the counter when you buy a bowl
  nod: { dur: 1.5, pose(t) { const P = CLIPS.idle.pose(0), k = bump(t, 0.12, 0.45, 0.75, 1.25); P.hp += 0.42 * k; P.lean += 0.10 * k; return P; } },
  // the head tilt — the films' 'bwoop?' — when he tells you what he heard
  tilt: { dur: 1.6, pose(t) { const P = CLIPS.idle.pose(0), k = bump(t, 0.1, 0.42, 1.05, 1.5); P.hr += 0.34 * k; P.hy += 0.14 * k; P.side += 0.05 * k; P.hp -= 0.04 * k; return P; } },
};
let lastKey = -1, clip = 'idle';
function pose(t) {
  const e = Math.floor(t * POSE_FPS + 1e-6);
  if (e === lastKey) return; lastKey = e;
  setBoil(e % 997);
  toko.pose(CLIPS[clip].pose(e / POSE_FPS));
}
function draw(t) {
  pose(t);
  const focus = camera.position.distanceTo(new THREE.Vector3(...T.hip));
  post.render(scene, camera, { focus, aperture: 0, maxBlur: 0, threshold: 1.6, knee: 0.5, bloomA: 0.14, bloomB: 0.06, exposure: 1.0, vignette: 0.0, grain: 0, seed: (t * 37) % 97, sat: 1.0, contrast: 1.0, lift: [0, 0, 0], gain: [1, 1, 1], toe: 0.0 });
}
function probe() {
  draw(0); const P = (v) => { const p = v.clone().project(camera); return [Math.round((p.x + 1) / 2 * W), Math.round((1 - p.y) / 2 * H)]; };
  return { mask: P(toko.mask.getWorldPosition(new THREE.Vector3())), handR: P(toko.hands[0].getWorldPosition(new THREE.Vector3())), hip: P(new THREE.Vector3(...T.hip)), counterTopY: Math.round(H * PLATE.counterTop) };
}
window.__counter = {
  W, H, CLIPS: Object.fromEntries(Object.entries(CLIPS).map(([k, v]) => [k, v.dur])), probe,
  tune(o) { if (o.hip) T.hip = o.hip; lastKey = -1; },
  frame(name, i, fps = 24, type = 'image/png') { if (clip !== name) { clip = name; lastKey = -1; } draw(i / fps); return renderer.domElement.toDataURL(type, 0.92); },
};
window.__ready = true;
