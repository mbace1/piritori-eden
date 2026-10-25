// Doors and the ten-day chapter (H1 + H2 of The Long Game).
//
//   node web/test/doors.mjs
//
// Owner, 2026-09-29: "go ahead" on the plan (design/H1_H2_PLAN.md), and
// answer 23: "Fights everyday, depending on the mission. Maybe 2 per day."
// This holds the rules in doors.js's header, the three new spine beats, and
// the ending that is now a look ahead rather than the end of the game.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createState, restoreState, currentSchedule, currentEncounter, chooseEncounter, choiceStatus,
  advanceSchedule, requirementStatus, recordFight, fightsToday, forecastEnding,
} from '../js/v3/state.js?v=10';
import { offerDoors, takeDoor, doorBlocker, registerTaken, templateOf, canFight, doorFightEffects, isDoorBlock, escalation } from '../js/v3/doors.js?v=4';

const read = async p => JSON.parse(await readFile(new URL(p, import.meta.url)));
const content = await read('../../content/era1-slice-v1.json');
const doors = await read('../../content/doors-v1.json');
const roadEvents = await read('../../content/road-events-v1.json');
const map = await read('../../map/kallio-era1-2003-v1.json');
const art = await read('../../art/v3/manifest.json');
const artIds = new Set((Array.isArray(art) ? art : art.assets ?? Object.values(art)).map(a => a.id));
const makeData = () => ({
  content,
  encounters: new Map(content.encounters.map(item => [item.id, item])),
  missions: new Map(content.missions.map(item => [item.id, item])),
  battles: new Map(content.battles.map(item => [item.id, item])),
  crew: new Map(content.crew.map(item => [item.id, item])),
  anchors: new Map(map.anchors.map(item => [item.id, item])),
  map,
});
let checks = 0;
const ok = (c, m) => { assert(c, m); checks += 1; };

// ── canon ────────────────────────────────────────────────────────────
const active = new Set(map.anchors.filter(a => a.sliceState === 'active').map(a => a.id));
const battles = new Set(content.battles.map(b => b.id));
const effect = /^(cash|intel|markka|debt):[+-]\d+$|^stock:[^:]+:[+-]\d+$|^relationship:(jaska|toko|mccormick_family|jade_lantern_network):[+-]\d+$|^obligation:[^:]+:[+-]\d+$|^pressure:[^:]+:[+-]\d+$|^flag:[a-z0-9-]+$|^memory:[a-z0-9-:]+$|^start-battle:[a-z0-9-]+$/;
const requirement = /^(cash|intel|deployed-crew|fighters|fights-today)(>=|<)\d+$|^stock:piri>=\d+$|^relationship:[a-z_]+>=-?\d+$|^flag:[a-z0-9-]+$/;
const ids = new Set();
for (const t of doors.templates) {
  ok(!ids.has(t.id), `unique ${t.id}`); ids.add(t.id);
  ok(['gig', 'pickup', 'sale', 'favour', 'watch', 'hit'].includes(t.kind), `${t.id} kind`);
  ok(['low', 'medium', 'high'].includes(t.risk), `${t.id} risk`);
  ok(t.anchors.length && t.anchors.every(a => active.has(a)), `${t.id} happens somewhere Aatami can go`);
  ok(t.anchors.every(a => artIds.has(doors.rules.scenes[a])), `${t.id} has a registered scene at every anchor`);
  ok(t.title && t.premise.length >= 60 && t.steps.length === 3 && t.stakes, `${t.id} is briefed (premise, three steps, stakes)`);
  ok((t.inspectables ?? []).length >= 2, `${t.id} has things to look at`);
  ok(t.choices.length >= 3 && t.choices.some(c => !c.requirements.length && !c.escalates && !c.effects.some(fx => fx.startsWith('start-battle'))), `${t.id} always has an open, safe way out`);
  for (const c of t.choices) if (c.escalates !== undefined) ok(c.escalates > 0 && c.escalates < 1 && /fight/i.test(c.forecast), `${t.id}/${c.id}: an escalation is a chance, and the forecast says fight`);
  for (const req of t.requires ?? []) ok(requirement.test(req), `${t.id} requires ${req}`);
  const fights = t.choices.filter(c => c.effects.some(fx => fx.startsWith('start-battle:')));
  const escalates = t.choices.filter(c => c.escalates);
  ok(Boolean(t.fight) === (fights.length > 0 || escalates.length > 0), `${t.id}: a fight block exactly when a choice fights or can go bad`);
  if (t.fight) {
    ok(battles.has(t.fight.battle), `${t.id} fight exists`);
    ok(/fight/i.test(t.stakes) && /way round/i.test(t.stakes), `${t.id} says it can become a fight and that there is a way round`);
    ok(t.fight.win.every(fx => effect.test(fx)) && t.fight.lose.every(fx => effect.test(fx)), `${t.id} fight stakes are in the grammar`);
    ok(fights.length <= 1 && t.choices.filter(c => !c.effects.some(fx => fx.startsWith('start-battle:'))).length >= 2, `${t.id}: at most one fight choice, and at least two other ways`);
  }
  for (const c of t.choices) {
    ok(c.forecast && c.label, `${t.id}/${c.id} forecast`);
    for (const fx of c.effects) ok(effect.test(fx), `${t.id}/${c.id} effect ${fx}`);
    for (const req of c.requirements) ok(requirement.test(req), `${t.id}/${c.id} requires ${req}`);
    if (c.effects.some(fx => fx.startsWith('start-battle:'))) {
      ok(c.effects.includes(`start-battle:${t.fight.battle}`), `${t.id}/${c.id} starts the door's own fight`);
      ok(c.requirements.includes(`fights-today<${doors.rules.fights_per_day_max}`), `${t.id}/${c.id}: at most two fights a day`);
      ok(c.requirements.some(r => r.startsWith('fighters>=')), `${t.id}/${c.id}: a fight needs people who can fight`);
    }
  }
}
ok(new Set(doors.templates.map(t => t.kind)).size === 6, 'all six kinds of door');
ok(doors.templates.filter(canFight).length >= 4, 'enough doors that can become a fight for one a block');
ok(doors.templates.filter(canFight).some(t => t.kind !== 'hit'), 'a fight depends on the job, not only on hits (answer 23)');
ok(doors.templates.filter(t => t.choices.some(c => c.escalates)).length >= 6, 'bad deals escalate on most doors (answer 25)');

