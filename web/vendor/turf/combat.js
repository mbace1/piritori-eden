// THE ENGINE, as one system.
//
// ═══════════════════════════════════════════════════════════════════════
// THE INVARIANT: THE PLAYER SEES EVERY CONSEQUENCE BEFORE COMMITTING.
// ═══════════════════════════════════════════════════════════════════════
//
// Stated as a rule the code can be held to, not as a mood:
//
//   1. Every change to the board is produced by ONE function, `resolve`,
//      and `resolve` writes what it did to `state.log` as it does it. There
//      is no second description of "what happened" anywhere — the log IS
//      the effect list, and it is the same list anim.js animates and main.js
//      narrates.
//
//   2. A PREVIEW is `resolve` run on a copy of the state with an oracle in
//      place of the dice. It returns the copy's log. So what the board shows
//      before a commit is not a forecast that resembles the resolution: it is
//      the resolution, run early, with the one unknowable value — the roll —
//      held at a named branch. The only thing a commit can add is which
//      branch the dice took, and the odds of that were on the effect.
//
//   3. The TELEGRAPH is that preview, run for every rival's chosen plan. The
//      warning badge over an operator's head is read off the rival's own
//      preview — not recomputed by a second function that might disagree.
//
//   4. The ENEMY PHASE executes the frozen plan through the same `resolve`.
//      When the board has moved under a plan (an earlier rival took the tile,
//      shoved the target, or the rival died on the way), the rival HOLDS
//      rather than improvising something the player was never shown — and
//      the log says so, in a `note`. A divergence is never silent.
//
//   5. Nothing in this file depends on which input drove it, which lets the
//      whole thing run in bare node (test/smoke.mjs) — including the gate
//      that asserts point 2 literally: preview the command, commit it, and
//      the committed log equals one of the previewed branches.
//
// WHY THIS IS ONE MODULE AND NOT TWO. Through v34 the rival brain (ai.js)
// and the resolution (combat.js) were separate files, and ai.js could not
// import combat.js without a cycle. So the brain scored plans with its own
// arithmetic, the badge quoted damage with a separate call to the forecast,
// and the phase re-derived legality a third time. Three readings of one
// rule is how the badge came to under-report by exactly the momentum a
// four-tile step banks (grunt_runt, grunt_milo): the step happens in the
// phase, the forecast was taken before it. Put the brain beside the resolver
// and the plan can carry its own preview; the number on the badge and the
// number that lands are then the same number by construction.
//
// Pure data in, pure data out. Nothing here touches a canvas or the DOM.
import {
  key, inBounds, unitAt, moveRange, manhattan, hasLOS, coverSoftens, approachTile,
  firingTiles, firingTileScore,
} from './grid.js?v=7';
// The rule-of-sight switch is re-exported from HERE, not read off grid.js by
// a test: a test imports `../js/grid.js` bare while every engine module
// imports `./grid.js?v=N`, and to the module loader those are two modules —
// a switch flipped on the bare copy leaves the engine on its default, and
// four balance columns come back bit-identical while looking like a finding.
export { setLOSMode, getLOSMode, LOS_MODES } from './grid.js?v=7';
import { makeRng } from './rng.js?v=2';
// Which rules this board is played under (rules.js). Absent = TURF's own.
import { TURF, resolveRules, makeLcg } from './rules.js?v=1';
import { addMomentum, clearMomentum, evasionOf, momentumDamage, EVADE_PER } from './momentum.js?v=1';
import { abilityTargets, canAfford, findAbility, isFlanked } from './abilities.js?v=5';
import { magOf, needsReload, roundsLeft } from './ammo.js?v=3';

export { magOf, needsReload, roundsLeft };

// ── §1 state ────────────────────────────────────────────────────────
export function createEncounterState(encounter, unitDefs, weaponDefs, enemyDefs, seed = 1, hazardDefs = [], trinketDefs = []) {
  const weaponById = id => weaponDefs.find(w => w.id === id);
  const fullCover = new Set(encounter.cover.full.map(([x, y]) => key(x, y)));
  const partialCover = new Set(encounter.cover.partial.map(([x, y]) => key(x, y)));
  const rules = resolveRules(encounter.rules);
  // Edge cover names the walled face as a third element, [x, y, 'north'].
  const partialEdges = rules.partialCover === 'edge'
    ? new Map(encounter.cover.partial.map(([x, y, edge]) => [key(x, y), edge])) : null;
  // tileKey -> hazard def. A hazard never blocks movement (that is cover's
  // job) — it makes a tile cost something, so the board asks a question
  // instead of drawing a wall.
  const hazards = new Map();
  for (const [x, y, kind] of (encounter.hazards || [])) {
    const def = hazardDefs.find(h => h.id === kind);
    if (def) hazards.set(key(x, y), def); // an unknown kind is a content bug, not a crash
  }

  const units = [];
  encounter.playerSpawns.forEach((spawn, i) => {
    const def = unitDefs.find(u => u.id === spawn.unit);
    units.push(makeUnit(`p${i}`, def, weaponById(def.weapon), 'player', spawn, rules));
  });
  encounter.enemySpawns.forEach((spawn, i) => {
    const def = enemyDefs.find(e => e.id === spawn.enemy);
    units.push(makeUnit(`e${i}`, def, weaponById(def.weapon), 'enemy', spawn, rules));
  });
  // Objective units — the thing a `destroy` mission is about. A third
  // faction rather than a new entity type, because "a thing on a tile with
  // hp that can be attacked" is what a unit already IS: attackableTargets
  // filters on `faction !== mine`, so both sides can hit it for free, while
  // the win check and the rival brain filter on 'enemy' and 'player' by name
  // and never see it. It cannot move, has no weapon, and is never asked to act.
  (encounter.objectives || []).forEach((spawn, i) => {
    units.push({
      uid: `o${i}`, defId: spawn.id, name: spawn.name, faction: 'objective',
      role: 'objective', weapon: null, baseWeapon: null,
      hp: spawn.hp, maxHp: spawn.hp, move: 0,
      x: spawn.x, y: spawn.y,
      actedMove: true, actedAction: true,
      kills: 0, xp: 0, level: 1, trinkets: [],
    });
  });

  const state = {
    encounterId: encounter.id,
    grid: encounter.grid,
    fullCover, partialCover, hazards,
    // Extraction tiles. A Set of tile keys — empty for every other mode, so
    // nothing downstream needs to know which mode is running.
    extract: new Set((encounter.extract || []).map(([x, y]) => key(x, y))),
    // Reinforcements: rivals that arrive part-way through, on a schedule the
    // player can SEE coming (MST_PARITY §2.4). A copy, because arrivals are
    // consumed as they land and an encounter def is shared across boots.
    reinforcements: (encounter.reinforcements || []).map((r, i) => ({ ...r, rid: `r${i}` })),
    // Units holding fire (Overwatch). Emptied at the top of every player
    // turn — a posture for one enemy phase, never a standing order.
    overwatch: new Set(),
    win: encounter.win || { mode: 'eliminate' },
    // Only a board that opted into a profile carries these, so TURF's own
    // state is the shape it always was.
    ...(encounter.rules != null ? { rules, partialEdges, items: { ...(encounter.items || {}) } } : {}),
    units,
    turn: 'player',
    round: 1,
    selected: null,
    telegraph: new Map(),
    enemyPlan: new Map(),
    enemyQueue: [],
    log: [],
    result: null,
    rng: rules.dice === 'lcg' ? makeLcg(seed) : makeRng(seed),
    weaponDefs, enemyDefs, trinketDefs,
    drops: [], // { x, y, weaponId | trinketId }
  };
  // THE DICE, behind one seam. Everything that rolls asks `state.roll(kind,
  // actor)`, and on the real state that is the rng. A preview swaps this
  // for an oracle (see previewOracle) on a COPY, which is the whole
  // mechanism by which a preview is the resolution rather than a model of
  // it. Nothing else may read `state.rng` directly.
  state.roll = () => state.rng();
  planAllIntents(state);
  return state;
}

const getWeapon = (state, id) => state.weaponDefs.find(w => w.id === id);
const getTrinket = (state, id) => (state.trinketDefs || []).find(t => t.id === id);

