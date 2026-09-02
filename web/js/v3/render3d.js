/**
 * THE 3D BATTLE STAGE — real `.glb` cast rendered in the browser.
 *
 * DESIGN_AUTHORITY.md addendum, 2026-08-28: "That ruling only starts AFTER js
 * has feature and asset parity with Godot." Godot's `battle_stage_3d.gd`
 * already renders the real cast3d/stage3d meshes; `web/` rendered battles as
 * flat DOM images. This is the first slice of closing that gap: a working
 * Three.js pipeline loading the SAME registered assets (`art/v3/manifest.json`,
 * resolved through the SAME `assetUrl()` every other screen uses — no second
 * path table to drift from the first).
 *
 * NOT attempted here: idle/attack/behit/dead animation clips (cast3d/clips/*),
 * the ART_BIBLE presenter posterize treatment, or camera framing tuned past a
 * first honest look. This proves the pipeline — load, place, light, render —
 * which is the part that had to exist before any of that is worth doing.
 *
 * `loadStageModel()` (2026-08-28) is the second slice: the real arena, not
 * just the cast. `godot/scenes/battle_stage_3d.gd`'s own version is a real
 * auto-fit system — a fixed 5.4 scale, then it SAMPLES THE MESH to find the
 * actual walkable surface (the open middle of the yard, not "30% up the
 * bounding box" — a diorama's height is mostly tree and lamp-post) and
 * derives the board's own cell size from the measured footprint
 * (`_fit_board()`). None of that is ported here: this build's board is
 * already a fixed size (`grid.js`), units are already positioned by it
 * regardless of what arena sits under them, so this only needs the arena to
 * LOOK right, not to drive placement. The same fixed 5.4 scale is kept for
 * visual parity, and the ground height uses the model's bounding-box
 * minimum Y rather than a sampled walkable surface — simpler, and a
 * legitimate first look at an arena with no trees or lamp-posts to be
 * fooled by, but a real simplification, not a hidden port of the real
 * algorithm.
 *
 * `app.js` calls `mountBattleStage3D()` after every battle-mode render and
 * `disposeBattleStage3D()` is called first thing inside it. It has to be:
 * `root.innerHTML = view()` destroys the `<canvas>` on every single re-render
 * (any action — select a unit, attack, end turn), so a WebGLRenderer that
 * does not dispose its old context on the next mount leaks one per click.
 * Browsers cap live WebGL contexts (commonly 8-16); a battle would go dark
 * a few actions in without this.
 */
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/jsm/loaders/GLTFLoader.js';
import { assetUrl } from './content.js?v=1';
import { LANES, totalRows } from './grid.js?v=1';
import { CELL_M, boardSpan, worldFor, buildStageCamera } from './stage-camera.js?v=1';

/** COMBAT.md / PHASING.md 1.06: the six generic crew roles all have their
 *  own registered body. Matches Godot's `UNIT_BY_ROLE` naming exactly
 *  (`cast3d-<role>-v01`), so there is one id convention, not two. */
const ROLE_MODEL = {
  driver: 'cast3d-driver-v01',
  fixer: 'cast3d-fixer-v01',
  local: 'cast3d-local-v01',
  muscle: 'cast3d-muscle-v01',
  runner: 'cast3d-runner-v01',
  watcher: 'cast3d-watcher-v01',
};
/** Generated/hired crew and unrecognised opposition roles fall back to a
 *  registered generic body rather than rendering nothing. */
const PLAYER_FALLBACK = 'cast3d-hired-v01';
const ENEMY_FALLBACK = 'cast3d-enforcer-v01';

const loader = new GLTFLoader();

/** Every exported cast3d/stage3d material comes in as `metalness: 1`
 *  (Blender's default PBR metallic-roughness preset, left unedited). That
 *  is fine under an environment map/IBL — this scene has none (`scene.
 *  environment` is never set below) — so with only direct lights a
 *  metalness-1 surface has no diffuse term left to catch them and reads as
 *  near-black outside a thin specular highlight; a dark garment texture on
 *  top of that renders as a near-solid silhouette. Confirmed by a
 *  side-by-side render (scratch `inspect-material-fix.cjs`): forcing
 *  metalness to 0 restores the base-color texture, clearing the emissive
 *  map did not. Zeroing it here is the honest fix rather than adding an
 *  environment map this pipeline doesn't otherwise need. */
