// The road (Act I v4.58): events in transit and on arrival.
//
//   node web/test/road.mjs
//
// Owner, 2026-09-27: about every third or fourth journey, a surprise, a bit of
// time, low-end hustle first. This holds the rules in road.js's header.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, restoreState, advanceSchedule, requirementStatus } from '../js/v3/state.js?v=9';
import { rollRoad, resolveRoad, pendingRoad, minutesThisBlock, clockLabel, choiceOpen } from '../js/v3/road.js?v=5';

const content = JSON.parse(await readFile(new URL('../../content/era1-slice-v1.json', import.meta.url)));
const roadEvents = JSON.parse(await readFile(new URL('../../content/road-events-v1.json', import.meta.url)));
const data = {
  content,
  crew: new Map(content.crew.map(item => [item.id, item])),
  missions: new Map(content.missions.map(item => [item.id, item])),
};
let checks = 0;
const ok = (c, m) => { assert(c, m); checks += 1; };

// Content: every effect and requirement is one the engine understands.
const known = /^(cash|intel|debt|markka):[+-]\d+$|^obligation:[^:]+:[+-]\d+$|^stock:[^:]+:[+-]\d+$|^relationship:[^:]+:[+-]\d+$|^pressure:[^:]+:[+-]\d+$|^flag:|^start-battle:/;
const ids = new Set();
for (const e of roadEvents.events) {
  ok(!ids.has(e.id), `unique id ${e.id}`); ids.add(e.id);
  ok(['transit', 'arrival', 'any'].includes(e.phase), `${e.id} phase`);
  ok([0, 1].includes(e.tier), `${e.id} tier`);
  ok(e.choices.length >= 2, `${e.id} offers a choice`);
  ok(e.choices.some(c => !(c.requires ?? []).length), `${e.id} always has an open way out`);
  for (const c of e.choices) {
    ok(Number.isInteger(c.minutes) && c.minutes >= 0 && c.minutes <= 60, `${e.id}/${c.id} costs a bit of time`);
    for (const fx of c.effects) ok(known.test(fx), `${e.id}/${c.id} effect ${fx}`);
    for (const req of [...(e.requires ?? []), ...(c.requires ?? [])]) {
      ok(requirementStatus(req, createState(content), data).reason !== req, `${e.id} requirement ${req} is understood`);
    }
    if (c.effects.some(fx => fx.startsWith('start-battle:'))) {
      ok((c.requires ?? []).includes('fighters>=2'), `${e.id}/${c.id}: a fight needs two who can fight`);
      ok(content.battles.some(b => `start-battle:${b.id}` === c.effects.find(fx => fx.startsWith('start-battle:'))), `${e.id} battle exists`);
    }
  }
}
ok(roadEvents.events.filter(e => e.tier === 0).length >= 4, 'enough low-end hustle to open with');
ok(roadEvents.events.filter(e => e.tier === 0).every(e => !e.choices.some(c => c.effects.some(fx => fx.startsWith('start-battle')))),
  'the first events are hustle, not fights');

// Walk a long road: journeys at a fixed story block, resolving each event with
// its last (quietest) open choice.
function walk(state, journeys) {
  const fired = [];
  for (let i = 0; i < journeys; i += 1) {
    const e = rollRoad(state, data, roadEvents, { path: ['piritori', 'siltasaari'], destination: 'siltasaari' });
    if (e) {
      fired.push({ at: state.road.journeys, id: e.id });
      const quiet = [...e.choices].reverse().find(c => choiceOpen(c, state, data).ok);
      assert.equal(resolveRoad(state, data, roadEvents, quiet.id).ok, true);
    }
  }
  return fired;
}

// Nothing before the first story block.
{
  const s = createState(content);
  ok(walk(s, 10).length === 0, 'no event before the first story block');
}

// Gaps of 3 or 4, and deterministic.
{
  const a = createState(content); a.scheduleIndex = 2;
  const b = createState(content); b.scheduleIndex = 2;
  const fa = walk(a, 16), fb = walk(b, 16);
  ok(JSON.stringify(fa) === JSON.stringify(fb), 'the same save rolls the same road');
  ok(fa.length >= 4, `events keep coming (${fa.length} in 16 journeys)`);
  let last = 0;
  for (const f of fa) { const gap = f.at - last; ok(gap === 3 || gap === 4, `gap ${gap} is 3 or 4`); last = f.at; }
  const seen = fa.map(f => f.id);
  ok(new Set(seen).size === seen.length, 'no event repeats');
  ok(seen.every(id => roadEvents.events.find(e => e.id === id).tier === 0), 'tier 0 only at block 2 with no crew');
}

