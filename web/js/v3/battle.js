import { stanceWeight, STANCE } from './stance.js?v=1';
import { rand01 } from '../../../market/model.mjs';
import {
  LANES, totalRows, rowOf, laneCentre,
  parseCell, defaultPlayerSlot, slotKey, parseSlotKey, describeSlot,
} from './grid.js?v=1';
import { weaponsFrom, UNARMED, ROW_FRONT } from './equipment.js?v=1';

const ROLE_PARTS = {
  runner: ['torso-runner-v03', 'legs-runner-v03'],
  watcher: ['torso-watcher-v03', 'legs-watcher-v03'],
  fixer: ['torso-fixer-v03', 'legs-fixer-v03'],
  muscle: ['torso-muscle-v03', 'legs-muscle-v03'],
  driver: ['torso-driver-v03', 'legs-driver-v03'],
  local: ['torso-local-v03', 'legs-local-v03'],
};
const ENEMY_HEADS = ['head-kallio-03-v03', 'head-kallio-09-v03', 'head-kallio-11-v03'];

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
    hp: 3,
    maxHp: 3,
    guard: member.role === 'muscle' ? 2 : 1,
    nerve: 3,
    maxNerve: 3,
    alive: status?.status !== 'missing',
    head: member.portrait_asset_id,
    torso,
    legs,
    equipment: member.initial_equipment?.[0] ?? 'feature-phone',
  };
}

