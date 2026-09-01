/**
 * THE SHARED STAGE PROJECTION — one source of truth for "where does a
 * board cell sit on screen," used by both `render3d.js` (the real
 * WebGL camera) and `app.js` (the DOM formation cells, unit tokens and
 * row labels layered on top of it).
 *
 * Before this existed, those were two independently-tuned coordinate
 * systems that happened to look roughly similar: the 3D camera's real
 * orthographic projection, and a hand-built CSS `skewY(-20deg)` grid in
 * `app.js`'s `cellPosition()`. v4.26/v4.27 made the 3D cast/arena
 * actually legible (fixed materials, added real shadows and a proper
 * isometric camera) — which made the ALREADY-existing gap between the
 * two systems far more visible than it used to be, when the 3D bodies
 * were dim enough that a floating label was easy to miss. `app.js`
 * still keeps its own static `cellPosition()` for the no-WebGL/no-3D
 * fallback (this module changes nothing about that contract — see
 * `render3d.js`'s own header on why 3D is additive, never load-bearing);
 * once 3D actually mounts, `positionBattleDOM()` below OVERWRITES those
 * DOM positions with the real projected ones, so a player never sees the
 * two disagree.
 */
import * as THREE from 'three';
import { LANES, totalRows, laneCentre, parseSlotKey, slotKey } from './grid.js?v=1';

/** `worldFor()`'s per-cell spacing, matching `battle_stage_3d.gd`'s own
 *  `CELL` (via `_fit_board()`) closely enough for visual parity — see
 *  `render3d.js`'s header on why this build's board is fixed-size rather
 *  than arena-fitted the way Godot's is. */
export const CELL_M = 0.85;

export function boardSpan() { return Math.max(LANES, totalRows()) * CELL_M; }
export function frustumSize() { return boardSpan() * 1.1; }

/** Lane/depth -> world (x, z), fractional values allowed on purpose —
 *  `positionBattleDOM()`'s cell corners sit at `lane ± 0.5` and need the
 *  same formula a whole-number cell centre uses. */
export function worldForLaneDepth(lane, depth) {
  const depthReach = (totalRows() - 1) / 2;
  return { x: (lane - laneCentre()) * CELL_M, z: (depth - depthReach) * CELL_M };
}

/** Cell -> world position. The one place lane/depth become an (x, z) —
 *  `render3d.js` and `app.js` both call this rather than keeping their
 *  own copies, which is the whole point of this module existing. */
export function worldFor(cell) {
  const { lane, depth } = parseSlotKey(cell);
  return worldForLaneDepth(lane, depth);
}

/** Builds the same orthographic camera `render3d.js` renders through.
 *  Position/lookAt are constants (the board's own span never varies), so
 *  the only real input is `aspect` — which does change the horizontal
 *  extent of the frustum, and therefore the screen-space X of every
 *  point (see `projectFraction`'s own note on why Y does not have this
 *  problem). */
export function buildStageCamera(aspect) {
  const size = frustumSize();
  const camera = new THREE.OrthographicCamera(
    (-size * aspect) / 2, (size * aspect) / 2,
    size / 2, -size / 2,
    0.1, 100,
  );
  const camBack = boardSpan() * 1.6;
  camera.position.set(-camBack, camBack * 0.62, -camBack);
  camera.lookAt(0, 0.9, 0);
  camera.updateMatrixWorld(true);
  return camera;
}

/** World (x, y, z) -> `{ xPct, yPct }`, 0..100 fractions of the stage
 *  container, matching whatever a real WebGL render through the SAME
 *  camera would put there. Note the frustum's *height* (`frustumSize()`)
 *  never depends on `aspect` — only its width does (`buildStageCamera`'s
 *  left/right) — so `yPct` is stable across container sizes and only
 *  `xPct` genuinely needs the caller's live aspect to be exactly right;
 *  a caller with no live measurement yet (see `app.js`'s static
 *  `cellPosition()`) still gets a reasonable `xPct` from a typical
 *  aspect, corrected the moment `positionBattleDOM()` can measure the
 *  real container. */
export function projectFraction(x, y, z, aspect) {
  const camera = buildStageCamera(aspect);
  const ndc = new THREE.Vector3(x, y, z).project(camera);
  return { xPct: ((ndc.x + 1) / 2) * 100, yPct: ((1 - ndc.y) / 2) * 100 };
}