// `unit.weapon` is the weapon AS IT ACTUALLY FIRES — base plus every
// trinket's weapon-field bonus — and `unit.baseWeapon` is what was picked up.
// Recomputed into unit.weapon rather than exposed as a getter so grid.js
// (which cannot import this file) reads the right range with no new import.
// Recompute on both events that can change the answer: a weapon swap and a
// trinket pickup.
function recomputeWeapon(unit) {
  const base = unit.baseWeapon || unit.weapon;
  // A picked-up gun comes loaded, and a trinket that changes the weapon must
  // not leave a stale round count from the old one behind.
  if (unit.ammo == null || magOf(base) !== magOf(unit.weapon)) unit.ammo = magOf(base);
  if (!unit.trinkets || !unit.trinkets.length) { unit.weapon = base; return; }
  const w = { ...base };
  for (const t of unit.trinkets) {
    const e = t.effect || {};
    if (e.damage) w.damage += e.damage;
    if (e.range) w.range += e.range;
    if (e.hitChance) w.hitChance = Math.min(1, w.hitChance + e.hitChance);
  }
  unit.weapon = w;
}

// Re-apply a saved trinket list by id (main.js's crewProgress, across
// encounters). Goes through applyTrinket so the stat and weapon effects land
// on this encounter's freshly-built unit instead of being restored as inert
// data.
export function applyTrinkets(unit, ids, defs) {
  for (const id of ids) {
    const def = defs.find(t => t.id === id);
    if (def) applyTrinket(unit, def);
  }
}

// maxHp also heals by the same amount: a +2 max that leaves you on the same
// hp is a promise rather than a pickup.
function applyTrinket(unit, def) {
  unit.trinkets.push(def);
  const e = def.effect || {};
  if (e.maxHp) { unit.maxHp += e.maxHp; unit.hp += e.maxHp; }
  if (e.move) unit.move += e.move;
  recomputeWeapon(unit);
}

function makeUnit(uid, def, weapon, faction, spawn, rules = TURF) {
  return {
    // Profile-only stats (rules.js): armour absorbs a blow before hp, items
    // are single-use kit. Never added under TURF's own rules.
    ...(rules.armour ? { armour: def.armour || 0 } : {}),
    ...(rules.items ? { items: [...(def.items || [])] } : {}),
    uid, defId: def.id, name: def.name, faction, role: def.role, weapon,
    baseWeapon: weapon,
    // Starts loaded. Null for melee; every ammo check goes through
    // magOf/needsReload rather than reading this directly.
    ammo: magOf(weapon),
    // The skill loadout, from any of abilities.json's lines (GDD §5.1).
    // Copied off the def: a unit's kit is per-UNIT and levelling grows it.
    abilities: def.abilities ? [...def.abilities] : null,
    // The rival brain reads these; absent on player units and on any enemy
    // not given one, where the behaviour table falls back to `charger`.
    behaviour: def.behaviour, focus: def.focus,
    hp: def.hp, maxHp: def.hp, move: def.move, portrait: def.portrait, sprite: def.sprite,
    x: spawn.x, y: spawn.y,
    actedMove: false, actedAction: false,
    kills: 0, xp: 0, level: 1,
    trinkets: [],
  };
}

// ── §2 queries ──────────────────────────────────────────────────────
export const hazardAt = (state, x, y) => (state.hazards ? state.hazards.get(key(x, y)) : null) || null;
export const getUnit = (state, uid) => state.units.find(u => u.uid === uid);
export const livingPlayers = state => state.units.filter(u => u.faction === 'player' && u.hp > 0);
export const livingEnemies = state => state.units.filter(u => u.faction === 'enemy' && u.hp > 0);
export const canUnitAct = unit => unit.hp > 0 && (!unit.actedMove || !unit.actedAction);

// A tile you can legally move to right now (the move command, and the range
// highlight in input.js/render.js, read the same map).
export function movableTiles(state, unit) {
  return unit.actedMove ? new Map() : moveRange(state, unit);
}

// Every target this unit could attack from SOME reachable tile this turn.
// An empty magazine removes the option entirely rather than offering a shot
// that then fails: the board must never highlight something it will refuse.
export function attackableTargets(state, unit) {
  if (unit.actedAction) return [];
  if (needsReload(unit)) return [];
  const out = [];
  for (const target of state.units) {
    if (target.hp <= 0 || target.faction === unit.faction) continue;
    if (approachTile(state, unit, target)) out.push(target.uid);
  }
  return out;
}

// How much cover an adjacent planted ally is giving this unit. Zero for
// melee, like every other evasion term.
export function guardAt(state, unit) {
  let best = 0;
  for (const u of state.units) {
    if (u.faction !== unit.faction || u.hp <= 0 || !u.guard) continue;
    if (u.uid === unit.uid) continue;
    if (manhattan(u, unit) > 1) continue;
    best = Math.max(best, u.guard);
  }
  return best / 100;
}

export const COVER_PENALTY = 0.3;

// THE ONE PLACE the odds are worked out. resolveStrike calls this, so the
// number quoted and the number rolled against are one piece of arithmetic.
// Pure — no rng, no mutation. `from` lets a caller ask about a tile the
// attacker has not reached yet; in practice every caller now asks through
// the resolver instead, which has ALREADY stepped there and banked the
// step's momentum — the difference is exactly the +1 the badge used to miss.
export function forecastAttack(state, attacker, target, weapon, opts = {}, from = attacker) {
  const rules = state.rules || TURF;
  let chance = opts.accuracy != null ? opts.accuracy : weapon.hitChance;
  if (opts.accuracyMod) chance += opts.accuracyMod;
  const cover = weapon.archetype === 'ranged' && coverSoftens(state, from, target);
  if (cover) chance -= rules.coverPenalty;
  // A moving target is harder to shoot (momentum.js) — where the rules
  // have momentum at all.
  const evade = weapon.archetype === 'ranged' && rules.momentum ? evasionOf(target, weapon) : 0;
  chance -= evade;
  // Planted (Anchor line), read off the BOARD so it stops the moment the
  // anchor moves.
  const guard = guardAt(state, target);
  chance -= guard;
  chance = Math.max(0.05, Math.min(1, chance));
  const bonus = opts.flatDamage != null ? 0 : (rules.momentum ? momentumDamage(attacker) : 0) + (opts.damageBonus || 0);
  const base = opts.flatDamage != null ? opts.flatDamage : weapon.damage;
  const damage = opts.flatDamage != null ? opts.flatDamage : base + bonus;
  const shots = opts.shots || 1;
  // Armour takes the blow first; a weapon's pierce ignores that much of it.
  const armour = rules.armour ? (() => {
    const armourDamage = Math.min(target.armour || 0, Math.max(0, damage - (weapon.pierce || 0)));
    return { armourDamage, hpDamage: Math.min(target.hp, damage - armourDamage) };
  })() : null;
  return {
    chance, cover, evade, guard, base, bonus, damage, shots,
    ...(armour || {}),
    lethal: armour ? armour.hpDamage >= target.hp : damage >= target.hp,
    knockback: opts.knockback != null ? opts.knockback : weapon.knockback,
  };
}

// ── §3 THE RESOLVER ─────────────────────────────────────────────────
// One entry point for every change to the board. `cmd` is assumed LEGAL —
// the public functions in §6 validate and refuse; this executes. Anything
// it does, it logs. Nothing outside this section (and the phase turnover in
// §8) mutates a unit's position, health, ammo, momentum or flags.
function resolve(state, cmd) {
  switch (cmd.type) {
    case 'move': return resolveMove(state, cmd);
    case 'attack': return resolveAttackCmd(state, cmd);
    case 'ability': return resolveAbility(state, cmd);
    case 'reload': return resolveReload(state, cmd);
    case 'rival': return resolveRival(state, cmd);
    case 'brace': return resolveBrace(state, cmd);
    case 'item': return resolveItem(state, cmd);
    default: throw new Error(`resolve: unknown command '${cmd.type}'`);
  }
}

