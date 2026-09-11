import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chapterPeople, renderChapterPeople} from '../js/v3/chapter-narrative.js';
const content = JSON.parse(await readFile(new URL('../../content/era1-slice-v1.json', import.meta.url)));
const state = {chapter:1,scheduleIndex:0,choices:{},newsSeen:[]};
const people = chapterPeople(state, content);
assert.deepEqual(people.map(p=>p.id), ['jaska','toko','arvo']);
for (const person of people) {
  assert.equal(person.role,'scene');
  assert(!content.crew.some(c=>c.id===person.id));
  for (const beat of person.beats) {
    const source = (beat.kind==='news'?content.news:content.encounters).find(e=>e.id===beat.id);
    assert(source, `Missing canonical source ${beat.id}`);
    assert.equal(beat.status,'ahead');
  }
}
assert.equal(people[1].combat_policy,'never');
assert.equal(people[2].combat_policy,'never');
const before = JSON.stringify(state);
const initial = renderChapterPeople(state,content);
assert.equal(JSON.stringify(state),before,'Viewing must not mutate campaign');
assert(!initial.includes(people[0].beats[0].recollection),'No future outcome text');
state.scheduleIndex=2;
assert.equal(chapterPeople(state,content)[0].beats[0].status,'now');
state.scheduleIndex=3;
assert.equal(chapterPeople(state,content)[0].beats[0].status,'passed');
state.choices['enc-jaska-receipt']='leave';
assert.equal(chapterPeople(state,content)[0].beats[0].status,'remembered');
state.newsSeen.push('news-markka-afterlife');
assert.equal(chapterPeople(state,content)[2].beats[0].status,'remembered');
assert.deepEqual(chapterPeople(JSON.parse(JSON.stringify(state)),content),chapterPeople(state,content),'Reload preserves derived progress');
assert.deepEqual(chapterPeople({...state,chapter:2},content),[],'No invented playable chapter');
const injected=structuredClone(content);
injected.chapters[0].narrative.people[0].name='<img onerror="bad()">';
assert(!renderChapterPeople(state,injected).includes('<img'),'Escape authored text');
const missing=structuredClone(content);
missing.schedule=[];
assert.equal(chapterPeople({chapter:1,scheduleIndex:0},missing)[0].beats[0].status,'unavailable');
console.log('PASS: canonical links, scene-only roles, timeline, outcome concealment, no mutation, reload, unknown chapter and HTML escaping');

