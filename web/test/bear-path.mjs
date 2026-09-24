import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createEncounter} from '../bear-path/encounter.js?v=2';
import {createSession,checkpoint,restoreSession} from '../fight-module/session.js?v=13';
const content=JSON.parse(fs.readFileSync(new URL('../../content/era1-slice-v1.json',import.meta.url)));
for(const choice of ['name-empty-van','withdraw','hold-path']){
 const m=createEncounter(content);for(const id of ['bear','exit','note','contact'])assert(m.command('look',id).ok);
 assert.equal(m.state.timeSpent,0);assert(!m.command('choose',choice).ok);assert(m.command('talk').ok);
 assert.equal(m.canChoose('send-fixer'),false);assert(!m.command('choose','send-fixer').ok);
 assert(m.command('choose',choice).ok);assert(!m.command('choose',choice).ok);
 if(choice==='hold-path')assert(m.command('battle-result','win').ok);
 assert.equal(m.state.timeSpent,1);assert.equal(m.state.settlements,1);assert.equal(m.state.cash,choice==='withdraw'?35:70);
 assert(!m.command('battle-result','win').ok);const copy=createEncounter(content,m.checkpoint());assert.deepEqual(copy.state,m.state);
 assert(copy.command('return').ok);assert.equal(copy.state.cash,m.state.cash);assert.equal(copy.state.contactOpen,choice!=='withdraw');
 assert(!copy.command('return').ok);const bad=copy.checkpoint();bad.state.cash+=100;assert.throws(()=>createEncounter(content,bad));
 assert.equal(copy.result().campaign_applied,false);
}
for(const result of ['win','loss','partial','withdraw']){
 const m=createEncounter(content);m.command('talk');m.command('choose','hold-path');assert(!m.command('battle-result','death').ok);assert(m.command('battle-result',result).ok);assert.equal(m.state.settlements,1);
 const mission=content.missions.find(v=>v.id==='mission-bear-path');assert.deepEqual(m.state.effects,result==='win'?mission.success_effects:result==='loss'?mission.failure_effects:mission.partial_effects);
}
const battle=createSession(content,'melee','bear-path');assert.equal(battle.battle.id,'battle-karhupuisto-2v2');
assert.deepEqual(battle.battle.enemies.map(u=>u.id),['opp-mikko-rinne','opp-pauli-leko']);assert.equal(battle.battle.players[0].hp,3);
assert.deepEqual([...battle.battle.cover.values()].map(v=>v.propId),['bear-plinth','park-bench']);
assert(battle.command('brace').ok);assert(battle.command('end').ok);assert.deepEqual(restoreSession(content,checkpoint(battle)).snapshot(),battle.snapshot());
assert(battle.command('withdraw').ok);assert.equal(battle.result().training,false);assert.deepEqual(battle.result().campaign_effects,content.missions.find(v=>v.id==='mission-bear-path').partial_effects);
console.log('PASS: authored encounter choices/effects, free inspection, one commitment/settlement, return memory, tamper rejection, canonical battle/cover and replay');
