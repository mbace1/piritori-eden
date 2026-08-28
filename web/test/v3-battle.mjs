import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, deployedCrew } from '../js/v3/state.js';
import {
  createBattleState, selectAction, validMoveCells, moveUnit, autoCommand,
  withdrawBattle, resultEffects,
} from '../js/v3/battle.js';

const content = JSON.parse(await readFile(new URL('../../content/era1-slice-v1.json', import.meta.url)));
const data = {
  content,
  crew: new Map(content.crew.map(item => [item.id, item])),
  battles: new Map(content.battles.map(item => [item.id, item])),
  missions: new Map(content.missions.map(item => [item.id, item])),
};
const state = createState(content);
state.recruited = content.crew.slice(0, 3).map(item => item.id);
state.deployed = [...state.recruited];

const definition2 = data.battles.get('battle-karhupuisto-2v2');
const battle2 = createBattleState(definition2, deployedCrew(state, data), state);
assert.equal(battle2.players.length, 2);
assert.equal(battle2.enemies.length, 2);
assert.equal(battle2.format, '2v2');

selectAction(battle2, 'move');
const moves = validMoveCells(battle2);
assert(moves.length > 0, 'selected unit has a legal formation move');
assert.equal(moveUnit(battle2, moves[0]).ok, true);
assert.equal(new Set(battle2.players.map(unit => unit.cell)).size, 2, 'units do not share a cell');

// The cap was 12 before auto-play scored commands by stance (VERSIONS.md,
// stances port): the old heuristic always attacked when it legally could,
// so a 2v2 resolved fast by construction. Real stance-weighted play can
// spend a round bracing or repositioning instead, and the default stance
// is HOLD_THE_LINE, which deliberately favours caution — this exact fight
// now takes 27 rounds to resolve. 60 leaves headroom without being so loose
// it stops catching a genuine stall (the bug this port itself introduced
// and fixed: an early cut always took the top-scored command instead of
// Godot's weighted-random-across-top-3, and a unit whose nerve had dropped
// could get GUARD-locked forever — this loop sitting at safety==60 with
// status still 'active' is exactly what that regression looked like).
let safety = 0;
while (battle2.status === 'active' && safety < 60) {
  autoCommand(battle2);
  safety += 1;
}
assert.notEqual(battle2.status, 'active', 'auto command reaches a battle result');
assert(['win', 'loss'].includes(battle2.result));
assert(resultEffects(battle2, data).length > 0);

const definition3 = data.battles.get('battle-courtyard-3v3');
const battle3 = createBattleState(definition3, deployedCrew(state, data), state);
assert.equal(battle3.players.length, 3);
assert.equal(battle3.enemies.length, 3);
assert.equal(withdrawBattle(battle3), true, 'withdrawal is available from round one');
assert.equal(battle3.result, 'withdraw');
assert.deepEqual(resultEffects(battle3, data), data.missions.get('mission-courtyard-receipts').partial_effects);

console.log('V3 BATTLE OK: mirrored 2v2/3v3 formations, reposition, auto command and withdrawal.');
