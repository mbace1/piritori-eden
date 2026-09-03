import { stanceWeight, STANCE } from './stance.js?v=1';
import { rand01 } from '../../../market/model.mjs';
import {
  LANES, totalRows, rowOf, laneCentre,
  parseCell, defaultPlayerSlot, slotKey, parseSlotKey, describeSlot,
} from './grid.js?v=1';
import { weaponsFrom, itemsFrom, UNARMED, ROW_FRONT } from './equipment.js?v=1';

const ROLE_PARTS = {
  runner: ['torso-runner-v03', 'legs-runner-v03'],
  watcher: ['torso-watcher-v03', 'legs-watcher-v03'],
  fixer: ['torso-fixer-v03', 'legs-fixer-v03'],
  muscle: ['torso-muscle-v03', 'legs-muscle-v03'],
  driver: ['torso-driver-v03', 'legs-driver-v03'],
  local: ['torso-local-v03', 'legs-local-v03'],
};
const ENEMY_HEADS = ['head-kallio-03-v03', 'head-kallio-09-v03', 'head-kallio-11-v03'];

/** `battle_builder.gd`'s `ROLE_PROFILES`, ported. An opponent authors only
 *  role/cell/intent/equipment and never a stat line, so on both sides of the
 *  port the ROLE is the stat line. `driver` has no entry in Godot's table
 *  either and takes the default — which is why the default exists. */
const ROLE_PROFILE = {
  muscle: { condition: 8, nerve: 6 },
  runner: { condition: 5, nerve: 5 },
  watcher: { condition: 5, nerve: 5 },
  fixer: { condition: 6, nerve: 7 },
  local: { condition: 6, nerve: 5 },
};
const DEFAULT_PROFILE = { condition: 6, nerve: 6 };
/** Guard has no authored ceiling on either side of the port — unlike
 *  condition and nerve, which the crew record and the role profile set. */
const GUARD_CEILING = 3;

/** A unit's `cell` field is a grid.js `slotKey` ("lane,depth") — not the
 *  authored "front-2" vocabulary, which only names a slot inside a SIDE's
 *  own band and cannot name the neutral cells a unit can now stand in (see
 *  grid.js's module doc). `laneDepth()` is the one place battle.js reads
 *  a unit's position back out for the arithmetic below. */
function laneDepth(unit) { return parseSlotKey(unit.cell); }

/** Human-readable form of a `slotKey` cell, for logs and aria-labels. */
function describeCell(cell) {
  const { lane, depth } = parseSlotKey(cell);
  return describeSlot(lane, depth);
}

function makePlayer(member, state, index, count) {
  const [torso, legs] = ROLE_PARTS[member.role] ?? ROLE_PARTS.local;
  // BattleBuilder._default_player_slot(): front rank first, each row read
  // from the centre outward; two fighters hold the centre lane in depth.
  const slot = defaultPlayerSlot(index, count);
  const status = state.crewStatus[member.id];
  return {
    id: member.id,
    name: member.name,
    side: 'player',
    role: member.role,
    cell: slotKey(slot.lane, slot.depth),
    // `_crew_to_unit()`: a crew member fights at their OWN condition, wounds
    // carried in. Flat 3/3 for everyone until 2026-09-02 — so the crew screen
    // showed the muscle at 10 while the fight gave them 3, and the authored
    // 7-10 spread did nothing at all.
    hp: Math.max(1, status?.condition ?? member.condition ?? DEFAULT_PROFILE.condition),
    maxHp: Math.max(1, status?.maxCondition ?? member.condition ?? DEFAULT_PROFILE.condition),
    guard: member.role === 'muscle' ? 2 : 1,
    nerve: Math.max(1, status?.nerve ?? member.nerve ?? DEFAULT_PROFILE.nerve),
    maxNerve: Math.max(1, member.nerve ?? DEFAULT_PROFILE.nerve),
    alive: status?.status !== 'missing',
    head: member.portrait_asset_id,
    torso,
    legs,
    equipment: member.initial_equipment?.[0] ?? 'feature-phone',
    // BattleBuilder._crew_to_unit(): item_ids is initial_equipment filtered
    // to feature-phone specifically — a fighter's other carried equipment
    // is a held WEAPON (`equipment` above), not a usable in-combat item.
    // Opponents never get item_ids at all (`_opponent_to_unit()` has no
    // such field), which `makeEnemy()` matches by simply not setting one.
    itemIds: (member.initial_equipment ?? []).filter(id => id === 'feature-phone'),
  };
}

function makeEnemy(opponent, index, openingNerve = 0) {
  const [torso, legs] = ROLE_PARTS[opponent.role] ?? ROLE_PARTS.local;
  // BattleBuilder._opponent_to_unit(): parse_cell() always answers for the
  // OPPOSITION band, centred onto the real board width.
  const slot = parseCell(opponent.cell);
  const profile = ROLE_PROFILE[opponent.role] ?? DEFAULT_PROFILE;
  return {
    id: opponent.id,
    name: opponent.name,
    side: 'enemy',
    role: opponent.role,
    cell: slotKey(slot.lane, slot.depth),
    // `_opponent_to_unit()`: flat 3/3 before 2026-09-02, which made a muscle
    // and a runner the same fighter wearing different art.
    hp: profile.condition,
    maxHp: profile.condition,
    guard: opponent.role === 'muscle' ? 2 : 1,
    // The scouting advantage applies to the role's own nerve, not a constant.
    nerve: Math.max(1, profile.nerve + openingNerve),
    maxNerve: profile.nerve,
    alive: true,
    head: ENEMY_HEADS[index % ENEMY_HEADS.length],
    torso,
    legs,
    equipment: opponent.equipment,
    intent: opponent.intent,
  };
}

