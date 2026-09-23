/**
 * battle-contract.mjs — the versioned battle REQUEST and RESULT that both
 * battle candidates are held to (DESIGN_AUTHORITY.md, 2026-09-10 ruling;
 * PIRITORI_LONG_TERM_SCOPE.md "Now" step 1).
 *
 *   A — Turf battle base      web/turf-base/
 *   C — Dream Loop battle base web/fight-module/ (C.19 is the active line)
 *
 * "A and C must be tested from the same versioned battle request: identical
 * units, starting positions, cover, equipment, seed, actions and rules. They
 * must return the same result vocabulary to the campaign."
 *
 * Until this file existed there was no request at all: C's lab fixtures were
 * built inside session.js/tactics.js and the only written description of the
 * battle was the code. So the request is DERIVED from C's own state
 * (requestFromTactical), never typed by hand, and the fixture generator
 * (port/battle-fixture.mjs --check) proves two things the request must be
 * able to say: that it regenerates byte-identically from C, and that C
 * rebuilt FROM the request plays the same game as C built natively.
 *
 * Pure data in, pure data out: no DOM, no fs, no three.js. Importable from
 * the browser, from bare node and from either candidate.
 */

export const REQUEST_VERSION = 1;
export const RESULT_VERSION = 1;

// C's result words, unchanged. A campaign reads these and nothing else.
//   win      every opposing fighter is down
//   loss     every one of ours is down
//   withdraw the crew left the field (Withdraw)
//   partial  a negotiated end (Talk, from round 2 in the lab rules)
export const RESULT_VOCABULARY = Object.freeze(['win', 'loss', 'withdraw', 'partial']);

// The commands a request may allow. `select` is UI, not a command, and is
// deliberately absent: it changes nothing a result can see.
export const COMMANDS = Object.freeze(['move', 'attack', 'brace', 'reload', 'item', 'end', 'withdraw', 'talk']);

// The C.11 laboratory rules as numbers. tactics.js holds these as literals
// (the 6x8 bounds and the 4-step route live inside routes(); +2/4 inside the
// brace branch; 25 inside forecast()). They are copied here so a second
// implementation can READ them instead of re-deriving them from code, and
// port/battle-fixture.mjs --check fails if tactics.js stops agreeing.
export const RULES_C11_V1 = Object.freeze({
  id: 'c11-v1',
  grid: { cols: 6, rows: 8 },
  movement: { steps: 4, adjacency: 'orthogonal', blockedBy: ['full-cover', 'partial-cover-edge', 'fighter'] },
  turn: { order: 'player-then-rivals', budget: 'one-move-and-one-action-any-order', rivals: 'frozen-visible-plans; an invalid plan holds, never retargets' },
  sight: { algorithm: 'supercover-dda', blockers: ['full-cover', 'fighter'], exact_corner: 'both-side-cells-block' },
  cover: { full: 'blocks movement and sight', partial: 'one edge; blocks crossing that edge; -25 percentage points to GUN accuracy through it' },
  brace: { guard: 2, cap: 4 },
  damage: 'guard absorbs first (pierce ignores that much guard), remainder is hp; down at hp <= 0',
  dice: { kind: 'lcg', a: 1664525, c: 1013904223, modulus: 4294967296, roll: 'state/2^32*100 < chance' },
  victory: { mode: 'eliminate', withdraw_from_round: 1, talk_from_round: 2 },
});

const CELL = /^\d+,\d+$/;

/** Throws with the first reason a request is unusable; returns it otherwise. */
export function validateRequest(req) {
  const fail = m => { throw new Error(`battle request: ${m}`); };
  if (!req || req.request_version !== REQUEST_VERSION) fail(`request_version must be ${REQUEST_VERSION}`);
  if (typeof req.id !== 'string' || !req.id) fail('id');
  if (!Number.isInteger(req.seed)) fail('seed must be an integer');
  const { cols, rows } = req.rules?.grid || {};
  if (!(cols > 0 && rows > 0)) fail('rules.grid');
  const inside = c => { const [x, y] = c.split(',').map(Number); return x >= 0 && y >= 0 && x < cols && y < rows; };
  const taken = new Set();
  for (const c of req.cover || []) {
    if (!CELL.test(c.cell) || !inside(c.cell)) fail(`cover cell ${c.cell}`);
    if (!['full', 'partial'].includes(c.kind)) fail(`cover kind ${c.kind}`);
    if (c.kind === 'partial' && !['north', 'south', 'east', 'west'].includes(c.edge)) fail(`partial cover ${c.cell} needs an edge`);
    if (c.kind === 'full') taken.add(c.cell);
  }
  const ids = new Set();
  for (const u of req.units || []) {
    if (ids.has(u.id)) fail(`duplicate unit ${u.id}`);
    ids.add(u.id);
    if (!['player', 'enemy'].includes(u.side)) fail(`unit ${u.id} side`);
    if (!req.weapons?.[u.weapon]) fail(`unit ${u.id} weapon ${u.weapon} is not in request.weapons`);
    if (!CELL.test(u.cell) || !inside(u.cell)) fail(`unit ${u.id} cell ${u.cell}`);
    if (u.alive && taken.has(u.cell)) fail(`unit ${u.id} stands in full cover or on another fighter at ${u.cell}`);
    if (u.alive) taken.add(u.cell);
    for (const item of u.items || []) if (!req.items?.[item]) fail(`unit ${u.id} item ${item} is not in request.items`);
  }
  if (!req.units?.some(u => u.side === 'player' && u.alive)) fail('no standing player fighter');
  if (!req.units?.some(u => u.side === 'enemy' && u.alive)) fail('no standing rival');
  for (const cmd of req.commands || []) if (!COMMANDS.includes(cmd)) fail(`command ${cmd}`);
  return req;
}

