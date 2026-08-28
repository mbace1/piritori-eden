import { stanceWeight, STANCE } from './stance.js?v=1';
import { rand01 } from '../../../market/model.mjs';

const ROWS = ['front', 'middle', 'back'];
const ROLE_PARTS = {
  runner: ['torso-runner-v03', 'legs-runner-v03'],
  watcher: ['torso-watcher-v03', 'legs-watcher-v03'],
  fixer: ['torso-fixer-v03', 'legs-fixer-v03'],
  muscle: ['torso-muscle-v03', 'legs-muscle-v03'],
  driver: ['torso-driver-v03', 'legs-driver-v03'],
  local: ['torso-local-v03', 'legs-local-v03'],
};
const ENEMY_HEADS = ['head-kallio-03-v03', 'head-kallio-09-v03', 'head-kallio-11-v03'];

function cellParts(cell) {
  const [row, lane] = cell.split('-');
  return { row, rowIndex: ROWS.indexOf(row), lane: Number(lane) };
}

function makePlayer(member, state, index, count) {
  const [torso, legs] = ROLE_PARTS[member.role] ?? ROLE_PARTS.local;
  const openingCells = count === 2 ? ['front-2', 'middle-1'] : ['front-2', 'middle-1', 'back-3'];
  const status = state.crewStatus[member.id];
  return {
    id: member.id,
    name: member.name,
    side: 'player',
    role: member.role,
    cell: openingCells[index] ?? `back-${index + 1}`,
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
  return {
    id: opponent.id,
    name: opponent.name,
    side: 'enemy',
    role: opponent.role,
    cell: opponent.cell,
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

export function createBattleState(definition, crew, state) {
  const required = definition.player_deployed;
  if (crew.length < required) throw new Error(`${definition.id} requires ${required} deployed crew`);
  const players = crew.slice(0, required).map((member, index) => makePlayer(member, state, index, required));
  const enemies = definition.opponents.map((opponent, index) => makeEnemy(opponent, index, state.battleOpeningNerve ?? 0));
  return {
    id: definition.id,
    missionId: definition.id === 'battle-karhupuisto-2v2' ? 'mission-bear-path' : 'mission-courtyard-receipts',
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
    cover: definition.cover,
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

export function attackable(attacker, target) {
  if (!attacker?.alive || !target?.alive) return false;
  const from = cellParts(attacker.cell);
  const to = cellParts(target.cell);
  const laneDistance = Math.abs(from.lane - to.lane);
  if (attacker.equipment === 'first-handgun') return laneDistance === 0;
  if (attacker.role === 'watcher' || attacker.role === 'fixer') return laneDistance <= 1;
  return from.row === 'front' && to.row === 'front' && laneDistance <= 1;
}

function attackableInBattle(battle, attacker, target) {
  if (attackable(attacker, target)) return true;
  if (!attacker?.alive || !target?.alive || cellParts(attacker.cell).row !== 'front') return false;
  const opponents = (attacker.side === 'player' ? battle.enemies : battle.players).filter(item => item.alive);
  const nearestRow = Math.min(...opponents.map(item => cellParts(item.cell).rowIndex));
  return cellParts(target.cell).rowIndex === nearestRow
    && Math.abs(cellParts(attacker.cell).lane - cellParts(target.cell).lane) <= 1;
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

export function validMoveCells(battle, unit = selectedUnit(battle)) {
  if (!unit) return [];
  const occupied = new Set(battle.players.filter(item => item.alive && item.id !== unit.id).map(item => item.cell));
  const from = cellParts(unit.cell);
  const cells = [];
  for (const row of ROWS) {
    for (let lane = 1; lane <= 3; lane += 1) {
      const cell = `${row}-${lane}`;
      const next = cellParts(cell);
      if (!occupied.has(cell) && Math.abs(next.rowIndex - from.rowIndex) + Math.abs(next.lane - from.lane) <= 1) cells.push(cell);
    }
  }
  return cells;
}

export function moveUnit(battle, cell) {
  const unit = selectedUnit(battle);
  if (!unit || battle.action !== 'move' || !validMoveCells(battle, unit).includes(cell)) return { ok: false, message: 'That paper cell is not reachable.' };
  const old = unit.cell;
  unit.cell = cell;
  battle.log.unshift(`${unit.name} repositions ${old} → ${cell}.`);
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

    const candidates = validMoveCells(battle, unit).filter(cell => cell !== unit.cell)
      .sort((a, b) => cellParts(a).rowIndex - cellParts(b).rowIndex
        || Math.abs(cellParts(a).lane - 2) - Math.abs(cellParts(b).lane - 2));
    const forward = candidates.find(cell => cellParts(cell).rowIndex < cellParts(unit.cell).rowIndex);
    const reposition = forward ?? candidates[0];

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