function resolveMove(state, { uid, x, y }) {
  const unit = getUnit(state, uid);
  // Momentum is banked from the distance actually travelled, before the
  // position is overwritten.
  addMomentum(unit, Math.abs(x - unit.x) + Math.abs(y - unit.y));
  unit.x = x; unit.y = y;
  unit.actedMove = true;
  state.log.push({ type: 'move', uid, x, y, momentum: unit.momentum });
  // Hazard first, then loot: a unit that walks into an open stairwell does
  // not get to pick up the pistol lying in it on the way down.
  const hazard = enterHazard(state, unit, 'move');
  const pickedUp = unit.hp > 0 ? pickUpDropAt(state, unit) : null;
  return { hazard, pickedUp };
}

// An attack, optionally with the step that reaches it — ONE command, so a
// preview shows the hazard on the approach and the shot in one effect list,
// and so the shot is forecast from the tile you end up on with the momentum
// the step banked. Through v34 orderAttack was two commits (a move, then an
// attack) and the seam between them is where the forecast lost the step.
function resolveAttackCmd(state, { uid, targetUid, from }) {
  const attacker = getUnit(state, uid);
  let stepped = null;
  if (from && (from.x !== attacker.x || from.y !== attacker.y)) {
    stepped = resolveMove(state, { uid, x: from.x, y: from.y });
    if (attacker.hp <= 0 || state.result) return { stepped, attack: null, ended: true };
  }
  const target = getUnit(state, targetUid);
  // The step can change the gun (a pickup on the way), and the new gun may
  // not reach. The board offered the shot with the OLD range; refusing here
  // rather than firing something else is the honest outcome, and it is
  // logged so the player is told, not left to notice.
  if (!target || target.hp <= 0
      || manhattan(attacker, target) > attacker.weapon.range
      || !hasLOS(state, attacker, target)) {
    state.log.push({ type: 'held', uid, targetUid, reason: 'out-of-position' });
    return { stepped, attack: null, held: 'out-of-position' };
  }
  const attack = resolveStrike(state, attacker, target, attacker.weapon);
  attacker.actedAction = true;
  return { stepped, attack };
}

function resolveReload(state, { uid }) {
  const unit = getUnit(state, uid);
  unit.ammo = magOf(unit.weapon);
  unit.actedAction = true;
  state.log.push({ type: 'reload', uid, name: unit.name, ammo: unit.ammo });
  return {};
}

// Profile verbs (rules.js). Each spends the ACTION and never the move, like
// a reload, and each writes what it did to the log like everything else.
function resolveBrace(state, { uid }) {
  const unit = getUnit(state, uid), { armour, cap } = state.rules.brace;
  unit.armour = Math.min(cap, (unit.armour || 0) + armour);
  unit.actedAction = true;
  state.log.push({ type: 'brace', uid, name: unit.name, armour: unit.armour });
  return {};
}

function resolveItem(state, { uid, itemId }) {
  const unit = getUnit(state, uid), def = state.items[itemId];
  const before = unit.hp;
  if (def.effectType === 'restore_condition') unit.hp = Math.min(unit.maxHp, unit.hp + def.magnitude);
  // A NEW array: a preview's copy shares this unit's list by reference.
  if (def.singleUse) { const i = unit.items.indexOf(itemId); unit.items = unit.items.filter((_, j) => j !== i); }
  unit.actedAction = true;
  state.log.push({ type: 'item', uid, name: unit.name, itemId, healed: unit.hp - before });
  return {};
}

// `cmd.targets` is the resolved list (validated in useAbility); `cmd.tile`
// for Barricade. Each case reduces to calls this file already makes for an
// ordinary attack, so an ability can never do something the normal path
// cannot explain.
function resolveAbility(state, { uid, ability, targets, tile, shots }) {
  const unit = getUnit(state, uid);
  const results = [];
  if (ability.shape === 'self') {
    if (ability.id === 'overwatch') state.overwatch.add(unit.uid);
    else unit.guard = ability.guard;  // Planted, cleared at the top of its own next turn
    state.log.push({ type: 'ability', uid, ability: ability.id, name: ability.name });
  } else if (ability.shape === 'empty-tile') {
    state.partialCover.add(key(tile.x, tile.y));
    state.log.push({ type: 'ability', uid, ability: ability.id, name: ability.name, x: tile.x, y: tile.y });
  } else {
    // adjacent-all resolves each body once; a single target takes `shots`
    // strikes. Either way a body killed by an earlier strike is not still
    // standing for the next — a second barrel is not fired into a corpse.
    const sequence = ability.shape === 'adjacent-all' ? targets : Array(shots || 1).fill(targets[0]);
    for (const tuid of sequence) {
      const t = getUnit(state, tuid);
      if (!t || t.hp <= 0) continue;
      results.push(resolveStrike(state, unit, t, unit.weapon, abilityOpts(ability, state, unit, t)));
    }
  }
  // Charged once, whatever the shape.
  unit.momentum = Math.max(0, (unit.momentum || 0) - ability.cost);
  unit.actedAction = true;
  return { results };
}

// Per-TARGET, because the flank bonus depends on who is being hit and who
// else is standing next to them.
function abilityOpts(ability, state, unit, target) {
  const flanked = target && isFlanked(state, unit, target, manhattan);
  return {
    ability: ability.id,
    flanked,
    accuracy: ability.accuracy,
    accuracyMod: ability.accuracy != null ? 0 : ability.accuracyMod,
    damageBonus: (ability.damageMode === 'weapon' ? (ability.damage || 0) : 0)
      + (flanked ? (ability.flankBonus || 0) : 0),
    flatDamage: ability.damageMode === 'flat' ? ability.damage : null,
    knockback: ability.knockback,
    slow: ability.slow,
    // The ability's own cost is the price; the swing must not also empty
    // the pool.
    keepMomentum: true,
  };
}

// One rival's turn, from its frozen plan. This is point 4 of the invariant:
// the plan is executed as shown, and where the board has moved under it the
// rival HOLDS and the log names why. It never improvises — a rival that
// re-targeted mid-phase would be doing something the player was not shown.
function resolveRival(state, { uid, plan }) {
  const enemy = getUnit(state, uid);
  let moved = null, attacked = null, reloaded = false, note = null;
  // FROZEN plans (rules.js): a plan the board has broken is cancelled WHOLE
  // — no step, no swing — because a rival that walked somewhere and then
  // found nothing to hit would be doing half of something it never showed.
  if (state.rules && state.rules.plans === 'frozen') {
    const broken = frozenPlanBroken(state, enemy, plan);
    if (broken) {
      state.log.push({ type: 'enemy-turn', uid, name: enemy.name, moved, attacked, reloaded, note: broken });
      return { moved, attacked, reloaded, note: broken };
    }
  }
  if (plan.moveTo && (plan.moveTo.x !== enemy.x || plan.moveTo.y !== enemy.y)) {
    const { x, y } = plan.moveTo;
    // Independent plans can collide: an earlier rival this phase may have
    // taken the tile. That is the one thing a frozen plan cannot see.
    if (state.fullCover.has(key(x, y)) || unitAt(state, x, y, enemy)) {
      note = 'blocked';
    } else {
      // Rivals bank momentum from their own step exactly as operators do —
      // evasion has to cut both ways or closing on a skirmisher is free.
      addMomentum(enemy, Math.abs(x - enemy.x) + Math.abs(y - enemy.y));
      enemy.x = x; enemy.y = y;
      moved = { x, y };
      enterHazard(state, enemy, 'move');
      // Overwatch fires HERE — after the step, before the rival acts. The
      // only reaction in the game, and what stops crossing open ground
      // under a held gun being free.
      overwatchFire(state, enemy);
      // A watcher's shove can knock the rival off the tile it was shown
      // standing on. It still acts if it legally can — that shove was the
      // PLAYER's own weapon at work — but the arithmetic has moved, and the
      // log says so rather than letting the numbers quietly differ.
      if (enemy.hp > 0 && (enemy.x !== x || enemy.y !== y)) note = 'displaced';
    }
  }
  if (enemy.hp <= 0) {
    note = 'died';
  } else if (plan.type === 'reload') {
    const mag = magOf(enemy.weapon);
    if (mag != null && roundsLeft(enemy) < mag) {
      enemy.ammo = mag;
      state.log.push({ type: 'reload', uid, name: enemy.name, ammo: enemy.ammo });
    }
    reloaded = true;
  } else if (plan.type === 'attack') {
    const target = getUnit(state, plan.targetUid);
    if (!target || target.hp <= 0) note = 'target-gone';
    else if (manhattan(enemy, target) > enemy.weapon.range || !hasLOS(state, enemy, target)) note = 'out-of-position';
    else attacked = resolveStrike(state, enemy, target, enemy.weapon);
  }
  state.log.push({ type: 'enemy-turn', uid, name: enemy.name, moved, attacked, reloaded, note });
  return { moved, attacked, reloaded, note };
}

