import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSession} from '../fight-module/session.js';
import {endPlayerPhase,attackTargets,selectAction,playerAttack,validMoveCells} from '../fight-module/resolver.js?v=1';
const content=JSON.parse(fs.readFileSync(new URL('../../content/era1-slice-v1.json',import.meta.url)));
for(const mode of ['mixed','melee','ranged']){
  const s=createSession(content,mode);assert.equal(s.snapshot().units.length,4);assert.equal(s.battle.players[0].equipment,s.battle.enemies[0].equipment);assert.equal(s.battle.players[1].equipment,s.battle.enemies[1].equipment);
  assert.equal(s.command('brace').ok,true);assert.equal(s.command('select','f01').ok,false,'spent unit cannot act again');assert.equal(s.command('item').ok,true);assert.equal(s.command('item').ok,false,'single action guard');assert.equal(s.command('end').ok,true);assert.equal(s.battle.round,2);assert.equal(s.command('talk').ok,true);assert.equal(s.battle.result,'partial');assert.equal(s.command('end').ok,false);assert.deepEqual(s.result().campaign_effects,[]);
}
const heal=createSession(content);heal.battle.players[0].hp=2;assert.equal(heal.command('item').ok,true);assert.equal(heal.battle.players[0].hp,4);assert.equal(heal.battle.players[0].itemIds.length,0);heal.command('end');heal.command('select','f01');assert.equal(heal.command('item').ok,false,'bandage cannot be reused');
const move=createSession(content);const target=validMoveCells(move.battle)[0];assert.equal(move.command('move',target).ok,true);assert.equal(move.battle.players[0].cell,target);assert(move.battle.acted.includes('f01'));assert.equal(move.command('move',target).ok,false,'occupied cell rejected');
const retreat=createSession(content);assert.equal(retreat.command('withdraw').ok,true);assert.equal(retreat.battle.result,'withdraw');
const blocked=createSession(content,'ranged');for(const u of blocked.battle.enemies)u.cell=u.id==='op-f01'?'0,5':'5,5';const before=blocked.battle.players.map(u=>[u.hp,u.guard]);const events=[];endPlayerPhase(blocked.battle,e=>events.push(e));assert(events.every(e=>e.type!=='attack'),'enemies without legal targets reposition/brace rather than inflict ghost hits');assert.deepEqual(blocked.battle.players.map(u=>u.hp),before.map(v=>v[0]));assert(events.some(e=>e.type==='move'),'enemy movement exercised');
const cover=createSession(content,'ranged');cover.battle.cover.set('2,4',{softBlock:true,hardBlock:false});assert(!attackTargets(cover.battle,cover.battle.players[0]).some(u=>u.id==='op-f01'),'cover blocks direct attack');
function replay(){const s=createSession(content);for(let n=0;n<40&&s.battle.status==='active';n++)s.command('auto');return s.snapshot();}assert.deepEqual(replay(),replay(),'identical commands reproduce battle');assert.notEqual(replay().status,'active','auto reaches an outcome');
console.log('PASS: mirrored fixture, action/item guards, move occupancy, cover, legal enemy fallback, training results and deterministic replay');


