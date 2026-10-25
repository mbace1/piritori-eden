// The families' standing (H5 of The Long Game).
//
//   node web/test/standing.mjs
//
// Holds the rules in standing.js's header: the ladder read off the numbers
// already in the save, doors closing and coming first by standing, and the
// night that settles it (a demand once, a warning and then retaliation, a
// vendetta every night), raised as repeatable road events.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, restoreState, requirementStatus } from '../js/v3/state.js?v=10';
import { rungOf, standingOf, standings, doorAllowed, doorFavoured, settleStanding } from '../js/v3/standing.js?v=1';
import { offerDoors } from '../js/v3/doors.js?v=4';
import { forceRoad, resolveRoad, pendingRoad } from '../js/v3/road.js?v=6';

const read = async p => JSON.parse(await readFile(new URL(p, import.meta.url)));
const content = await read('../../content/era1-slice-v1.json');
const families = await read('../../content/families-v1.json');
const doors = await read('../../content/doors-v1.json');
const roadEvents = await read('../../content/road-events-v1.json');
const map = await read('../../map/kallio-era1-2003-v1.json');
const data = {
  content, families,
  encounters: new Map(content.encounters.map(e => [e.id, e])),
  crew: new Map(content.crew.map(c => [c.id, c])),
  battles: new Map(content.battles.map(b => [b.id, b])),
  anchors: new Map(map.anchors.map(a => [a.id, a])),
};
let checks = 0;
const ok = (c, m) => { assert(c, m); checks += 1; };

// ── canon ────────────────────────────────────────────────────────────
const ids = families.rungs.map(r => r.id).join();
ok(ids === 'friendly,neutral,wary,insulted,retaliating,vendetta', `the ladder is the GDD's four under Friendly and Neutral (${ids})`);
ok(families.rungs.every((r, i, a) => i === 0 || r.min < a[i - 1].min), 'each rung is lower than the one above');
const rels = Object.keys(content.campaign.starting_state.relationships);
for (const f of families.families) {
  ok(rels.includes(f.id), `${f.id} is a relationship the save already keeps`);
  ok(f.ground.every(a => data.anchors.get(a)?.sliceState === 'active'), `${f.id} ground is on the board`);
  for (const key of ['restitution_event', 'retaliation_event']) {
    const e = roadEvents.events.find(x => x.id === f[key]);
    ok(e && e.trigger === 'standing' && e.repeatable, `${f.id} ${key} is a repeatable triggered event`);
    ok(e.choices.some(c => !(c.requires ?? []).length), `${e.id} always has a way out`);
    ok(e.choices.some(c => c.effects.includes(`relationship:${f.id}:+1`)), `${e.id} has a priced way back up`);
  }
  const r = roadEvents.events.find(x => x.id === f.retaliation_event);
  ok(r.fight && r.choices.some(c => c.effects.some(fx => fx.startsWith('start-battle:')) && c.requires.includes('fighters>=2') && c.requires.includes('fights-today<2')), `${r.id} can be a fight, with fighters, inside the day's two`);
  ok(doors.templates.some(t => t.from === f.id), `${f.id} offers doors`);
}

// ── the ladder ───────────────────────────────────────────────────────
const at = [[3, 'friendly'], [2, 'friendly'], [1, 'neutral'], [0, 'neutral'], [-1, 'wary'], [-2, 'insulted'], [-3, 'retaliating'], [-4, 'vendetta'], [-9, 'vendetta']];
for (const [v, id] of at) ok(rungOf(v, families).id === id, `${v} reads ${id}`);
{
  const s = createState(content);
  ok(standings(s, families).every(x => x.rung.id === 'neutral'), 'everyone starts neutral');
  s.relationships.mccormick_family = 2;
  ok(standingOf(s, families, 'mccormick_family').rung.id === 'friendly', 'the ladder reads the number the save already has');
}