function neutralizeMetalness(model) {
  model.traverse(node => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const mat of materials) {
      if (mat && 'metalness' in mat) mat.metalness = 0;
    }
  });
}

function enableShadows(model) {
  model.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });
}

/** Godot's own values (`battle_stage_3d.gd`'s `SIDE_CYAN`/`SIDE_RED`/
 *  `SIDE_THIRD`), not this build's UI `--cyan`/`--danger` — those are tuned
 *  for a button at UI scale, these for a rim glow at battle-model scale. */
const RIM_TINT = { player: 0x57c8e8, enemy: 0xc8443c, police: 0xdfe6ef };

/** A short, stable hash of a fighter's own id into 0..1 — Godot's
 *  `float(abs(hash(f.fighter_id)) % 1000) / 1000.0`, so the same person
 *  gets the same shift every time the board rebuilds, ported to JS's lack
 *  of a built-in `hash()`. */
function seedFromId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 1000;
}

/** `pt_rgb2hsv`/`pt_hsv2rgb` are `battle_stage_3d.gd`'s `RECOLOUR` shader's
 *  own GLSL, copied rather than re-derived — a `pt_` prefix keeps them from
 *  colliding with anything three.js's own generated shader already
 *  declares. */
const HSV_GLSL = `
vec3 pt_rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}
vec3 pt_hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
`;

/** Ports `battle_stage_3d.gd`'s `RECOLOUR` shader onto the real loaded
 *  material via `onBeforeCompile`, rather than replacing it with a bespoke
 *  `ShaderMaterial` — that keeps three.js's own PBR lighting integration
 *  against this scene's real lights, instead of hand-rolling one to match.
 *  Three things Godot's version does, all missing before this: **one
 *  rigged mesh becomes a crew** (jacket/trouser hue shift seeded off the
 *  fighter's own id, skin and dark boots protected by the same hue/sat
 *  test); **black cloth is never pure black** (a lift toward the lit end);
 *  and **team membership reads off the 3D body itself** (a side-tinted
 *  Fresnel rim), which is `ART_BIBLE.md` §12.2's team/intent rule ("colour
 *  never alone… enemy intent readable before confirmation") applied to the
 *  model, not just the DOM label floating above it. */
function styleUnitMaterial(model, { seed, rimTint, rimGain }) {
  const jacketShift = seed * 0.16 - 0.08;
  const trouserShift = seed * 0.20 - 0.10;
  const tint = new THREE.Color(rimTint);
  model.traverse(node => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const mat of materials) {
      if (!mat) continue;
      // Matte, never glossy — the house register is hand marker on cut
      // card, not a lit PBR surface (`ART_BIBLE.md` rule 4: "not a switch
      // to polished fantasy rendering").
      mat.roughness = 0.9;
      mat.onBeforeCompile = shader => {
        shader.uniforms.ptJacketShift = { value: jacketShift };
        shader.uniforms.ptTrouserShift = { value: trouserShift };
        shader.uniforms.ptRimTint = { value: tint };
        shader.uniforms.ptRimGain = { value: rimGain };
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${HSV_GLSL}\nuniform float ptJacketShift;\nuniform float ptTrouserShift;\nuniform vec3 ptRimTint;\nuniform float ptRimGain;`)
          .replace('#include <map_fragment>', `#include <map_fragment>
{
  vec3 ptHsv = pt_rgb2hsv(diffuseColor.rgb);
  bool ptSkin = ptHsv.x < 0.09 && ptHsv.y > 0.22 && ptHsv.y < 0.62 && ptHsv.z > 0.35;
  bool ptBoots = ptHsv.x < 0.09 && ptHsv.y >= 0.62;
  if (!ptSkin && !ptBoots) {
    if (ptHsv.y < 0.30 && ptHsv.z > 0.45) ptHsv.x = fract(ptHsv.x + ptJacketShift);
    else if (ptHsv.x > 0.45 && ptHsv.x < 0.62) ptHsv.x = fract(ptHsv.x + ptTrouserShift);
  }
  vec3 ptCol = pt_hsv2rgb(ptHsv);
  ptCol = mix(ptCol, ptCol + vec3(0.10), 1.0 - ptHsv.z);
  diffuseColor.rgb = ptCol;
}`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  float ptFresnel = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.6);
  totalEmissiveRadiance += ptRimTint * ptFresnel * ptRimGain;
}`);
      };
      mat.needsUpdate = true;
    }
  });
}