// ── the ten-day chapter ──────────────────────────────────────────────
const doorIdx = content.schedule.map((s, i) => (s.door ? i : -1)).filter(i => i >= 0);
ok(content.schedule.length === 20 && content.campaign.days === 10, 'ten days, twenty blocks');
ok(JSON.stringify(doorIdx) === '[15,16,18]', `door blocks are day 8 night, day 9 day, day 10 day (${doorIdx})`);
ok(content.schedule.at(-1).encounter_id === 'enc-shipment-night', 'the shipment is the last night');
ok(!JSON.stringify(content.encounters).includes('resolve-ending'), 'nothing ends the campaign on day 7 any more');

function atDoor(index = 15, mutate) {
  const s = createState(content); s.scheduleIndex = index; mutate?.(s); return s;
}

// Offers: 2-3, stable, remembered, one of each kind first, a fight door when fights are left.
{
  const data = makeData();
  const a = atDoor(); const b = atDoor();
  const oa = offerDoors(a, data, doors), ob = offerDoors(b, data, doors);
  ok(oa.length >= 2 && oa.length <= 3, `2-3 doors (${oa.length})`);
  ok(JSON.stringify(oa) === JSON.stringify(ob), 'the same save offers the same doors');
  ok(new Set(oa.map(o => templateOf(doors, o.template).kind)).size === oa.length, 'no two doors of one kind');
  ok(oa.some(o => canFight(templateOf(doors, o.template))), 'a door that can become a fight is on offer');
  a.cash = 9999;
  ok(JSON.stringify(offerDoors(a, data, doors)) === JSON.stringify(oa), 'offers are kept for the block, whatever changes');
  const saved = restoreState(JSON.parse(JSON.stringify(a)), content);
  ok(JSON.stringify(offerDoors(saved, data, doors)) === JSON.stringify(oa), 'and survive a reload');
  ok(offerDoors(atDoor(14), data, doors).length === 0, 'no doors on a spine block');
  ok(isDoorBlock(a, content) && !isDoorBlock(atDoor(14), content), 'a door block is known');
  // Over many seeds, every door block has a fight door while fights are left.
  let withFight = 0, n = 0;
  for (let seed = 0; seed < 40; seed += 1) for (const i of doorIdx) {
    const s = atDoor(i, x => { x.contentId = `${content.id}#${seed}`; x.stock.piri = 2; });
    n += 1; if (offerDoors(s, data, doors).some(o => canFight(templateOf(doors, o.template)))) withFight += 1;
  }
  ok(withFight === n, `every door block offers a fight door (${withFight}/${n})`);
  // Late doors: only at night.
  let lateByDay = 0;
  for (let seed = 0; seed < 40; seed += 1) {
    const s = atDoor(16, x => { x.contentId = `${content.id}#${seed}`; });
    lateByDay += offerDoors(s, data, doors).filter(o => templateOf(doors, o.template).late).length;
  }
  ok(lateByDay === 0, 'a late door never opens in the day');
}

