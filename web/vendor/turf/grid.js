// The board: orthogonal (4-directional) tiles, ITB-style rather than an
// 8-directional grid — it is what keeps range and line-of-sight unambiguous
// (no "does a diagonal cut a corner" question to answer), and it is one of
// the two named influences (Into the Breach) rather than a departure from
// either. All game logic below works in plain (x,y) grid space; the iso
// *look* is a render-time projection only (render.js), never fed back in.

import { crossesEdge, supercoverTiles, edgeProtects } from './rules.js?v=1';

export const key = (x, y) => `${x},${y}`;

export const inBounds = (grid, x, y) => x >= 0 && y >= 0 && x < grid.cols && y < grid.rows;

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// Every live unit at a tile, or null. `exclude` lets a unit check its own
// starting tile without seeing itself as blocking.
export function unitAt(state, x, y, exclude) {
  for (const u of state.units) {
    if (u.hp <= 0) continue;
    if (u === exclude) continue;
    if (u.x === x && u.y === y) return u;
  }
  return null;
}

// BFS move range: full-cover tiles and occupied tiles block passage; cost is
// 1 per step, capped at the unit's `move` stat. Returns a Map of "x,y" -> the
// tile plus the path cost, which is also everywhere a "can this unit legally
// stand here" check reads from.
export function moveRange(state, unit) {
  const { grid, fullCover } = state;
  const start = { x: unit.x, y: unit.y };
  const seen = new Map();
  seen.set(key(start.x, start.y), { x: start.x, y: start.y, cost: 0 });
  let frontier = [start];
  let cost = 0;
  // `slowed` (the Enforcer line's Cripple) comes off the move budget here and
  // nowhere else, so every reader of move range — the highlight, the AI's
  // telegraph, approachTile, the bots — sees the same shortened reach without
  // any of them learning the rule. Never below 1: a unit pinned to zero can
  // be farmed from range with nothing it can do, which is a different game.
  const budget = Math.max(1, unit.move - (unit.slowed || 0));
  while (frontier.length && cost < budget) {
    cost++;
    const next = [];
    for (const { x, y } of frontier) {
      for (const [dx, dy] of N4) {
        const nx = x + dx, ny = y + dy;
        if (!inBounds(grid, nx, ny)) continue;
        const k = key(nx, ny);
        if (seen.has(k)) continue;
        if (fullCover.has(k)) continue;
        if (unitAt(state, nx, ny, unit)) continue;
        // A low wall on one edge (rules.js 'edge' cover) is walked AROUND:
        // the step across that edge is refused, the tile itself is not.
        if (state.partialEdges && crossesEdge(state.partialEdges, { x, y }, { x: nx, y: ny })) continue;
        seen.set(k, { x: nx, y: ny, cost });
        next.push({ x: nx, y: ny });
      }
    }
    frontier = next;
  }
  return seen;
}

// Bresenham's line, tile centers, endpoints excluded — the set of tiles a
// shot actually crosses between attacker and target.
export function lineTiles(a, b) {
  const pts = [];
  let x0 = a.x, y0 = a.y;
  const x1 = b.x, y1 = b.y;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    if (!(x0 === a.x && y0 === a.y) && !(x0 === x1 && y0 === y1)) pts.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return pts;
}

// ── line of sight ───────────────────────────────────────────────────
// Owner, 2026-09-19: "Take rot.js FOV only. Skip PathFinding.js." — and then
// "go ahead with the FOV swap, measure the deltas."
//
// rot.js ships three FOV classes. `PreciseShadowcasting` (its default) works
// in exact angular arcs and answers with a visibility FRACTION, which for a
// yes/no shot means picking a threshold — a balance knob smuggled in with the
// algorithm. `DiscreteShadowcasting` is a coarser cousin. `Recursive-
// Shadowcasting` is Björn Bergström's eight-octant algorithm, the one every
// roguelike agrees on, integer-only in its geometry and binary in its answer.
// That is what is ported here, faithfully to rot.js's own implementation
// (which credits the same source), with no dependency taken — the house rule.
//
// WHAT CHANGES. Through v36 a shot's line of sight was a Bresenham line of
// tile centres: blocked if any tile it crossed was full cover. Shadowcasting
// asks the roguelike question instead — from where I stand, which tiles are
// lit — and a tile is lit if ANY part of its angular span escapes the
// shadows the blockers cast. The practical difference is corners: a
// centre-to-centre line clips a wall's corner and is refused, where a
// shadowcaster sees the far tile's edge round it and allows the shot. So
// shadowcasting is the more PERMISSIVE rule, and on a roster that is
// weaker-but-numerous by design, more shots is a delta with a direction.
//
// AND ONE PROPERTY WORTH SAYING OUT LOUD: shadowcasting is not symmetric.
// There are pairs where A sees B and B does not see A — a known property of
// the algorithm, not a bug in the port. In a game whose whole contract is
// that the board shows you every shot, a rival that can hit you when you
// cannot hit it back is a fairness fault the Bresenham line never had (it
// is symmetric up to rounding). So the mode seam below carries the raw
// rot.js answer AND two symmetric closures — `mutual` (both must see) and
// `either` (one is enough) — and test/balance.mjs takes `--los` so all four
// can be measured in one sitting. The census script in VERSIONS.md v37
// records what each does to the board and to the seven rates.
//
// `coverSoftens` deliberately stays on the Bresenham line: partial cover is
// about the TRAJECTORY of a shot (what it passes), not about visibility, and
// the two questions are allowed different geometry.
export const LOS_MODES = ['line', 'fov', 'mutual', 'either'];
let losMode = 'mutual';
// The measurement seam. Set once per process (balance.mjs's --los); it is a
// module-level switch so the same engine can be run under each rule, and it
// is not a per-state option because a board where two units disagree about
// the rule of sight is not a board.
export function setLOSMode(mode) {
  if (!LOS_MODES.includes(mode)) throw new Error(`setLOSMode: unknown mode '${mode}'`);
  losMode = mode;
}
export const getLOSMode = () => losMode;