/** Deliberately NOT cached/cloned. Three.js's default `Object3D.clone()`
 *  does not correctly share a SkinnedMesh's bone bindings across clones —
 *  reusing one loaded template for two units of the same role would bind
 *  both to the SAME skeleton and move them together. A fresh network load
 *  per unit is the correct, simple answer at this battle's scale (at most
 *  six bodies); revisit with `SkeletonUtils.clone()` if load time matters
 *  once there is animation to also share. */
function loadUnitModel(data, assetId) {
  const url = assetUrl(data, assetId);
  return new Promise((resolve, reject) => {
    if (!url) { reject(new Error(`render3d: no registered asset for '${assetId}'`)); return; }
    loader.load(url, gltf => { neutralizeMetalness(gltf.scene); resolve(gltf.scene); }, undefined, reject);
  });
}

// ── animation ───────────────────────────────────────────────────────────────
//
// THE FOUR FIGHT CLIPS, LIFTED ONTO WHOEVER IS WEARING THE BODY. Exactly what
// `battle_stage_3d.gd`'s `CLIPS` table does: the clips ship as four separate
// one-animation GLBs (that is how Meshy delivers them), all four cut from the
// MUSCLE's rig, and every fighter borrows them. That is a deliberate design
// choice, not a shortcut — Meshy rigs come out near-identical, so buying four
// clips per role would be paying repeatedly for the same motion.
//
// It is now checked rather than assumed: `port/rig-vectors.mjs` asserts every
// rigged cast body carries the SAME 24 joints as the clip source (measured
// 2026-09-02: 13 of 14 do, exactly). The fourteenth, `parka-man`, has no
// skeleton at all and cannot animate — it is in the live `hired` variant pool,
// so roughly one hired crew member in four gets a still body. Named in
// QUEUE.md; `applyClips()` below degrades to a static figure for it rather
// than throwing, which is what it already did before animation existed.
// The ids are the manifest's own flattened FRAME ids
// (`<group-id>:<pose>`, built by content.js's flattenArt) — the clips ship as
// one `animation-set-3d` group with four frames, not four separate assets.
// Resolved through the same assetUrl() every other screen uses, so there is
// still no second path table to drift. Note `behit` is the manifest's pose
// name; `hit` is Godot's key for the same clip, kept here so poseFor()'s
// vocabulary matches battle_stage_3d.gd's _pose_for() exactly.
const CLIP_SOURCES = {
  idle: 'cast3d-muscle-clips-v01:idle',
  attack: 'cast3d-muscle-clips-v01:attack',
  hit: 'cast3d-muscle-clips-v01:behit',
  dead: 'cast3d-muscle-clips-v01:dead',
};

/** Loaded once and shared across every unit in the battle. Godot's own version
 *  notes why: four clips fetched per unit per refresh would reload the same
 *  files six times a round. AnimationClips are immutable data — unlike the
 *  SkinnedMesh above, they are safe to share. */
let clipCache = null;

function loadFightClips(data) {
  if (clipCache) return clipCache;
  clipCache = Promise.all(Object.entries(CLIP_SOURCES).map(([key, assetId]) => {
    const url = assetUrl(data, assetId);
    if (!url) return Promise.resolve([key, null]);
    return new Promise(resolve => {
      loader.load(url,
        gltf => resolve([key, gltf.animations?.[0] ?? null]),
        undefined,
        () => resolve([key, null]));   // a missing clip is a static pose, not a crash
    });
  })).then(pairs => Object.fromEntries(pairs));
  return clipCache;
}