// A late door closes at 22:00.
{
  const data = makeData();
  const s = atDoor(15);
  s.doors.offers[15] = [{ template: 'watch-back-door', anchor: 'hakaniemi' }, { template: 'gig-rauno-cart', anchor: 'harju' }];
  ok(doorBlocker(s, data, doors, s.doors.offers[15][0], roadEvents) === '', 'open at 20:00');
  s.road = { journeys: 0, since: 0, seen: [], pending: null, minutes: 125, minutesBlock: 15, last: null };
  ok(doorBlocker(s, data, doors, s.doors.offers[15][0], roadEvents) === 'closed', 'closed at 22:05');
  ok(doorBlocker(s, data, doors, s.doors.offers[15][1], roadEvents) === '', 'an ordinary door stays open');
  ok(takeDoor(s, data, doors, 'watch-back-door', roadEvents).reason === 'closed', 'a closed door cannot be taken');
}

// Taking a door: it becomes the block's encounter, where it is.
{
  const data = makeData();
  const s = atDoor(15);
  s.doors.offers[15] = [{ template: 'gig-rauno-cart', anchor: 'harju' }, { template: 'hit-bear-debt', anchor: 'karhupuisto' }];
  ok(!currentSchedule(s, content).encounter_id && currentEncounter(s, data) === null, 'no lead before a door is taken');
  ok(takeDoor(s, data, doors, 'nope', roadEvents).reason === 'not-offered', 'only an offered door');
  const r = takeDoor(s, data, doors, 'gig-rauno-cart', roadEvents);
  ok(r.ok, 'the door is taken');
  ok(currentSchedule(s, content).anchor_id === 'harju', 'the lead is the door');
  const enc = currentEncounter(s, data);
  ok(enc?.door === 'gig-rauno-cart' && enc.scene_asset_id === doors.rules.scenes.harju, 'the door is the encounter, with its scene');
  ok(takeDoor(s, data, doors, 'hit-bear-debt', roadEvents).reason === 'already-taken', 'one door a block');
  const saved = restoreState(JSON.parse(JSON.stringify(s)), content);
  const fresh = makeData(); registerTaken(saved, fresh, doors);
  ok(currentEncounter(saved, fresh)?.id === enc.id, 'a taken door survives a reload');
  const cash = s.cash;
  ok(chooseEncounter(s, enc, enc.choices.find(c => c.id === 'push'), data).ok && s.cash === cash + 20, 'its choices are ordinary effects');
  advanceSchedule(s, data);
  ok(s.scheduleIndex === 16, 'and it cost the block');
  ok(!offerDoors(s, data, doors).some(o => o.template === 'gig-rauno-cart'), 'a door is taken once a chapter');
}

// Answer 23: two fights a day, then no more.
{
  const data = makeData();
  const s = atDoor(15);
  s.recruited = content.crew.slice(0, 3).map(c => c.id); s.deployed = [...s.recruited];
  const lean = doors.templates.find(t => t.id === 'hit-bear-debt').choices.find(c => c.id === 'lean');
  ok(choiceStatus(lean, s, data).ok, 'a fight is open with a crew and no fights today');
  recordFight(s, content); ok(fightsToday(s, content) === 1 && choiceStatus(lean, s, data).ok, 'one fight today, a second is allowed');
  recordFight(s, content); ok(!choiceStatus(lean, s, data).ok, 'two fights today, no third');
  s.scheduleIndex = 16;
  ok(fightsToday(s, content) === 0 && choiceStatus(lean, s, data).ok, 'the next day starts at nought');
  ok(JSON.stringify(doorFightEffects(doors, 'hit-bear-debt', 'win')) === JSON.stringify(doors.templates.find(t => t.id === 'hit-bear-debt').fight.win), 'a door fight pays the door, not a mission');
}