// Full cover blocks a shot outright (and melee can never reach through it,
// since it also blocks movement). Adjacent tiles always see each other.
export function hasLOS(state, a, b) {
  if (manhattan(a, b) <= 1) return true;
  if (state.rules && state.rules.sight === 'supercover') return supercoverLOS(state, a, b);
  switch (losMode) {
    case 'line': return lineLOS(state, a, b);
    case 'fov': return fovSees(state, a, b);
    case 'mutual': return fovSees(state, a, b) && fovSees(state, b, a);
    case 'either': return fovSees(state, a, b) || fovSees(state, b, a);
    default: return fovSees(state, a, b);
  }
}

// A rules profile's sight (rules.js): the supercover line, blocked by full
// cover and, where the profile says bodies block, by any living unit that is
// not standing on either end. Ends are compared by TILE, since a caller may
// be asking about a tile the shooter has not reached yet.
function supercoverLOS(state, a, b) {
  for (const t of supercoverTiles(a, b)) {
    if (state.fullCover.has(key(t.x, t.y))) return false;
    if (state.rules.bodiesBlock && unitAt(state, t.x, t.y)) return false;
  }
  return true;
}

// The v1-v36 rule, kept as the control column.
export function lineLOS(state, a, b) {
  for (const t of lineTiles(a, b)) {
    if (state.fullCover.has(key(t.x, t.y))) return false;
  }
  return true;
}

export const fovSees = (state, a, b) => fovFrom(state, a.x, a.y).has(key(b.x, b.y));

// The lit set from one origin, cached per board. Full cover is never
// mutated by game code within an encounter (Barricade adds PARTIAL cover),
// so the cache keys on the fullCover Set itself; the size check catches a
// test that clears it. A preview clones the Set, so each clone computes its
// own few origins — cheap, since the heavy callers (firingTiles over every
// reachable tile, firingTileScore over every gun) run on the real state.
const fovCache = new WeakMap();
// A state with no grid (a unit test's bare board) is treated as unbounded:
// the cast runs to a fixed radius and nothing is out of bounds.
const OPEN_GRID = { cols: 64, rows: 64, open: true };
export function fovFrom(state, ox, oy) {
  const fc = state.fullCover;
  const grid = state.grid || OPEN_GRID;
  let entry = fovCache.get(fc);
  if (!entry || entry.size !== fc.size || entry.cols !== grid.cols || entry.rows !== grid.rows) {
    entry = { size: fc.size, cols: grid.cols, rows: grid.rows, byOrigin: new Map() };
    fovCache.set(fc, entry);
  }
  const k = key(ox, oy);
  let vis = entry.byOrigin.get(k);
  if (!vis) { vis = computeFov(grid, fc, ox, oy); entry.byOrigin.set(k, vis); }
  return vis;
}

// The eight octant transforms, in rot.js's order: [xx, xy, yx, yy].
const OCTANTS = [
  [1, 0, 0, 1], [0, 1, 1, 0], [0, -1, 1, 0], [-1, 0, 0, 1],
  [-1, 0, 0, -1], [0, -1, -1, 0], [0, 1, -1, 0], [1, 0, 0, -1],
];

function computeFov(grid, fullCover, ox, oy) {
  const vis = new Set([key(ox, oy)]);
  const radius = grid.cols + grid.rows;     // the whole board is in range
  const passes = (x, y) => !fullCover.has(key(x, y));
  for (const [xx, xy, yx, yy] of OCTANTS) {
    castLight(grid, ox, oy, 1, 1.0, 0.0, radius, xx, xy, yx, yy, passes, vis);
  }
  return vis;
}