/** BattleBuilder._cover_props(): cover is built into the LOCATION, and the
 *  two half-boards are mirrors of one place, so a bench the slice names
 *  exists identically for both sides — Godot's own `_cover_props` parses
 *  every cover cell once (always via the opposition-band `parseCell`) and
 *  tags it for side 0 and side 1 with the SAME lane/depth either way,
 *  which is why side is not threaded through the lookup here: nothing in
 *  the content yet needs a cover prop to sit at two different depths
 *  depending on who is asking. "hard" cover would stop even a firearm;
 *  nothing in the slice asks for that yet, so every authored effect is
 *  soft cover until one does — same as equipment_rules.gd. */
function buildCover(definition) {
  const map = new Map();
  for (const prop of definition.cover ?? []) {
    for (const cell of prop.cells ?? []) {
      const { lane, depth } = parseCell(cell);
      map.set(slotKey(lane, depth), { hardBlock: false, softBlock: true, propId: prop.id, effect: prop.effect });
    }
  }
  return map;
}

/** Which mission a battle's result reports to — content has no `mission_id`
 *  field of its own (`battle.js`'s only, not ported from anywhere), so this
 *  table is the one place that link lives. An id with no entry here (any
 *  new battle, training included) gets `missionId: null`, and
 *  `resultEffects()` already treats a missing mission as "no effects" —
 *  which is exactly right for a battle with no mission behind it, not a
 *  gap to patch. `battle-kattilahalli-3v3` sharing `mission-courtyard-
 *  receipts` with `battle-courtyard-3v3` is preserved exactly as it was
 *  before this table existed; whether that's the intended mission is a
 *  separate, pre-existing question this change doesn't resolve. */
const BATTLE_MISSION = {
  'battle-karhupuisto-2v2': 'mission-bear-path',
  'battle-courtyard-3v3': 'mission-courtyard-receipts',
  'battle-kattilahalli-3v3': 'mission-courtyard-receipts',
};

export function createBattleState(definition, crew, state, data) {
  const required = definition.player_deployed;
  if (crew.length < required) throw new Error(`${definition.id} requires ${required} deployed crew`);
  const players = crew.slice(0, required).map((member, index) => makePlayer(member, state, index, required));
  const enemies = definition.opponents.map((opponent, index) => makeEnemy(opponent, index, state.battleOpeningNerve ?? 0));
  return {
    id: definition.id,
    missionId: BATTLE_MISSION[definition.id] ?? null,
    // content's own field, on battle-hermanni-training: no mission, no
    // permanent crew injury, no campaign-clock cost — see
    // `recordBattleConsequences()` in app.js.
    training: Boolean(definition.training),
    format: definition.format,
    sceneAssetId: definition.scene_asset_id,
    objective: definition.objective,
    round: 1,
    phase: 'player',
    selectedId: players[0]?.id ?? null,
    action: null,
    acted: [],
    // COMBAT.md §6.2 / fight_manager.gd: player_stance defaults to
    // HOLD_THE_LINE — the same default as the Godot side.
    stance: STANCE.HOLD_THE_LINE,
    players,
    enemies,
    // EquipmentRules.weapons(): every registered item, keyed by id, reach
    // and tuning derived from its own `hold`/`reach_pattern` — not a
    // hand-kept catalogue in this file.
    weapons: weaponsFrom(data ? [...data.equipment.values()] : []),
    // EquipmentRules.items(): the support-kind half of the same list, in
    // the shape `useItem()` reads.
    items: itemsFrom(data ? [...data.equipment.values()] : []),
    cover: buildCover(definition),
    withdrawal: definition.withdrawal,
    negotiation: definition.negotiation,
    status: 'active',
    result: null,
    log: [`Round 1. ${definition.objective}`],
    // Heat and police (COMBAT.md §9.5) — see the block below `enemyPhase()`.
    // `police` is a THIRD side, not battle.players/battle.enemies grown by
    // one: fight_manager.gd's own Fighter.Side.THIRD_PARTY, occupying the
    // shared grid like anyone else but never a valid attack target for
    // either side (attackTargets() excludes it explicitly).
    heat: 0,
    firearmHeard: false,
    police: [],
    policeArrived: false,
    policeEntryDepth: -1,
    policePosture: null,
    policeResolved: false,
    policeTaken: [],
    policeSaved: [],
  };
}

export function units(battle, side) {
  return (side === 'player' ? battle.players : battle.enemies).filter(unit => unit.alive);
}

export function selectedUnit(battle) {
  return battle.players.find(unit => unit.id === battle.selectedId && unit.alive) ?? null;
}

export function selectUnit(battle, id) {
  if (battle.status !== 'active' || battle.phase !== 'player') return false;
  const unit = battle.players.find(item => item.id === id && item.alive);
  if (!unit || battle.acted.includes(id)) return false;
  battle.selectedId = id;
  battle.action = null;
  return true;
}

export function selectAction(battle, action) {
  if (policeAwaitingPosture(battle)) return false;
  const unit = selectedUnit(battle);
  if (!unit || battle.acted.includes(unit.id)) return false;
  battle.action = action;
  return true;
}

/** The player's team-wide AUTO-play instruction (COMBAT.md §6.2). Changeable
 *  any time, including mid-round — it only affects `autoCommand()`'s choices
 *  from here on, never anything already resolved. */