// ── doors by standing ────────────────────────────────────────────────
{
  const mc = doors.templates.filter(t => t.from === 'mccormick_family');
  const s = createState(content); s.scheduleIndex = 15;
  s.relationships.mccormick_family = -1;
  ok(mc.every(t => !doorAllowed(s, families, t)), 'Wary: their doors close');
  let offered = 0;
  for (let seed = 0; seed < 40; seed += 1) {
    const x = createState(content); x.scheduleIndex = 15; x.contentId = `${content.id}#${seed}`; x.relationships.mccormick_family = -1; x.stock.piri = 2;
    offered += offerDoors(x, data, doors).filter(o => mc.some(t => t.id === o.template)).length;
  }
  ok(offered === 0, 'and are never on the board');
  let favoured = 0, n = 0;
  for (let seed = 0; seed < 40; seed += 1) {
    const x = createState(content); x.scheduleIndex = 15; x.contentId = `${content.id}#${seed}`; x.relationships.jade_lantern_network = 2; x.stock.piri = 2;
    n += 1; if (offerDoors(x, data, doors).some(o => doors.templates.find(t => t.id === o.template).from === 'jade_lantern_network')) favoured += 1;
  }
  ok(favoured === n, `Friendly: their work is always on the board (${favoured}/${n})`);
  ok(doorFavoured({ relationships: { jade_lantern_network: 2 } }, families, { from: 'jade_lantern_network' }), 'a Friendly family is favoured');
  // Neutral families change nothing: the board is what v4.65 rolled.
  const plain = { ...data, families: undefined };
  for (let seed = 0; seed < 20; seed += 1) {
    const a = createState(content); a.scheduleIndex = 16; a.contentId = `${content.id}#${seed}`;
    const b = createState(content); b.scheduleIndex = 16; b.contentId = `${content.id}#${seed}`;
    ok(JSON.stringify(offerDoors(a, data, doors)) === JSON.stringify(offerDoors(b, plain, doors)), 'with everyone neutral the board is unchanged');
  }
}

// ── the night settles it ─────────────────────────────────────────────
{
  const s = createState(content);
  ok(settleStanding(s, families).raise === null, 'neutral: nothing happens at night');
  s.relationships.mccormick_family = -2;
  ok(settleStanding(s, families).raise === 'road-restitution-mccormick', 'insulted: a demand');
  ok(settleStanding(s, families).raise === null, 'the demand comes once');
  s.relationships.mccormick_family = -1; settleStanding(s, families);
  s.relationships.mccormick_family = -2;
  ok(settleStanding(s, families).raise === 'road-restitution-mccormick', 'insult them again, and it comes again');
  s.relationships.mccormick_family = -3;
  const warn = settleStanding(s, families);
  ok(warn.raise === null && warn.warnings.length === 1 && standingOf(s, families, 'mccormick_family').warned, 'retaliating: first a warning');
  ok(s.logs[0] === families.families[0].warning, 'the warning is in the city memory');
  ok(settleStanding(s, families).raise === 'road-retaliation-mccormick', 'then, the next night, they come');
  ok(settleStanding(s, families).raise === null, 'and warn again before the next time');
  s.relationships.mccormick_family = -5;
  ok(settleStanding(s, families).raise === 'road-retaliation-mccormick' && settleStanding(s, families).raise === 'road-retaliation-mccormick', 'vendetta: every night');
  // Two families at once: one event a night; the other waits, not lost.
  const t = createState(content); t.relationships.mccormick_family = -2; t.relationships.jade_lantern_network = -2;
  ok(settleStanding(t, families).raise === 'road-restitution-mccormick' && settleStanding(t, families).raise === 'road-restitution-jade', 'two demands arrive on two nights');
  ok(restoreState(JSON.parse(JSON.stringify(t)), content).standing?.demanded?.jade_lantern_network === true, 'the bookkeeping survives a reload');
}

// ── the events play ──────────────────────────────────────────────────
{
  const s = createState(content); s.relationships.mccormick_family = -2; s.cash = 200;
  ok(forceRoad(s, roadEvents, 'road-restitution-mccormick', 'piritori'), 'a demand is raised on the road');
  ok(resolveRoad(s, data, roadEvents, 'pay').ok && s.cash === 120 && s.relationships.mccormick_family === -1, 'paying it buys you back to wary');
  ok(forceRoad(s, roadEvents, 'road-restitution-mccormick', 'piritori'), 'a repeatable event can come again');
  ok(pendingRoad(s, roadEvents)?.id === 'road-restitution-mccormick', 'and waits for an answer');
  const u = createState(content);
  u.road = { journeys: 0, since: 0, seen: ['road-cut-found-out'], pending: null, minutes: 0, minutesBlock: -1, last: null };
  ok(!forceRoad(u, roadEvents, 'road-cut-found-out', 'piritori'), 'an ordinary triggered event is still seen once');
  const f = createState(content);
  ok(!requirementStatus('fighters>=2', f, data).ok, 'alone, Aatami cannot stand against a retaliation');
}

console.log(`standing: ${checks} checks passed`);
