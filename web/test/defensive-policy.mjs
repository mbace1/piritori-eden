import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSession } from '../fight-module/session.js?v=23';
import { forecast } from '../fight-module/tactics.js?v=11';
import { chooseDefensiveDecision, defensiveExposure, defensivePolicy } from '../tools/defensive-policy.mjs';
const content = JSON.parse(fs.readFileSync(new URL('../../content/era1-slice-v1.json', import.meta.url)));
const records = [];
function trappedFixture() {
  const fight = createSession(content, 'melee', 'lab-6'), b = fight.battle;
  b.cover.clear();
  const [hurt, partner] = b.players, enemy = b.enemies[0];
  b.players[2].alive = false; b.enemies.slice(1).forEach(p => p.alive = false);
  Object.assign(hurt, { cell: '2,2', hp: 2, maxHp: 5, guard: 0, reach: 0 });
  Object.assign(partner, { cell: '3,3', hp: 5, guard: 0, reach: 0 });
  Object.assign(enemy, { cell: '2,3', hp: 5, maxHp: 5, guard: 0, equipment: 'baseball-bat', harmBonus: 0 });
  b.plans = [{ id: enemy.id, type: 'attack', target: hurt.id, path: [], to: enemy.cell }];
  return fight;
}
{
  const fight = trappedFixture(), b = fight.battle, hurt = b.players[0], before = JSON.stringify(fight.snapshot());
  const risk = defensiveExposure(b), decision = chooseDefensiveDecision(b, hurt);
  assert.equal(JSON.stringify(fight.snapshot()), before, 'planning never consumes RNG, state or budgets');
  assert(risk.byPerson[hurt.id].worstDown, 'announced hit can down unguarded low-health fighter');
  assert.equal(decision.type, 'brace'); assert(decision.worstDownPrevented);
  defensivePolicy(fight, decision => records.push(decision));
  assert.equal(records.find(record => record.actor === hurt.id).actionOK, true);
  assert.equal(hurt.guard, 2); assert(b.acted.includes(hurt.id)); assert(!b.moved.includes(hurt.id));
  assert(fight.command('select', hurt.id).ok);
  assert.equal(fight.command('attack', b.enemies[0].id).ok, false, 'spent Action cannot attack in the same round');
  assert(fight.history.some(record => record.type === 'attack'), 'partner attacks instead of stalling');
  fight.command('end'); assert(hurt.alive); assert.equal(hurt.hp, 1, 'real deterministic hit spends guard before HP');
  defensivePolicy(fight, decision => records.push(decision));
  assert.equal(b.status, 'complete'); assert.equal(b.result, 'win'); assert.equal(b.round, 2);
  assert(records.some(record => record.actor === hurt.id && record.type === 'attack' && record.actionOK), 'braced fighter follows with a lethal attack');
  console.log('PASS constrained fixture: prevents a down, legal Brace, partner attack, next-round attack and win');
}
{
  const control = trappedFixture(), hurt = control.battle.players[0];
  control.command('select', control.battle.players[1].id);
  assert(control.command('attack', control.battle.enemies[0].id).ok, 'same partner attack as the braced fixture');
  control.command('end'); assert.equal(hurt.alive, false, 'same fixture without Brace downs this fighter');
  console.log('PASS matched fixture control: unbraced announced hit downs the fighter');
}
{
  const fight = createSession(content, 'ranged', 'lab-2'), b = fight.battle, actor = b.players[0], enemy = b.enemies[0];
  b.cover.clear();Object.assign(actor, { cell: '1,2', hp: 5, guard: 2, reach: 1 });Object.assign(enemy, { cell: '2,5', hp: 5, guard: 0 });
  b.cover.set('2,2', { softBlock: true, hardBlock: false, edge: 'north' });
  b.plans = [{ id: enemy.id, type: 'attack', target: actor.id, path: [], to: enemy.cell }];
  const decision = chooseDefensiveDecision(b, actor);
  assert.equal(decision.cell, '2,2');assert.equal(decision.type, 'attack');
  const openChance = forecast(b, enemy, actor).chance;
  defensivePolicy(fight);assert.equal(actor.cell, '2,2');assert(forecast(b, enemy, actor).chance < openChance);
  assert(fight.history.some(record => record.type === 'move'));assert(fight.history.some(record => record.type === 'attack'));
  console.log('PASS cover fixture: advances into directional cover and legally attacks with independent budgets');
}
{
  const fight = createSession(content, 'melee', 'lab-2'), b = fight.battle, actor = b.players[0], enemy = b.enemies[0];
  b.cover.clear();Object.assign(actor,{cell:'1,1',guard:0,reach:1});Object.assign(enemy,{cell:'1,6'});
  b.plans = [{id:enemy.id,type:'hold',path:[],to:enemy.cell}];
  const decision = chooseDefensiveDecision(b,actor);assert.equal(decision.type,'brace');assert(decision.spareActionPreparation);
  defensivePolicy(fight);assert.notEqual(actor.cell,'1,1');assert.equal(actor.guard,2);
  assert(b.moved.includes(actor.id)&&b.acted.includes(actor.id));
  console.log('PASS spare-action fixture: moves toward opposition and prepares persistent guard, without another round');
}
{
  const fight = trappedFixture(), b = fight.battle, actor = b.players[0];b.acted.push(actor.id);actor.reach=1;
  const decision=chooseDefensiveDecision(b,actor);assert.equal(decision.type,'hold','already-spent Action cannot propose another action');
  actor.guard=4;b.acted=[];const next=chooseDefensiveDecision(b,actor);assert.notEqual(next.type,'brace','full guard is not pointlessly braced');
  console.log('PASS budget/cap guards: no double Action and no full-guard Brace loop');
}
{
  // Real authored campaign getaway, staged late in the fight. Clearing the
  // final rival must not be mistaken for completion of the extraction goal.
  const store = new Map(); let search = '';
  globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key) };
  globalThis.location = { get search() { return search; } };
  const { createState, SAVE_KEY, fighters } = await import('../js/v3/state.js?v=12');
  const { stageFight, doorFightStage } = await import('../js/v3/places.js?v=1');
  const { templateOf } = await import('../js/v3/doors.js?v=6');
  const { nameFrom } = await import('../../people/roster.mjs?v=1');
  const O = await import('../js/v3/outing.js?v=7'), R = await import('../crew-run/run.js?v=23');
  const doors = JSON.parse(fs.readFileSync(new URL('../../content/doors-v1.json', import.meta.url)));
  const places = JSON.parse(fs.readFileSync(new URL('../../content/places-v1.json', import.meta.url)));
  const state = createState(content), template = templateOf(doors, 'pickup-fish-stall');
  state.scheduleIndex = 15; state.recruited = ['crew-slot-runner', 'crew-slot-muscle']; state.deployed = [...state.recruited];
  const crewData = { content, crew: new Map(content.crew.map(person => [person.id, { ...person, name: person.name ?? nameFrom(person.id) }])) };
  const anchor = template.anchors[0], encounter = { id: 'door-15-pickup-fish-stall', door: template.id, anchor_override_id: anchor };
  const authored = content.battles.find(battle => battle.id === template.fight.battle), team = fighters(state, crewData);
  const staged = stageFight(authored, doorFightStage(encounter, template), places, team.map(person => person.name));
  state.outing = O.doorOuting(state, encounter, staged, team.slice(0, authored.player_deployed).map(person => person.id), { nonce: 'defensive-empty-arena', goal: 'getaway' });
  localStorage.setItem(SAVE_KEY, JSON.stringify(state)); search = `?campaign=1&outing=${state.outing.id}&arena=${state.outing.kit}`;
  const run = R.loadRun(null, content), fight = R.makeMission(content, R.launch(run)), b = fight.battle;
  b.cover.clear(); b.accuracy = { 'baseball-bat': 100, 'folding-knife': 100, 'first-handgun': 100 };
  b.players.forEach((person, i) => { person.cell = `${i + 1},1`; });
  const attacker = b.players[0], enemy = b.enemies[0];
  Object.assign(enemy, { cell: '1,2', hp: 1, guard: 0 }); b.enemies.slice(1).forEach(person => { person.hp = 0; person.alive = false; });
  assert(fight.command('select', attacker.id).ok); assert(fight.command('attack', enemy.id).ok);
  assert(!b.enemies.some(person => person.alive)); assert.equal(b.status, 'active'); assert.equal(b.mission.goal, 'getaway');
  const decision = chooseDefensiveDecision(b, attacker);
  assert(decision); assert.equal(decision.cell.split(',')[1], '0'); assert.equal(decision.type, 'hold', 'spent Action may Move but cannot Extract yet');
  const actions = []; defensivePolicy(fight, value => actions.push(value));
  assert.equal(attacker.cell.split(',')[1], '0'); assert(actions.some(value => value.type === 'extract' && value.actionOK));
  if (b.status === 'active') { fight.command('end'); defensivePolicy(fight, value => actions.push(value)); }
  assert.equal(b.result, 'win'); assert(b.players.every(person => person.extracted)); assert.equal(b.mission.police.arrived, false);
  assert(actions.some(value => value.actor === attacker.id && value.type === 'extract' && value.actionOK));
  assert(!actions.some(value => value.type === 'brace'), 'empty getaway does not build guard against nonexistent enemies');
  console.log('PASS real campaign getaway: clear last rival, keep goal active, Move with spent Action, then Extract all crew without enemy targets or police');
  console.log('EMPTY_ARENA_FIXTURE', JSON.stringify({ goal: b.mission.goal, result: b.result, round: b.round, crew: b.players.length, extracted: b.players.filter(person => person.extracted).length, police: b.mission.police.arrived, commands: fight.history.map(record => record.type) }));
}
console.log('Defensive policy fixtures passed; constrained fixture rules are not Act I outcome evidence.');
