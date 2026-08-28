/**
 * THE SHARED BOARD — ported from `godot/scripts/fight/board.gd` and the
 * grid half of `godot/scripts/fight/battle_builder.gd`.
 *
 * DESIGN_AUTHORITY.md addendum, 2026-08-28: until js has feature/asset
 * parity with Godot, anything Godot already has flows Godot -> web. The
 * board `battle.js` used before this file existed was its own invention —
 * two small mirrored 3-lane grids, adjacency-limited movement, role-based
 * reach shortcuts — not a port of anything. This IS the port: ONE unified
 * depth axis shared by both sides (owner ruling, 2026-08-21: "crews start
 * in their colour areas and can move to all coloured areas"), a real
 * occupiable neutral band between them, and authored 3-lane content
 * centred onto the wider canon 6-lane board the same way Godot centres it.
 *
 * `rows`/`lanes` are vars in board.gd because the owner can widen the board
 * live (`?rows=4&lanes=5`). web/ has no debug-query plumbing for that yet —
 * ROWS/LANES below are the canon default only (board.gd's CANON_ROWS/
 * CANON_LANES), not a ported override system. Widening this later means
 * turning these two into the mutable half of board.gd, not touching every
 * call site — everything below already reads them, never a copy.
 */

export const ROWS = 3; // FightBoard.CANON_ROWS — depth rows per side
export const LANES = 6; // FightBoard.CANON_LANES — lateral lanes
export const NEUTRAL_ROWS = 2; // FightBoard.NEUTRAL_ROWS — real, occupiable, nobody's ground
// BattleBuilder.ROWS — front is nearest the midline for BOTH sides.
export const ROW_NAMES = ['front', 'middle', 'back'];

export function totalRows() { return ROWS * 2 + NEUTRAL_ROWS; } // 8, canon

export function laneCentre() { return (LANES - 1) * 0.5; } // 2.5, canon

export function clampLane(lane) { return Math.min(LANES - 1, Math.max(0, lane)); }
export function clampRow(row) { return Math.min(ROWS - 1, Math.max(0, row)); }
export function clampDepth(depth) { return Math.min(totalRows() - 1, Math.max(0, depth)); }

export function hasSlot(lane, depth) {
  return lane >= 0 && lane < LANES && depth >= 0 && depth < totalRows();
}

/** Not a Godot function — GDScript keys its shared grid on a Vector2i, JS
 *  has no equivalent value type, so every consumer of a slot as a Map key
 *  or a DOM `data-cell` needs one canonical string form. `describeSlot()`
 *  is for humans (labels, logs) and is lossy outside a side's own band;
 *  `slotKey`/`parseSlotKey` are for code and round-trip exactly. */
export function slotKey(lane, depth) { return `${lane},${depth}`; }
export function parseSlotKey(key) {
  const [lane, depth] = key.split(',').map(Number);
  return { lane, depth };
}

/** FightBoard.depth_of — a side's own row (0 front .. ROWS-1 back) onto the
 *  one shared depth axis. Player rows count backwards from the neutral
 *  band; the opposition's count forwards from it — which is what makes
 *  front sit nearest the middle for both sides. */
export function depthOf(row, isPlayer) {
  const r = clampRow(row);
  return isPlayer ? ROWS - 1 - r : ROWS + NEUTRAL_ROWS + r;
}

/** FightBoard.row_of — inverse of depthOf. -1 when standing outside your
 *  own band entirely, which the movement rule above makes a normal thing
 *  to be, not an error. */
export function rowOf(depth, isPlayer) {
  if (isPlayer) {
    if (depth < 0 || depth >= ROWS) return -1;
    return ROWS - 1 - depth;
  }
  const r = depth - ROWS - NEUTRAL_ROWS;
  if (r < 0 || r >= ROWS) return -1;
  return r;
}

export function isNeutralDepth(depth) { return depth >= ROWS && depth < ROWS + NEUTRAL_ROWS; }