// Why a frozen plan no longer holds, or null. Checked against the board as it
// is when the rival's turn comes: its step must still be a legal move from
// where it stands, and an attack must still be legal from where it would end.
function frozenPlanBroken(state, enemy, plan) {
  const to = plan.moveTo && (plan.moveTo.x !== enemy.x || plan.moveTo.y !== enemy.y) ? plan.moveTo : null;
  if (to && !moveRange(state, enemy).has(key(to.x, to.y))) return 'blocked';
  if (plan.type !== 'attack') return null;
  const target = getUnit(state, plan.targetUid);
  if (!target || target.hp <= 0) return 'target-gone';
  const at = { x: enemy.x, y: enemy.y };
  if (to) { enemy.x = to.x; enemy.y = to.y; }
  const legal = manhattan(enemy, target) <= enemy.weapon.range && hasLOS(state, enemy, target) && !needsReload(enemy);
  enemy.x = at.x; enemy.y = at.y;
  return legal ? null : 'out-of-position';
}

// GDD §5's found gear: a dead rival has a flat chance to leave ONE thing —
// sometimes its gun, sometimes what was in its pockets.
export const DROP_CHANCE = 0.5;
export const TRINKET_SHARE = 0.4;

// One strike. `opts` is how an ability bends one attack without a second
// damage pipeline. The dice are asked through `state.roll`, in a FIXED order
// (hit; then, on a kill of a rival, drop; then which kind; then which one),
// because the balance gate replays seeds and a reordered roll is a different
// game with the same numbers.
function resolveStrike(state, attacker, target, weapon, opts = {}) {
  const f = forecastAttack(state, attacker, target, weapon, opts);
  // The round is spent HERE and nowhere else, so every firing path pays.
  if (magOf(weapon) != null) attacker.ammo = Math.max(0, roundsLeft(attacker) - 1);
  const rules = state.rules || TURF;
  const roll = state.roll('hit', attacker);
  // Piritori's dice compare in whole percentage points, exactly as it does,
  // so one seed lands the same hit in both engines.
  const hit = rules.dice === 'lcg' ? roll * 100 < Math.round(f.chance * 100) : roll < f.chance;
  let damage = 0, killed = false, knockback = null, dropped = null;
  if (hit) {
    if (rules.armour) {
      target.armour = (target.armour || 0) - f.armourDamage;
      damage = f.hpDamage;
    } else damage = f.damage;
    target.hp = Math.max(0, target.hp - damage);
    killed = target.hp <= 0;
    if (killed) {
      attacker.kills += 1;
      if (rules.drops && target.faction === 'enemy' && state.roll('drop', attacker) < DROP_CHANCE) {
        const pool = state.trinketDefs || [];
        const asTrinket = pool.length && state.roll('kind', attacker) < TRINKET_SHARE;
        dropped = asTrinket
          ? { x: target.x, y: target.y, trinketId: pool[Math.floor(state.roll('which', attacker) * pool.length)].id }
          : { x: target.x, y: target.y, weaponId: target.baseWeapon ? target.baseWeapon.id : target.weapon.id };
        state.drops.push(dropped);
      }
    }
    // Cripple: take away the approach rather than the health.
    if (opts.slow) target.slowed = Math.max(target.slowed || 0, opts.slow);
    const shove = opts.knockback != null ? opts.knockback : weapon.knockback;
    if (!killed && shove > 0) knockback = applyKnockback(state, attacker, target, shove);
  }
  // Spending it is the whole interlock (momentum.js). Cleared whether the
  // shot lands or not — you committed to the swing. An ability has already
  // paid its own cost and opts out.
  if (!opts.keepMomentum) clearMomentum(attacker);
  const evt = {
    type: 'attack', attackerUid: attacker.uid, targetUid: target.uid, hit, damage,
    killed, knockback, dropped, chance: f.chance, roll,
    base: f.base, bonus: f.bonus, evade: f.evade,
    ammo: attacker.ammo,
    ability: opts.ability || null,
    flanked: !!opts.flanked,
    // The full forecast rides on the event so a preview reads it straight
    // off the effect and the HUD can say WHY the number is what it is.
    forecast: f,
    dropChance: target.faction === 'enemy' ? DROP_CHANCE : 0,
  };
  state.log.push(evt);
  // The payoff the pipe exists for: a shove that lands a body in a fire or
  // a stairwell. Folded back onto the same event so a caller that only
  // looks at `killed` still learns the target died.
  if (knockback && knockback.moved) {
    const hz = enterHazard(state, target, 'knockback');
    if (hz) {
      evt.hazard = hz;
      if (hz.killed && !evt.killed) {
        evt.killed = true;
        attacker.kills += 1;
      }
    }
  }
  return evt;
}

// Pushes the target away along the dominant axis of the attack, stopping at
// the first tile that is out of bounds, full cover, or occupied. A lethal
// hazard CATCHES what is shoved across it.
function applyKnockback(state, attacker, target, tiles) {
  const dx = target.x - attacker.x, dy = target.y - attacker.y;
  let stepX = 0, stepY = 0;
  if (Math.abs(dx) >= Math.abs(dy)) stepX = Math.sign(dx) || 1;
  else stepY = Math.sign(dy) || 1;
  let moved = 0;
  for (let i = 0; i < tiles; i++) {
    const nx = target.x + stepX, ny = target.y + stepY;
    if (!inBounds(state.grid, nx, ny)) break;
    if (state.fullCover.has(key(nx, ny))) break;
    if (unitAt(state, nx, ny, target)) break;
    target.x = nx; target.y = ny; moved++;
    if (hazardAt(state, nx, ny)?.lethal) break;
  }
  return { moved, dx: stepX, dy: stepY };
}

// Every way a unit's position can change routes through here. Returns the
// event (or null); checkWinLoss runs here, since a hazard killing the last
// rival — or the last operator — ends the encounter like a killing blow.
function enterHazard(state, unit, cause) {
  if (unit.hp <= 0) return null;
  const h = hazardAt(state, unit.x, unit.y);
  if (!h) return null;
  const before = unit.hp;
  if (h.lethal) unit.hp = 0;
  else if (h.onEnter > 0) unit.hp = Math.max(0, unit.hp - h.onEnter);
  else return null;
  const evt = {
    type: 'hazard', uid: unit.uid, kind: h.id, name: h.name, cause,
    damage: before - unit.hp, killed: unit.hp <= 0, lethal: !!h.lethal,
    x: unit.x, y: unit.y,
  };
  state.log.push(evt);
  checkWinLoss(state);
  return evt;
}

// End-of-round burn: a hazard with `lingers` bites anything still standing
// in it when the round turns over.
function tickLingeringHazards(state) {
  const out = [];
  for (const unit of state.units) {
    if (unit.hp <= 0) continue;
    const h = hazardAt(state, unit.x, unit.y);
    if (!h || !h.lingers) continue;
    const before = unit.hp;
    unit.hp = Math.max(0, unit.hp - h.lingers);
    const evt = {
      type: 'hazard', uid: unit.uid, kind: h.id, name: h.name, cause: 'linger',
      damage: before - unit.hp, killed: unit.hp <= 0, lethal: false,
      x: unit.x, y: unit.y,
    };
    state.log.push(evt);
    out.push(evt);
  }
  if (out.length) checkWinLoss(state);
  return out;
}