export function selectStance(battle, stance) {
  if (!Object.values(STANCE).includes(stance)) return false;
  battle.stance = stance;
  return true;
}

/** All living fighters standing anywhere on the board, keyed by slot — the
 *  unified `_grid` fight_manager.gd walks: ONE grid, so a cell that holds a
 *  body blocks EITHER side's line, not just an ally's. Includes `police`:
 *  a third-party body still occupies its cell and still stops a
 *  non-piercing shot, it just never becomes a valid TARGET for either
 *  side (see `attackTargets()`). */
function occupiedGrid(battle) {
  const map = new Map();
  for (const unit of battle.players.concat(battle.enemies, battle.police ?? [])) {
    if (unit.alive) map.set(unit.cell, unit);
  }
  return map;
}

function weaponFor(battle, unit) {
  return battle.weapons?.[unit.equipment] ?? UNARMED;
}

/**
 * FightManager._get_attack_targets(), ported. Non-piercing: the frontmost
 * body or cover per lane; piercing: every body until hard cover. Reach
 * comes entirely from the equipped item's `reach_pattern` (equipment.js) —
 * nothing here reads `attacker.role`, which is what makes this the same
 * test for every fighter regardless of which side authored them.
 */
export function attackTargets(battle, attacker) {
  const targets = [];
  if (!attacker?.alive) return targets;
  const isPlayer = attacker.side === 'player';
  const weapon = weaponFor(battle, attacker);
  const laneSpread = weapon.laneSpread ?? 0;
  const piercing = weapon.piercing ?? false;
  const allowedRows = weapon.allowedRows ?? [ROW_FRONT];
  const { lane: fromLane, depth: fromDepth } = laneDepth(attacker);

  // allowedRows names rows within the ATTACKER'S OWN formation (front/
  // middle/back); a fighter who has advanced out of their own band counts
  // as front, by definition — Godot's ruling that crossing the whole board
  // is a normal position, not an edge case.
  let ownRow = rowOf(fromDepth, isPlayer);
  if (ownRow < 0) ownRow = ROW_FRONT;
  if (!allowedRows.includes(ownRow)) return targets;

  const laneMin = Math.max(0, fromLane - laneSpread);
  const laneMax = Math.min(LANES - 1, fromLane + laneSpread);
  const toward = isPlayer ? 1 : -1;
  const occupied = occupiedGrid(battle);

  for (let lane = laneMin; lane <= laneMax; lane += 1) {
    let d = fromDepth + toward;
    while (d >= 0 && d < totalRows()) {
      const cover = battle.cover.get(slotKey(lane, d));
      if (cover?.hardBlock) break;
      if (cover?.softBlock && !piercing) break;
      const other = occupied.get(slotKey(lane, d));
      if (other) {
        if (other.side !== attacker.side && other.side !== 'police' && other.alive) targets.push(other);
        if (!piercing) break;
      }
      d += toward;
    }
  }
  return targets;
}

function attackableInBattle(battle, attacker, target) {
  if (!attacker?.alive || !target?.alive) return false;
  return attackTargets(battle, attacker).some(item => item.id === target.id);
}

/**
 * Sync fire (COMBAT.md §9.13; PORTING.md §3.2 — this is where it's canonical
 * now, ported to Godot's fight_manager.gd, not the other way around). Every
 * OTHER active fighter on `attacker`'s own side who can also reach `target`
 * right now, using the SAME reach test a normal attack already uses
 * (`attackableInBattle`) — so there is no second targeting model to keep in
 * sync with the first.
 */
export function syncAlliesFor(battle, attacker, target) {
  const side = attacker.side === 'player' ? battle.players : battle.enemies;
  return side.filter(unit => unit.alive && unit.id !== attacker.id
    && attackableInBattle(battle, unit, target));
}

/**
 * `attacker` just landed a real hit (never a sync shot itself — one hop, not
 * a cascade) on `target`. Every ally `syncAlliesFor()` names fires too, for
 * free: it costs no action and isn't added to `battle.acted`, so a synced
 * ally still gets their own separate turn this round.
 */
function triggerSyncFire(battle, attacker, target) {
  for (const ally of syncAlliesFor(battle, attacker, target)) {
    // Re-checked per ally, not once before the loop: an earlier sync shot in
    // this same chain may already have downed the target, and nobody fires a
    // bonus round into a body already on the ground.
    if (!target.alive) return;
    battle.log.unshift(`${ally.name} syncs fire: ${hit(target, rollHarm(battle, ally, target))}`);
  }
}

function markActed(battle, unit) {
  if (!battle.acted.includes(unit.id)) battle.acted.push(unit.id);
  battle.action = null;
  const next = battle.players.find(item => item.alive && !battle.acted.includes(item.id));
  battle.selectedId = next?.id ?? unit.id;
}

/** `_roll_range(weapon.harm_min, weapon.harm_max)`, through the house seeded
 *  `rand01()` rather than a live `Math.random()`: `v3-playthrough` replays a
 *  whole run and cannot do that against an unseeded roll, so the same battle,
 *  round and pair always produce the same swing.
 *
 *  The band itself was already ported — `equipment.js`'s `HOLD_TUNING`, built
 *  into `battle.weapons` at creation — and simply never read for damage:
 *  every blow was a flat 1, so a sawn-off and a folding knife hit identically
 *  and the whole harm table was decoration. */
