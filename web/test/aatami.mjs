// Aatami fights first, then the crew does (H6.1, owner answer 24).
//
//   node web/test/aatami.mjs
//
// COMBAT.md §9.9.1: he fights the first battles because he cannot afford a
// crew, then steps back for good; the withdrawal is the arc.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createState, restoreState, aatamiFights, stepBackIfReady, fighters, requirementStatus, ageCrew, crewRecord, isNamed,
} from '../js/v3/state.js?v=10';
import { createBattleState } from '../js/v3/battle.js?v=14';

const read = async p => JSON.parse(await readFile(new URL(p, import.meta.url)));
const content = await read('../../content/era1-slice-v1.json');
const data = {
  content,
  crew: new Map(content.crew.map(c => [c.id, c])),
  battles: new Map(content.battles.map(b => [b.id, b])),
  equipment: new Map(content.equipment.map(e => [e.id, e])),
  missions: new Map(content.missions.map(m => [m.id, m])),
};
let checks = 0;
const ok = (c, m) => { assert(c, m); checks += 1; };
const aatami = content.protagonist;

ok(aatami?.id === 'aatami' && aatami.named && aatami.steps_back_at_chapter === 3, 'Aatami is in canon, named, and steps back at chapter 3 (GDD §16, answer 26)');
ok(!content.crew.some(c => c.id === 'aatami'), 'he is not one of the six crew slots');

const s = createState(content);
ok(aatamiFights(s, content), 'on day one he fights');
ok(fighters(s, data).map(f => f.id).join() === 'aatami', 'with nobody hired, he is the whole side');
ok(s.crewStatus.aatami?.status === 'available', 'he has a condition like anyone who fights');
ok(crewRecord(s, data, 'aatami')?.name === 'Aatami' && isNamed(s, data, 'aatami'), 'his record resolves, and he is named');

s.recruited = [content.crew[0].id]; s.deployed = [...s.recruited];
ok(requirementStatus('fighters>=2', s, data).ok, 'one hire and Aatami make two who can fight');
ok(!requirementStatus('deployed-crew>=2', s, data).ok, 'but only one crew with you');
ok(requirementStatus('deployed-crew>=1', s, data).ok && !requirementStatus('deployed-crew>=2', s, data).ok, '"someone with you" still means crew');
const battle = createBattleState(data.battles.get('battle-karhupuisto-2v2'), fighters(s, data), s, data);
ok(battle.players.map(p => p.id).join() === `aatami,${content.crew[0].id}`, 'he takes the board, in front');
ok(ageCrew(s, data, ['aatami']).length === 0 && !s.crewFights.aatami, 'he has no career ceiling');
ok(stepBackIfReady(s, content) === '', 'with one hire he does not step back');

s.recruited = content.crew.slice(0, 3).map(c => c.id); s.deployed = [...s.recruited];
ok(aatamiFights(s, content) && fighters(s, data)[0].id === 'aatami', 'a crew of three in chapter 1: he still fights (it is a story point, not a crew count)');
ok(stepBackIfReady(s, content) === '', 'and does not step back yet');
s.chapter = 2;
ok(aatamiFights(s, content), 'chapter 2, The Route: he still fights');
s.chapter = 3;
ok(!aatamiFights(s, content), 'chapter 3, The Supplier: he could stay out');
const beat = stepBackIfReady(s, content);
ok(beat === aatami.step_back_beat && s.flags.includes('memory:aatami-stepped-back'), 'the first fight of chapter 3, he does, and it is a beat');
ok(stepBackIfReady(s, content) === '', 'the beat plays once');
ok(!fighters(s, data).some(f => f.id === 'aatami'), 'from then on the crew fights');
s.chapter = 1;
ok(!aatamiFights(s, content), 'the withdrawal is permanent');

const old = createState(content); delete old.crewStatus.aatami;
ok(restoreState(JSON.parse(JSON.stringify(old)), content).crewStatus.aatami, 'an older save gains his condition');

console.log(`aatami: ${checks} checks passed`);