// Over many seeds (block counts), the average gap is between 3 and 4.
{
  let gaps = [], firsts = new Set();
  for (let block = 2; block < 14; block += 1) {
    const s = createState(content); s.scheduleIndex = block; s.contentId = `${content.id}#${block}`;
    const f = walk(s, 12); let last = 0;
    for (const x of f) { gaps.push(x.at - last); last = x.at; }
    if (f[0]) firsts.add(f[0].id);
  }
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  ok(mean >= 3 && mean <= 4, `mean gap ${mean.toFixed(2)} is every third or fourth journey`);
  ok(gaps.includes(3) && gaps.includes(4), 'both gaps occur (a surprise, not a metronome)');
  ok(firsts.size >= 2, `the first event varies (${[...firsts].join(', ')})`);
}

// Tier 1 opens with a recruit or late story, and requirements gate events.
{
  const s = createState(content); s.scheduleIndex = 6; s.stock.piri = 0;
  const seen = walk(s, 40).map(f => f.id);
  ok(seen.some(id => roadEvents.events.find(e => e.id === id).tier === 1), 'late story reaches bigger contacts');
  ok(!seen.includes('road-torn-pocket'), 'a torn pocket needs a pack to lose');
}

// Resolution: effects, minutes on this block's clock, gone next block, save round-trip.
{
  const s = createState(content); s.scheduleIndex = 2;
  s.road = { journeys: 3, since: 3, seen: [], pending: { id: 'road-first-gig', phase: 'transit', from: 'piritori', to: 'siltasaari' }, minutes: 0, minutesBlock: -1, last: null };
  const saved = restoreState(JSON.parse(JSON.stringify(s)), content);
  ok(pendingRoad(saved, roadEvents)?.id === 'road-first-gig', 'a pending event survives a reload');
  ok(rollRoad(saved, data, roadEvents, {}) === null, 'nothing stacks on a pending event');
  const cash = saved.cash;
  ok(resolveRoad(saved, data, roadEvents, 'nope').reason === 'unknown-choice', 'unknown choice refused');
  ok(resolveRoad(saved, data, roadEvents, 'carry').ok, 'carry the bag');
  ok(saved.cash === cash + 15, 'fifteen euros');
  ok(saved.flags.includes('road-first-gig'), 'the gig is remembered');
  ok(minutesThisBlock(saved) === 40, '40 minutes spent');
  ok(clockLabel(saved, { block: 'night' }, roadEvents) === '20:40', 'night clock reads 20:40');
  ok(clockLabel(saved, { block: 'day' }, roadEvents) === '10:40', 'day clock reads 10:40');
  ok(resolveRoad(saved, data, roadEvents, 'carry').reason === 'no-event', 'resolving twice does nothing');
  ok(saved.scheduleIndex === 2, 'minutes never turn the block (D002)');
  advanceSchedule(saved, { content, encounters: new Map(), offers: new Map() });
  ok(minutesThisBlock(saved) === 0 && clockLabel(saved, { block: 'day' }, roadEvents) === '', 'a new block starts on the hour');
}

// A fight: refused without a crew, shown anyway; with a crew it names the battle.
{
  const s = createState(content); s.scheduleIndex = 8;
  s.road = { journeys: 9, since: 0, seen: [], pending: { id: 'road-underpass', phase: 'transit' }, minutes: 0, minutesBlock: -1, last: null };
  const stand = pendingRoad(s, roadEvents).choices.find(c => c.id === 'stand');
  ok(!choiceOpen(stand, s, data).ok, 'no crew, no stand');
  ok(resolveRoad(s, data, roadEvents, 'stand').ok === false && s.road.pending, 'refused, and the event waits');
  const two = content.crew.slice(0, 2).map(c => c.id);
  s.recruited = [...two]; s.deployed = [...two];
  const r = resolveRoad(s, data, roadEvents, 'stand');
  ok(r.ok && r.startBattle === 'battle-karhupuisto-2v2', 'with a crew it becomes a fight');
}

console.log(`road: ${checks} checks passed`);