function rollHarm(battle, attacker, target) {
  const held = weaponFor(battle, attacker);
  // A support item is not a weapon, and swinging one is not an attack for
  // ZERO — you hit them with your hands instead. This is what Godot keeps an
  // `UNARMED` entry for, and skipping it stalls the fight outright: a crew
  // member holding a feature-phone (`utility-one`, harm 0/0) could never
  // finish anybody, and `v3-battle`'s 150-round auto-play never resolved.
  const band = (held.harmMax ?? 0) > 0 ? held : UNARMED;
  const min = band.harmMin ?? 1;
  const max = Math.max(min, band.harmMax ?? min);
  if (max === min) return min;
  return min + Math.floor(rand01(battle.id, battle.round, attacker.id, target.id, 'harm') * (max - min + 1));
}

function hit(target, amount = 1) {
  if (target.guard > 0) {
    target.guard -= 1;
    return `${target.name}'s guard tears instead of their condition.`;
  }
  target.hp = Math.max(0, target.hp - amount);
  if (target.hp === 0) {
    target.alive = false;
    return `${target.name} goes down. The consequence waits for the aftermath.`;
  }
  return `${target.name} loses condition (${target.hp}/${target.maxHp}).`;
}

export function playerAttack(battle, targetId) {
  if (policeAwaitingPosture(battle)) return { ok: false, message: 'The police are here. Answer them first.' };
  const attacker = selectedUnit(battle);
  const target = battle.enemies.find(item => item.id === targetId);
  if (!attacker || battle.action !== 'attack' || !attackableInBattle(battle, attacker, target)) return { ok: false, message: 'Target is outside this position and reach.' };
  if (attacker.role === 'watcher' && attacker.equipment === 'feature-phone'
      && (target.nerve > 0 || target.guard > 0)) {
    target.nerve = Math.max(0, target.nerve - 1);
    target.guard = Math.max(0, target.guard - 1);
    battle.log.unshift(`${attacker.name} marks ${target.name}'s lane. Guard and nerve drop.`);
  } else {
    battle.log.unshift(`${attacker.name}: ${hit(target, rollHarm(battle, attacker, target))}`);
    triggerSyncFire(battle, attacker, target);
  }
  markActed(battle, attacker);
  checkBattleEnd(battle);
  return { ok: true };
}

/**
 * `Command.Type.ITEM`, ported: `_resolve_item()` looks up the item's
 * `effect_type` and applies the one matching branch it has code for. This
 * build has no `tempo` and no discrete status track beyond hp/nerve/alive
 * (`QUEUE.md`'s audited "campaign progression" gap), so only the two
 * effect types with a real stat to touch — `restore_condition`,
 * `restore_nerve` — do anything; everything else (`boost_tempo`,
 * `clear_status`, `apply_status`, and the slice's own registered
 * `'signal'`) falls through exactly as it does in Godot's own `match`,
 * which has no `'signal'` branch either: a legal command that logs and
 * spends the action, nothing more. Always targets the user — Godot's
 * `target: 'ally'` field implies a picker; building one for an item with
 * no observable effect on either build is not attempted here.
 */
export function useItem(battle, itemId) {
  if (policeAwaitingPosture(battle)) return { ok: false, message: 'The police are here. Answer them first.' };
  const unit = selectedUnit(battle);
  if (!unit || battle.action !== 'item' || !(unit.itemIds ?? []).includes(itemId)) return { ok: false, message: 'That item is not carried.' };
  const item = battle.items?.[itemId];
  if (!item) return { ok: false, message: 'That item is not carried.' };
  switch (item.effectType) {
    case 'restore_condition':
      unit.hp = Math.min(unit.maxHp, unit.hp + item.magnitude);
      battle.log.unshift(`${unit.name} uses ${itemId}: condition rises to ${unit.hp}/${unit.maxHp}.`);
      break;
    case 'restore_nerve':
      unit.nerve = Math.min(unit.maxNerve, unit.nerve + item.magnitude);
      battle.log.unshift(`${unit.name} uses ${itemId}: nerve rises to ${unit.nerve}/${unit.maxNerve}.`);
      break;
    default:
      battle.log.unshift(`${unit.name} uses ${itemId}.`);
  }
  if (item.singleUse) unit.itemIds = unit.itemIds.filter(id => id !== itemId);
  markActed(battle, unit);
  return { ok: true };
}

export function brace(battle) {
  if (policeAwaitingPosture(battle)) return { ok: false, message: 'The police are here. Answer them first.' };
  const unit = selectedUnit(battle);
  if (!unit || battle.action !== 'brace') return { ok: false, message: 'Select a crew member first.' };
  // Both ceilings were the literal 3 that every stat used to be. Guard's
  // still is — nothing authors a guard ceiling — but NERVE is now the
  // fighter's own, and leaving the literal there capped a nerve-7 muscle at
  // 3: their nerve could never fill, so `autoCommand()`'s guard weight
  // (which rises as nerve falls) stayed high and the crew braced forever
  // without ever attacking. A 150-round auto-play ended with both opponents
  // untouched at full condition.
  unit.guard = Math.min(GUARD_CEILING, unit.guard + 1);
  unit.nerve = Math.min(unit.maxNerve ?? GUARD_CEILING, unit.nerve + 1);
  battle.log.unshift(`${unit.name} braces: guard ${unit.guard}, nerve ${unit.nerve}.`);
  markActed(battle, unit);
  return { ok: true };
}