/** Which clip a fighter should be playing — mirrors `battle_stage_3d.gd`'s
 *  `_pose_for()` against this build's own unit shape. Godot reads
 *  Fighter.Status; web/ has no status enum, so the equivalents are: not
 *  alive -> dead, nerve exhausted -> hit (battle.js prints "is shaken" on
 *  exactly that condition), currently selected and yet to act -> attack. */
function poseFor(unit, battle) {
  if (!unit.alive) return 'dead';
  if (unit.nerve === 0) return 'hit';
  const acting = unit.id === battle.selectedId && !battle.acted?.includes(unit.id);
  return acting ? 'attack' : 'idle';
}

/** Binds the shared clips to this figure's own skeleton and starts one.
 *  Returns the mixer so the render loop can advance it, or null for a body
 *  with no skeleton to bind to. */
function applyClips(model, clips, pose) {
  const clip = clips[pose] ?? clips.idle;
  if (!clip) return null;
  const mixer = new THREE.AnimationMixer(model);
  const action = mixer.clipAction(clip);
  // A downed fighter holds its last frame instead of looping back upright.
  if (pose === 'dead') { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
  action.play();
  return mixer;
}

/** Fixed scale factor, matching `battle_stage_3d.gd`'s `_build_stage()`
 *  exactly ("Scale is inherited, not measured" — QUEUE.md), so an arena
 *  reads at the same size in both builds even though nothing here refits
 *  the board to it the way Godot's `_fit_board()` does. */
const STAGE_SCALE = 5.4;

/** A battle's `sceneAssetId` is only an arena when the SAME id is
 *  registered as a `mesh-3d` asset (`battle-kattilahalli-3v3` and
 *  `battle-hermanni-training` both already author it that way — the real
 *  manifest id directly, not a 2D scene-art id). Battles with real 2D
 *  scene art (karhupuisto, courtyard) have no such entry and keep
 *  rendering flat, exactly as before this function existed. */
function stageAssetId(data, battle) {
  return data.art.get(battle.sceneAssetId)?.kind === 'mesh-3d' ? battle.sceneAssetId : null;
}

/** Loads the arena, scales it, and settles it onto the board's own origin:
 *  centred in X/Z on its own bounding box (a diorama's origin is wherever
 *  the generator put it, not the middle of the model — same reasoning as
 *  `_build_stage()`'s own centring comment), and dropped so its lowest
 *  point sits at y=0. Resolves to `null` when the battle has no arena, so
 *  callers do not need a separate has-an-arena branch. Also returns the
 *  model's own half-extents post-scale, so the caller can size a ground-
 *  fill slab under it (see `_build_ground_fill()`'s reasoning below). */
function loadStageModel(data, battle) {
  const assetId = stageAssetId(data, battle);
  if (!assetId) return Promise.resolve(null);
  return loadUnitModel(data, assetId).then(model => {
    model.scale.setScalar(STAGE_SCALE);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -box.min.y, -center.z);
    const size = box.getSize(new THREE.Vector3());
    return { model, halfX: size.x / 2, halfZ: size.z / 2 };
  });
}

/** `_build_ground_fill()`'s constant, ported verbatim: the floor has to be
 *  bigger than the arena, not equal to it (`STAGE_SPEC.md` §1.1), or the
 *  board runs to the exact edge of the world. */
const GROUND_MARGIN = 1.22;

/** CONCRETE UNDER THE HOLES — `_build_ground_fill()`'s own heading. A
 *  generated diorama models what it was asked for and nothing else, so an
 *  arena with open sides (kattilahalli is Godot's own named example: "a
 *  hall with open sides and simply has no floor beyond its own footprint")
 *  has real gaps a camera angle happens not to catch today but a different
 *  one would. A plain dark slab under the whole arena, margin-padded, is
 *  cheap insurance against exactly that — reads as ordinary Helsinki
 *  industrial hardstanding and only ever shows where the diorama left a
 *  gap. */