// A dead rival's tile never blocks movement, which is what makes "walk over
// the body to grab its gun" work with no extra input affordance.
function pickUpDropAt(state, unit) {
  if (unit.faction !== 'player') return null;
  const i = state.drops.findIndex(d => d.x === unit.x && d.y === unit.y);
  if (i < 0) return null;
  const [drop] = state.drops.splice(i, 1);
  if (drop.trinketId) {
    const trinket = getTrinket(state, drop.trinketId);
    if (!trinket) return null;
    applyTrinket(unit, trinket);
    state.log.push({ type: 'pickup', uid: unit.uid, trinketId: trinket.id, name: trinket.name });
    return trinket;
  }
  const weapon = getWeapon(state, drop.weaponId);
  if (!weapon) return null;
  unit.baseWeapon = weapon;
  recomputeWeapon(unit);
  state.log.push({ type: 'pickup', uid: unit.uid, weaponId: weapon.id, name: weapon.name });
  return unit.weapon;
}

// Every operator holding fire that can now see this rival takes its shot —
// one each per enemy phase.
function overwatchFire(state, enemy) {
  if (!state.overwatch || !state.overwatch.size || enemy.hp <= 0) return;
  for (const uid of [...state.overwatch]) {
    const watcher = getUnit(state, uid);
    if (!watcher || watcher.hp <= 0) { state.overwatch.delete(uid); continue; }
    if (manhattan(watcher, enemy) > watcher.weapon.range) continue;
    if (!hasLOS(state, watcher, enemy)) continue;
    state.overwatch.delete(uid);
    state.log.push({ type: 'overwatch', uid, targetUid: enemy.uid, name: watcher.name });
    resolveStrike(state, watcher, enemy, watcher.weapon, { ability: 'overwatch', keepMomentum: true });
    checkWinLoss(state);
    if (enemy.hp <= 0) return;
  }
}

// ── §4 preview: the resolver, run early ─────────────────────────────
// A copy of the state deep enough that `resolve` can run on it without the
// real board noticing. The dice are replaced by `roll`; `rng` is booby-
// trapped so any code path that still reaches for it directly fails loudly
// in a preview instead of silently advancing the real sequence.
function cloneState(state, roll) {
  return {
    ...state,
    units: state.units.map(u => ({ ...u, trinkets: [...(u.trinkets || [])] })),
    fullCover: new Set(state.fullCover),
    partialCover: new Set(state.partialCover),
    overwatch: new Set(state.overwatch || []),
    drops: state.drops.map(d => ({ ...d })),
    reinforcements: (state.reinforcements || []).map(r => ({ ...r })),
    telegraph: new Map(state.telegraph),
    enemyPlan: new Map(state.enemyPlan || []),
    enemyQueue: [...(state.enemyQueue || [])],
    log: [],
    roll,
    rng: () => { throw new Error('a preview reached for the real dice'); },
    preview: true,
  };
}

// What the dice say in a preview. The ACTOR's own rolls follow the branch
// being previewed (all land, or all miss); every other roll is the case the
// player would least like — a rival's shot lands, an operator's overwatch
// misses — so a warning is always its worst case and a preview of your own
// shot never quietly assumes a reaction saves you. Drops never happen in a
// preview; the chance rides on the effect instead.
function previewOracle(actorUid, branch) {
  return (kind, actor) => {
    if (kind !== 'hit') return kind === 'which' ? 0 : 1;
    if (actor.uid === actorUid) return branch === 'hit' ? 0 : 1;
    return actor.faction === 'player' ? 1 : 0;
  };
}

// Run a command on a copy and return the copy. The log on it IS the preview.
// `prepare` puts the copy into the state the command will really start from
// when that is not the current one (a rival's plan previews from the top of
// the enemy phase, not from the middle of the player's turn).
function dryRun(state, cmd, branch = 'hit', prepare = null) {
  const c = cloneState(state, previewOracle(cmd.uid, branch));
  if (prepare) prepare(c);
  const out = resolve(c, cmd);
  return { state: c, out };
}

// THE PLAYER'S PREVIEW — point 2 of the invariant, as an export. Two
// branches for a command with a roll in it (yours all land / yours all
// miss), one for a command without; each carries the effect list, the
// telegraph the board would show AFTER, the incoming warnings on that
// telegraph, and the encounter result if the command ends it. The chance on
// the branch is the actor's own hit chance, read off the effect — for a
// multi-shot ability the per-shot odds are on each strike.
export function previewCommand(state, cmd) {
  const run = branch => {
    const { state: c } = dryRun(state, cmd, branch);
    checkWinLoss(c);
    planAllIntents(c);
    return { branch, effects: c.log, telegraph: c.telegraph, threats: incomingThreats(c), result: c.result };
  };
  const hit = run('hit');
  const own = hit.effects.find(e => e.type === 'attack' && e.attackerUid === cmd.uid);
  if (!own) return { branches: [{ ...hit, branch: 'certain', chance: 1 }] };
  const miss = run('miss');
  return { branches: [{ ...hit, chance: own.chance }, { ...miss, chance: 1 - own.chance }] };
}

// The attack event a shot from `from` would produce — one dry run, no
// replan. Where the per-tile forecasts for the aiming UI come from.
function dryStrike(state, uid, targetUid, from) {
  const { state: c } = dryRun(state, { type: 'attack', uid, targetUid, from }, 'hit');
  return c.log.find(e => e.type === 'attack' && e.attackerUid === uid) || null;
}

// Every tile this operator could shoot `target` from, each with the
// forecast it would give FROM THERE, WITH THE STEP'S MOMENTUM. Sorted best
// first so the UI can mark the default.
export function firingOptions(state, attackerUid, targetUid) {
  const attacker = getUnit(state, attackerUid);
  const target = getUnit(state, targetUid);
  if (!attacker || !target || attacker.actedAction || needsReload(attacker)) return [];
  return firingTiles(state, attacker, target)
    .map(t => {
      const evt = dryStrike(state, attackerUid, targetUid, t);
      return {
        ...t,
        score: firingTileScore(state, attacker, target, t),
        steps: manhattan(t, attacker),
        forecast: evt ? evt.forecast : forecastAttack(state, attacker, target, attacker.weapon, {}, t),
      };
    })
    .sort((a, b) => b.score - a.score || (key(a.x, a.y) < key(b.x, b.y) ? -1 : 1));
}

// What the player is about to do to whoever they are pointing at, from the
// tile orderAttack would actually shoot from. Null when the shot is not on.
export function previewAttack(state, attackerUid, targetUid, opts = {}) {
  const attacker = getUnit(state, attackerUid);
  const target = getUnit(state, targetUid);
  if (!attacker || !target || attacker.hp <= 0 || target.hp <= 0) return null;
  if (attacker.actedAction) return null;
  const tile = approachTile(state, attacker, target);
  if (!tile) return null;
  // opts is an ability's modifier set (input.js asks about a skill the same
  // way); the plain shot goes through the resolver so the step counts.
  const f = Object.keys(opts).length
    ? forecastAttack(state, attacker, target, attacker.weapon, opts, tile)
    : (dryStrike(state, attackerUid, targetUid, tile) || {}).forecast
      || forecastAttack(state, attacker, target, attacker.weapon, {}, tile);
  return { ...f, from: tile, steps: manhattan(tile, attacker), targetHp: target.hp };
}

// WHAT IS ABOUT TO HAPPEN TO YOU, as a number. Read off each rival's OWN
// preview (planIntent attaches it), so the badge and the phase are one
// computation. Lethal is measured against the total, not the worst single
// hit: two rivals each taking half your health is the case that kills you
// and the one a per-attack marker hides.
export function incomingThreats(state) {
  const out = new Map();
  if (!state.telegraph) return out;
  for (const [uid, intent] of state.telegraph) {
    if (!intent || intent.type !== 'attack' || !intent.targetUid) continue;
    const attacker = getUnit(state, uid);
    if (!attacker || attacker.hp <= 0) continue;
    const strikes = (intent.preview || []).filter(e => e.type === 'attack' && e.attackerUid === uid);
    for (const s of strikes) {
      const target = getUnit(state, s.targetUid);
      if (!target || target.hp <= 0 || target.faction === 'enemy') continue;
      let e = out.get(target.uid);
      if (!e) { e = { total: 0, worst: 0, sources: [] }; out.set(target.uid, e); }
      e.total += s.damage;
      e.worst = Math.max(e.worst, s.damage);
      e.sources.push({ uid, name: attacker.name, chance: s.chance, damage: s.damage });
    }
  }
  for (const [uid, e] of out) {
    const target = getUnit(state, uid);
    e.lethal = !!target && e.total >= target.hp;
  }
  return out;
}

