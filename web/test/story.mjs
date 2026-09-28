// The Thursday Load (v4.62): briefings, the case board and the case.
//
//   node web/test/story.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, chooseEncounter, restoreState, applyEffects } from '../js/v3/state.js?v=7';
import { chooseVisit, openVisit } from '../js/v3/visits.js?v=3';
import { caseBoard, keyCluesFound, caseBlocker, caseKnown, resolveCase, briefing, settleCut } from '../js/v3/story.js?v=2';
import { forceRoad, pendingRoad, resolveRoad, rollRoad } from '../js/v3/road.js?v=2';

const read = async p => JSON.parse(await readFile(new URL(p, import.meta.url)));
const content = await read('../../content/era1-slice-v1.json');
const map = await read('../../map/kallio-era1-2003-v1.json');
const story = await read('../../content/act1-story-v1.json');
const road = await read('../../content/road-events-v1.json');
const data = {
  content, map,
  encounters: new Map(content.encounters.map(e => [e.id, e])),
  missions: new Map(content.missions.map(m => [m.id, m])),
  crew: new Map(content.crew.map(c => [c.id, c])),
  anchors: new Map(map.anchors.map(a => [a.id, a])),
  sites: new Map(map.sites.map(s => [s.id, s])),
};
let n = 0; const ok = (c, m) => { assert(c, m); n += 1; };

// G1: the families keep their ground.
ok(data.sites.get('jade_lantern_front').anchorId === 'hakaniemi', 'the Jade front is at Hakaniemi (G1)');
ok(data.sites.get('mccormick_yard').anchorId === 'linjat_yard', 'the McCormicks stay at Linjat / Siltanen');
ok(content.schedule.find(s => s.encounter_id === 'enc-jade-window').anchor_id === 'hakaniemi', "Mei Lan's lunch is at Hakaniemi");
ok(data.sites.get('toko_slomo_noodles').anchorId === 'vaasankatu', 'Toko stays on Vaasankatu');

// Every clue is earned by an ordinary effect somewhere in the game.
const all = [
  ...content.encounters.flatMap(e => e.choices.flatMap(c => c.effects)),
  ...content.optional_visits.flatMap(v => v.choices.flatMap(c => c.effects)),
  ...content.missions.flatMap(m => [...m.success_effects, ...m.partial_effects, ...m.failure_effects]),
  ...road.events.flatMap(e => e.choices.flatMap(c => c.effects)),
];
for (const clue of story.clues) {
  const want = clue.flag.startsWith('memory:') ? clue.flag : `flag:${clue.flag}`;
  ok(all.includes(want), `clue ${clue.id} is earned by some choice (${want})`);
}
ok(story.clues.filter(c => c.key).length >= story.case.unlock.key_clues, 'enough key clues exist to open the case');
// Briefings cover every authored mission.
for (const m of content.missions) {
  const b = briefing(data, story, m.id);
  ok(b && b.premise && b.plants && b.steps.length === m.steps.length, `${m.id} has a briefing with its real steps`);
}
// Case choices use the ordinary grammar.
const known = /^(cash|intel):[+-]\d+$|^stock:[^:]+:[+-]\d+$|^(relationship|obligation|pressure):[^:]+:[+-]\d+$|^flag:/;
for (const c of story.case.choices) ok(c.effects.every(fx => known.test(fx)), `case choice ${c.id} uses known effects`);