function groundFillMesh(halfX, halfZ) {
  const span = Math.max(halfX, halfZ) * 2 * GROUND_MARGIN;
  const slab = new THREE.Mesh(
    new THREE.PlaneGeometry(span, span),
    new THREE.MeshStandardMaterial({ color: 0x3a3d3f, roughness: 0.92, metalness: 0 }),
  );
  slab.rotation.x = -Math.PI / 2;
  slab.position.y = -0.02; // below y=0 so it never z-fights the arena's own floor
  slab.receiveShadow = true;
  // Cast nothing: it is a gap filler sitting fractionally below the real
  // arena floor, and a slab shadowing the arena from underneath would
  // darken the very holes it exists to hide — `_build_ground_fill()`'s own
  // reasoning, ported along with the rest of it.
  slab.castShadow = false;
  return slab;
}

let current = null; // { renderer, canvas, raf, generation }
let generation = 0;

export function disposeBattleStage3D() {
  if (!current) return;
  cancelAnimationFrame(current.raf);
  current.renderer.dispose();
  current.renderer.forceContextLoss?.();
  current.canvas.remove();
  current = null;
}

/** Mounts a fresh Three.js scene into `container` for this battle's current
 *  live formation. Safe to call on every render — it tears down whatever it
 *  mounted last time first. */