/** Overwrites `app.js`'s static `.formation-cell`/`.unit-token` `left`/`top`
 *  with the real projected positions, once the real container size is
 *  known (`mountBattleStage3D()` already measures the same container to
 *  size the canvas/camera, so calling this right after it is the natural
 *  place). `cellPosition()` in `app.js` still runs first and bakes its own
 *  approximation into the initial HTML — this is a correction pass, not a
 *  replacement, so a browser that never gets this far (no WebGL, a slow
 *  network) is left with the same complete, if approximate, 2D grid it
 *  always had.
 *
 *  Ground-level (`y = 0`) is used for both cells and units: a
 *  `.formation-cell` is centred on its cell already
 *  (`transform: translate(-50%, -50%)`), and a `.unit-token`'s own
 *  `translate(-50%, -86%)` anchors it near the FEET, which is also where
 *  `render3d.js` roots a unit's model (`model.position.set(x, 0, z)`) —
 *  projecting at torso height would put the DOM anchor and the model's
 *  own origin at two different heights and reintroduce a smaller version
 *  of the same drift this function exists to remove. */
export function positionBattleDOM(container, battle) {
  const stage = container?.closest('.battle-stage');
  if (!stage || !battle) return;
  const width = container.clientWidth || container.offsetWidth;
  const height = container.clientHeight || container.offsetHeight;
  if (!width || !height) return;
  const aspect = width / height;
  const camera = buildStageCamera(aspect);
  const projectPx = (x, z) => {
    const ndc = new THREE.Vector3(x, 0, z).project(camera);
    return { px: ((ndc.x + 1) / 2) * width, py: ((1 - ndc.y) / 2) * height };
  };
  const project = (x, z) => {
    const { px, py } = projectPx(x, z);
    return { left: `${(px / width) * 100}%`, top: `${(py / height) * 100}%` };
  };

  // A `.formation-cell` is a flat GROUND tile, not a billboard, so its
  // shape has to be the real projected quad — CSS's `skewY(-20deg)` was a
  // fixed-angle guess for one particular (never-measured) camera framing.
  // Re-centring it without also re-deriving its shape is why the tiles
  // read as "standing up": the true isometric parallelogram this camera
  // actually draws is flatter/wider than a constant 20° skew, so a tile
  // moved to its correct centre but kept at the old angle looks tilted
  // toward vertical rather than lying on the ground. Each cell's four
  // world corners (lane ± 0.5, depth ± 0.5) are projected individually
  // and drawn via `clip-path`, which is exact at any camera angle or
  // container aspect rather than another hand-tuned constant.
  for (let lane = 0; lane < LANES; lane += 1) {
    for (let depth = 0; depth < totalRows(); depth += 1) {
      const cell = slotKey(lane, depth);
      const el = stage.querySelector(`.formation-cell[data-cell="${cell}"]`);
      if (!el) continue;
      const corners = [
        [lane - 0.5, depth - 0.5], [lane + 0.5, depth - 0.5],
        [lane + 0.5, depth + 0.5], [lane - 0.5, depth + 0.5],
      ].map(([l, d]) => {
        const { x, z } = worldForLaneDepth(l, d);
        return projectPx(x, z);
      });
      const quadMinX = Math.min(...corners.map(c => c.px));
      const quadMaxX = Math.max(...corners.map(c => c.px));
      const quadMinY = Math.min(...corners.map(c => c.py));
      const quadMaxY = Math.max(...corners.map(c => c.py));
      // The 44px control floor (`CLAUDE.md`'s house rule, checked in
      // `v3-contract.mjs`) is about the TAPPABLE box, not the drawn
      // shape — an orthographic cell's true projected footprint can dip
      // under that on a small viewport. Pad the box (not the polygon)
      // symmetrically up to 44px per side when it does, same pattern as
      // any small icon getting a bigger invisible tap area.
      const padX = Math.max(0, (44 - (quadMaxX - quadMinX)) / 2);
      const padY = Math.max(0, (44 - (quadMaxY - quadMinY)) / 2);
      const boxMinX = quadMinX - padX;
      const boxMinY = quadMinY - padY;
      el.style.left = `${boxMinX}px`;
      el.style.top = `${boxMinY}px`;
      el.style.width = `${quadMaxX - quadMinX + padX * 2}px`;
      el.style.height = `${quadMaxY - quadMinY + padY * 2}px`;
      el.style.minHeight = '0';
      el.style.aspectRatio = 'auto';
      el.style.transform = 'none';
      el.style.clipPath = `polygon(${corners.map(c => `${c.px - boxMinX}px ${c.py - boxMinY}px`).join(', ')})`;
    }
  }

  const units = [...battle.players, ...battle.enemies, ...(battle.police ?? [])].filter(u => u.alive);
  for (const unit of units) {
    const el = stage.querySelector(`.unit-token[data-unit="${CSS.escape(unit.id)}"]`);
    if (!el) continue;
    const { x, z } = worldFor(unit.cell);
    Object.assign(el.style, project(x, z));
  }
}