/**
 * FightManager.free_slots_for(), ported — every unoccupied cell on the
 * WHOLE shared board, not merely adjacent ones and not merely a unit's own
 * half. Godot's own version loops `range(3)` rather than
 * `FightBoard.total_rows()`, which is a leftover from before the board was
 * unified (board.gd's own docstring: "a `range(3)` in the intent scan" was
 * one of four places the three-row assumption hid, three of which were
 * already found and fixed there) — as written it silently limits every
 * fighter, opposition included, to depths 0-2 (the PLAYER's home band).
 * That contradicts the owner ruling both `free_slots_for`'s own comment and
 * board.gd quote outright ("crews start in their colour areas and can move
 * to all coloured areas", "[the neutral rows] are ground a unit can be
 * pushed or repositioned into") and has no adjacency check of its own to
 * fall back on — a reposition here is a placement anywhere free, not a
 * step. This port uses the documented-correct wide range rather than
 * replicating what reads as an unported leftover; flagged here rather than
 * silently diverging.
 */
export function validMoveCells(battle, unit = selectedUnit(battle)) {
  if (!unit) return [];
  const occupied = occupiedGrid(battle);
  const cells = [];
  for (let lane = 0; lane < LANES; lane += 1) {
    for (let depth = 0; depth < totalRows(); depth += 1) {
      const cell = slotKey(lane, depth);
      if (cell !== unit.cell && !occupied.has(cell)) cells.push(cell);
    }
  }
  return cells;
}

export function moveUnit(battle, cell) {
  if (policeAwaitingPosture(battle)) return { ok: false, message: 'The police are here. Answer them first.' };
  const unit = selectedUnit(battle);
  if (!unit || battle.action !== 'move' || !validMoveCells(battle, unit).includes(cell)) return { ok: false, message: 'That formation cell is not reachable.' };
  const old = unit.cell;
  unit.cell = cell;
  battle.log.unshift(`${unit.name} repositions ${describeCell(old)} → ${describeCell(cell)}.`);
  markActed(battle, unit);
  return { ok: true };
}

// ── heat, and who it brings (COMBAT.md §9.5) ───────────────────────────────
//
// Ported from `FightManager`'s `heat`/`police_*` block. Heat rises with
// firearms, long fights and bodies on the ground until somebody turns up —
// the counterweight to a quick, merciful win being worth something
// mechanically, not only morally. Skipped entirely for a training battle
// (`battle.training`): "no cost — this is a test area" already covers heat
// the same way it covers crew injury and the campaign clock.
const HEAT_PER_ROUND = 1.0; // per ROUND, for simply still being here
const HEAT_PER_DOWNED = 2.5; // per body on the ground, either side — the loud one
const HEAT_FIREARM = 4.0; // once, the first round a lethal-held weapon is in play
const HEAT_THRESHOLD = 12.0; // PLAYTEST GATE in Godot too, not canon

const POLICE_BASE = 2;
const POLICE_PER_STEP = 8.0;
const POLICE_MAX = 5;
// How close to the police a fallen crew member has to be before pulling
// them out costs you the person doing the pulling.
const RESCUE_DANGER_DEPTH = 1;

export const POLICE_POSTURE = { BACK_OFF: 'BACK_OFF', HELP_FRIENDS: 'HELP_FRIENDS', ENGAGE: 'ENGAGE' };

function weaponIsLethal(battle, unit) {
  return Boolean(weaponFor(battle, unit)?.lethal);
}

/** How many turn up, scaled to how loud it got — a base pair, plus one for
 *  every step of noise past the threshold, capped: past a certain number
 *  they stop being a complication and start being a wall. */
function policeCount(battle) {
  const extra = Math.floor((battle.heat - HEAT_THRESHOLD) / POLICE_PER_STEP);
  return Math.min(POLICE_MAX, Math.max(POLICE_BASE, POLICE_BASE + Math.max(extra, 0)));
}

/** Lanes filled from the middle outward, so a small number reads as a
 *  group arriving rather than two figures at opposite edges. */
function spawnPolice(battle) {
  const n = policeCount(battle);
  const mid = Math.floor(LANES / 2);
  const order = [];
  for (let step = 0; step < LANES; step += 1) {
    const lane = mid + Math.floor((step + 1) / 2) * (step % 2 === 0 ? 1 : -1);
    if (lane >= 0 && lane < LANES) order.push(lane);
  }
  const occupied = occupiedGrid(battle);
  let placed = 0;
  for (const lane of order) {
    if (placed >= n) break;
    const cell = slotKey(lane, battle.policeEntryDepth);
    if (occupied.has(cell)) continue;
    battle.police.push({
      id: `police-${placed}`,
      name: 'Police',
      side: 'police',
      role: 'police',
      cell,
      hp: 8,
      maxHp: 8,
      guard: 0,
      nerve: 10,
      maxNerve: 10,
      alive: true,
      head: ENEMY_HEADS[0],
      torso: ROLE_PARTS.muscle[0],
      legs: ROLE_PARTS.muscle[1],
      equipment: 'unarmed',
    });
    placed += 1;
  }
}

/** Put them in the yard. They arrive behind whichever side is still
 *  standing in numbers — the ones who look like they are winning are the
 *  ones who look like they started it — never in the middle: the one
 *  entrance that threatens a formation instead of appearing inside it. */
function policeArrive(battle) {
  battle.policeArrived = true;
  const ours = battle.players.filter(item => item.alive).length;
  const theirs = battle.enemies.filter(item => item.alive).length;
  battle.policeEntryDepth = totalRows() - 1;
  if (ours >= theirs) battle.policeEntryDepth = 0;
  spawnPolice(battle);
  battle.log.unshift(`Sirens. Police arrive at the ${battle.policeEntryDepth === 0 ? 'crew’s' : 'opposition’s'} end of the yard.`);
}