/** FightBoard.band_of — -1 player ground, 0 the neutral band, 1 opposition. */
export function bandOf(depth) {
  if (depth < ROWS) return -1;
  if (isNeutralDepth(depth)) return 0;
  return 1;
}

export function homeBand(isPlayer) {
  const out = [];
  for (let r = 0; r < ROWS; r += 1) out.push(depthOf(r, isPlayer));
  return out.sort((a, b) => a - b);
}

// ── content <-> grid: BattleBuilder.parse_cell / cell_name / deploy order ──

/** Authored content ("front-2") is written against a 3-lane board.
 *  BattleBuilder.AUTHORED_LANES / _authored_lane_offset(): centre it on the
 *  real, wider canon board rather than pinning it to the left, or the
 *  opposition sits off to one side and the two formations stop facing
 *  each other. */
export const AUTHORED_LANES = 3;
export function authoredLaneOffset() {
  if (LANES <= AUTHORED_LANES) return 0;
  return Math.floor((LANES - AUTHORED_LANES) * 0.5);
}

/** BattleBuilder.parse_cell — answers for the OPPOSITION by default; the
 *  slice authors cell ids for opponents and cover, never for the player. */
export function parseCell(cell) {
  const [rowName, laneText] = cell.split('-');
  const row = Math.max(0, ROW_NAMES.indexOf(rowName));
  const lane = Number(laneText) - 1 + authoredLaneOffset();
  return { lane: clampLane(lane), depth: depthOf(clampRow(row), false) };
}

/** BattleBuilder.parse_cell_for — the general form, for a named side. */
export function parseCellFor(cell, isPlayer) {
  const { lane, depth } = parseCell(cell);
  let row = 0;
  for (let r = 0; r < ROWS; r += 1) {
    if (depthOf(r, false) === depth) { row = r; break; }
  }
  return { lane, depth: depthOf(row, isPlayer) };
}

/** BattleBuilder.cell_name — the inverse of parseCell, for a slot in either
 *  side's own band. Godot's own version is only ever called on own-band
 *  cells; `describeSlot` below extends the same idea to the neutral band,
 *  which this build's units can now actually stand in. */
export function cellName(lane, depth) {
  let band = depth - ROWS - NEUTRAL_ROWS;
  if (band < 0) band = ROWS - 1 - depth;
  band = Math.min(ROW_NAMES.length - 1, Math.max(0, band));
  return `${ROW_NAMES[band]}-${clampLane(lane) - authoredLaneOffset() + 1}`;
}

/** Not a Godot function — cell_name() is only defined for a side's own
 *  band, and this build needs to label EVERY slot (logs, aria-labels, the
 *  2D formation grid), including the real, occupiable neutral band a unit
 *  can now be pushed or repositioned into (board.gd's "grey rows"). Falls
 *  back to cellName's own-band naming outside the neutral band, so this is
 *  a superset, not a divergence. */
export function describeSlot(lane, depth) {
  const laneLabel = clampLane(lane) - authoredLaneOffset() + 1;
  if (isNeutralDepth(depth)) return `neutral-${laneLabel}`;
  return cellName(lane, depth);
}

/** BattleBuilder._deploy_order — every cell, front row first, each row read
 *  from the centre outward. */
export function deployOrder() {
  const out = [];
  const centre = laneCentre();
  for (let row = 0; row < ROWS; row += 1) {
    const lanes = Array.from({ length: LANES }, (_, lane) => lane)
      .sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre));
    for (const lane of lanes) out.push({ lane, depth: depthOf(row, true) });
  }
  return out;
}

/** BattleBuilder._default_player_slot — two fighters hold the centre lane
 *  in depth rather than spreading out laterally. */
export function defaultPlayerSlot(index, total) {
  const order = deployOrder();
  if (order.length === 0) return { lane: 0, depth: 0 };
  if (total <= 2) {
    const mid = clampLane(Math.round(laneCentre()));
    return { lane: mid, depth: depthOf(Math.min(index, ROWS - 1), true) };
  }
  return order[index % order.length];
}
