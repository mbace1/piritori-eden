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
import { LANES, totalRows, laneCentre, parseSlotKey } from './grid.js?v=1';

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
    loader.load(url, gltf => resolve(gltf.scene), undefined, reject);
  });
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
 *  callers do not need a separate has-an-arena branch. */
function loadStageModel(data, battle) {
  const assetId = stageAssetId(data, battle);
  if (!assetId) return Promise.resolve(null);
  return loadUnitModel(data, assetId).then(model => {
    model.scale.setScalar(STAGE_SCALE);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -box.min.y, -center.z);
    return model;
  });
}

/** Cell -> world position, off the SAME `grid.js` slot a unit's `battle.cell`
 *  already carries (lane 0..LANES-1, depth 0..totalRows()-1 — the real
 *  unified board ported from `godot/scripts/fight/board.gd`, not a
 *  screen-space layout of its own). `cellPosition()` in app.js is the 2D
 *  DOM equivalent and reads the same slot the same way; a battle's depth
 *  axis maps to world Z (front nearest the midline, Z 0, for both sides)
 *  and lane maps to world X, centred on the board's own `laneCentre()` so
 *  neither side sits off-centre on the ground plane. */
function worldFor(cell) {
  const { lane, depth } = parseSlotKey(cell);
  const depthReach = (totalRows() - 1) / 2;
  const x = (lane - laneCentre()) * 0.85;
  const z = (depth - depthReach) * 0.85;
  return { x, z };
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
  renderer.domElement.className = 'stage3d-canvas';
  container.appendChild(renderer.domElement);
  current = { renderer, canvas: renderer.domElement, raf: 0 };

  const scene = new THREE.Scene();
  // Framing for the real board (6 lanes x 8 depths, see `worldFor`) rather
  // than the old 3-lane mirrored one: deeper than it is wide now, so the
  // camera sits further back and higher to keep both back rows in frame.
  const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
  camera.position.set(0, 4.4, 8.8);
  camera.lookAt(0, 0.9, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(3, 6, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb4ff, 0.4);
  rim.position.set(-3, 4, -3);
  scene.add(rim);

  // A flat ground plane is the fallback for a battle with no registered
  // arena mesh (karhupuisto, courtyard) — kept in the scene unconditionally
  // and only removed once a real arena actually finishes loading, so a
  // slow or failed arena fetch never leaves units floating over nothing.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(LANES * 0.85 + 1.5, totalRows() * 0.85 + 1.5),
    new THREE.MeshStandardMaterial({ color: 0x1b222c, roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
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
  const unitLoads = units.map(unit => {
    const fallback = unit.side === 'player' ? PLAYER_FALLBACK : ENEMY_FALLBACK;
    const assetId = ROLE_MODEL[unit.role] ?? fallback;
    return loadUnitModel(data, assetId)
      .then(model => {
        // The mount that requested this load may already have been torn
        // down by a later render before the network resolved.
        if (myGeneration !== generation) return;
        const { x, z } = worldFor(unit.cell);
        model.position.set(x, 0, z);
        model.rotation.y = unit.side === 'player' ? Math.PI * 0.5 : -Math.PI * 0.5;
        scene.add(model);
      })
      .catch(err => { console.error(`render3d: '${unit.id}' (${assetId})`, err); throw err; });
  });
  const stageLoad = loadStageModel(data, battle)
    .then(model => {
      if (!model || myGeneration !== generation) return;
      scene.remove(ground);
      scene.add(model);
      if (myGeneration === generation) stage?.classList.add('stage3d-arena');
    })
    .catch(err => { console.error(`render3d: arena '${battle.sceneAssetId}'`, err); });
  Promise.all([...unitLoads, stageLoad])
    .then(() => { if (myGeneration === generation) stage?.classList.add('stage3d-ready'); })
    .catch(() => {}); // logged per-unit above; 2D sprites stay the fallback

  function tick() {
    renderer.render(scene, camera);
    if (myGeneration === generation) current.raf = requestAnimationFrame(tick);
  }
  tick();
}