function accrueHeat(battle) {
  if (battle.training || battle.policeArrived) return;
  battle.heat += HEAT_PER_ROUND;
  for (const unit of battle.players.concat(battle.enemies)) {
    if (!unit.alive) battle.heat += HEAT_PER_DOWNED;
  }
  if (!battle.firearmHeard) {
    // Every fighter who acted this round, either side — `battle.acted`
    // already tracks the player half; the current enemy AI gives every
    // living enemy exactly one action a round, so "alive when the enemy
    // phase runs" is that same set for the opposition.
    const acted = battle.players.filter(item => battle.acted.includes(item.id))
      .concat(battle.enemies.filter(item => item.alive));
    if (acted.some(unit => weaponIsLethal(battle, unit))) {
      battle.firearmHeard = true;
      battle.heat += HEAT_FIREARM;
    }
  }
  if (battle.heat >= HEAT_THRESHOLD) policeArrive(battle);
}

/** Still waiting on an answer — outranks every other command while true
 *  (COMBAT.md §9.5.2): the player cannot attack, brace, reposition, end
 *  the turn, withdraw or negotiate until the posture question is answered. */
export function policeAwaitingPosture(battle) {
  return Boolean(battle.policeArrived) && !battle.policeResolved;
}

/** BACK_OFF loses everyone on the ground. HELP_FRIENDS spends the people
 *  still standing to pull them out, nearest the police first (they are the
 *  ones actually in danger), and the ones close enough that the helper
 *  walks into it cost the helper too — a body on its feet for a body on
 *  the ground, usually a bad trade and meant to be. */
function resolvePoliceOutcome(battle) {
  battle.policeResolved = true;
  battle.policeTaken = [];
  battle.policeSaved = [];

  const fallen = battle.players.filter(item => !item.alive);
  if (battle.policePosture !== POLICE_POSTURE.HELP_FRIENDS) {
    for (const item of fallen) battle.policeTaken.push(item.id);
    return;
  }

  const entryDepth = battle.policeEntryDepth;
  const byDanger = [...fallen].sort((a, b) =>
    Math.abs(laneDepth(a).depth - entryDepth) - Math.abs(laneDepth(b).depth - entryDepth));
  const standing = battle.players.filter(item => item.alive);
  for (const item of byDanger) {
    if (standing.length === 0) { battle.policeTaken.push(item.id); continue; }
    const helper = standing.pop();
    battle.policeSaved.push(item.id);
    if (Math.abs(laneDepth(item).depth - entryDepth) <= RESCUE_DANGER_DEPTH) {
      battle.policeTaken.push(helper.id);
    }
  }
}

/** Answer them. Returns false for a posture that is not available —
 *  ENGAGE is deliberately refused rather than faked: fighting the police
 *  means a third combat side, which this build (like Godot's own) does
 *  not have. */
export function choosePolicePosture(battle, posture) {
  if (!battle.policeArrived || battle.policeResolved) return false;
  if (posture === POLICE_POSTURE.ENGAGE) return false;
  battle.policePosture = posture;
  resolvePoliceOutcome(battle);
  battle.log.unshift(battle.policeTaken.length
    ? `The police take ${battle.policeTaken.length} of the crew.`
    : 'The crew clears the yard before the police reach anyone.');
  return true;
}

/** Who the police take. Their default posture is subdue, and its bite is
 *  on the fallen: anyone downed on the board when they arrive is taken —
 *  a downed crew member is not merely hurt, they are gone. Before a
 *  posture is answered this reports the PROVISIONAL cost of doing
 *  nothing: everyone currently on the ground. */
export function takenByPolice(battle) {
  if (!battle.policeArrived) return [];
  if (battle.policeResolved) return battle.policeTaken;
  return battle.players.filter(item => !item.alive).map(item => item.id);
}

/** Who was pulled out. Empty unless somebody went back for them. */
export function savedFromPolice(battle) {
  return battle.policeSaved;
}

function enemyPhase(battle) {
  battle.phase = 'enemy';
  for (const enemy of battle.enemies.filter(item => item.alive)) {
    const targets = battle.players.filter(item => item.alive)
      .sort((a, b) => (a.guard + a.hp) - (b.guard + b.hp) || a.name.localeCompare(b.name));
    const target = targets.find(item => attackableInBattle(battle, enemy, item)) ?? targets[0];
    if (!target) break;
    battle.log.unshift(`${enemy.name}: ${hit(target, rollHarm(battle, enemy, target))}`);
    // Symmetric with the player side (COMBAT.md §9.13): sync fire is a
    // property of standing where a gun already reaches, not a player perk.
    triggerSyncFire(battle, enemy, target);
    target.nerve = Math.max(0, target.nerve - 1);
    if (target.nerve === 0 && target.alive) battle.log.unshift(`${target.name} is shaken; withdrawal stays available.`);
  }
  checkBattleEnd(battle);
  if (battle.status !== 'active') return;
  accrueHeat(battle);
  battle.round += 1;
  battle.phase = 'player';
  battle.acted = [];
  battle.players.filter(item => item.alive).forEach(item => { item.guard = Math.min(item.guard + 1, 2); });
  battle.selectedId = battle.players.find(item => item.alive)?.id ?? null;
  battle.log.unshift(`Round ${battle.round}. Enemy intent is pinned before the next commitment.`);
}