function makeEnemy(opponent, index, openingNerve = 0) {
  const [torso, legs] = ROLE_PARTS[opponent.role] ?? ROLE_PARTS.local;
  // BattleBuilder._opponent_to_unit(): parse_cell() always answers for the
  // OPPOSITION band, centred onto the real board width.
  const slot = parseCell(opponent.cell);
  return {
    id: opponent.id,
    name: opponent.name,
    side: 'enemy',
    role: opponent.role,
    cell: slotKey(slot.lane, slot.depth),
    hp: 3,
    maxHp: 3,
    guard: opponent.role === 'muscle' ? 2 : 1,
    nerve: Math.max(1, 3 + openingNerve),
    maxNerve: 3,
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
    cover: buildCover(definition),
    withdrawal: definition.withdrawal,
    negotiation: definition.negotiation,
    status: 'active',
    result: null,
    log: [`Round 1. ${definition.objective}`],
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
 *  body blocks EITHER side's line, not just an ally's. */
function occupiedGrid(battle) {
  const map = new Map();
  for (const unit of battle.players.concat(battle.enemies)) {
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
        if (other.side !== attacker.side && other.alive) targets.push(other);
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
    battle.log.unshift(`${ally.name} syncs fire: ${hit(target)}`);
  }
}

function markActed(battle, unit) {
  if (!battle.acted.includes(unit.id)) battle.acted.push(unit.id);
  battle.action = null;
  const next = battle.players.find(item => item.alive && !battle.acted.includes(item.id));
  battle.selectedId = next?.id ?? unit.id;
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
  const attacker = selectedUnit(battle);
  const target = battle.enemies.find(item => item.id === targetId);
  if (!attacker || battle.action !== 'attack' || !attackableInBattle(battle, attacker, target)) return { ok: false, message: 'Target is outside this position and reach.' };
  if (attacker.role === 'watcher' && attacker.equipment === 'feature-phone'
      && (target.nerve > 0 || target.guard > 0)) {
    target.nerve = Math.max(0, target.nerve - 1);
    target.guard = Math.max(0, target.guard - 1);
    battle.log.unshift(`${attacker.name} marks ${target.name}'s lane. Guard and nerve drop.`);
  } else {
    battle.log.unshift(`${attacker.name}: ${hit(target)}`);
    triggerSyncFire(battle, attacker, target);
  }
  markActed(battle, attacker);
  checkBattleEnd(battle);
  return { ok: true };
}

export function brace(battle) {
  const unit = selectedUnit(battle);
  if (!unit || battle.action !== 'brace') return { ok: false, message: 'Select a crew member first.' };
  unit.guard = Math.min(3, unit.guard + 1);
  unit.nerve = Math.min(3, unit.nerve + 1);
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
  const unit = selectedUnit(battle);
  if (!unit || battle.action !== 'move' || !validMoveCells(battle, unit).includes(cell)) return { ok: false, message: 'That formation cell is not reachable.' };
  const old = unit.cell;
  unit.cell = cell;
  battle.log.unshift(`${unit.name} repositions ${describeCell(old)} → ${describeCell(cell)}.`);
  markActed(battle, unit);
  return { ok: true };
}

function enemyPhase(battle) {
  battle.phase = 'enemy';
  for (const enemy of battle.enemies.filter(item => item.alive)) {
    const targets = battle.players.filter(item => item.alive)
      .sort((a, b) => (a.guard + a.hp) - (b.guard + b.hp) || a.name.localeCompare(b.name));
    const target = targets.find(item => attackableInBattle(battle, enemy, item)) ?? targets[0];
    if (!target) break;
    battle.log.unshift(`${enemy.name}: ${hit(target)}`);
    // Symmetric with the player side (COMBAT.md §9.13): sync fire is a
    // property of standing where a gun already reaches, not a player perk.
    triggerSyncFire(battle, enemy, target);
    target.nerve = Math.max(0, target.nerve - 1);
    if (target.nerve === 0 && target.alive) battle.log.unshift(`${target.name} is shaken; withdrawal stays available.`);
  }
  checkBattleEnd(battle);
  if (battle.status !== 'active') return;
  battle.round += 1;
  battle.phase = 'player';
  battle.acted = [];
  battle.players.filter(item => item.alive).forEach(item => { item.guard = Math.min(item.guard + 1, 2); });
  battle.selectedId = battle.players.find(item => item.alive)?.id ?? null;
  battle.log.unshift(`Round ${battle.round}. Enemy intent is pinned before the next commitment.`);
}

export function endPlayerPhase(battle) {
  if (battle.status !== 'active' || battle.phase !== 'player') return false;
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
function scoreBase(battle, type, unit, target) {
  switch (type) {
    case 'ATTACK': {
      if (!target) return 0;
      const targetNerveFraction = target.nerve / (target.maxNerve ?? 3);
      const targetConditionFraction = target.hp / target.maxHp;
      return 1.0 + (1 - targetNerveFraction) * 1.5 + (1 - targetConditionFraction) * 0.8;
    }
    case 'GUARD': {
      const nerveFraction = unit.nerve / (unit.maxNerve ?? 3);
      return 0.6 + (1 - nerveFraction) * 1.2;
    }
    case 'REPOSITION':
      return 0.4;
    default:
      return 0;
  }
}

/** `scoreBase() * stanceWeight()` — the same multiplication
 *  `FightManager._score_command()` does for the player side only. */
function scoreCommand(battle, type, unit, target) {
  return Math.max(scoreBase(battle, type, unit, target), 0) * stanceWeight(battle.stance, type);
}

export function autoCommand(battle) {
  if (battle.status !== 'active') return false;
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

    // "Forward" is toward the OPPOSITION along the shared depth axis — for
    // the player that's increasing depth, for the opposition decreasing
    // depth (grid.js: front sits nearest the middle for both sides).
    // Candidates prefer the most-forward cell first, then the one closest
    // to the lane centre, matching the old sort's intent on the wider board.
    const { depth: fromDepth } = laneDepth(unit);
    const toward = unit.side === 'player' ? 1 : -1;
    const centre = laneCentre();
    const candidates = validMoveCells(battle, unit)
      .map(cell => ({ cell, ...parseSlotKey(cell) }))
      .sort((a, b) => (toward * b.depth - toward * a.depth) || Math.abs(a.lane - centre) - Math.abs(b.lane - centre));
    const forward = candidates.find(item => toward * (item.depth - fromDepth) > 0)?.cell;
    const reposition = forward ?? candidates[0]?.cell;

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
  if (battle.status !== 'active' || battle.round < battle.withdrawal.available_from_round) return false;
  battle.status = 'resolved';
  battle.result = 'withdraw';
  battle.log.unshift(`The crew withdraws. ${battle.withdrawal.known_cost}.`);
  return true;
}

export function negotiateBattle(battle) {
  if (battle.status !== 'active' || !battle.negotiation?.available) return false;
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