// ── §5 the rival brain, and the telegraph ───────────────────────────
// Data-driven per GDD §3 — enemies.json names a behaviour and a focus, and
// nothing here knows which grunt is which. Ties break on uid throughout,
// because the telegraph must be STABLE: an intent that flickers between two
// equally good tiles is unreadable even though each frame is correct.

// What standing on a tile costs this rival, in HP. A lethal hazard is its
// whole health bar rather than Infinity so the comparison stays arithmetic.
function hazardCost(state, enemy, x, y) {
  const h = state.hazards && state.hazards.get(key(x, y));
  if (!h) return 0;
  if (h.lethal) return enemy.hp;
  return (h.onEnter || 0) + (h.lingers || 0);
}

// Evasion folded into focus, scaled to tiles so it trades against distance
// in the units the rest of this section scores in.
const evadeTiles = (enemy, u) => evasionOf(u, enemy.weapon) / EVADE_PER;
const FOCUS = {
  nearest: (state, enemy, players) => pick(players, u => manhattan(enemy, u) + evadeTiles(enemy, u)),
  weakest: (state, enemy, players) =>
    pick(players, u => u.hp * 100 + manhattan(enemy, u) + evadeTiles(enemy, u)),
};

function pick(list, scoreFn) {
  let best = null, bestScore = Infinity;
  for (const u of list) {
    const s = scoreFn(u);
    if (s < bestScore || (s === bestScore && best && u.uid < best.uid)) { best = u; bestScore = s; }
  }
  return best;
}

// How a rival wants to stand when it attacks — a penalty on the tile, so a
// behaviour expresses a preference without ever refusing a shot it can take.
const BEHAVIOUR = {
  charger: () => 0,
  skirmisher: (state, enemy, target, tile) => {
    const reach = manhattan(tile, target);
    let pen = (enemy.weapon.range - reach) * 1.2;
    for (const u of state.units) {
      if (u.faction !== 'enemy' && u.hp > 0 && manhattan(tile, u) <= 1) pen += 4;
    }
    return pen;
  },
  holder: (state, enemy, target, tile) => (coverSoftens(state, target, tile) ? 0 : 3),
  flanker: (state, enemy, target, tile) => (coverSoftens(state, tile, target) ? 3.5 : 0),
};

function nearestTarget(state, enemy) {
  const players = livingPlayers(state);
  if (!players.length) return null;
  const focus = FOCUS[enemy.focus] || FOCUS.nearest;
  return focus(state, enemy, players);
}

// The plan for one rival, WITH ITS OWN PREVIEW attached: `preview` is the
// effect list resolveRival would write if the turn started now, from the
// worst-case oracle. The badge reads it; the gate compares the phase to it.
// Never mutates state.
export function planIntent(state, enemy) {
  const intent = chooseIntent(state, enemy);
  if (intent.type === 'idle') return intent;
  const target = intent.targetUid ? getUnit(state, intent.targetUid) : null;
  // Where the target stood when this was promised — the phase compares
  // against it, because a target shoved elsewhere by an earlier rival is
  // the one legitimate reason a plan does not land as shown.
  if (target) intent.targetAt = { x: target.x, y: target.y };
  // FROM THE TOP OF THE PHASE. During the player's turn a rival still holds
  // the momentum it banked LAST phase, and endPlayerTurn wipes it before the
  // rival acts. A preview taken from the middle of the player's turn would
  // add the coming step to a pool that will not exist — v34's badge did the
  // mirror image, quoting the stale pool without the step. The copy is put
  // into the state the phase will actually start it in.
  const { state: c } = dryRun(state, { type: 'rival', uid: enemy.uid, plan: intent }, 'hit', copy => {
    const e = getUnit(copy, enemy.uid);
    clearMomentum(e);
    e.slowed = 0;
  });
  intent.preview = c.log;
  return intent;
}

function chooseIntent(state, enemy) {
  const target = nearestTarget(state, enemy);
  if (!target) return { type: 'idle' };

  // AN EMPTY GUN IS TELEGRAPHED, and the rival backs off while it reloads.
  if (needsReload(enemy)) {
    const reachable = enemy.actedMove ? [] : [...moveRange(state, enemy).values()];
    let best = { x: enemy.x, y: enemy.y };
    let bestScore = manhattan(enemy, target) + hazardCost(state, enemy, enemy.x, enemy.y) * 1.5;
    for (const { x, y } of reachable) {
      const s2 = -manhattan({ x, y }, target) + hazardCost(state, enemy, x, y) * 1.5;
      if (s2 < bestScore) { bestScore = s2; best = { x, y }; }
    }
    return { type: 'reload', moveTo: best, targetUid: target.uid };
  }

  // A firing position the way this rival's behaviour wants to stand. An
  // attack is worth a scratch but never worth dying for.
  const shape = BEHAVIOUR[enemy.behaviour] || BEHAVIOUR.charger;
  const options = firingTiles(state, enemy, target)
    .filter(t => hazardCost(state, enemy, t.x, t.y) < enemy.hp);
  if (options.length) {
    const best = pick(
      options.map(t => ({ ...t, uid: `${t.x},${t.y}` })),
      t => t.cost + shape(state, enemy, target, t) + hazardCost(state, enemy, t.x, t.y) * 1.5,
    );
    return { type: 'attack', moveTo: { x: best.x, y: best.y }, targetUid: target.uid };
  }

  // Cannot reach range this turn — close the gap. One HP is worth a tile
  // and a half: enough to route a healthy rival around a fire, not enough
  // to refuse a shortcut that costs a scratch.
  const reachable = moveRange(state, enemy);
  const score = (x, y) => manhattan({ x, y }, target) + hazardCost(state, enemy, x, y) * 1.5;
  let bestMove = { x: enemy.x, y: enemy.y };
  let bestScore = score(enemy.x, enemy.y);
  for (const { x, y } of reachable.values()) {
    const s = score(x, y);
    if (s < bestScore) { bestScore = s; bestMove = { x, y }; }
  }
  return { type: 'move', moveTo: bestMove, targetUid: target.uid };
}

// The telegraph: every living rival's plan, each with its preview. Recomputed
// after every player action, so the intent on screen never lies about the
// current board.
export function planAllIntents(state) {
  const telegraph = new Map();
  for (const u of state.units) {
    if (u.faction !== 'enemy' || u.hp <= 0) continue;
    telegraph.set(u.uid, planIntent(state, u));
  }
  state.telegraph = telegraph;
  return telegraph;
}

// ── §6 the player's commands ────────────────────────────────────────
// Each validates, then commits: resolve on the real state, settle the
// encounter, replan the rivals. The validation is what the board already
// refused to highlight; the commit is what the preview already showed.
function commit(state, cmd) {
  const out = resolve(state, cmd);
  checkWinLoss(state);
  // Live plans are re-read after every command; frozen ones (rules.js) were
  // shown once at the top of the round and stand until the round turns.
  if (!state.rules || state.rules.plans !== 'frozen') planAllIntents(state);
  return out;
}

function maybeDeselect(state, unit) {
  if (unit.actedMove && unit.actedAction && state.selected === unit.uid) state.selected = null;
}

export function selectUnit(state, uid) {
  if (state.turn !== 'player') return { ok: false, reason: 'not-your-turn' };
  const unit = getUnit(state, uid);
  if (!unit || unit.faction !== 'player' || unit.hp <= 0) return { ok: false, reason: 'invalid' };
  state.selected = uid;
  return { ok: true };
}

export function moveUnit(state, uid, x, y) {
  const unit = getUnit(state, uid);
  if (!unit || unit.hp <= 0) return { ok: false, reason: 'dead' };
  if (state.turn !== 'player' || unit.faction !== 'player') return { ok: false, reason: 'not-your-turn' };
  if (unit.actedMove) return { ok: false, reason: 'already-moved' };
  if (!moveRange(state, unit).has(key(x, y))) return { ok: false, reason: 'out-of-range' };
  const { hazard, pickedUp } = commit(state, { type: 'move', uid, x, y });
  maybeDeselect(state, unit);
  return { ok: true, pickedUp, hazard };
}