// Play it: the clues come from real choices.
const s = createState(content);
ok(caseBoard(s, story).every(c => !c.isFound) && !caseKnown(s, story), 'a new campaign knows nothing');
ok(caseBlocker(s, story) === 'not-enough', 'the case is closed at first');
const first = data.encounters.get('enc-first-purchase');
chooseEncounter(s, first, first.choices.find(c => c.id === 'ask-control'), data);
ok(caseBoard(s, story).find(c => c.id === 'kello-named').isFound, 'asking who watches names Kello');
ok(keyCluesFound(s, story) === 0, 'naming him is not a key clue');
// Harju visit: needs Toko's night, and a crew member to watch the tram.
s.choices['enc-toko-quiet-voice'] = 'buy-info'; s.flags.push('toko-van-pattern');
s.selectedAnchor = 'harju';
ok(openVisit(s, data, 'visit-harju-thursday'), 'the Brahenkenttä visit opens after Toko');
ok(chooseVisit(s, data, 'watch-the-tram').ok === false, 'watching the tram needs someone with you');
s.recruited = ['crew-slot-runner']; s.deployed = ['crew-slot-runner'];
ok(chooseVisit(s, data, 'watch-the-tram').ok, 'with a runner, you watch the tram');
ok(caseBoard(s, story).find(c => c.id === 'saw-the-tram').isFound && keyCluesFound(s, story) === 1, 'the tram is key clue one');
// Bear path: naming the empty van tells the McCormicks.
const bear = data.encounters.get('enc-bear-path');
chooseEncounter(s, bear, bear.choices.find(c => c.id === 'name-empty-van'), data);
ok(keyCluesFound(s, story) === 2, 'sold air is key clue two');
ok(caseKnown(s, story) && caseBlocker(s, story) === 'not-here', 'the case is known, and it waits at Piritori');
// Courtyard receipts (mission success) would be a third.
const t = structuredClone(s);
applyEffects(t, data.missions.get('mission-courtyard-receipts').success_effects, data, 'test');
ok(keyCluesFound(t, story) === 3, "Kello's receipts are key clue three");
// Resolve each ending on a copy.
s.selectedAnchor = 'piritori';
ok(caseBlocker(s, story) === '', 'at Piritori the case can be answered');
const before = { cash: s.cash, index: s.scheduleIndex };
for (const ch of story.case.choices) {
  const c = restoreState(JSON.parse(JSON.stringify(s)), content);
  const r = resolveCase(c, data, story, ch.id);
  ok(r.ok && c.choices[story.case.id] === ch.id, `${ch.id} resolves`);
  ok(c.scheduleIndex === before.index, `${ch.id} does not turn the block`);
  ok(resolveCase(c, data, story, ch.id).reason === 'resolved', `${ch.id} is answered once`);
  if (ch.id === 'sell-kello') ok(c.cash === before.cash + 250 && c.flags.includes('kello-sold'), 'selling Kello pays €250');
  if (ch.id === 'take-the-route') ok(c.stock.piri === (s.stock.piri ?? 0) + 2, 'the route brings the first load');
  if (ch.id === 'tell-toko') ok((c.relationships.toko ?? 0) === (s.relationships.toko ?? 0) + 2, 'Toko +2');
}
ok(resolveCase(s, data, story, 'nope').reason === 'unknown-choice', 'an unknown answer is refused');

// Kello's cut (v4.63): pays each night, and the risk grows.
{
  const base = restoreState(JSON.parse(JSON.stringify(s)), content);
  ok(settleCut(base, story).paid === 0, 'no cut, no pay');
  const r = resolveCase(base, data, story, 'take-a-cut');
  ok(r.ok && base.flags.includes('thursday-cut'), 'taking the cut starts it');
  const cash = base.cash; const first = settleCut(base, story);
  ok(first.paid === 30 && base.cash === cash + 30 && !first.foundOut, 'the first night pays €30 and is safe');
  let found = null;
  for (let i = 2; i <= 6 && found === null; i += 1) { base.scheduleIndex += 2; if (settleCut(base, story).foundOut) found = i; }
  ok(found !== null, `sooner or later a family finds out (payment ${found})`);
  // Deterministic: the same save finds out on the same payment.
  const again = restoreState(JSON.parse(JSON.stringify(s)), content); resolveCase(again, data, story, 'take-a-cut');
  let found2 = null; settleCut(again, story);
  for (let i = 2; i <= 6 && found2 === null; i += 1) { again.scheduleIndex += 2; if (settleCut(again, story).foundOut) found2 = i; }
  ok(found2 === found, 'the same save finds out on the same night');
  // The found-out event is raised by the story, and ends the cut.
  ok(forceRoad(base, road, story.case.cut.found_out_event, 'piritori'), 'the story raises the event');
  ok(pendingRoad(base, road)?.id === 'road-cut-found-out', 'it waits on the road screen');
  const pay = structuredClone(base); pay.cash = 500;
  ok(resolveRoad(pay, data, road, 'pay').ok && pay.flags.includes('cut-ended'), 'paying them off ends the cut');
  ok(settleCut(pay, story).paid === 0, 'an ended cut pays nothing');
  const give = structuredClone(base);
  ok(resolveRoad(give, data, road, 'give-kello').ok && give.flags.includes('kello-sold') && give.flags.includes('cut-ended'), 'giving them Kello ends it too');
  ok(forceRoad(pay, road, story.case.cut.found_out_event) === false, 'a seen event is not raised twice');
}
// A triggered event never rolls on the road.
{
  const t = createState(content); t.scheduleIndex = 8; t.flags.push('thursday-cut');
  const seen = [];
  for (let i = 0; i < 80; i += 1) { const e = rollRoad(t, data, road, {}); if (e) { seen.push(e.id); resolveRoad(t, data, road, e.choices.find(c => !(c.requires ?? []).length).id); } }
  ok(!seen.includes('road-cut-found-out'), 'the found-out event never rolls by chance');
}
console.log(`story: ${n} checks passed`);
