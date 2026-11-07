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
console.log('Defensive policy fixtures passed; constrained fixture rules are not Act I outcome evidence.');