// Fire from where you stand. Strict and in place; the "step to make the
// shot happen" path is orderAttack / attackFrom.
export function attack(state, attackerUid, targetUid) {
  const attacker = getUnit(state, attackerUid);
  const target = getUnit(state, targetUid);
  if (!attacker || !target || attacker.hp <= 0 || target.hp <= 0) return { ok: false, reason: 'invalid' };
  if (state.turn !== 'player' || attacker.faction !== 'player') return { ok: false, reason: 'not-your-turn' };
  if (attacker.actedAction) return { ok: false, reason: 'already-acted' };
  if (needsReload(attacker)) return { ok: false, reason: 'empty' };
  if (attacker.faction === target.faction) return { ok: false, reason: 'same-faction' };
  if (manhattan(attacker, target) > attacker.weapon.range) return { ok: false, reason: 'out-of-range' };
  if (!hasLOS(state, attacker, target)) return { ok: false, reason: 'no-los' };
  const { attack: evt } = commit(state, { type: 'attack', uid: attackerUid, targetUid });
  maybeDeselect(state, attacker);
  return { ok: true, ...evt };
}

function stepAndStrike(state, attackerUid, targetUid, tile) {
  const attacker = getUnit(state, attackerUid);
  const from = (tile.x !== attacker.x || tile.y !== attacker.y) && !attacker.actedMove ? tile : null;
  const r = commit(state, { type: 'attack', uid: attackerUid, targetUid, from });
  maybeDeselect(state, attacker);
  if (r.ended) return { ok: true, ended: true };
  if (!r.attack) return { ok: false, reason: r.held || 'out-of-range', stepped: !!r.stepped };
  return { ok: true, ...r.attack };
}

// The one-tap attack: the BEST firing tile (grid.js's firingTileScore), then
// the shot, as one command.
export function orderAttack(state, attackerUid, targetUid) {
  const attacker = getUnit(state, attackerUid);
  const target = getUnit(state, targetUid);
  if (!attacker || !target) return { ok: false, reason: 'invalid' };
  if (state.turn !== 'player' || attacker.faction !== 'player') return { ok: false, reason: 'not-your-turn' };
  if (attacker.actedAction) return { ok: false, reason: 'already-acted' };
  if (needsReload(attacker)) return { ok: false, reason: 'empty' };
  const tile = approachTile(state, attacker, target);
  if (!tile) return { ok: false, reason: 'unreachable' };
  return stepAndStrike(state, attackerUid, targetUid, tile);
}

// Attack from a SPECIFIC tile the player chose from firingOptions.
export function attackFrom(state, attackerUid, targetUid, tile) {
  const attacker = getUnit(state, attackerUid);
  if (!attacker) return { ok: false, reason: 'invalid' };
  if (state.turn !== 'player' || attacker.faction !== 'player') return { ok: false, reason: 'not-your-turn' };
  const legal = firingOptions(state, attackerUid, targetUid);
  if (!legal.some(t => t.x === tile.x && t.y === tile.y)) return { ok: false, reason: 'bad-tile' };
  return stepAndStrike(state, attackerUid, targetUid, tile);
}

// Profile verbs (rules.js). Refused outright under rules that do not have
// them, so a TURF board can never be offered a brace it would then ignore.
export function braceUnit(state, uid) {
  const unit = getUnit(state, uid);
  if (!state.rules || !state.rules.brace) return { ok: false, reason: 'no-brace-in-these-rules' };
  if (!unit || unit.hp <= 0) return { ok: false, reason: 'dead' };
  if (state.turn !== 'player' || unit.faction !== 'player') return { ok: false, reason: 'not-your-turn' };
  if (unit.actedAction) return { ok: false, reason: 'already-acted' };
  commit(state, { type: 'brace', uid });
  maybeDeselect(state, unit);
  return { ok: true, armour: unit.armour };
}

export function useItem(state, uid, itemId) {
  const unit = getUnit(state, uid);
  if (!state.rules || !state.rules.items) return { ok: false, reason: 'no-items-in-these-rules' };
  if (!unit || unit.hp <= 0) return { ok: false, reason: 'dead' };
  if (state.turn !== 'player' || unit.faction !== 'player') return { ok: false, reason: 'not-your-turn' };
  if (unit.actedAction) return { ok: false, reason: 'already-acted' };
  if (!(unit.items || []).includes(itemId) || !state.items[itemId]) return { ok: false, reason: 'no-such-item' };
  if (state.items[itemId].effectType === 'restore_condition' && unit.hp >= unit.maxHp) return { ok: false, reason: 'already-full' };
  commit(state, { type: 'item', uid, itemId });
  maybeDeselect(state, unit);
  return { ok: true, hp: unit.hp };
}

// RELOADING IS YOUR ACTION and never your move.
export function reloadUnit(state, uid) {
  const unit = getUnit(state, uid);
  if (!unit || unit.hp <= 0) return { ok: false, reason: 'dead' };
  if (unit.faction === 'player' && state.turn !== 'player') return { ok: false, reason: 'not-your-turn' };
  if (unit.actedAction) return { ok: false, reason: 'already-acted' };
  const mag = magOf(unit.weapon);
  if (mag == null) return { ok: false, reason: 'nothing-to-reload' };
  if (roundsLeft(unit) >= mag) return { ok: false, reason: 'already-full' };
  commit(state, { type: 'reload', uid });
  maybeDeselect(state, unit);
  return { ok: true };
}

export function endUnitTurn(state, uid) {
  const unit = getUnit(state, uid);
  if (!unit || unit.faction !== 'player' || state.turn !== 'player') return { ok: false };
  unit.actedMove = true; unit.actedAction = true;
  if (state.selected === uid) state.selected = null;
  return { ok: true };
}

// Legality is answered by the same function the UI highlighted with
// (abilityTargets), so a tile the board offered can never be refused here
// and a tile it did not can never be taken by a crafted call.
export function useAbility(state, uid, abilityId, target, abilityDefs) {
  const unit = getUnit(state, uid);
  const ability = findAbility(abilityDefs, abilityId);
  if (!unit || !ability) return { ok: false, reason: 'invalid' };
  if (state.turn !== 'player' || unit.faction !== 'player') return { ok: false, reason: 'not-your-turn' };
  if (!canAfford(unit, ability)) return { ok: false, reason: 'cannot-afford' };
  const legal = abilityTargets(state, unit, ability);
  const cmd = { type: 'ability', uid, ability };
  if (ability.shape === 'self') {
    if (ability.id !== 'overwatch' && !ability.guard) return { ok: false, reason: 'unknown-self-ability' };
  } else if (ability.shape === 'adjacent-all') {
    const group = legal[0];
    const alive = group ? group.all.filter(t => { const u = getUnit(state, t); return u && u.hp > 0; }) : [];
    if (!alive.length) return { ok: false, reason: 'no-target' };
    cmd.targets = alive;
  } else if (ability.shape === 'empty-tile') {
    const tile = target || {};
    if (!legal.some(t => t.x === tile.x && t.y === tile.y)) return { ok: false, reason: 'bad-tile' };
    cmd.tile = { x: tile.x, y: tile.y };
  } else {
    const tuid = typeof target === 'string' ? target : target && target.uid;
    if (!legal.some(t => t.uid === tuid)) return { ok: false, reason: 'bad-target' };
    cmd.targets = [tuid];
    cmd.shots = ability.shots || 1;
  }
  const { results } = commit(state, cmd);
  maybeDeselect(state, unit);
  return { ok: true, results };
}

// ── §7 the turn ─────────────────────────────────────────────────────
export function endPlayerTurn(state) {
  if (state.turn !== 'player') return { ok: false };
  state.turn = 'enemy';
  state.selected = null;
  // FREEZE the plan the player just read. A telegraph is a promise, not a
  // preview — each rival executes exactly this, never a plan re-computed
  // against a board earlier rivals this phase have already moved.
  state.enemyPlan = new Map(state.telegraph);
  state.enemyQueue = livingEnemies(state).map(u => u.uid);
  // Their momentum from LAST round is spent; each banks fresh as it steps.
  for (const u of state.units) if (u.faction === 'enemy') { clearMomentum(u); u.slowed = 0; }
  return { ok: true };
}