export function mountBattleStage3D(container, battle, data) {
  disposeBattleStage3D();
  if (!container || !battle) return;
  generation += 1;
  const myGeneration = generation;

  const width = Math.max(1, container.clientWidth || container.offsetWidth || 600);
  const height = Math.max(1, container.clientHeight || container.offsetHeight || 360);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // `battle_stage_3d.gd`'s own comment: "the shadow is what does the
  // work: a stylised figure and a photoreal yard stop arguing the moment
  // the figure casts a real shadow onto the ground, which no amount of
  // palette matching achieves."
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Matches `_build_night()`'s `TONE_MAPPER_FILMIC` — Godot's closest named
  // equivalent to three.js's ACES fit, both there to keep the warm lamp's
  // highlight from blowing out against the cold night the rest of the
  // scene sits in.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.className = 'stage3d-canvas';
  container.appendChild(renderer.domElement);
  current = { renderer, canvas: renderer.domElement, raf: 0 };

  const scene = new THREE.Scene();
  // `_build_night()`'s own values: background/ambient are a single named
  // palette there (`Environment`), not scattered magic hex — carried over
  // literally rather than re-picked, so the two builds read as the same
  // night rather than merely similar ones.
  scene.background = new THREE.Color(0x0b0e13);
  scene.fog = new THREE.FogExp2(0x12161d, 0.05);
  // Orthographic, matching `battle_stage_3d.gd`'s `_build_camera()`: a
  // perspective camera makes the board's far edge read smaller than its
  // near edge, which is exactly what `STAGE_SPEC.md` §2.4 rules out ("true
  // 2:1 isometric... there is no vanishing point"). Built by
  // `stage-camera.js` rather than inline, so the exact same camera can be
  // reconstructed by `positionBattleDOM()` in `app.js` to keep the DOM
  // grid/labels agreeing with what this canvas actually draws.
  const aspect = width / height;
  const camera = buildStageCamera(aspect);

  scene.add(new THREE.AmbientLight(0x3c5570, 0.55));
  // "Cold ambient, one warm practical, and shadows" — `_build_night()`'s
  // own summary of the pattern. The key stands in for that one practical
  // light (Godot uses a warm OmniLight lamp, `#ffcf8f`); the directional
  // form is kept rather than porting an omni/point light, since nothing
  // here currently varies per-arena lamp placement.
  const key = new THREE.DirectionalLight(0xffcf8f, 1.3);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0015;
  // Ortho shadow frustum sized off the board, same reasoning as the
  // camera above it — big enough to cover the largest arena's footprint,
  // not just the small board itself.
  const shadowSpan = boardSpan() * 2.5;
  key.shadow.camera.left = -shadowSpan;
  key.shadow.camera.right = shadowSpan;
  key.shadow.camera.top = shadowSpan;
  key.shadow.camera.bottom = -shadowSpan;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 40;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb4ff, 0.4);
  rim.position.set(-3, 4, -3);
  scene.add(rim);

  // A flat ground plane is the fallback for a battle with no registered
  // arena mesh (karhupuisto, courtyard) — kept in the scene unconditionally
  // and only removed once a real arena actually finishes loading, so a
  // slow or failed arena fetch never leaves units floating over nothing.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(LANES * CELL_M + 1.5, totalRows() * CELL_M + 1.5),
    new THREE.MeshStandardMaterial({ color: 0x1b222c, roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Additive, not a replacement: renderBattle() in app.js still draws every
  // unit's flat legs/torso/head sprite underneath this canvas, so a battle
  // is still a complete, playable screen the instant a model fails to load
  // or a browser has no WebGL. `stage3d-ready` only goes on `.battle-stage`
  // once EVERY unit's real mesh is actually up — CSS then hides the 2D
  // sprite ART specifically (not the label/track/button around it, which
  // stays the real hit target and readout either way). A partial failure
  // — one unit's mesh 404s — leaves 2D art showing for EVERYONE this
  // battle rather than mixing a rendered body with a blank one. The same
  // logic extends to the arena: `stage3d-arena` only goes on once the real
  // arena mesh is up, and only THEN does CSS hide the flat 2D scene image —
  // a battle with no registered arena (karhupuisto, courtyard) never gets
  // that class and keeps its real 2D backdrop forever, unchanged.
  const stage = container.closest('.battle-stage');
  stage?.classList.remove('stage3d-ready', 'stage3d-arena');

  const units = [...battle.players, ...battle.enemies, ...(battle.police ?? [])].filter(unit => unit.alive);
  const mixers = [];
  const clipsReady = loadFightClips(data);
  const unitLoads = units.map(unit => {
    const fallback = unit.side === 'player' ? PLAYER_FALLBACK : ENEMY_FALLBACK;
    const assetId = ROLE_MODEL[unit.role] ?? fallback;
    return Promise.all([loadUnitModel(data, assetId), clipsReady])
      .then(([model, clips]) => {
        // The mount that requested this load may already have been torn
        // down by a later render before the network resolved.
        if (myGeneration !== generation) return;
        const mixer = applyClips(model, clips, poseFor(unit, battle));
        if (mixer) mixers.push(mixer);
        const { x, z } = worldFor(unit.cell);
        model.position.set(x, 0, z);
        model.rotation.y = unit.side === 'player' ? Math.PI * 0.5 : -Math.PI * 0.5;
        styleUnitMaterial(model, {
          seed: seedFromId(unit.id),
          rimTint: RIM_TINT[unit.side] ?? RIM_TINT.police,
          // The currently selected unit reads brighter at its edge than the
          // rest of the field — the nearest thing this build has to
          // Godot's `is_active()` dim (that distinguishes downed-but-shown
          // fighters, which this build simply never renders at all).
          rimGain: unit.id === battle.selectedId ? 0.85 : 0.5,
        });
        enableShadows(model);
        scene.add(model);
      })
      .catch(err => { console.error(`render3d: '${unit.id}' (${assetId})`, err); throw err; });
  });
  const stageLoad = loadStageModel(data, battle)
    .then(loaded => {
      if (!loaded || myGeneration !== generation) return;
      scene.remove(ground);
      scene.add(groundFillMesh(loaded.halfX, loaded.halfZ));
      enableShadows(loaded.model);
      scene.add(loaded.model);
      if (myGeneration === generation) stage?.classList.add('stage3d-arena');
    })
    .catch(err => { console.error(`render3d: arena '${battle.sceneAssetId}'`, err); });
  Promise.all([...unitLoads, stageLoad])
    .then(() => { if (myGeneration === generation) stage?.classList.add('stage3d-ready'); })
    .catch(() => {}); // logged per-unit above; 2D sprites stay the fallback

  // Real elapsed time, not a fixed step: AnimationMixer.update() takes a
  // DELTA, and feeding it a constant would run every clip at whatever rate
  // this particular device happens to hit rather than at its authored speed.
  const clock = new THREE.Clock();
  function tick() {
    const dt = clock.getDelta();
    for (const mixer of mixers) mixer.update(dt);
    renderer.render(scene, camera);
    if (myGeneration === generation) current.raf = requestAnimationFrame(tick);
  }
  tick();
}