// C cover entry -> request cover entry, and back. C keys cover by cell in a
// Map; the request is a plain list so it survives JSON.
const coverOut = ([cell, c]) => (c.hardBlock
  ? { cell, kind: 'full', prop: c.propId }
  : { cell, kind: 'partial', edge: c.edge, prop: c.propId });

/**
 * Capture a C tactical battle (tactics.js createTacticalSession state) as a
 * request. Only what changes the outcome is carried; how a fighter LOOKS
 * (modelId, head/torso/legs) is each candidate's own business.
 */
export function requestFromTactical(battle, { id, weapons, rules = RULES_C11_V1, commands = COMMANDS } = {}) {
  const used = new Set(battle.players.concat(battle.enemies).map(u => u.equipment));
  const items = {};
  for (const u of battle.players.concat(battle.enemies)) for (const it of u.itemIds || []) items[it] = structuredClone(battle.items[it]);
  return validateRequest({
    request_version: REQUEST_VERSION,
    id,
    rules: structuredClone(rules),
    seed: battle.rng,
    round: battle.round,
    selected: battle.selectedId,
    cover: [...battle.cover].map(coverOut),
    weapons: Object.fromEntries([...used].sort().map(w => [w, structuredClone(weapons[w])])),
    items,
    units: battle.players.concat(battle.enemies).map(u => ({
      id: u.id, side: u.side, label: u.label, name: u.name, role: u.role,
      cell: u.cell, weapon: u.equipment,
      hp: u.hp, maxHp: u.maxHp, guard: u.guard, harmBonus: Number(u.harmBonus) || 0,
      ammo: u.ammo ?? null, maxAmmo: u.maxAmmo ?? null,
      items: [...(u.itemIds || [])], alive: u.alive,
    })),
    commands: [...commands],
    campaign: null,
  });
}

/** Write a request back onto a C battle (used inside createTacticalSession's
 * `prepare`, after C has set its own defaults and before it plans). */
export function applyRequestToTactical(battle, req, template) {
  validateRequest(req);
  battle.cover = new Map(req.cover.map(c => [c.cell, c.kind === 'full'
    ? { hardBlock: true, softBlock: false, propId: c.prop, effect: 'blocks movement and sight' }
    : { softBlock: true, hardBlock: false, edge: c.edge, propId: c.prop, effect: 'Facing edge: -25 percentage points gun accuracy; walk around' }]));
  battle.rng = req.seed;
  battle.round = req.round ?? 1;
  battle.items = { ...battle.items, ...structuredClone(req.items) };
  const make = u => ({
    ...structuredClone(template[u.side]),
    id: u.id, side: u.side, label: u.label, name: u.name, role: u.role,
    cell: u.cell, equipment: u.weapon, hp: u.hp, maxHp: u.maxHp, guard: u.guard,
    harmBonus: u.harmBonus, ammo: u.ammo, maxAmmo: u.maxAmmo, itemIds: [...u.items], alive: u.alive,
  });
  battle.players = req.units.filter(u => u.side === 'player').map(make);
  battle.enemies = req.units.filter(u => u.side === 'enemy').map(make);
  battle.selectedId = req.selected ?? battle.players.find(u => u.alive)?.id;
}

/**
 * The one result shape both candidates return. `rounds` and `downed` are
 * what a campaign needs to settle injuries and time; `actions` is the replay.
 */
export function makeResult({ request, result, round, units, actions, candidate }) {
  if (result !== null && !RESULT_VOCABULARY.includes(result)) throw new Error(`battle result: '${result}' is not in the vocabulary`);
  return {
    schema_version: RESULT_VERSION,
    request_version: request.request_version,
    encounter: request.id,
    candidate,
    result,
    rounds: round,
    survivors: units.filter(u => u.alive).map(u => u.id).sort(),
    downed: units.filter(u => !u.alive).map(u => u.id).sort(),
    campaign_effects: [],
    actions,
  };
}