// Who acts next, without acting — so the camera can look before it moves.
export function peekEnemyQueue(state) {
  if (state.turn !== 'enemy') return null;
  for (const uid of state.enemyQueue) {
    const enemy = getUnit(state, uid);
    if (enemy && enemy.hp > 0) return uid;
  }
  return null;
}

// Resolves exactly one rival's frozen plan and returns a descriptor for the
// HUD/animation layer. Returns { done: true } once the phase is empty,
// having turned the round over.
export function stepEnemyPhase(state) {
  if (state.turn !== 'enemy') return null;
  while (state.enemyQueue.length) {
    const uid = state.enemyQueue.shift();
    const enemy = getUnit(state, uid);
    if (!enemy || enemy.hp <= 0) continue;
    state.actingUid = uid;
    const plan = state.enemyPlan.get(uid) || { type: 'idle' };
    const r = resolve(state, { type: 'rival', uid, plan });
    checkWinLoss(state);
    return { done: false, uid, name: enemy.name, moved: r.moved, attacked: r.attacked, reloaded: r.reloaded, note: r.note };
  }

  // The round turns over. Lingering hazards bite first, then the reset and
  // the replan, so the new telegraph is computed against who survived.
  const burns = tickLingeringHazards(state);
  state.turn = 'player';
  state.round += 1;
  for (const u of state.units) if (u.faction === 'player') {
    u.actedMove = false; u.actedAction = false;
    // Momentum never carries between turns. Cleared at the START of the
    // player's turn so a unit that moved and did not attack still shows the
    // evasion it earned through the phase it just faced.
    clearMomentum(u);
    u.guard = 0;
    u.slowed = 0;
  }
  state.overwatch.clear();
  // Arrivals land at the TOP of the player's turn — on the board and in the
  // telegraph before the player is asked to do anything about them.
  landArrivals(state);
  checkWinLoss(state);
  planAllIntents(state);
  state.actingUid = null;
  return { done: true, burns };
}

// ── §8 arrivals, and the end of an encounter ────────────────────────
export const ARRIVAL_NOTICE = 1;
export const pendingArrivals = state => (state.reinforcements || []).filter(r => !r.landed);
export const incomingArrivals = state =>
  pendingArrivals(state).filter(r => r.round - state.round <= ARRIVAL_NOTICE);

// Its declared tile if free, otherwise the nearest free tile — a rival that
// failed to arrive because somebody stood on its square would be a promise
// the board made and did not keep. Deterministic: nearest, ties on tile key.
function arrivalTile(state, spot) {
  const free = (x, y) =>
    inBounds(state.grid, x, y) && !state.fullCover.has(key(x, y)) && !unitAt(state, x, y);
  if (free(spot.x, spot.y)) return { x: spot.x, y: spot.y };
  let best = null, bestD = Infinity;
  for (let y = 0; y < state.grid.rows; y++) {
    for (let x = 0; x < state.grid.cols; x++) {
      if (!free(x, y)) continue;
      const d = manhattan({ x, y }, spot);
      if (d < bestD || (d === bestD && best && key(x, y) < key(best.x, best.y))) {
        bestD = d; best = { x, y };
      }
    }
  }
  return best;
}

export function landArrivals(state) {
  const landed = [];
  for (const r of pendingArrivals(state)) {
    if (r.round > state.round) continue;
    const def = state.enemyDefs.find(e => e.id === r.enemy);
    if (!def) { r.landed = true; continue; }
    const tile = arrivalTile(state, r);
    if (!tile) continue;
    const weapon = getWeapon(state, def.weapon);
    const unit = makeUnit(`x${r.rid}`, def, weapon, 'enemy', tile);
    state.units.push(unit);
    r.landed = true;
    landed.push({ uid: unit.uid, name: unit.name, x: tile.x, y: tile.y });
    state.log.push({ type: 'arrive', uid: unit.uid, name: unit.name, x: tile.x, y: tile.y });
  }
  if (landed.length) planAllIntents(state);
  return landed;
}

// Everything that can end an encounter, in one place. Each mode is a branch
// because `state.win` is DATA (GDD §3).
function checkWinLoss(state) {
  if (state.result) return;
  const win = state.win || { mode: 'eliminate' };
  if (!state.units.some(u => u.faction === 'player' && u.hp > 0)) { state.result = 'lose'; return; }
  if (win.deadline && state.round > win.deadline) { state.result = 'lose'; return; }
  // Clearing the block wins any mission — once the block is actually clear.
  // With rivals still due, an empty board is a lull, not a victory.
  if (!state.units.some(u => u.faction === 'enemy' && u.hp > 0) && !pendingArrivals(state).length) {
    state.result = 'win'; return;
  }
  if (win.mode === 'survive' && state.round > win.rounds) { state.result = 'win'; return; }
  if (win.mode === 'destroy') {
    if (!state.units.some(u => u.faction === 'objective' && u.hp > 0)) { state.result = 'win'; return; }
  }
  if (win.mode === 'extract') {
    const alive = state.units.filter(u => u.faction === 'player' && u.hp > 0);
    const need = win.need || alive.length;
    // `need` IS ABSOLUTE. Falling below it is the third loss condition.
    if (alive.length < need) { state.result = 'lose'; return; }
    const out = alive.filter(u => state.extract.has(key(u.x, u.y)));
    if (out.length >= need) { state.result = 'win'; return; }
  }
}

// ── §9 progression ──────────────────────────────────────────────────
export const XP_BASE_CLEAR = 10;
export const XP_PER_KILL = 8;
export const HP_PER_LEVEL = 2;
export const xpToNext = level => 20 + (level - 1) * 15;
export const OFFER_SIZE = 3;
export const MAX_SKILLS = 4;

// The three skills on offer, drawn from the encounter's own rng so the same
// seed always shows the same three. Weapon-gated skills are offered on
// purpose: §5.1's payoff is a build that goes live when a gun drops.
export function skillOffer(state, unit, defs) {
  if (!unit || !(unit.slots > 0)) return [];
  if ((unit.abilities || []).length >= MAX_SKILLS) return [];
  if (unit.offer && unit.offer.length) return unit.offer.slice();
  const held = new Set(unit.abilities || []);
  const pool = defs.filter(a => !held.has(a.id)).map(a => a.id);
  const out = [];
  while (out.length < OFFER_SIZE && pool.length) {
    const i = Math.floor(state.rng() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  unit.offer = out.slice();
  return out;
}

export function learnSkill(state, uid, abilityId, defs) {
  const unit = getUnit(state, uid);
  if (!unit) return { ok: false, reason: 'invalid' };
  if (!(unit.slots > 0)) return { ok: false, reason: 'no-slot' };
  if ((unit.abilities || []).includes(abilityId)) return { ok: false, reason: 'already-known' };
  const offer = skillOffer(state, unit, defs);
  if (!offer.includes(abilityId)) return { ok: false, reason: 'not-offered' };
  unit.abilities = [...(unit.abilities || []), abilityId];
  unit.slots -= 1;
  unit.offer = null;
  state.log.push({ type: 'learn', uid, ability: abilityId, name: unit.name });
  return { ok: true };
}

// Once, after a win. A level grants a SLOT; learnSkill spends it — separately,
// because the pick is the player's.
export function awardXp(state) {
  if (state.result !== 'win') return [];
  const events = [];
  for (const u of state.units) {
    if (u.faction !== 'player' || u.hp <= 0) continue;
    const gained = XP_BASE_CLEAR + u.kills * XP_PER_KILL;
    u.xp += gained;
    const levelsGained = [];
    while (u.xp >= xpToNext(u.level)) {
      u.xp -= xpToNext(u.level);
      u.level += 1;
      u.maxHp += HP_PER_LEVEL;
      u.hp += HP_PER_LEVEL;
      levelsGained.push(u.level);
      u.slots = (u.slots || 0) + 1;
    }
    events.push({ uid: u.uid, name: u.name, kills: u.kills, gained, levelsGained, slots: u.slots || 0 });
  }
  return events;
}
