import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, deployedCrew } from '../js/v3/state.js';
import {
  createBattleState, selectAction, selectUnit, validMoveCells, moveUnit, autoCommand,
  withdrawBattle, resultEffects, playerAttack, syncAlliesFor,
  policeAwaitingPosture, choosePolicePosture, takenByPolice, POLICE_POSTURE,
} from '../js/v3/battle.js';
import { parseCellFor, slotKey } from '../js/v3/grid.js';

const content = JSON.parse(await readFile(new URL('../../content/era1-slice-v1.json', import.meta.url)));
const data = {
  content,
  crew: new Map(content.crew.map(item => [item.id, item])),
  battles: new Map(content.battles.map(item => [item.id, item])),
  missions: new Map(content.missions.map(item => [item.id, item])),
  equipment: new Map(content.equipment.map(item => [item.id, item])),
};
const state = createState(content);
state.recruited = content.crew.slice(0, 3).map(item => item.id);
state.deployed = [...state.recruited];

/** Test-only convenience: authored "front-1" cell text, for the given side,
 *  as a `battle.js` `cell` (a grid.js `slotKey`). Mirrors what
 *  `createBattleState` itself does when it reads a battle definition's own
 *  authored cells. */
const playerCell = cell => { const { lane, depth } = parseCellFor(cell, true); return slotKey(lane, depth); };
const enemyCell = cell => { const { lane, depth } = parseCellFor(cell, false); return slotKey(lane, depth); };

const definition2 = data.battles.get('battle-karhupuisto-2v2');
const battle2 = createBattleState(definition2, deployedCrew(state, data), state, data);
assert.equal(battle2.players.length, 2);
assert.equal(battle2.enemies.length, 2);
assert.equal(battle2.format, '2v2');

selectAction(battle2, 'move');
const moves = validMoveCells(battle2);
assert(moves.length > 0, 'selected unit has a legal formation move');
assert.equal(moveUnit(battle2, moves[0]).ok, true);
assert.equal(new Set(battle2.players.map(unit => unit.cell)).size, 2, 'units do not share a cell');

// The cap was 12 before auto-play scored commands by stance, then 60 once
// it did (VERSIONS.md, stances port). The grid rebuild (VERSIONS.md, this
// entry) raised the real number again: BattleBuilder._default_player_slot's
// ported deployment for a 2-fighter crew holds the CENTRE lane at two
// depths rather than the old build's own hand-picked opening cells, which
// no longer happens to sit lane-for-lane with this battle's authored
// opponent positions the way the old 3-lane board's coincidentally did —
// so HOLD_THE_LINE's real weighting (GUARD 1.35 vs REPOSITION 0.35,
// fight_manager.gd's own numbers) makes an out-of-reach crew brace far more
// often than it drifts into range, and this exact fight now takes 100
// rounds. 150 leaves headroom without being so loose it stops catching a
// genuine stall (the bug this port itself introduced and fixed once
// already: an early cut always took the top-scored command instead of
// Godot's weighted-random-across-top-3, and a unit whose nerve had dropped
// could get GUARD-locked forever — this loop sitting at the cap with
// status still 'active' is exactly what that regression looked like).
// A 100+ round fight is also long enough to run the heat clock past
// HEAT_THRESHOLD (COMBAT.md §9.5), so this loop is the coverage for
// "police arrive mid-autoplay" too: `autoCommand()` correctly refuses to
// act while `policeAwaitingPosture()` is true (§9.5.2 "outranks
// everything"), so the harness answers it the same way a player would —
// HELP_FRIENDS, the branch with real logic to exercise (BACK_OFF is a
// straight list copy).
let safety = 0;
let policeAnswered = false;
while (battle2.status === 'active' && safety < 150) {
  if (policeAwaitingPosture(battle2)) {
    assert.equal(choosePolicePosture(battle2, POLICE_POSTURE.HELP_FRIENDS), true, 'a posture is always answerable once the police arrive');
    policeAnswered = true;
  }
  autoCommand(battle2);
  safety += 1;
}
assert.notEqual(battle2.status, 'active', 'auto command reaches a battle result');
assert(['win', 'loss'].includes(battle2.result));
assert(resultEffects(battle2, data).length > 0);
if (policeAnswered) assert(Array.isArray(takenByPolice(battle2)), 'a resolved police outcome still reports a taken list');

const definition3 = data.battles.get('battle-courtyard-3v3');
const battle3 = createBattleState(definition3, deployedCrew(state, data), state, data);
assert.equal(battle3.players.length, 3);
assert.equal(battle3.enemies.length, 3);
assert.equal(withdrawBattle(battle3), true, 'withdrawal is available from round one');
assert.equal(battle3.result, 'withdraw');
assert.deepEqual(resultEffects(battle3, data), data.missions.get('mission-courtyard-receipts').partial_effects);

// Sync fire (COMBAT.md §9.13). PORTING.md §3.2: this is where it is
// canonical now — designed here first, Godot's fight_manager.gd re-ports it.
// A fresh battle, positions set directly so reach is unambiguous rather than
// depending on the authored opening formation.
const syncDef = data.battles.get('battle-courtyard-3v3');
const syncBattle = createBattleState(syncDef, deployedCrew(state, data), state, data);
const [ally, syncer, bystander] = syncBattle.players;
// ally: runner/feature-phone (front-same-lane, 0 spread). syncer: muscle/
// baseball-bat (front-same-or-adjacent-lane, 1 spread) — adjacent lane,
// front row: also in reach of front-2's target. bystander: watcher/
// feature-phone at the back row — feature-phone's reach only fires from
// the front row, so bystander is out of reach regardless of lane. Lane 2,
// not lane 1: this battle's own authored cover ("stone-bin", cell
// "front-1") sits at the opposition's front-1 — cover blocks the WALK
// through that depth for a non-piercing weapon even when the walk's own
// target is the body standing on it (equipment_rules.gd's cover check runs
// before the occupancy check, at the same depth), so front-1 is a real
// no-shot cell in this battle now that cover is ported and front-2 is not.
ally.cell = playerCell('front-2');
syncer.cell = playerCell('front-3');
bystander.cell = playerCell('back-1');
const enemyTarget = syncBattle.enemies[0];
enemyTarget.cell = enemyCell('front-2');
enemyTarget.guard = 0; // isolate the harm count from guard absorption

const syncAllies = syncAlliesFor(syncBattle, ally, enemyTarget);
assert.deepEqual(syncAllies.map(u => u.id).sort(), [syncer.id],
  'only the ally who can also reach the target syncs, not the one who cannot');

selectUnit(syncBattle, ally.id);
selectAction(syncBattle, 'attack');
const hpBefore = enemyTarget.hp;
assert.equal(playerAttack(syncBattle, enemyTarget.id).ok, true);
assert.equal(hpBefore - enemyTarget.hp, 2,
  'both the attacker\'s hit and the sync hit landed (1 hp each)');
assert.equal(syncBattle.acted.includes(syncer.id), false,
  'the syncing ally spent no action — they still have their own turn this round');
assert(syncBattle.log[0].includes('syncs fire') || syncBattle.log[1].includes('syncs fire'),
  'the sync shot is visible in the log');

console.log('V3 BATTLE OK: mirrored 2v2/3v3 formations, reposition, auto command, withdrawal and sync fire.');