// One octant, one recursion per shadow edge. A tile is lit when its slope
// span [rSlope, lSlope] overlaps the still-lit interval [end, start]; a wall
// splits that interval and the part above it recurses on. Out-of-bounds
// tiles are skipped rather than treated as walls — there is nothing past
// the edge for them to shade.
function castLight(grid, cx, cy, row, start, end, radius, xx, xy, yx, yy, passes, vis) {
  if (start < end) return;
  let newStart = 0;
  for (let i = row; i <= radius; i++) {
    let blocked = false;
    const dy = -i;
    for (let dx = -i; dx <= 0; dx++) {
      const X = cx + dx * xx + dy * xy;
      const Y = cy + dx * yx + dy * yy;
      const lSlope = (dx - 0.5) / (dy + 0.5);
      const rSlope = (dx + 0.5) / (dy - 0.5);
      if ((!grid.open && !inBounds(grid, X, Y)) || start < rSlope) continue;
      if (end > lSlope) break;
      vis.add(key(X, Y));
      if (blocked) {
        if (!passes(X, Y)) { newStart = rSlope; continue; }
        blocked = false;
        start = newStart;
      } else if (!passes(X, Y) && i < radius) {
        blocked = true;
        castLight(grid, cx, cy, i + 1, start, lSlope, radius, xx, xy, yx, yy, passes, vis);
        newStart = rSlope;
      }
    }
    if (blocked) break;
  }
}

// Partial cover softens a ranged hit rather than blocking it: true if the
// shot's path crosses a partial-cover tile, or the target is standing on one.
export function coverSoftens(state, a, b) {
  // Edge cover protects only a shot coming in through the walled face.
  if (state.partialEdges) return edgeProtects(state.partialEdges, a, b);
  if (state.partialCover.has(key(b.x, b.y))) return true;
  for (const t of lineTiles(a, b)) {
    if (state.partialCover.has(key(t.x, t.y))) return true;
  }
  return false;
}

export function inRange(state, weapon, a, b) {
  return manhattan(a, b) <= weapon.range;
}

// The cheapest tile `unit` could stand on to hit `target` this turn — its
// current tile if already in range, otherwise the nearest reachable tile
// with range and LOS, or null if no such tile exists. Shared by the AI
// (the rival brain in combat.js) and by click-to-attack in input.js, so "can I reach this fight"
// is answered exactly once.
// Every tile this unit could hit `target` from this turn. The raw list, so
// the UI can offer a CHOICE rather than a fait accompli.
export function firingTiles(state, unit, target) {
  const reachable = unit.actedMove
    ? new Map([[key(unit.x, unit.y), { x: unit.x, y: unit.y, cost: 0 }]])
    : moveRange(state, unit);
  const out = [];
  for (const { x, y, cost } of reachable.values()) {
    if (manhattan({ x, y }, target) > unit.weapon.range) continue;
    if (!hasLOS(state, { x, y }, target)) continue;
    out.push({ x, y, cost });
  }
  return out;
}

// What a firing tile is WORTH. Higher is better.
//
// THIS USED TO BE "the cheapest tile that can reach", and by v27 that was
// actively wrong. Measured over 400 one-tap attacks where a real choice of
// tile existed, the cheapest tile banked LESS momentum than an available
// alternative 80% of the time and stopped in the open when cover was on
// offer 20% of the time — so the single most common input in the game was
// systematically fighting the movement economy (v24) and ignoring the cover
// rules (v6) and the hazards (v18). A default that quietly plays badly is
// worse than no default.
//
// Deliberately in grid.js and not in the AI: this is what the PLAYER's tap
// resolves to, and the rival brain keeps its own scoring because a behaviour has to be
// free to disagree with "the best tile" (that is what a behaviour IS).
export function firingTileScore(state, unit, target, tile) {
  let score = 0;
  // Cover against the unit you are shooting at is worth the most: it is the
  // one term that changes what happens to you on THEIR turn.
  if (coverSoftens(state, target, tile)) score += 6;
  // Every other gun that bears on the tile costs, softened if something is
  // between them and it.
  for (const f of state.units) {
    if (f.faction === unit.faction || f.hp <= 0 || !f.weapon || f === target) continue;
    if (manhattan(tile, f) > f.weapon.range) continue;
    if (!hasLOS(state, f, tile)) continue;
    score -= coverSoftens(state, f, tile) ? 1 : 2.5;
  }
  // A hazard is measured in HP, which is worth more than any positional term
  // here — walking into a fire to take a shot is never the default.
  const h = state.hazards && state.hazards.get(key(tile.x, tile.y));
  if (h) score -= h.lethal ? 100 : ((h.onEnter || 0) + (h.lingers || 0)) * 3;
  // Distance travelled is momentum (momentum.js), which is damage on this
  // swing or evasion until you use it. Small per tile, because it must not
  // outweigh cover — but positive, so a tie goes to the longer run.
  score += manhattan(tile, unit) * 0.6;
  return score;
}

// The tile a one-tap attack uses: the BEST one, not the nearest. Ties break
// on tile key so the same board always resolves the same way — a default
// that moves you somewhere different on a replay is not a default.
export function approachTile(state, unit, target) {
  const tiles = firingTiles(state, unit, target);
  let best = null, bestScore = -Infinity;
  for (const t of tiles) {
    const s = firingTileScore(state, unit, target, t);
    if (s > bestScore || (s === bestScore && best && key(t.x, t.y) < key(best.x, best.y))) {
      bestScore = s; best = t;
    }
  }
  return best;
}