export function endPlayerPhase(battle) {
  if (battle.status !== 'active' || battle.phase !== 'player' || policeAwaitingPosture(battle)) return false;
  enemyPhase(battle);
  return true;
}

/**
 * Base score before the stance multiplier — ATTACK and GUARD are ported
 * faithfully from `FightManager._score_base()` (`fight_manager.gd:1629`):
 * same fractions, same constants (`1.0 + (1-nerve)*1.5 + (1-condition)*0.8`
 * for attack, `0.6 + (1-nerve)*1.2` for guard). REPOSITION keeps its flat
 * 0.4 base.
 *
 * What this deliberately does NOT port: `_score_base()`'s per-role
 * "behaviour_package" multiplier (collector/veteran/watcher/fixer/runner/
 * local_pusher). Player crew's `behaviour_package` there is literally their
 * `role` (`battle_builder.gd:212`), but crew roles are driver/fixer/local/
 * muscle/runner/watcher — three of six don't even appear in that match
 * statement, and reconciling the two vocabularies is its own investigation,
 * not part of a "minimal scorer" pass. Every role scores as Godot's
 * unlisted roles already do: no bonus, the `_:` default.
 */
/** `_score_base()`'s `behaviour_package` multipliers, now ported. Godot sets
 *  a crew member's package to their own ROLE (`battle_builder.gd:212`), so
 *  the two vocabularies were always meant to be one; `local` is spelled
 *  `local_pusher` there and is the only word that differs. `driver` and
 *  `muscle` appear in neither match statement and take the `_:` default of
 *  1.0, exactly as in Godot.
 *
 *  Skipping this was recorded as "its own investigation, not part of a
 *  minimal scorer pass", and the cost was REPOSITION. Without the package
 *  every role scores a flat 0.4 to move, which loses to GUARD at every
 *  nerve level — so nobody ever advanced. A crew that had killed everything
 *  in reach would stand and brace forever rather than close on the last
 *  opponent, and the fight could not end. The runner's 1.8 and the
 *  watcher's 1.2 are what make repositioning a real command at all. */
const BEHAVIOUR = {
  ATTACK: { collector: 1.4, veteran: 1.2, watcher: 0.4, fixer: 0.1, runner: 0.7 },
  GUARD: { local: 1.3, collector: 1.1, runner: 0.4 },
};
/** REPOSITION REPLACES the base rather than scaling it — the GDScript
 *  assigns (`score = 1.8`) where the other two multiply. */
const REPOSITION_BY_ROLE = { runner: 1.8, watcher: 1.2 };

function scoreBase(battle, type, unit, target) {
  switch (type) {
    case 'ATTACK': {
      if (!target) return 0;
      const targetNerveFraction = target.nerve / (target.maxNerve ?? 3);
      const targetConditionFraction = target.hp / target.maxHp;
      const base = 1.0 + (1 - targetNerveFraction) * 1.5 + (1 - targetConditionFraction) * 0.8;
      return base * (BEHAVIOUR.ATTACK[unit.role] ?? 1.0);
    }
    case 'GUARD': {
      const nerveFraction = unit.nerve / (unit.maxNerve ?? 3);
      const base = 0.6 + (1 - nerveFraction) * 1.2;
      return base * (BEHAVIOUR.GUARD[unit.role] ?? 1.0);
    }
    case 'REPOSITION':
      return REPOSITION_BY_ROLE[unit.role] ?? 0.4;
    default:
      return 0;
  }
}

/** `scoreBase() * stanceWeight()` — the same multiplication
 *  `FightManager._score_command()` does for the player side only. */
function scoreCommand(battle, type, unit, target) {
  return Math.max(scoreBase(battle, type, unit, target), 0) * stanceWeight(battle.stance, type);
}

/**
 * Where a unit should move to. Ported from TURF's `approachTile`/`planIntent`
 * (`turf/js/ai.js`, on Suds-Jack's gh-pages — `PORTING.md` §1.08 records it
 * as a sibling source), because it answers the question this one had wrong:
 *
 *   1. prefer a cell you can actually ATTACK FROM, best target first;
 *   2. failing that, the cell that CLOSES THE MOST DISTANCE.
 *
 * What was here before took the most-forward reachable cell instead, and
 * "most forward" on this board is the opposition's own back row. Measured on
 * `battle-karhupuisto-2v2`: the runner's first auto-move went from depth 2
 * straight to depth 7 — PAST both opponents, who stand at 5 and 6 — and
 * since reach is directional it could then never attack anything. It braced
 * for the rest of the fight, the muscle never moved at all, and the crew
 * were beaten to death without landing a single blow.
 *
 * That is also why `v3-battle`'s "auto command reaches a battle result"
 * passed for so long: it resolved as a LOSS every time, with both opponents
 * finishing at full condition. The assertion was true and proved nothing.
 * Only real stat lines (which stop the crew dying in three hits) made the
 * stall long enough to see.
 *
 * `unit.cell` is set and restored around the reach test rather than copied:
 * `attackTargets()` reads position off the unit, and a unit is a live
 * reference inside `battle.players`, so there is nothing to clone.
 */
