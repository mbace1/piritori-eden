// RULE PROFILES — which rules a board is played under.
//
// WHY THIS EXISTS. TURF is Option A in Piritori → Eden: "Turf as the first
// implementation base for the shared battle mechanic" (piritori-eden,
// DESIGN_AUTHORITY.md, 2026-09-10). Piritori's C line already plays that
// mechanic under its own rules, and the two candidates must be compared from
// ONE battle request under ONE set of rules. A.1 measured the distance
// (piritori-eden design/A1_TURF_BASE.md): armour, a brace verb, a bandage,
// low walls that cover one EDGE rather than a whole tile, bodies that block a
// shot, and plans that are frozen at the top of the round.
//
// So the rules are a PROFILE an encounter opts into, and TURF's own game is
// the default profile, unchanged. The rule that makes that safe: with no
// `rules` on the encounter, every code path is the path it was before this
// file existed — test/balance.mjs reads bit-identical, and smoke.mjs asserts
// it. A profile is data (switches), never a second engine: combat.js and
// grid.js ask `state.rules` one question at each place a rule forks.
//
// Pure: no imports, no DOM. grid.js and combat.js both read it, so it must
// stay a leaf or the pair would import each other through it.

export const TURF = Object.freeze({
  id: 'turf',
  armour: false,          // no damage absorption; a unit's `guard` is Planted evasion
  brace: null,            // no brace verb
  items: false,           // no item verb
  partialCover: 'tile',   // a partial tile softens any ranged shot that crosses or ends on it
  coverPenalty: 0.3,
  sight: 'turf',          // grid.js's LOS mode (mutual shadowcasting by default)
  bodiesBlock: false,
  momentum: true,
  drops: true,
  dice: 'mulberry32',
  plans: 'live',          // the telegraph is re-planned after every player command
});

// Piritori C.11 laboratory rules (piritori-eden port/battle-contract.mjs,
// RULES_C11_V1), as switches on this engine.
export const PIRITORI_C11 = Object.freeze({
  id: 'piritori-c11',
  armour: true,           // `armour` absorbs first; a weapon's `pierce` ignores that much
  brace: { armour: 2, cap: 4 },
  items: true,
  partialCover: 'edge',   // a low wall on ONE edge of its tile: blocks crossing that edge,
                          // and a gun firing in through that face loses coverPenalty
  coverPenalty: 0.25,
  sight: 'supercover',    // DDA through every cell touched; an exact corner touches both sides
  bodiesBlock: true,
  momentum: false,
  drops: false,
  dice: 'lcg',
  plans: 'frozen',        // shown once per round; breaking a plan cancels it, never re-aims it
});

export const PROFILES = Object.freeze({ turf: TURF, 'piritori-c11': PIRITORI_C11 });

export function resolveRules(spec) {
  if (spec == null) return TURF;
  const base = PROFILES[typeof spec === 'string' ? spec : spec.id];
  if (!base) throw new Error(`rules: unknown profile '${typeof spec === 'string' ? spec : spec.id}'`);
  return typeof spec === 'string' ? base : Object.freeze({ ...base, ...spec });
}

// ── edge cover (Piritori's low walls) ────────────────────────────────
// Row y grows "north". A wall is stored once, on one tile, facing one edge;
// the tile on the other side of that edge is protected by it too.
export const EDGES = { north: [0, 1], east: [1, 0], south: [0, -1], west: [-1, 0] };
const OPPOSITE = { north: 'south', east: 'west', south: 'north', west: 'east' };
const k = (x, y) => `${x},${y}`;

export function coverEdgesAt(edges, x, y) {
  const out = [], own = edges.get(k(x, y));
  if (own && EDGES[own]) out.push({ edge: own, anchor: k(x, y) });
  for (const [edge, [dx, dy]] of Object.entries(EDGES)) {
    const other = edges.get(k(x + dx, y + dy));
    if (other === OPPOSITE[edge]) out.push({ edge, anchor: k(x + dx, y + dy) });
  }
  return out;
}

export function crossesEdge(edges, from, to) {
  return coverEdgesAt(edges, from.x, from.y).some(({ edge }) => {
    const [dx, dy] = EDGES[edge];
    return to.x - from.x === dx && to.y - from.y === dy;
  });
}

// Does a shot from `from` enter `to`'s tile through a walled face? Exact
// 45-degree corners count as protected; side, rear and same-tile do not.
export function edgeProtects(edges, from, to) {
  const dx = from.x - to.x, dy = from.y - to.y;
  for (const { edge } of coverEdgesAt(edges, to.x, to.y)) {
    const [nx, ny] = EDGES[edge];
    const normal = dx * nx + dy * ny, tangent = dx * ny - dy * nx;
    if (normal > 0 && normal >= Math.abs(tangent)) return true;
  }
  return false;
}

// ── supercover sight ─────────────────────────────────────────────────
// Every tile the line from a to b touches, endpoints excluded; where it
// passes exactly through a corner, BOTH side tiles, so no shot threads
// between two touching walls.
export function supercoverTiles(a, b) {
  let x = a.x, y = a.y;
  const dx = b.x - x, dy = b.y - y, sx = Math.sign(dx), sy = Math.sign(dy), ax = Math.abs(dx), ay = Math.abs(dy);
  let ix = 0, iy = 0;
  const out = [];
  while (ix < ax || iy < ay) {
    const p = (1 + 2 * ix) * ay, q = (1 + 2 * iy) * ax;
    if (p === q) { if (sx && sy) out.push({ x: x + sx, y }, { x, y: y + sy }); x += sx; y += sy; ix++; iy++; }
    else if (p < q) { x += sx; ix++; }
    else { y += sy; iy++; }
    out.push({ x, y });
  }
  const seen = new Set();
  return out.filter(t => {
    const key = k(t.x, t.y);
    if (seen.has(key) || (t.x === a.x && t.y === a.y) || (t.x === b.x && t.y === b.y)) return false;
    seen.add(key); return true;
  });
}

// ── dice ─────────────────────────────────────────────────────────────
// Piritori's linear congruential generator. Returns [0,1); the caller that
// compares it multiplies by 100 exactly as Piritori does, so a seed rolls
// the same hit in both engines.
export function makeLcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