// Answer 25: a bad deal escalates, by a roll the forecast names.
{
  const data = makeData();
  const crew = content.crew.slice(0, 3).map(c => c.id);
  let fights = 0, alone = 0, n = 0;
  for (let seed = 0; seed < 200; seed += 1) {
    const s = atDoor(15, x => { x.contentId = `${content.id}#${seed}`; x.recruited = [...crew]; x.deployed = [...crew]; });
    const a = escalation(s, data, doors, 'pickup-fish-stall', 'skim');
    ok(JSON.stringify(a) === JSON.stringify(escalation(s, data, doors, 'pickup-fish-stall', 'skim')), 'an escalation is deterministic');
    n += 1; if (a?.battle) fights += 1;
    const lone = atDoor(15, x => { x.contentId = `${content.id}#${seed}`; });
    const b = escalation(lone, data, doors, 'pickup-fish-stall', 'skim');
    if (b) { ok(!b.battle && JSON.stringify(b.effects) === JSON.stringify(templateOf(doors, 'pickup-fish-stall').fight.lose), 'alone, it costs the losing stakes'); alone += 1; }
  }
  ok(fights / n > 0.4 && fights / n < 0.6, `the skim goes bad about half the time (${fights}/${n})`);
  ok(alone === fights, 'with no crew the same rolls go bad, without a fight');
  const s = atDoor(15, x => { x.recruited = [...crew]; x.deployed = [...crew]; });
  recordFight(s, content); recordFight(s, content);
  let any = 0;
  for (let seed = 0; seed < 50; seed += 1) { s.contentId = `${content.id}#${seed}`; if (escalation(s, data, doors, 'pickup-fish-stall', 'skim')) any += 1; }
  ok(any === 0, 'nothing escalates past two fights a day');
  ok(escalation(atDoor(15), data, doors, 'gig-rauno-cart', 'push') === null, 'an honest job never escalates');
}

// The spine beats and the ending.
{
  const data = makeData();
  const beat = id => data.encounters.get(id);
  const k = beat('enc-kello-reckoning');
  const s = atDoor(14);
  const open = k.choices.filter(c => choiceStatus(c, s, data).ok).map(c => c.id);
  ok(JSON.stringify(open) === '["let-it-pass"]', `with no case answered only the quiet way is open (${open})`);
  s.flags.push('thursday-cut');
  ok(choiceStatus(k.choices.find(c => c.id === 'ask-kello'), s, data).ok, 'the case outcome opens its own reckoning');
  const ship = beat('enc-shipment-night');
  const run = ship.choices.find(c => c.id === 'run-shipment');
  const t = atDoor(19, x => { x.selectedAnchor = 'sornainen_harbour'; x.cash = 500; });
  ok(!choiceStatus(run, t, data).ok && requirementStatus('chapter-goal-met', t, data).ok === false, 'the shipment needs the chapter goal');
  t.chapterEarned = t.chapterThreshold;
  ok(choiceStatus(run, t, data).ok, 'earned, it can run');
  ok(chooseEncounter(t, ship, run, data).ok && t.chapterCleared && ['clean', 'messy', 'lost'].includes(t.lastEndingOutcome) && t.cash === 100, 'the shipment runs for its stake');
  const m = atDoor(19, x => { x.selectedAnchor = 'sornainen_harbour'; });
  ok(chooseEncounter(m, ship, ship.choices.find(c => c.id === 'let-it-go'), data).ok && m.chapterCleared && m.lastEndingOutcome === 'missed', 'missing the boat still closes the chapter');
  const j = atDoor(13, x => { x.selectedAnchor = 'makelansilta'; });
  const last = beat('enc-jaska-last-light');
  chooseEncounter(j, last, last.choices[0], data);
  ok(!j.endingId && j.flags.some(f => f.startsWith('memory:pasila-forecast:')), 'day 7 points at Pasila instead of ending there');
  ok(forecastEnding(j, data)?.id?.startsWith('pasila-'), 'the forecast names an ending');
}

// A whole chapter, walking the quietest open way through every block.
{
  const data = makeData();
  const s = createState(content);
  for (let guard = 0; guard < 40 && currentSchedule(s, content); guard += 1) {
    if (isDoorBlock(s, content) && !s.doors.taken[s.scheduleIndex]) {
      const offers = offerDoors(s, data, doors);
      ok(takeDoor(s, data, doors, offers[0].template, roadEvents).ok, `a door is taken at block ${s.scheduleIndex}`);
    }
    const enc = currentEncounter(s, data);
    s.selectedAnchor = currentSchedule(s, content).anchor_id;
    const quiet = [...enc.choices].reverse().find(c => choiceStatus(c, s, data).ok && !c.effects.some(fx => fx.startsWith('start-battle')));
    ok(Boolean(quiet), `${enc.id} has an open, fight-free way`);
    chooseEncounter(s, enc, quiet, data);
    advanceSchedule(s, data);
  }
  ok(s.scheduleIndex === 20 && !currentSchedule(s, content), 'all twenty blocks play');
  ok(!s.endingId && s.chapterCleared, 'the chapter closes without ending the game');
}

console.log(`doors: ${checks} checks passed`);