function approachCell(battle, unit) {
  const foes = (unit.side === 'player' ? battle.enemies : battle.players).filter(item => item.alive);
  const cells = validMoveCells(battle, unit).slice().sort(); // stable, so the pick is deterministic
  if (!cells.length || !foes.length) return cells[0];
  const origin = unit.cell;
  const gapFrom = cell => {
    const { lane, depth } = parseSlotKey(cell);
    return Math.min(...foes.map(foe => {
      const at = parseSlotKey(foe.cell);
      return Math.abs(at.lane - lane) + Math.abs(at.depth - depth);
    }));
  };
  let attackFrom = null;
  let attackScore = -Infinity;
  let closest = cells[0];
  let closestGap = Infinity;
  for (const cell of cells) {
    unit.cell = cell;
    for (const foe of attackTargets(battle, unit)) {
      const score = scoreBase(battle, 'ATTACK', unit, foe);
      if (score > attackScore) { attackScore = score; attackFrom = cell; }
    }
    const gap = gapFrom(cell);
    if (gap < closestGap) { closestGap = gap; closest = cell; }
  }
  unit.cell = origin;
  return attackFrom ?? closest;
}

export function autoCommand(battle) {
  if (battle.status !== 'active' || policeAwaitingPosture(battle)) return false;
  for (const unit of battle.players.filter(item => item.alive && !battle.acted.includes(item.id))) {
    battle.selectedId = unit.id;

    // The best-scoring attackable target, not merely the first one — this is
    // what makes the ATTACK score (and its wounded-target preference) mean
    // anything at all.
    const reachable = battle.enemies.filter(item => attackableInBattle(battle, unit, item));
    let bestTarget = null;
    let bestTargetScore = -Infinity;
    for (const candidate of reachable) {
      const s = scoreBase(battle, 'ATTACK', unit, candidate);
      if (s > bestTargetScore) { bestTargetScore = s; bestTarget = candidate; }
    }

    const reposition = approachCell(battle, unit);

    // Pick the highest-scoring TYPE (deterministic top pick — the same
    // choice Godot's own `_ai_select_command(preview=true)` makes; the
    // weighted-random-across-top-3 personality variation on a live turn is
    // not ported, since web/'s auto-play has always been deterministic).
    const options = [
      bestTarget && { type: 'attack', score: scoreCommand(battle, 'ATTACK', unit, bestTarget) },
      { type: 'brace', score: scoreCommand(battle, 'GUARD', unit, null) },
      reposition && { type: 'move', score: scoreCommand(battle, 'REPOSITION', unit, null) },
    ].filter(Boolean).sort((a, b) => b.score - a.score);

    // Weighted-random across the top 3, not the flat top pick — ported from
    // `_ai_select_command()` (`fight_manager.gd:1591`), and load-bearing,
    // not decoration: an early cut of this always took the single best
    // score, and a unit whose own nerve had dropped could get GUARD-locked
    // permanently — nerve falling raises GUARD's score with no ceiling on
    // ATTACK's side, so once GUARD overtook ATTACK it never gave it back,
    // and a 2v2 sat at round 60 with neither enemy having taken real
    // damage. Weighting by score instead of always taking the max is what
    // stops a temporarily-dominant option from becoming a permanent one.
    // Seeded through the house `rand01()` (`market/model.mjs`), not
    // `Math.random()` — this codebase's one hash convention, so a replayed
    // seed reproduces the same fight.
    const top = options.slice(0, 3);
    const total = top.reduce((sum, entry) => sum + entry.score, 0);
    let choice = top[0]?.type ?? 'brace';
    if (total > 0) {
      const pick = rand01(battle.id, battle.round, unit.id, 'auto-command') * total;
      let acc = 0;
      for (const entry of top) {
        acc += entry.score;
        if (pick <= acc) { choice = entry.type; break; }
      }
    }
    if (choice === 'attack') {
      battle.action = 'attack';
      playerAttack(battle, bestTarget.id);
    } else if (choice === 'move') {
      battle.action = 'move';
      moveUnit(battle, reposition);
    } else {
      battle.action = 'brace';
      brace(battle);
    }
    if (battle.status !== 'active') break;
  }
  if (battle.status === 'active') enemyPhase(battle);
  return true;
}

export function withdrawBattle(battle) {
  if (battle.status !== 'active' || policeAwaitingPosture(battle) || battle.round < battle.withdrawal.available_from_round) return false;
  battle.status = 'resolved';
  battle.result = 'withdraw';
  battle.log.unshift(`The crew withdraws. ${battle.withdrawal.known_cost}.`);
  return true;
}

export function negotiateBattle(battle) {
  if (battle.status !== 'active' || policeAwaitingPosture(battle) || !battle.negotiation?.available) return false;
  const enemyNerve = battle.enemies.filter(item => item.alive).reduce((sum, item) => sum + item.nerve, 0);
  const can = battle.round >= 2 || enemyNerve <= 4;
  if (!can) return false;
  battle.status = 'resolved';
  battle.result = 'partial';
  battle.log.unshift('Both formations hold. A partial account replaces another round.');
  return true;
}

export function checkBattleEnd(battle) {
  if (!battle.enemies.some(item => item.alive)) {
    battle.status = 'resolved';
    battle.result = 'win';
  } else if (!battle.players.some(item => item.alive)) {
    battle.status = 'resolved';
    battle.result = 'loss';
  }
  return battle.result;
}

export function resultEffects(battle, data) {
  const mission = data.missions.get(battle.missionId);
  if (!mission) return [];
  if (battle.result === 'win') return mission.success_effects;
  if (battle.result === 'partial' || battle.result === 'withdraw') return mission.partial_effects;
  return mission.failure_effects;
}

export function injuredPlayers(battle) {
  return battle.players.filter(item => !item.alive).map(item => item.id);
}
